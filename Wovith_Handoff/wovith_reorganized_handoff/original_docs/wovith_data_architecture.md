# Wovith Data Architecture
### Automerge schema, storage layers, and what lives where

---

## 0. About this document

This document specifies how Wovith stores user state. It covers the Automerge document schema (what's a lens, a cell, a connection at the persistence layer), the storage layer strategy (Automerge docs in IndexedDB/SQLite, separate caches, ephemeral runtime state), the sync model (what travels between devices and what doesn't), and the migration story for schema evolution.

The architecture is constrained by Wovith's commitments:

- **Local-first.** Data lives on the user's device. The cloud relays sync messages between devices but stores no canonical state. A user with one device must still get the full product; a user with three devices gets them in sync but the cloud is not the authority.
- **Multi-device.** A lens authored on the Android phone shows up on the desktop within seconds.
- **CRDTs for conflict resolution.** Two devices editing the same lens definition concurrently merge cleanly.
- **Privacy by default.** The cloud sees encrypted opaque blobs in the steady state; metadata visible to the cloud is minimized.
- **Capacitor-native.** The same data layer runs in the browser, in the Capacitor WebView on Android, and (later) on iOS and desktop.

The core technical choice: **Automerge 2** for CRDT documents, **SQLite (via `@capacitor-community/sqlite`)** for native storage, **IndexedDB** for web fallback, **WebSocket-based sync** for inter-device coordination through a Supabase-hosted relay.

---

## 1. The big picture

Wovith state lives in three storage layers, with deliberately different durability and synchronization characteristics. (Naming note: this doc uses "storage layer" deliberately to avoid confusion with the security doc's "action tier" terminology — those are different systems with different numbering. Here, the three layers are *synced docs*, *local cache*, and *runtime state*.)

```
┌────────────────────────────────────────────────────┐
│ Synced docs (the Automerge layer)                  │
│   The user's lens definitions, cell definitions,   │
│   captures, manual calibration state.              │
│   Persisted, sync'd, conflict-free merge.          │
│   Storage: SQLite (native) / IndexedDB (web)       │
└────────────────────────────────────────────────────┘
                       ▲
                       │
┌────────────────────────────────────────────────────┐
│ Local cache                                        │
│   MCP responses, agent responses, computed cell    │
│   values that are expensive to recompute.          │
│   Persisted, NOT sync'd, evictable.                │
│   Storage: SQLite key-value tables / IndexedDB     │
└────────────────────────────────────────────────────┘
                       ▲
                       │
┌────────────────────────────────────────────────────┐
│ Runtime state                                      │
│   Cell evaluation state, observation set,          │
│   in-flight promises, dependency graph.            │
│   In-memory, regenerated on app start.             │
│   Storage: JavaScript memory                       │
└────────────────────────────────────────────────────┘
```

What goes in each layer is governed by the answers to: *is it canonical?* (synced docs), *is it useful to keep but rebuildable?* (local cache), *is it ephemeral computation state?* (runtime state).

---

## 2. Synced docs: the Automerge layer

### 2.1 Document granularity

The fundamental design question for any CRDT-backed app: how many documents, and where to draw the boundaries?

Automerge guidance (from the Automerge team's modeling-data documentation): hundreds of documents are fine, thousands get expensive in sync overhead. Many small documents allow fine-grained sharing and snappy startup. One big document allows trivial cross-reference and atomic operations.

**The committed answer for Wovith:** *one document per top-level entity that can be independently shared or backgrounded.*

This translates to:

- One **user profile document** per user account. Contains identity, preferences, connector list.
- One **canvas document** per canvas (most users have one; power users may have several).
- One **lens document** per lens. Authoring, ownership, cells.
- One **captures document** per user (the global capture inbox).
- One **calibration document** per user (calibration state across all lenses).
- One **agent budget document** per user (budget tracking).

Document IDs are Automerge URLs (`automerge:abc123def456...`). The runtime maintains a registry mapping user IDs to known document URLs.

### 2.2 The user profile document

The root document. Created when the user first signs up. Holds the references that let the rest of the system find everything else.

```typescript
type UserProfileDoc = {
  // Identity
  userId: string                      // Supabase auth ID, stable across devices
  displayName: string
  email: string
  createdAt: number                   // unix ms
  
  // Document references
  canvases: { [canvasId: string]: AutomergeUrl }
  primaryCanvasId: string             // which canvas to show on launch
  
  // Singleton documents
  capturesDocUrl: AutomergeUrl
  calibrationDocUrl: AutomergeUrl
  budgetDocUrl: AutomergeUrl
  
  // Connections (not the tokens — those are in secure storage)
  connections: { [connectionId: string]: ConnectionMetadata }
  
  // Preferences
  preferences: {
    theme: 'light' | 'dark' | 'system'
    language: string                  // BCP 47 language tag
    timeZone: string                  // IANA TZ database identifier
    notificationsEnabled: boolean
    backgroundRefreshEnabled: boolean
    doNotDisturbHours: { startHour: number; endHour: number } | null
    voiceModelPreference: 'haiku-class' | 'sonnet-class' | 'opus-class'
  }
  
  // Device list (for multi-device coordination)
  knownDevices: {
    [deviceId: string]: {
      name: string                    // user-named ("Chris's Pixel", "Office Mac")
      platform: 'android' | 'ios' | 'web' | 'desktop'
      lastSeenAt: number
      trustedAt: number               // when this device was authorized
    }
  }
  
  // Schema version (for migration)
  schemaVersion: number
}

type ConnectionMetadata = {
  id: string
  connectorId: string                 // 'google-drive', 'gmail', etc.
  displayName: string                 // 'Personal Gmail', 'Work Drive'
  accountIdentifier: string           // email or other identifier
  scopeTier: 'read-only' | 'read-and-write' | 'full'
  grantedScopes: string[]             // raw OAuth scopes for audit
  connectedAt: number
  lastUsedAt: number
  state: 'healthy' | 'degraded' | 'expired' | 'revoked'
  // NOTE: actual OAuth tokens are NOT in the Automerge doc
  // They live in Capacitor secure storage, keyed by connection ID
}
```

### 2.3 The canvas document

A canvas is the spatial workspace that holds lenses. Most users have one. Some power users will create multiple canvases (a "work" canvas and a "personal" canvas, for example).

```typescript
type CanvasDoc = {
  canvasId: string
  name: string
  
  // The lenses on this canvas (ordered by user-defined position)
  lenses: {
    [lensId: string]: {
      lensDocUrl: AutomergeUrl
      position: number                // ordering on the canvas dock
      pinned: boolean
    }
  }
  
  // Which lens is currently primary
  currentLensId: string | null
  
  // Canvas-level settings
  visualTheme: string                 // e.g., 'wovith-default'
  
  schemaVersion: number
}
```

### 2.4 The lens document

This is the bulk of user-authored content. One Automerge document per lens.

```typescript
type LensDoc = {
  lensId: string
  
  // Identity and metadata
  name: string
  description: string                 // user-written or generated
  iconHint: string | null             // optional small visual cue
  
  // Authorship
  authorId: string                    // userId of the original author
  forkedFrom: AutomergeUrl | null    // if forked from another lens
  createdAt: number
  modifiedAt: number
  version: number                     // bumped on each non-trivial edit
  
  // The cells in this lens
  cells: {
    [cellId: string]: CellDef
  }
  
  // Layout (cell positioning on the lens)
  layout: {
    type: 'grid' | 'stack' | 'freeform'
    cells: {
      [cellId: string]: {
        gridX: number
        gridY: number
        gridW: number
        gridH: number
      }
    }
  }
  
  // Required connectors (computed from cells, cached here for fast checks)
  requiredConnectors: string[]
  requiredScopes: { [connectorId: string]: 'read-only' | 'read-and-write' | 'full' }
  
  // Sharing state
  sharingState: 'private' | 'exported' | 'imported'
  exportSnapshot: AutomergeUrl | null   // if exported, the sanitized snapshot
  
  schemaVersion: number
}

type CellDef = {
  cellId: string
  expression: string                  // the DSL source code, as a string
  parsedExpression: any              // parsed AST, cached (regenerated on schema mismatch)
  rendererId: string
  
  // Freshness policy
  ttl: number | null                  // ms; null = manual refresh only
  background: boolean                 // refresh in background?
  
  // User-facing
  title: string | null                // optional, override of computed title
  notes: string | null                // user notes about the cell
  
  // History/state that should sync
  calibrationHints: string[]          // dismissed item IDs, prioritized topics, etc.
  
  createdAt: number
  modifiedAt: number
}
```

A specific note on `expression` being both a string and a parsed AST: the source-of-truth is the string. The AST is a cache that's regenerated whenever the parser version changes. This avoids syncing parser-version-specific data structures between devices that might have different versions of Wovith installed.

### 2.5 The captures document

User-generated content (voice notes, text snippets, photo captures) lives in a separate document because it grows continuously and has different sync characteristics than lens definitions (which change rarely once authored).

```typescript
type CapturesDoc = {
  capturesByDate: {
    // Daily buckets, capped at ~100 entries per day
    [yyyymmdd: string]: {
      [captureId: string]: {
        type: 'text' | 'voice-transcript' | 'image-reference' | 'link'
        content: string                // the actual text/transcript/URL/etc
        createdAt: number
        deviceId: string               // which device captured this
        tags: string[]
        archivedAt: number | null     // soft-deleted entries (privacy-safe deletion)
      }
    }
  }
  
  schemaVersion: number
}
```

The bucket-per-day structure follows the MongoDB time-series pattern: bounds individual document size, makes range queries efficient, simplifies retention policy (archive captures older than N days).

### 2.6 The calibration document

Calibration state — what the user has dismissed, prioritized, marked as relevant — accumulates over time and should sync across devices.

```typescript
type CalibrationDoc = {
  // Per-cell calibration
  perCell: {
    [cellId: string]: {
      dismissedItemIds: string[]      // stable IDs of items the user dismissed
      pinnedItemIds: string[]
      lastCalibratedAt: number
    }
  }
  
  // Per-source signals (e.g., "stop showing me anything from these senders")
  perSource: {
    [sourceId: string]: {
      preferredCount: number           // running count of "I want more like this"
      dispreferredCount: number        // running count of "less like this"
      muted: boolean                   // hard mute
    }
  }
  
  // Topic and entity signals
  topics: {
    [topicId: string]: {
      preferred: boolean
      lastSignal: number
    }
  }
  
  schemaVersion: number
}
```

The calibration model is deliberately simple at v1 — a counter and a flag per source. Sophistication (contextual bandits, embedding-based similarity) is v2+ work.

### 2.7 The agent budget document

Budget tracking is its own document because:
- It updates frequently (every agent call increments it)
- Concurrent updates from multiple devices need CRDT merging (LWW counters)
- The privacy and audit characteristics differ from lens definitions

```typescript
type AgentBudgetDoc = {
  userId: string
  tier: 'free' | 'pro' | 'trust'
  
  // Per-day rolling history
  daysHistory: {
    [yyyymmdd: string]: {
      callCount: number               // Automerge Counter type
      unitTotal: number               // weighted cost
      providerBreakdown: { [provider: string]: number }
      modelTierBreakdown: { [tier: string]: number }
    }
  }
  
  // Current day fast access
  currentDay: string                  // yyyymmdd
  currentDayCalls: number             // Counter, atomic increment
  currentDayUnits: number             // Counter
  
  // Last reset
  lastResetAt: number
  
  schemaVersion: number
}
```

Automerge's `Counter` CRDT type is used for `callCount` and `currentDayCalls` so that concurrent increments from two devices merge correctly.

---

## 3. What's NOT in Automerge

Some data is deliberately *outside* the CRDT layer:

### 3.1 OAuth tokens

Tokens live in Capacitor's secure storage (`@capacitor-community/secure-storage-plugin` on native, IndexedDB with WebCrypto-derived encryption on web). They are device-local and never sync.

Rationale: tokens represent device-specific authorization. A Gmail token granted to the Android phone shouldn't be usable from the desktop — that would be a security regression. Each device runs its own OAuth flow against the user's accounts.

The Automerge `ConnectionMetadata` records that a connection exists and what scope it has; the actual ability to use the connection is device-local.

### 3.2 MCP response cache

Cached MCP responses live in a separate SQLite table (or IndexedDB store on web). They're device-local and rebuildable.

Rationale: cache is performance optimization, not state. Syncing it would burn bandwidth on data that's freshly available from the connector. Each device fetches and caches independently.

### 3.3 Agent response cache

Same model. Device-local, rebuildable. If sync'd it could leak data the device shouldn't have (a cell from a forked lens that the user is testing on one device shouldn't put its agent responses on every other device).

### 3.4 Runtime cell state

Cell evaluation state (`state`, `value`, `error`, `dependencies`) is in-memory only. It's reconstructed on each app launch by re-evaluating cells.

Rationale: serializing computed state across devices creates a class of consistency bugs (a cell that's "fresh" on the laptop but "stale" on the phone for no good user-visible reason). Re-evaluation on each device is simpler and gives a clean mental model.

### 3.5 Telemetry / analytics

Crash reports, performance metrics, anonymized usage telemetry — these go to the cloud directly (Supabase analytics tables) bypassing Automerge entirely. Strictly opt-in.

### 3.6 Conversation history with Wovith

Wovith deliberately has no chat thread. So there's no "conversation history" to store. The closest analog — the audit log of what Wovith did on the user's behalf — is its own structure (specified in section 4.4 below).

---

## 4. Local cache: device-only, evictable

Cache data lives in SQLite (native) or IndexedDB (web) with simple key-value semantics. The cache layer is intentionally not a full ORM — it's a small set of typed tables with deterministic key derivation.

### 4.1 The cache schema

```sql
-- MCP response cache
CREATE TABLE mcp_cache (
  cache_key TEXT PRIMARY KEY,        -- hash of (connector + tool + params)
  connector_id TEXT NOT NULL,
  response_blob BLOB NOT NULL,       -- serialized response
  cached_at INTEGER NOT NULL,        -- unix ms
  ttl_ms INTEGER NOT NULL,
  hit_count INTEGER DEFAULT 0,
  last_hit_at INTEGER
);

CREATE INDEX idx_mcp_cache_connector ON mcp_cache(connector_id);
CREATE INDEX idx_mcp_cache_expiry ON mcp_cache(cached_at, ttl_ms);

-- Agent response cache
CREATE TABLE agent_cache (
  cache_key TEXT PRIMARY KEY,        -- hash of (model + prompt + params)
  model_id TEXT NOT NULL,
  response_blob BLOB NOT NULL,
  cached_at INTEGER NOT NULL,
  ttl_ms INTEGER NOT NULL DEFAULT 86400000  -- 24h default
);

CREATE INDEX idx_agent_cache_model ON agent_cache(model_id);

-- Cell value cache (for cells expensive to recompute)
CREATE TABLE cell_cache (
  cell_id TEXT PRIMARY KEY,
  expression_hash TEXT NOT NULL,
  value_blob BLOB NOT NULL,
  computed_at INTEGER NOT NULL,
  size_bytes INTEGER NOT NULL
);

CREATE INDEX idx_cell_cache_size ON cell_cache(size_bytes);

-- Audit log (what Wovith did)
CREATE TABLE audit_log (
  log_id TEXT PRIMARY KEY,           -- ULID
  timestamp INTEGER NOT NULL,
  cell_id TEXT,
  lens_id TEXT,
  action_type TEXT NOT NULL,         -- 'mcp_read' | 'mcp_write' | 'agent_call' | 'user_action'
  connector_id TEXT,
  details_json TEXT,                 -- structured details
  user_confirmed BOOLEAN              -- did user approve this action via Intent Preview
);

CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_cell ON audit_log(cell_id);
CREATE INDEX idx_audit_lens ON audit_log(lens_id);
CREATE INDEX idx_audit_connector ON audit_log(connector_id);
```

The audit log is in SQLite rather than Automerge because:
- It's append-only — CRDT merge semantics offer nothing here
- It can grow large (one entry per agent call adds up)
- Each device has its own audit — what the phone did vs what the desktop did — that's correct because the audit is what *this device* did
- Cross-device audit aggregation is a UI concern, not a sync concern

### 4.2 Cache size management

The cache is bounded:

- `mcp_cache`: max 50 MB; eviction by LRU after expiry
- `agent_cache`: max 100 MB; eviction by age (oldest first)
- `cell_cache`: max 50 MB; eviction by LRU
- `audit_log`: kept for 90 days; older entries archived to a separate table on demand (the user can download their full history but it's not loaded into memory by default)

A periodic job (every few minutes when the app is active) sweeps expired entries.

### 4.3 Cache invalidation

Three signals trigger invalidation:

1. **TTL expiry** — cache entry is older than its TTL. Removed on next sweep or on cache miss.
2. **Explicit refresh** — user clicks "refresh this cell" or "refresh this lens." All related cache entries are invalidated.
3. **Connection state change** — if a connector goes from `healthy` to `expired`, all cache entries for that connector are invalidated.

Cache invalidation is local-only. Two devices may have different cache states; that's fine — neither is wrong.

### 4.4 The audit log shape

Audit log entries follow a typed shape:

```typescript
type AuditLogEntry = 
  | { 
      type: 'mcp_read'
      timestamp: number
      cellId: string
      lensId: string
      connectorId: string
      toolName: string
      paramsHash: string             // not the params themselves, for privacy
      resultSize: number             // bytes
      cacheHit: boolean
      durationMs: number
    }
  | {
      type: 'mcp_write'
      timestamp: number
      cellId: string
      lensId: string
      connectorId: string
      toolName: string
      target: string                 // e.g., recipient email
      summary: string                // user-facing summary
      userConfirmed: boolean
      durationMs: number
    }
  | {
      type: 'agent_call'
      timestamp: number
      cellId: string
      lensId: string
      provider: string
      model: string
      promptHash: string
      inputTokens: number
      outputTokens: number
      cacheHit: boolean
      durationMs: number
      units: number                  // budget units consumed
    }
  | {
      type: 'user_action'
      timestamp: number
      cellId: string | null
      lensId: string | null
      action: string                 // 'lens_created' | 'cell_authored' | 'item_dismissed' | etc.
      details: any
    }
```

The audit log is the basis for the "what did Wovith do?" UI surface and for provenance lineage (covered in the provenance doc).

---

## 5. Runtime state: in-memory only

Already specified in the cell runtime doc. The shape is:

```typescript
type RuntimeState = {
  cells: Map<string, RuntimeCellState>
  observers: Map<string, Set<Subscription>>
  scheduler: SchedulerState
  budget: BudgetState
  network: NetworkState
}

type RuntimeCellState = {
  state: CellState
  value: CellValue | null
  error: CellError | null
  dependencies: Set<string>
  dependents: Set<string>
  lastFreshAt: number
  inFlightPromise: Promise<CellValue> | null
}
```

This state is built from the synced docs (the definitions) and populated from the local cache (cache hits) plus live MCP/agent calls. It is never serialized. On app launch, all of this is reconstructed.

---

## 6. The sync model

### 6.1 The sync server

A Supabase-hosted WebSocket sync server runs the standard `automerge-repo` sync protocol. Each user connects to it from each device.

The server's role is intentionally minimal:

- **Authenticate** the connection (Supabase Auth JWT verifies user identity)
- **Authorize** access to documents the user owns
- **Relay** sync messages between the user's devices
- **Provide ephemeral catch-up** for devices that have been offline

The server stores Automerge changes on its disk *only as a temporary buffer* — to handle the case where Device A goes offline before Device B has fully synced. After all known devices have acknowledged a change, the server can drop it.

In practice, the server keeps a rolling buffer of changes (say, the last 30 days) for safety. This is the only persistent state the cloud holds.

### 6.2 What the server can see

Honestly: by default, more than it should. Automerge changes are not encrypted at rest server-side. The server sees document IDs, change history, and (because Automerge sync is content-addressed) the actual content of changes.

For users who want end-to-end encryption, Wovith provides an opt-in mode:
- Documents are encrypted with a key derived from the user's master password (which the server never sees)
- The server relays opaque blobs
- New devices need to be authorized from an existing trusted device to receive the master key

E2E encryption is a privacy upgrade with usability costs (lost password = lost data; new device requires existing trusted device). It's the default for Trust-tier users; opt-in for Pro; not available on Free (which has no multi-device sync anyway, per the GTM doc — free tier is single-device or sync via export).

This is consistent with the security doc's "tiered privacy posture" section.

### 6.3 Sync conflict resolution

CRDT merge handles concurrent edits without conflicts in the mathematical sense — two devices editing the same field both produce a valid post-merge state.

The semantic question is whether the merge result *makes sense to the user*. For most edits in Wovith, it does:

- Adding cells from two devices → both cells appear
- Editing different cells from two devices → both edits stick
- Editing different fields of the same cell → both edits stick
- Editing the same field of the same cell from two devices → Automerge's last-writer-wins (with deterministic tiebreaking) picks one

The edge case worth attention: editing the same cell's `expression` field on two devices. The CRDT will pick one and discard the other. The losing user's edit is lost.

Mitigation: cell expressions are version-tracked. When the runtime detects a remote `version` jump that's larger than expected (suggesting a concurrent edit), it shows a small banner: *"Your cell on Device X was edited at the same time. The other version was kept; your version is in your captures so you don't lose it."*

This is conservative enough to handle the multi-device-edit case without the user feeling their work disappeared into a void.

### 6.4 Initial sync from scratch

A new device authenticated to an existing user's account fetches:

1. The user profile document (small, fast)
2. The list of canvas/lens/captures/calibration/budget URLs from the profile
3. Each referenced document in priority order (current canvas first, then its lenses, then captures/calibration/budget)

The user sees their primary canvas with most-recently-used lenses loaded within a few seconds. Other lenses load progressively as the user navigates to them.

Local cache is *not* synced — the new device starts with a cold cache and warms it as the user uses it. This is fine because the cache is rebuildable from authoritative sources.

---

## 7. Storage adapters per platform

### 7.1 Native (Capacitor on Android, future iOS)

- **Automerge documents**: `@automerge/automerge-repo-storage-indexeddb` via the WebView's IndexedDB, *plus* an `@capacitor-community/sqlite`-backed adapter as primary storage. The committed answer: **native SQLite** for reliability.
- **Local cache**: SQLite tables (same SQLite database as Automerge, different table namespace)
- **Secure tokens**: `@capacitor-community/secure-storage-plugin`
- **Sync transport**: `@automerge/automerge-repo-network-websocket`

Capacitor's IndexedDB is unreliable on iOS (the OS evicts), and even on Android the persisted-storage API only marks it as "preferred" not "guaranteed." Native SQLite via `@capacitor-community/sqlite` is the reliable storage option. Wovith uses it directly.

The SQLite schema includes:
- `automerge_storage` (key-value, used by the Automerge storage adapter)
- `mcp_cache`, `agent_cache`, `cell_cache`, `audit_log` (the local cache tables)

### 7.2 Web

- **Automerge documents**: `IndexedDBStorageAdapter` via the official `@automerge/automerge-repo-storage-indexeddb`
- **Local cache**: IndexedDB (separate object stores)
- **Secure tokens**: IndexedDB with WebCrypto-derived encryption (no platform secure storage available)
- **Sync transport**: same WebSocket adapter

Web is a degraded experience compared to native because of IndexedDB's volatility. Wovith communicates this — the welcome flow on web shows a small note: *"Your data is stored in this browser. We sync across devices but for the strongest reliability, also install the Android app."*

A future move: WASM-based SQLite (`sqlite-wasm` with OPFS storage) for web would close the reliability gap. Tracked as v2.

### 7.3 Desktop (future)

- **Automerge documents**: `@automerge/automerge-repo-storage-nodefs` for filesystem storage
- **Local cache**: SQLite via `better-sqlite3` or similar
- **Secure tokens**: OS keychain via `keytar` or Electron's safeStorage
- **Sync transport**: same WebSocket

Desktop deferred to v2.

---

## 8. Schema evolution

Schemas evolve. The migration story has to be deliberate because:
- Users have data on their devices already
- Devices may be on different app versions briefly during a rollout
- A migration that's destructive can lose user work

### 8.1 The schema version field

Every Automerge document has a `schemaVersion: number` at its root. Migration code keys off this number.

Rule: never lower the number. Migrations only go forward.

### 8.2 The migration runner

On every app launch, the runtime loads each document, checks its schemaVersion, and runs registered migrations in order if the version is behind the current code's expected version.

```typescript
const migrations: Migration[] = [
  {
    fromVersion: 1,
    toVersion: 2,
    description: 'Add iconHint field to lens',
    docType: 'lens',
    migrate: (doc) => {
      // Automerge changes are applied transactionally
      Automerge.change(doc, (d) => {
        if (!('iconHint' in d)) {
          d.iconHint = null
        }
        d.schemaVersion = 2
      })
    }
  },
  // ...
]
```

The runner applies migrations idempotently. Running v1→v2 twice produces the same result as running it once.

### 8.3 Backward compatibility during rollout

A live app rollout means some users are on v1.5 and some on v1.4 simultaneously. The CRDT layer is robust to this — clients with different code versions can sync because Automerge's data format is backward compatible.

But the *semantics* differ: a v1.5 client might write a new field that a v1.4 client doesn't understand. The v1.4 client will preserve the field on its local copy (Automerge stores unknown fields) but ignore it.

Rule: when adding fields, always make them optional in the type definition and have the runtime tolerate their absence. When *removing* fields, never actually remove from existing documents — just stop writing/reading them. This avoids data loss on older clients.

### 8.4 Renaming and restructuring

Significant restructuring (renaming a field, moving content from one document to another) requires:
1. Code that reads from both old and new locations during a transition window
2. A migration that copies data old → new
3. After the transition window (e.g., 90 days), the read-old code can be removed

This is conservative but bulletproof. Every Wovith user can update Wovith on their own schedule without losing data.

---

## 9. Backup, export, and account portability

### 9.1 Manual backup

A user can export their full state at any time as a `.wovith-backup` file containing:
- All their Automerge documents (binary format)
- Their preferences and metadata
- A version marker
- *Not* their OAuth tokens (those are device-local; restore re-prompts for connector auth)

Restore from backup recreates the full set of documents on a new device.

### 9.2 Account deletion

A user who deletes their account triggers:
1. All Automerge documents removed from the sync server's buffer
2. All sync messages cease
3. Local data on each device is wiped on next launch (after a "you're being deleted" warning if they're online)
4. Audit logs and analytics data are deleted per the privacy policy commitment

The user can request a final backup before deletion.

### 9.3 Lens export (for sharing)

Already covered in the design and workflow doc: a `.wovith-lens` file contains a single LensDoc snapshot with personal data sanitized. Implemented as: serialize the LensDoc, run the sanitization pass (strip `notes`, blanket-clear `calibrationHints`, replace identifiers with placeholders), wrap in a versioned envelope.

The recipient can import. Their own user becomes the author; the lens is treated as a fresh local document.

---

## 10. Privacy specifics

### 10.1 Encryption at rest

- SQLite database is encrypted with SQLCipher when using `@capacitor-community/sqlite`'s encryption support. Key derived from a device-specific identifier + user passphrase (if set).
- IndexedDB on web is *not* encrypted at rest by default. This is a known web platform limitation. The user is informed.
- Secure storage (OAuth tokens) is encrypted via the platform's secure storage API.

### 10.2 Encryption in transit

All sync messages and all MCP/agent traffic go over TLS. The WebSocket sync connection is `wss://`.

### 10.3 Server-side data minimization

The sync server stores:
- Document change buffers (encrypted if user has E2E enabled)
- A user-to-documents mapping for routing

The sync server does *not* store:
- OAuth tokens
- MCP responses or agent responses
- Cached cell values
- Audit logs

### 10.4 Telemetry

Wovith's telemetry collection (separate from the sync layer) follows opt-in defaults:
- Anonymized usage events: opt-in at sign-up
- Crash reports: opt-in at sign-up, with a "send this one" prompt on each crash
- Performance metrics: opt-in
- Full text of any user data: never collected automatically

The telemetry pipeline is a separate Supabase analytics table, not part of the sync server.

---

## 11. Performance considerations

### 11.1 Document size targets

Automerge document size affects sync speed and memory usage:

| Document | Target | Hard limit |
|---|---|---|
| User profile | < 100 KB | 1 MB |
| Canvas | < 50 KB | 500 KB |
| Lens | < 200 KB | 2 MB |
| Captures (per day bucket) | < 500 KB | 5 MB |
| Calibration | < 1 MB | 10 MB |
| Budget | < 200 KB | 2 MB |

If a document approaches its hard limit, the schema has a problem worth refactoring (usually splitting into multiple documents).

### 11.2 Number of documents

A power user might have:
- 1 user profile
- 2 canvases
- 20 lenses
- 1 captures doc
- 1 calibration doc
- 1 budget doc

= ~25 documents. Well within Automerge's comfortable range.

A heavy user with 100 lenses still has only ~105 documents. Fine.

### 11.3 Indexes and queries

Within a document, Automerge doesn't have indexes per se — it's a tree of objects with O(log n) access by path. Most Wovith queries are direct lookups (give me lens X) or iteration (give me all cells in lens X) which are O(n) where n is small.

Across documents, Wovith maintains a separate in-memory index (an inverted map of cell ID → lens URL, for example) for fast lookups. The index is rebuilt on app launch from the documents.

### 11.4 Initial load time

Target: first cell rendered within 1 second of app launch on a warm device (data already locally cached).

This is achieved by:
1. The user profile loads first (it's tiny)
2. The current canvas loads next
3. The primary lens loads in parallel
4. Cells in the primary lens evaluate against cache hits first (cached values appear immediately, marked stale)
5. Background re-evaluation refreshes them

Cold start (new device, syncing from scratch) is bounded by network speed and sync server throughput. Target: under 30 seconds for the user profile + primary canvas + primary lens.

---

## 12. Operational concerns

### 12.1 Sync server scaling

Each user maintains a long-lived WebSocket connection. With 10,000 active users: 10,000 connections. Supabase Realtime can handle this on its standard tier; beyond ~100,000 active concurrent users, dedicated WebSocket infrastructure may be needed.

The sync protocol is stateless from the server's perspective beyond the buffer — server restarts cause clients to reconnect and resume from their last known sync state. No data loss.

### 12.2 Sync server downtime

If the sync server is down:
- Local-first works: each device functions normally with its local Automerge state
- Multi-device sync pauses
- The user sees a small banner: *"Can't reach sync right now. Your local changes are safe."*
- When sync resumes, all queued changes propagate

This is the entire reason for local-first architecture: the cloud being down doesn't break the user.

### 12.3 Disaster recovery

The sync server has automated backups. The Automerge buffer is replicated for durability.

But: the canonical state lives on user devices. Even total loss of the sync server's buffer doesn't lose data — the next time every device comes online, they all already have their state and resume sync from the new (empty) server buffer.

The only data the sync server holds canonically is user-to-document mappings and account metadata (in Supabase tables, with normal backups).

---

## 13. Cross-doc check

The data architecture as specified is consistent with:

- **Cell runtime**: synced docs hold cell definitions; local cache caches MCP/agent responses; runtime state holds in-memory state. The cell runtime reads from synced docs and local cache.
- **Security**: token storage in secure platform stores; document encryption with sqlcipher; sync server data minimization. All match the security doc.
- **Onboarding**: the mining algorithm reads from connected services through the runtime; mined lens proposals create new LensDoc entries. Consistent.
- **Concept**: local-first, CRDT-merge, cloud-as-relay. Matches.
- **Design system**: no overlap.
- **DSL**: cells store their DSL source; runtime parses on use. Matches.
- **Renderer spec**: cells store rendererId; the renderer layer interprets. Matches.
- **Voice and copy**: user-facing messages about sync, conflicts, backup, and account deletion are voice-doc compliant.
- **Connector UX**: connection metadata in profile doc, tokens in secure storage. Matches.
- **GTM**: pricing tiers gate features (E2E for Trust, multi-device for Pro). Matches.

No conflicts identified.

---

## 14. What this document does not cover

- The MCP client implementation (see `wovith_mcp_client.md`)
- The agent client / LLM provider abstraction (see `wovith_agentic_budget.md`)
- Provenance graph (see `wovith_provenance_graph.md`)
- Sync relay API surface in detail (see `wovith_sync_relay.md`)
- Engineering architecture / module layout (see `wovith_engineering_architecture.md`)

---

## References

- Automerge 2 documentation (automerge.org)
- *Modeling Data* in Automerge (automerge.org/docs/cookbook/modeling-data/)
- *Automerge Repo* tutorial series
- PowerSync Capacitor SDK announcement (Nov 2025) — for the SQLite-on-Capacitor pattern
- `@capacitor-community/sqlite` documentation
- *Best Offline-First Tech Stack for 2026* (cssauthor.com)
- MongoDB time-series bucket pattern (for the captures schema)
- ElectricSQL / PowerSync architecture writings
- Convex + Automerge integration patterns (stack.convex.dev/automerge-and-convex)
