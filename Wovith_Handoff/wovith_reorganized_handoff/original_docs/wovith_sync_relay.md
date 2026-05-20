# Wovith Sync Relay API
### Minimal WebSocket relay for Automerge document sync

---

## 0. About this document

This document specifies the sync relay — the cloud-side component that lets a user's devices stay in sync without making the cloud the authority. The relay's role is intentionally minimal: authenticate users, route document changes between their devices, and provide enough temporary storage that an offline device can catch up when it reconnects. It is not a database. It is not a query engine. It does not understand the contents of the documents it relays.

The relay is built on **Supabase** infrastructure: Supabase Auth for identity, a Node.js WebSocket server (deployed as a Supabase Edge Function or a small dedicated service) for the actual sync protocol, and Supabase Storage / Postgres for the temporary change buffer. The sync protocol itself is the standard `automerge-repo` sync protocol, which is well-defined and battle-tested.

The privacy model from the data architecture doc holds: the server sees document IDs and (by default) change contents. For Trust tier or opt-in users, end-to-end encryption renders the change contents opaque to the server.

---

## 1. The big picture

```
┌────────────────────────────────────────────────────────────┐
│                       Wovith devices                       │
│   ┌──────────┐    ┌──────────┐    ┌──────────────────┐    │
│   │ Android  │    │ Desktop  │    │ Web browser      │    │
│   │ (Chris)  │    │ (Chris)  │    │ (Chris's iPad)   │    │
│   └────┬─────┘    └────┬─────┘    └────────┬─────────┘    │
│        │ wss://         │ wss://             │ wss://      │
│        └────────────────┼────────────────────┘             │
│                         │                                  │
└─────────────────────────┼──────────────────────────────────┘
                          ▼
            ┌──────────────────────────────┐
            │  Wovith sync relay           │
            │  (Node.js + WebSocket)       │
            │                              │
            │  ┌────────────────────────┐  │
            │  │ Auth verification      │  │
            │  │ (Supabase JWT)         │  │
            │  └─────────┬──────────────┘  │
            │            │                 │
            │  ┌─────────▼──────────────┐  │
            │  │ Document authorization │  │
            │  │ (who owns what?)       │  │
            │  └─────────┬──────────────┘  │
            │            │                 │
            │  ┌─────────▼──────────────┐  │
            │  │ automerge-repo sync    │  │
            │  │ protocol handler       │  │
            │  └─────────┬──────────────┘  │
            │            │                 │
            │  ┌─────────▼──────────────┐  │
            │  │ Change buffer          │  │
            │  │ (Postgres + Storage)   │  │
            │  └────────────────────────┘  │
            └──────────────────────────────┘
```

The relay is a thin layer above the standard Automerge sync protocol. It doesn't reimplement sync logic; it authenticates connections, authorizes document access, and lets the protocol do its thing.

---

## 2. Authentication

The user signs in to Wovith via Supabase Auth (email + password, magic link, or social SSO). Supabase issues a JWT.

When a device connects to the sync relay:

```
WebSocket upgrade request:
  wss://sync.wovith.app/v1/sync
  
Headers:
  Authorization: Bearer <Supabase JWT>
  X-Wovith-Device-Id: <stable device ID>
  X-Wovith-Device-Name: <user-named, e.g. "Chris's Pixel">
  X-Wovith-Platform: android | ios | web | desktop
  X-Wovith-Client-Version: 1.0.3
```

The relay verifies the JWT:
- Signature valid (against Supabase's public key)
- Not expired
- Audience matches
- User exists and is not banned

If verification fails: HTTP 401, connection rejected.

If verification succeeds: the user ID is extracted, the device is registered (or updated) in the user's known-devices list, and the WebSocket upgrade completes.

---

## 3. Document authorization

After authentication, the device requests access to specific documents. The relay enforces:

- The user must own the document (it's in their known-documents list)
- Or the document is one they've been granted access to (future: shared lenses with multiple users)

Document ownership is stored in a simple Postgres table:

```sql
CREATE TABLE document_ownership (
  document_id TEXT NOT NULL,        -- automerge:abc123...
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner', -- 'owner' | 'reader' | 'writer'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (document_id, user_id)
);

CREATE INDEX idx_doc_ownership_user ON document_ownership(user_id);
CREATE INDEX idx_doc_ownership_doc ON document_ownership(document_id);
```

A new document is registered with the relay when first created on a device:

```
Client → Server:  REGISTER_DOCUMENT { documentId: 'automerge:abc...' }
Server → Client:  REGISTERED
```

The server records the user as owner. Subsequent connections from any of this user's devices can sync the document.

Documents the user doesn't own: the server returns ACCESS_DENIED and refuses to relay any messages for them. This is the simplest possible authorization — no per-document ACL beyond ownership at v1.

---

## 4. The sync protocol

After authentication and authorization, the device speaks the standard automerge-repo sync protocol over the WebSocket. The relay's responsibilities:

### 4.1 Peer routing

The relay is, conceptually, a peer in the automerge-repo network. It connects to itself for each user, and routes messages between that user's devices.

```
Device A → Relay:  SYNC_MESSAGE { documentId, message: <binary> }
Relay:             [stores message in buffer]
                   [forwards to all other devices of this user]
Relay → Device B:  SYNC_MESSAGE { documentId, message: <binary> }
Relay → Device C:  SYNC_MESSAGE { documentId, message: <binary> }
```

The relay does not interpret the binary message. It just routes.

### 4.2 The change buffer

Devices come and go. When Device A is online but Device B is offline, A's changes need to be held until B reconnects. The buffer serves this purpose.

Buffer storage:

```sql
CREATE TABLE sync_buffer (
  buffer_id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  document_id TEXT NOT NULL,
  sender_device_id TEXT NOT NULL,
  message_blob BYTEA NOT NULL,        -- the automerge sync message
  message_size INTEGER NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_by_devices TEXT[] NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sync_buffer_user_doc ON sync_buffer(user_id, document_id, received_at);
CREATE INDEX idx_sync_buffer_expires ON sync_buffer(expires_at);
```

For large messages (rare but possible — Automerge can produce sizable change blobs), the buffer offloads to Supabase Storage and stores only the storage URL in the Postgres row.

### 4.3 Buffer retention

Default retention: 30 days. Within this window, an offline device that reconnects can catch up to the current state regardless of how long it was offline.

After 30 days: messages are deleted. A device that's been offline for >30 days reconnects with stale state. The Automerge sync protocol handles this gracefully — it negotiates with peers and re-fetches as needed. The relay's buffer is performance optimization, not authoritative storage.

### 4.4 Acknowledgment and cleanup

When a device successfully receives and applies a message, it sends ACK:

```
Device → Relay: ACK { bufferIds: [123, 124, 125] }
```

The relay marks those buffer entries as acknowledged by that device. When a buffer entry has been acknowledged by all known devices of the user, it can be deleted ahead of the 30-day window.

This keeps the buffer lean in normal operation: a user with two devices both online has near-zero buffer at any moment. The buffer fills only during periods of offline divergence.

---

## 5. The full API surface

The relay's API is small and stable:

### 5.1 WebSocket frames (after authentication)

**Client → Server:**

```typescript
type ClientFrame =
  | { type: 'REGISTER_DOCUMENT'; documentId: string }
  | { type: 'SUBSCRIBE'; documentIds: string[] }
  | { type: 'UNSUBSCRIBE'; documentIds: string[] }
  | { type: 'SYNC_MESSAGE'; documentId: string; message: Uint8Array }
  | { type: 'ACK'; bufferIds: number[] }
  | { type: 'PING' }
```

**Server → Client:**

```typescript
type ServerFrame =
  | { type: 'REGISTERED'; documentId: string }
  | { type: 'ACCESS_DENIED'; documentId: string; reason: string }
  | { type: 'SYNC_MESSAGE'; documentId: string; message: Uint8Array; bufferId: number }
  | { type: 'CATCHUP_COMPLETE'; documentId: string }
  | { type: 'BUFFER_EXPIRED'; documentId: string }
  | { type: 'PEER_JOINED'; documentId: string; deviceId: string }
  | { type: 'PEER_LEFT'; documentId: string; deviceId: string }
  | { type: 'ERROR'; code: string; message: string }
  | { type: 'PONG' }
```

That's it. Eleven message types total. The relay does nothing the protocol doesn't require.

### 5.2 REST API (administrative, sparingly used)

```
POST /v1/devices
  - Register a new device (returns deviceId)
  - Body: { name, platform, publicKey? }

GET /v1/devices
  - List the user's devices
  - Returns: [{ deviceId, name, platform, lastSeenAt, trustedAt }]

DELETE /v1/devices/:deviceId
  - Revoke a device's access
  - All future connection attempts from this device are rejected

POST /v1/account/export
  - Initiate full backup export
  - Returns a signed URL with a 24h expiry to download

DELETE /v1/account
  - Initiate account deletion
  - 7-day grace period; can be reversed
```

All REST endpoints require the same Supabase JWT.

---

## 6. End-to-end encryption (Trust tier)

For users on Trust tier or who opt in, change messages are encrypted client-side before being sent to the relay. The relay sees only opaque ciphertext.

### 6.1 Key model

Each user has a **master key** derived from their passphrase:

```
masterKey = PBKDF2(passphrase, salt, iterations=600000, length=32)
```

The salt is server-stored (not secret); the passphrase is never sent. PBKDF2 is OWASP-recommended at 600k iterations for SHA-256 as of 2026.

Per-document encryption keys are derived from the master:

```
docKey = HKDF(masterKey, info=documentId, length=32)
```

This means: knowing the master gives access to all documents; knowing one docKey gives access to one document only.

### 6.2 The encryption transport

Before sending:
```
encryptedMessage = AES-256-GCM.encrypt(message, docKey, nonce)
```

The relay sees: a binary blob it can't read. It still routes correctly because the document ID is in the unencrypted envelope.

After receiving:
```
message = AES-256-GCM.decrypt(encryptedMessage, docKey, nonce)
```

If decryption fails (wrong key), the device knows something's wrong and surfaces an error.

### 6.3 Multi-device key sharing

When a user adds a new device, the new device doesn't have the master key. The bootstrap flow:

1. New device generates an ephemeral key pair
2. New device displays a setup QR code containing the public key
3. Existing trusted device scans the QR code
4. Existing device encrypts the master key with the new device's public key
5. Encrypted master key is uploaded to the relay (the relay sees ciphertext, not the master)
6. New device downloads, decrypts with its private key, now has the master

This is essentially the Signal-style key exchange. The relay never sees the master key in plaintext.

### 6.4 Lost passphrase

If the user forgets their passphrase: their data is unrecoverable. Stated clearly in the Trust tier onboarding. A "recovery code" — a 12-word phrase displayed once at setup, never stored anywhere by Wovith — can be used to reset. The recovery code is a derived key encrypted form of the master.

This is the trade-off Trust tier accepts in exchange for true E2E.

---

## 7. Operational concerns

### 7.1 Scaling

Each user maintains a persistent WebSocket connection per active device. A user with 3 devices has up to 3 simultaneous connections.

Supabase's WebSocket capabilities (via Realtime) can handle up to ~100k concurrent connections per region. With a dedicated WebSocket service, this can scale to ~1M+ on modest hardware.

For Wovith's anticipated v1 scale (10k-100k active users, 1-3 devices each), Supabase's managed infrastructure is sufficient. Beyond that, a self-hosted WebSocket layer (deployed as a stateful service) is the next step.

### 7.2 Geographic distribution

WebSocket round-trip latency matters for the perception of "real-time sync." A user in Tokyo connecting to a US-East relay sees 200+ ms RTT, which makes typing in a shared cell laggy.

v1: single region (US-East). Acceptable because Wovith isn't a real-time collaborative editor — sync delays in the seconds are fine for the use case (lens definitions don't change rapidly).

v2: multi-region with the closest-region routing. Each region has its own relay; documents owned by users in that region are bound to that region for sync. Cross-region replication is via standard Postgres replication for ownership tables; sync buffers are region-local.

### 7.3 Backup and disaster recovery

The relay's authoritative state is the `document_ownership` table and the device registry. Both are in Supabase Postgres, which has automated backups.

The sync buffer is *not* authoritative. Even total loss of the buffer doesn't lose data — devices re-sync from scratch.

A new relay instance can come online and immediately serve traffic: device connections re-establish, ownership is verified against Postgres, sync messages route. The 30-day buffer rebuilds organically as devices send new changes.

### 7.4 Monitoring

Metrics tracked:
- WebSocket connections per region (current count, peak, churn)
- Sync messages per second (by document, by user)
- Buffer size (total, p99 per user)
- Buffer age distribution
- Decryption failures (for E2E users)
- Authorization denials

Alerts on:
- Auth verification failure spike (potential attack)
- Connection churn spike (potential client bug or infrastructure issue)
- Buffer fill rate exceeding retention drain rate (indicates a bottleneck)

### 7.5 The deployment shape

The relay is one of:

**Option A — Supabase Edge Function (recommended for v1)**
- Deno-based, deployed at the edge
- WebSocket support via the Deno runtime
- Constraint: stateless per-request, so the sync state is in Postgres

**Option B — Self-hosted Node.js service**
- Deployed on Fly.io, Railway, or similar
- Stateful WebSocket connections
- Buffer in Postgres or Redis

v1 starts with Option A (operationally simpler). The architecture moves to Option B if Edge Function constraints prove limiting at scale.

---

## 8. What the relay does *not* do

Explicit non-goals, to keep the system tight:

- **It does not store canonical document state.** That's on devices.
- **It does not perform document-level queries.** It doesn't read inside documents.
- **It does not do conflict resolution.** Automerge handles that on devices.
- **It does not do offline rendering or background processing of documents.** Cells evaluate on devices.
- **It does not store OAuth tokens.** Those are device-local in secure storage.
- **It does not store agent or MCP responses.** Those are device-local in the local cache.
- **It does not store provenance.** That's device-local.
- **It does not do server-side migration of documents.** Migrations run on devices when they update.

The relay is a router. Nothing more.

---

## 9. Privacy posture

### 9.1 What the relay can see (default, non-E2E)

- User identity (from JWT)
- Device identifiers and metadata
- Document IDs
- Document content via sync messages (the Automerge changes are not encrypted by default)
- Sync timing patterns

### 9.2 What the relay cannot see (E2E enabled)

- Document content (only ciphertext)
- The master key (never sent)
- Decrypted lens definitions, cell contents, captures

### 9.3 What the relay never sees, regardless of tier

- OAuth tokens
- MCP responses
- Agent prompts and responses
- Cached cell values
- Audit log details
- The user's actual messages, files, calendar events (those are on connectors, not synced through Wovith)

### 9.4 Audit log on the relay side

The relay maintains its own minimal audit log:
- Connection events (auth success/failure, device identity)
- Document registrations
- Bulk operations (export requests, account deletion)

This log is for security and operational purposes. Retained for 90 days. Not exposed to the user directly (the user-facing audit log is device-local; the relay's audit is for Wovith's operations team).

---

## 10. Cost model

Sync traffic is small per user:

- Average change message: a few hundred bytes to a few KB
- Average user produces 10-100 changes per day
- Average daily sync traffic per user: ~50 KB

A 10,000-user deployment: ~500 MB/day of sync traffic. Trivial cost.

WebSocket connection cost is the dominant infrastructure expense. Supabase's pricing scales reasonably with concurrent connections up to ~100k; beyond that, dedicated WebSocket infrastructure is more cost-effective.

The cost per user per month for sync: under $0.05 at the scale Wovith targets at v1. Subsumed in the Pro tier pricing easily.

---

## 11. Cross-doc consistency

- **Data architecture**: the relay implements the sync transport that the storage adapter uses. Same change buffer model.
- **Security**: the relay enforces the privacy minimization described in the security doc. E2E is the opt-in path.
- **Cell runtime**: cells don't talk to the relay; they talk to their local Automerge document, which syncs through the relay. Decoupled.
- **Engineering architecture**: client-side, sync lives in `effects/network/sync-client.ts`. Server-side, it's a separate codebase (the relay is its own deployable).
- **GTM**: pricing tiers (Free single-device, Pro multi-device, Trust E2E) gate sync features.

No conflicts.

---

## References

- automerge-repo sync protocol documentation
- Supabase Realtime documentation
- Supabase Edge Functions documentation
- OWASP password storage cheat sheet (PBKDF2 iteration count, 2026)
- *Signal Protocol* (for the key exchange pattern)
- WebSocket scalability writings (Fly.io engineering blog)
- AES-GCM specification
