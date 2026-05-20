# 04 — Architecture Contract

**Status:** Canonical  
**Purpose:** define architecture boundaries that let Wovith start small without blocking later ambition.

## 1. Architecture summary

Wovith should be built as a small local-first runtime with clear ports:

```txt
User UI
  ↓
Lens / Cell app layer
  ↓
DSL parser + AST analyzer + runtime scheduler
  ↓
Source adapters + agent adapters + storage adapters
  ↓
External systems / local stores / model providers
```

The core runtime should be deterministic and usable without a model. AI is layered on top for authoring/enrichment, not required for evaluation of ordinary cells.

## 2. Four data categories

The original docs sometimes blur data categories. The implementation must keep them separate.

### 2.1 Lens and cell definitions

User-owned configuration:

- lens name and layout;
- cell AST/DSL;
- renderer config;
- refresh settings;
- calibration signals;
- captures;
- preferences.

These are the best fit for local-first storage and sync.

### 2.2 Source data

External data from Gmail, Calendar, Drive, Slack, files, etc.

Wovith does not own this by default. Wovith reads it through connectors and caches only what the user has permitted.

### 2.3 Evaluation results

Computed outputs of cells. These may be cached, discarded, or snapshotted depending on stage and privacy mode.

### 2.4 Provenance evidence

Lightweight records explaining why a result appeared. Evidence is not necessarily the full source record.

The default should be evidence snapshots, not full data archives.

## 3. Local-first boundary

Wovith can truthfully be local-first for:

- lens definitions;
- cell definitions;
- layout;
- calibration;
- captures;
- local caches;
- local audit log.

Wovith cannot truthfully claim local-first ownership of:

- all Gmail content;
- all Drive files;
- all Calendar events;
- external app state;
- third-party audit trails;
- full historical source values.

Unless explicit snapshots are enabled, Wovith should say:

> “Your lenses are local-first. External source data remains in the connected service. Wovith stores only the local cache/evidence needed for the features you enable.”

## 4. Storage model by stage

| Stage | Lens definitions | Source cache | Evidence | Sync | Notes |
|---:|---|---|---|---|---|
| 0 | Local store | Synthetic only | Local | None | Plain IndexedDB/localStorage OK if replaceable. |
| 0.5 | Local store / Automerge | Real read-only connector cache | Evidence tier | None | Tokens are device-local. |
| 1 | Automerge preferred | Local cache | Evidence tier | None or experimental | Do not overpromise multi-device. |
| 1.5 | Automerge | Local per-device cache | Evidence + optional summaries | Plain sync or E2E if built | Clear privacy modes. |
| 2+ | Automerge | Managed cache controls | User-selectable tiers | Sync | Add storage budgets. |

## 5. Sync modes

### 5.1 Local-only

- No sync server.
- Lens definitions stay on one device/browser profile.
- Best default for Stage 0–1 if sync is not ready.

### 5.2 Plain sync

- Sync server relays/stores Automerge changes.
- Server may see lens definitions unless encrypted before relay.
- Must not be marketed as E2E.

### 5.3 E2E sync

- Server relays encrypted changes.
- Requires key generation, device enrollment, recovery story, lost-key UX, and tests.
- Earliest recommended stage: Stage 3.

## 6. Token storage

OAuth tokens must not live in synced lens documents. Store tokens using platform-appropriate secure storage:

- web: consider backend OAuth session/proxy or secure browser pattern; avoid long-lived tokens in plain local storage;
- mobile: platform secure storage/keychain equivalents;
- desktop: OS credential store.

Each device may need its own authorization. Syncing lens definitions does not imply every device can evaluate every cell until the connector is authorized on that device or a secure server-side connector model exists.

## 7. Core ports

### 7.1 SourceAdapter

```ts
interface SourceAdapter {
  readonly id: string;
  getSchema(): Promise<SourceSchema>;
  getHealth(): Promise<ConnectionHealth>;
  query(request: SourceQuery, context: SourceQueryContext): Promise<SourceQueryResult>;
}
```

### 7.2 StorageAdapter

```ts
interface LensStore {
  loadLens(id: LensId): Promise<LensDoc | null>;
  saveLens(doc: LensDoc): Promise<void>;
  subscribe(id: LensId, cb: (doc: LensDoc) => void): () => void;
}
```

### 7.3 AgentAdapter

```ts
interface AgentAdapter {
  compileIntentToAst(request: NlCompileRequest): Promise<NlCompileResult>;
  enrichRecord(request: AgentEnrichmentRequest): Promise<AgentEnrichmentResult>;
}
```

Stage 0 should mock or omit AgentAdapter.

### 7.4 ProvenanceRecorder

```ts
interface ProvenanceRecorder {
  beginEvaluation(cellId: CellId, lensId: LensId): EvaluationTrace;
  recordSourceRead(trace: EvaluationTrace, read: SourceReadEvidence): void;
  recordTransform(trace: EvaluationTrace, transform: TransformEvidence): void;
  finish(trace: EvaluationTrace, result: CellValue): CellEvaluationSnapshot;
}
```

### 7.5 ActionGate

```ts
interface ActionGate {
  propose(manifest: ActionManifest): Promise<ActionDecision>;
}
```

ActionGate should exist as a type before writes are available.

## 8. Source schema registry

Every source must expose a schema before cells can query it.

A schema includes:

- source ID;
- display name;
- available fields;
- field types;
- supported operators;
- pushdown capabilities;
- required connector permissions;
- whether fields are sensitive;
- whether fields are metadata or content.

This prevents NL/DSL from hallucinating fields and lets Wovith show cell permissions.

## 9. Query planning

The evaluator should split a cell into:

1. source selection;
2. pushdown filters/sorts/limits where the source supports them;
3. in-memory transforms;
4. optional enrichment;
5. renderer dispatch.

The runtime should preserve evidence for both pushdown and in-memory transforms. Otherwise “Why am I seeing this?” becomes unreliable.

## 10. Runtime principles

- Evaluation is cancellable.
- Evaluation is idempotent unless explicitly an action.
- Reads and writes are separate code paths.
- Cached results must be labeled as cached/stale/fresh.
- Every connector call is auditable.
- Every agent call is budgeted and auditable.
- Runtime should support synthetic source permanently for testing.

## 11. MCP integration approach

MCP is valuable, but Wovith should not hard-depend on preview or unstable MCP servers for the first real product.

Recommended design:

- Use a connector adapter abstraction.
- Implement synthetic adapter first.
- Implement direct Google API adapter or official MCP adapter depending on stability.
- Keep MCP client behind the same source/action ports.
- Do not expose arbitrary MCP servers to users until Stage 4.

## 12. Privacy modes

Product copy must distinguish:

| Mode | What sync server can see | When available |
|---|---|---|
| Local-only | Nothing, because there is no sync | Stage 0+ |
| Plain sync | Lens definitions unless encrypted before upload | Stage 1.5 if implemented |
| E2E sync | Encrypted lens changes, metadata leakage possible | Stage 3 if implemented |

Do not describe plain sync as end-to-end private.

## 13. Platform stack guidance

Starting stack:

- TypeScript strict mode.
- React web app.
- Vite or equivalent lightweight builder.
- Vitest for unit tests.
- Playwright for e2e once UI exists.
- Automerge when local-first sync becomes concrete.
- Capacitor only when mobile stage begins.

Current Capacitor 8 docs list modern toolchain requirements including Node 22+, Xcode 26.0+, Android Studio 2025.2.1+, and Android SDK settings such as minSdkVersion 24 and compile/target SDK 36. Do not scaffold mobile until these requirements are accepted by the project.

## 14. Performance targets

Stage 0:

- 1k records: evaluate under 250 ms for simple filters.
- 10k records: evaluate under 1 s for simple filters in local synthetic tests.
- UI interaction remains responsive.

Stage 1:

- User-perceived first useful lens within onboarding should be fast enough to feel interactive, but do not hard-code a 5-minute promise until real OAuth and connector latency are measured.
- Background refresh should not cause uncontrolled model or connector spend.

## 15. Architecture risks

### 15.1 Overcoupling DSL to renderer

Renderer config should be part of canonical cell definition, but evaluation should not depend on UI components.

### 15.2 Letting AI own semantics

Models can propose AST. Code validates semantics.

### 15.3 Treating provenance as logs only

Logs are useful, but “Why?” requires structured evidence.

### 15.4 Syncing tokens or sensitive source data

Never sync OAuth tokens in lens docs. Avoid syncing source data unless a privacy mode explicitly allows it.

### 15.5 Building MCP too early

MCP should be a connector implementation strategy, not the core product identity.

## 16. Research cross-references

- Local-first and Automerge: R-LOCAL-01, R-LOCAL-02, R-LOCAL-03.
- MCP: R-MCP-01 through R-MCP-05.
- OAuth/browser security: R-OAUTH-01, R-OAUTH-02.
- Capacitor requirements: R-MOBILE-01, R-MOBILE-02.
- Storage: R-STORAGE-01, R-STORAGE-02.
