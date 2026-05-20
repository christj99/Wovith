# Wovith MCP Client Implementation
### OAuth 2.1, Resource Indicators, transport, token storage

---

## 0. About this document

This document specifies the MCP client implementation: how Wovith authenticates against MCP servers (OAuth 2.1 + PKCE + Resource Indicators per the November 2025 spec), what transport it uses (Streamable HTTP + SSE), how tokens are stored (Capacitor secure storage, scoped per device), and how the client handles capability negotiation, error mapping, async tasks, and incremental scope upgrades.

The MCP spec referenced is **MCP 2025-11-25**, the November 25, 2025 revision (one-year anniversary release). Wovith targets this version as its baseline. Older specs (2025-06-18, 2025-03-26, 2024-11-05) are not supported — the spec moves fast enough that supporting old versions adds significant complexity for marginal compatibility.

The connector UX doc specifies *which* connectors Wovith supports at v1 (Drive, Gmail, Calendar) and what user-facing patterns govern connection. This doc specifies *how* the client actually works underneath.

---

## 1. The big picture

The MCP client is a single TypeScript module in `effects/mcp/`. It exposes a high-level `McpClient` interface to the runtime and handles the protocol details internally.

```
┌──────────────────────────────────────────────────┐
│  Runtime (cells make MCP calls through this)     │
└─────────────┬────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────┐
│  McpClient (the public interface)                │
│  - call(connectorId, toolName, params)           │
│  - oauth flows (connect, upgrade scope)          │
│  - capability discovery                          │
│  - task polling for long ops                     │
│  - health monitoring                             │
└─────────────┬────────────────────────────────────┘
              │
       ┌──────┴──────┐──────────────┐──────────────┐
       │             │              │              │
       ▼             ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────────┐
│Transport │  │  OAuth   │  │Token Storage │  │Connector     │
│(HTTP+SSE)│  │  Flow    │  │(secure store)│  │Registry      │
└──────────┘  └──────────┘  └──────────────┘  └──────────────┘
```

Each block is a discrete module. The transport handles HTTP and SSE; the OAuth flow runs through the system browser; token storage encrypts tokens per-device; the connector registry knows which connectors are known and how to address them.

---

## 2. The public interface

```typescript
// runtime/core/ports.ts — port definition the runtime depends on
export interface McpClient {
  // Tool invocation
  call(
    connectorId: string,
    toolName: string,
    params: any,
    options?: CallOptions
  ): Promise<any>
  
  // Connection management
  listConnectors(): Promise<ConnectorDescriptor[]>
  getConnectionState(connectorId: string): ConnectionState
  connect(connectorId: string, scopeTier: ScopeTier): Promise<ConnectionResult>
  disconnect(connectorId: string): Promise<void>
  upgradeScope(connectorId: string, newTier: ScopeTier): Promise<ConnectionResult>
  
  // Capability discovery
  listTools(connectorId: string): Promise<ToolDescriptor[]>
  describeTool(connectorId: string, toolName: string): Promise<ToolDescriptor>
  
  // Async tasks (long-running operations)
  pollTask(taskHandle: TaskHandle): Promise<TaskResult>
  cancelTask(taskHandle: TaskHandle): Promise<void>
  
  // Health
  isHealthy(connectorId: string): boolean
  onHealthChange(callback: HealthChangeCallback): Unsubscribe
}

type CallOptions = {
  signal?: AbortSignal
  cacheKey?: string
  cacheTtlMs?: number
  longRunning?: boolean        // hint that this may take >30s; use Tasks API
  priority?: 'normal' | 'background'
}

type ScopeTier = 'read-only' | 'read-and-write' | 'full'
```

---

## 3. The transport layer

### 3.1 Streamable HTTP transport

MCP 2025-11-25 standardizes on **Streamable HTTP** as the primary transport for remote servers. The client sends HTTP requests; the server may respond with either:
- A direct JSON response (for fast operations)
- A Server-Sent Events (SSE) stream (for operations that benefit from streaming results or notifications)

Wovith's transport module wraps `fetch` and adds:
- Authorization header injection (using the cached access token)
- Resource Indicator parameter (the canonical URI of the target MCP server, per RFC 8707)
- MCP-Protocol-Version header set to `2025-11-25`
- SSE handling for streamed responses
- Automatic retry on transient errors (429 with Retry-After, 5xx with backoff)
- Connection pooling

```typescript
// effects/mcp/transport-http.ts
export class McpHttpTransport {
  async request(
    serverUrl: string,
    method: string,
    params: any,
    options: TransportOptions
  ): Promise<TransportResult> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${options.accessToken}`,
      'MCP-Protocol-Version': '2025-11-25',
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    }
    
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: ulid(),
      method,
      params: {
        ...params,
        resource: options.canonicalUri,  // RFC 8707 Resource Indicator
      }
    })
    
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers,
      body,
      signal: options.signal,
    })
    
    if (response.status === 401) {
      throw new McpAuthError(response.headers.get('WWW-Authenticate'))
    }
    if (response.status === 403) {
      throw new McpScopeError(response.headers.get('WWW-Authenticate'))
    }
    if (response.status === 429) {
      throw new McpRateLimitError(parseInt(response.headers.get('Retry-After') || '60'))
    }
    
    const contentType = response.headers.get('Content-Type') || ''
    if (contentType.includes('text/event-stream')) {
      return this.handleSSE(response, options)
    }
    return await response.json()
  }
  
  private async handleSSE(response: Response, options: TransportOptions) {
    // Parse SSE stream; events include 'data', 'task-update', 'partial-result'
    // ... 
  }
}
```

### 3.2 Capacitor-specific concerns

Capacitor's WebView runs the JavaScript fetch implementation, which is the same as in browsers. So `fetch` works identically on web and on Android.

Two Android-specific concerns:

**Network security configuration**: Capacitor 8 requires an explicit `network_security_config.xml` for production builds. Wovith's allows TLS-only outbound connections to specific MCP server domains.

**HTTP cleartext (development only)**: development against a local synthetic MCP server uses `cleartextTrafficPermitted` for `localhost` only — production builds disable this entirely.

### 3.3 Streaming results

When an MCP server returns an SSE stream, individual SSE events may include:
- `data:` — actual response chunks (for streaming tool results)
- `task-update:` — task state changes (for long-running tasks)
- `partial-result:` — intermediate results before completion
- `notification:` — server-initiated notifications

The transport surfaces these as an async iterator the cell evaluator can consume:

```typescript
for await (const chunk of transport.streamRequest(...)) {
  if (chunk.type === 'partial-result') {
    // Render partial state in the cell
  } else if (chunk.type === 'data') {
    finalResult = chunk.value
  }
}
```

This is what makes cells feel responsive on slow operations — partial results show up immediately, not just at the end.

---

## 4. OAuth 2.1 flow

### 4.1 The mandatory features

Per MCP 2025-11-25, the client **must** implement:

- **OAuth 2.1** as the authorization framework
- **PKCE** with S256 code challenge method (mandatory, no exception)
- **Resource Indicators (RFC 8707)** — the `resource` parameter in both authorization and token requests, set to the canonical URI of the MCP server
- **Authorization Server Metadata (RFC 8414)** — discovery via `.well-known/oauth-authorization-server` or `.well-known/oauth-protected-resource`
- **Protected Resource Metadata (RFC 9728)** — for MCP servers to advertise their authorization server
- **Step-Up Authorization** — when a tool requires higher scopes than currently granted, return WWW-Authenticate with `insufficient_scope` and the required scopes

The client **should** support:
- **Client ID Metadata Documents (CIMD)** — a URL pointing to a JSON metadata document that describes the client, used as an alternative to per-server registration
- **OpenID Connect Discovery 1.0** — for authorization servers that support it
- **Dynamic Client Registration (RFC 7591)** — for backward compatibility, but deprioritized in favor of CIMD

### 4.2 The connection flow

```
1. User taps "Connect" on a connector card
2. Client fetches the MCP server's protected resource metadata
   - GET https://drivemcp.googleapis.com/.well-known/oauth-protected-resource
   - Response includes: authorization_servers[], scopes_supported, resource
3. Client fetches the authorization server's metadata
   - GET <auth_server>/.well-known/oauth-authorization-server
   - Response includes: authorization_endpoint, token_endpoint, scopes_supported
4. Client generates PKCE verifier and challenge (S256)
5. Client opens the system browser to the authorization endpoint with:
   - response_type=code
   - client_id (from CIMD URL or pre-registered)
   - redirect_uri=app.wovith://oauth-callback
   - code_challenge, code_challenge_method=S256
   - resource=<canonical URI of MCP server>
   - scope=<requested scopes based on user's selected tier>
   - state=<random nonce, also stored locally>
6. User authenticates in browser, grants consent
7. Browser redirects to app.wovith://oauth-callback?code=...&state=...
8. Capacitor's appUrlOpen listener catches the deep link
9. Client verifies state matches the stored nonce
10. Client exchanges code for tokens at token endpoint:
    - grant_type=authorization_code
    - code, code_verifier (the PKCE verifier)
    - resource=<canonical URI>
    - redirect_uri
11. Response includes access_token, refresh_token, expires_in, scope
12. Client stores tokens in secure storage, updates connection metadata
13. Connection card now shows "Connected"
```

### 4.3 Token storage

Tokens **never** leave the device. They live in platform-specific secure storage:

- **Android**: `@capacitor-community/secure-storage-plugin` → Android Keystore
- **iOS** (future): same plugin → iOS Keychain
- **Web**: IndexedDB with a WebCrypto-derived key (acknowledged as weaker)
- **Desktop** (future): OS keychain via Electron's safeStorage or `keytar`

The token storage interface:

```typescript
export interface TokenStorage {
  store(connectionId: string, tokens: TokenSet): Promise<void>
  retrieve(connectionId: string): Promise<TokenSet | null>
  delete(connectionId: string): Promise<void>
  list(): Promise<string[]>  // connection IDs only, not the tokens themselves
}

export type TokenSet = {
  accessToken: string
  refreshToken: string | null
  expiresAt: number              // unix ms
  scope: string[]                // granted scopes
  tokenType: 'Bearer'
  // The canonical URI this token is bound to
  resource: string
}
```

Stored under a key that combines `userId + connectionId`. A user with multiple accounts on the same connector (two Gmail accounts) gets two storage entries.

### 4.4 Token refresh

Access tokens expire (commonly 1 hour). The client tracks expiry and refreshes proactively:

- 5 minutes before expiry: trigger background refresh
- On 401 response: trigger refresh + retry the original request once

Refresh uses the refresh token at the token endpoint:

```
POST <token_endpoint>
grant_type=refresh_token
refresh_token=<stored>
resource=<canonical URI>
```

If refresh fails (refresh token revoked, expired), the connection transitions to `expired` state and the user sees the reconnection UI.

### 4.5 Step-up authorization

A user with `read-only` scope tries to use a cell that requires `read-and-write`. The MCP server returns 403 with:

```
WWW-Authenticate: Bearer error="insufficient_scope",
                  scope="https://www.googleapis.com/auth/gmail.compose"
```

The client:
1. Catches the `insufficient_scope` error
2. Surfaces it to the runtime as `kind: 'connection_not_granted'`
3. The renderer shows the cell in `failed` state with a "Upgrade connection" affordance
4. User taps to upgrade
5. Client runs a fresh OAuth flow with the expanded scope set (existing scopes + the new requested scope)
6. After successful upgrade, the cell retries

This is the *step-up authorization flow* formalized in MCP 2025-11-25. The user controls scope expansion explicitly; cells can't silently escalate.

---

## 5. Connector registry

The client maintains a registry of known connectors. Each entry includes:

```typescript
type ConnectorDescriptor = {
  id: string                      // 'google-drive', 'gmail', 'google-calendar'
  displayName: string
  
  // Canonical URI for Resource Indicators
  canonicalUri: string            // 'https://drivemcp.googleapis.com/mcp/v1'
  
  // OAuth configuration
  clientId: string                // Wovith's registered client ID (or CIMD URL)
  clientIdMetadataUrl?: string    // CIMD alternative
  authorizationServer: string     // discovered or pre-configured
  
  // Scope tier definitions
  scopeTiers: {
    'read-only': string[]         // OAuth scopes for read-only access
    'read-and-write': string[]
    'full': string[]
  }
  
  // UI metadata (matches connector UX doc)
  iconUrl?: string
  description: string
  preOAuthDisclosure: string      // user-facing text
}
```

The registry is populated from two sources:

**Built-in connectors**: Drive, Gmail, Calendar at v1. Hardcoded in `effects/mcp/connectors/`. Each has its own file with the specific configuration.

**MCP registry connectors (v2)**: discoverable from the public MCP registry (`registry.modelcontextprotocol.io`). When a user wants to connect a non-built-in connector, the client queries the registry, downloads the metadata, and registers it locally.

### 5.1 Drive connector

```typescript
// effects/mcp/connectors/drive.ts
export const driveConnector: ConnectorDescriptor = {
  id: 'google-drive',
  displayName: 'Google Drive',
  canonicalUri: 'https://drivemcp.googleapis.com/mcp/v1',
  clientId: process.env.WOVITH_GOOGLE_OAUTH_CLIENT_ID!,
  authorizationServer: 'https://accounts.google.com',
  scopeTiers: {
    'read-only': [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
    ],
    'read-and-write': [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
      'https://www.googleapis.com/auth/drive.file',
    ],
    'full': [
      'https://www.googleapis.com/auth/drive',
    ],
  },
  description: 'Read files from your Drive...',
  preOAuthDisclosure: 'Connecting Drive will let me read files you\'ve created or have access to. I\'ll never create or modify files unless you specifically upgrade this connection.',
}
```

### 5.2 Gmail connector

Same shape with Gmail-specific scopes:

```typescript
scopeTiers: {
  'read-only': [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.metadata',
  ],
  'read-and-write': [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.metadata',
    'https://www.googleapis.com/auth/gmail.compose',
  ],
  'full': [
    'https://www.googleapis.com/auth/gmail.modify',
  ],
  // 'full-with-delete' is a separate tier not exposed by default
}
```

### 5.3 Calendar connector

```typescript
scopeTiers: {
  'read-only': ['https://www.googleapis.com/auth/calendar.readonly'],
  'read-and-write': [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
  ],
  'full': ['https://www.googleapis.com/auth/calendar'],
}
```

---

## 6. Tool invocation

A cell calls `mcp.call('gmail', 'list-threads', { query: '...' })`. The client:

1. Resolves the connector descriptor by ID
2. Retrieves the cached tokens for this connection (refreshing if near expiry)
3. Constructs the JSON-RPC request with the tool name and params
4. Adds the Resource Indicator (`resource`) to params
5. Sends through the transport
6. Handles the response (direct JSON, SSE stream, or Task handle)
7. Returns the result

### 6.1 Capability discovery

On first connection (or periodically), the client calls `tools/list` on the MCP server to enumerate available tools:

```
POST https://gmailmcp.googleapis.com/mcp/v1
{
  "jsonrpc": "2.0",
  "id": "...",
  "method": "tools/list",
  "params": {}
}
```

Response includes tool names, descriptions, and JSON schemas for parameters. The client caches this and exposes it to the runtime so cells can auto-complete tool names in the DSL editor.

### 6.2 Tool execution errors vs protocol errors

MCP 2025-11-25 distinguishes:

- **Tool Execution Errors**: the tool ran but returned an error result (e.g., "no such file"). The client returns the error result to the caller as data, and the cell handles it semantically.
- **Protocol Errors**: the MCP layer itself failed (auth, transport, malformed response). These throw exceptions.

The client correctly classifies and routes. Validation errors are tool execution errors (so an LLM agent can self-correct on retry without re-doing the auth dance).

### 6.3 Async Tasks

For long-running operations (background mining might invoke a tool that takes 60+ seconds to scan a year of email), MCP 2025-11-25 introduces the Tasks primitive. The client supports it:

```typescript
// Make a call that hints it may be long-running
const result = await mcp.call('gmail', 'deep-mine-history', params, {
  longRunning: true,  // signals to use Tasks API
})

// If the server returns a task handle instead of a direct result:
if (result.taskHandle) {
  // Poll periodically
  while (true) {
    const taskState = await mcp.pollTask(result.taskHandle)
    if (taskState.status === 'completed') return taskState.result
    if (taskState.status === 'failed') throw new McpTaskError(taskState.error)
    if (taskState.status === 'cancelled') throw new McpTaskCancelled()
    await delay(taskState.pollAfterMs ?? 2000)
  }
}
```

Tasks can move through states: `working`, `input_required`, `completed`, `failed`, `cancelled`. The `input_required` state is interesting — a task that needs user input mid-flight surfaces a prompt back to Wovith, which routes it through the Intent Preview flow.

---

## 7. Health monitoring

The client tracks each connection's health. Health states:

- **`healthy`**: recent calls succeeded
- **`degraded`**: at least one of the last 10 calls failed with a transient error
- **`expired`**: token refresh failed (refresh token expired or revoked)
- **`revoked`**: provider returned a clear revocation signal
- **`scoped-out`**: cells require scopes the user hasn't granted

Health changes propagate as events:

```typescript
mcp.onHealthChange((connectorId, oldHealth, newHealth) => {
  // The runtime updates affected cells
  // The UI updates the connection card
})
```

Health checks are passive (driven by actual call results), not active (no synthetic ping calls). This avoids burning quota on health-check traffic, and the worst case is a stale health indicator that updates on the next real call.

### 7.1 Outage handling

When a connector is unreachable (network failure, server outage), the client:

1. Marks affected calls as `failed` with `kind: 'mcp_timeout'`
2. Sets the connection to `degraded`
3. Backs off exponentially on subsequent calls (1s, 2s, 4s, 8s, max 60s)
4. On the first successful call, returns to `healthy`

The runtime's cell error UI surfaces this clearly: *"Can't reach Gmail right now. I'll retry in a minute."* (voice-doc compliant phrasing).

---

## 8. Specific edge cases and quirks

### 8.1 The Drive-named OAuth client issue

The connector UX doc references the known issue where Google's Gmail MCP integration routes through a Drive-named OAuth client. The MCP client's pre-OAuth disclosure copy warns the user, and the OAuth flow proceeds correctly regardless (the scopes granted are what matter, not the client's display name on Google's screen).

### 8.2 Multiple accounts per connector

A user with personal Gmail + work Gmail has two connections. Each has its own:
- Connection ID (ULID-generated)
- Tokens (separately stored)
- Display name ("Personal Gmail", "Work Gmail")
- Account identifier (email address)

Cells reference the connection by ID, not by connector type. A cell that says `from gmail.threads` defaults to the user's primary Gmail; explicit account selection is `from gmail.threads on "work"`.

### 8.3 Workspace policy restrictions

A Workspace-managed Google account may have admin-imposed restrictions (e.g., no third-party access to Gmail). The OAuth flow fails with an admin-policy error. The client surfaces this with a specific error UI: *"Your Workspace admin restricts third-party Gmail access. Talk to your admin or use a personal account."*

### 8.4 Token-binding to canonical URI

A token granted for `https://drivemcp.googleapis.com/mcp/v1` is bound to that resource by RFC 8707. The client never sends it to any other URL. This is enforced at the transport layer — the token storage records the bound resource, and the transport refuses to attach a token to a request for a different resource.

This prevents the entire class of token-misuse attacks the November 2025 spec was designed to defend against.

### 8.5 OAuth state and PKCE persistence

The PKCE verifier and state nonce are generated per-flow and stored in memory only. If the user cancels the OAuth flow (closes the browser without authorizing), the verifier is discarded. If the flow is interrupted (app crashes during OAuth), the next launch detects the dangling state and prompts to retry from scratch.

### 8.6 Tool name normalization

MCP 2025-11-25 standardizes tool naming (SEP-986). Wovith's client normalizes tool names to lowercase-with-hyphens internally regardless of how the server presents them. This avoids the casing inconsistencies that broke interop across earlier SDK implementations.

---

## 9. Performance characteristics

| Operation | Target | Notes |
|---|---|---|
| Token retrieval (warm cache) | < 1ms | in-memory cache of decrypted tokens |
| Token retrieval (cold) | < 20ms | secure storage call + decrypt |
| Token refresh | < 500ms | network roundtrip dominates |
| First call after connection | < 2s | excluding network |
| Capability discovery | < 1s | one tools/list call |
| Steady-state call dispatch | < 10ms | excluding actual network time |

The transport layer has a connection pool to avoid TLS handshake overhead on every call. Recent connections to `drivemcp.googleapis.com` reuse the same HTTP/2 connection.

---

## 10. Testing

The MCP client is tested in three modes:

### 10.1 Unit tests

Pure-logic modules (PKCE generation, state nonce verification, scope tier mapping) have unit tests.

### 10.2 Integration tests with synthetic MCP server

`tools/synthetic-mcp-server/` runs a real MCP server that serves canned responses. Integration tests:
- Verify OAuth flow happy path
- Verify token refresh
- Verify scope upgrade (step-up authorization)
- Verify error mapping for 401, 403, 429, 5xx
- Verify Task polling
- Verify SSE handling

### 10.3 Live smoke tests

Manual smoke tests against real Drive, Gmail, Calendar MCP servers, using a dedicated test Google account. Run before each release.

---

## 11. Cross-doc consistency

Consistent with:
- **Connector UX**: scope tiers, pre-OAuth disclosures, connection cards. Same shape.
- **Security**: OAuth 2.1+PKCE, Resource Indicators, token storage in secure platform stores. Same posture.
- **Cell runtime**: the MCP client implements the `McpClient` port the runtime depends on.
- **Engineering architecture**: lives in `effects/mcp/`. Token storage in `effects/storage/tokens-secure.ts`.
- **Data architecture**: connection metadata in profile doc; tokens in secure storage (not Automerge).

No conflicts.

---

## References

- MCP Specification 2025-11-25 (modelcontextprotocol.io)
- MCP Authorization Specification (2025-11-25 revision)
- RFC 8707 — Resource Indicators for OAuth 2.0
- RFC 9728 — OAuth 2.0 Protected Resource Metadata
- RFC 8414 — OAuth 2.0 Authorization Server Metadata
- RFC 7591 — OAuth 2.0 Dynamic Client Registration
- OAuth 2.1 Internet-Draft (IETF)
- Aaron Parecki, *Client Registration and Enterprise Management in the November 2025 MCP Authorization Spec* (Nov 25, 2025)
- Den Delimarsky, *What's New In The 2025-11-25 MCP Authorization Spec* (Nov 2025)
- WorkOS, *MCP 2025-11-25 is here: async Tasks, better OAuth, extensions* (Nov 2025)
- Google Workspace MCP documentation
