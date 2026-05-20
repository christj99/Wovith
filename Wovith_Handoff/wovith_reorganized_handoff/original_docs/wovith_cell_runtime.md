# Wovith Cell Runtime
### How a cell actually executes

---

## 0. About this document

This document specifies the cell runtime — the engine that takes DSL expressions, evaluates them against connected data, manages reactivity, surfaces results through renderers, and tracks provenance. The runtime is the heart of Wovith: the user's experience of cells "feeling alive" comes from this layer behaving correctly under the full matrix of conditions (online/offline, fresh/stale, isolated/dependent, cheap/expensive to recompute).

The runtime is *not* React. React is the renderer layer that subscribes to the runtime. Decoupling matters because: (a) tests can run the runtime headlessly without a DOM, (b) the runtime can be swapped to a different UI framework without rewriting evaluation logic, (c) lens-as-prompt-export needs to serialize cell state independently of UI state, (d) the runtime can later move into a worker thread for performance.

The design draws on three lineages: spreadsheet evaluation (topological sort, dirty marking), Adapton-style demand-driven incremental computation, and modern signals (TC39 proposal, Solid, Preact). Wovith's cells share the structural properties of spreadsheet cells but with two complications: (1) some cells take seconds or minutes to evaluate because they hit MCP servers, (2) some cells return non-deterministic results because they invoke LLMs.

---

## 1. The big picture

A cell is a node in a reactive computation graph. Edges in the graph are *dependencies* — cell B depends on cell A if B reads from A's output. The runtime evaluates cells in topological order, recomputing only what has changed and what is being observed.

The lifecycle of a cell is six states:

```
        ┌─────────┐
        │  idle   │  ← cell exists but hasn't been observed
        └────┬────┘
             │ user opens the lens containing this cell
             ▼
        ┌─────────┐
        │ fetching│  ← runtime is querying the cell's sources
        └────┬────┘
             │ data arrives
             ▼
        ┌─────────┐     time passes / data changes
        │  fresh  │ ─────────────────────────┐
        └────┬────┘                          ▼
             │                          ┌─────────┐
             │ explicit refresh         │  stale  │
             ▼                          └────┬────┘
        ┌──────────┐                         │
        │ recomputing│ ◄───────────────────┘
        └─────┬─────┘
              │ error during recompute
              ▼
         ┌───────┐
         │failed │  ← user sees an error state, can retry
         └───────┘
```

The seventh state is *waiting* — when a cell's evaluation is blocked on user confirmation (an agent proposing an action through Intent Preview). Waiting is a hold pattern, not a terminal state.

**Logical states vs visual states.** The runtime tracks 7 logical states (above). The renderer spec and design system define 9 *visual* freshness states (Fresh, Steady, Stale, Recomputing, Working, Stuck, Failed, Suspended, Stub) because the visual layer encodes additional signals — how long a cell has been fresh (Fresh → Steady), whether a long evaluation is using an agent (Recomputing → Working), whether it's taking longer than expected (Working → Stuck), and whether a cell has ever evaluated (idle → Stub vs idle → Suspended). The mapping:

| Runtime state | Visual state(s) | Disambiguating signal |
|---|---|---|
| idle (never evaluated) | Stub | first observation pending |
| idle (paused by user/system) | Suspended | pause set |
| fetching | Recomputing → Working → Stuck | elapsed time + has agent call |
| fresh (recent) | Fresh | within first ~30s of computation |
| fresh (settled) | Steady | beyond ~30s |
| stale | Stale | — |
| recomputing | Recomputing → Working → Stuck | elapsed time + has agent call |
| failed | Failed | — |
| waiting | (Intent Preview modal renders instead of visual indicator) | — |

The runtime exposes the logical state and the disambiguating signals; the renderer combines them into the visual treatment.

Each state has a visual signature in the renderer (specified in the design system doc). The state itself is property of the runtime.

---

## 2. The cell data structure

A cell, at runtime, is an object with the following shape:

```typescript
type Cell = {
  // Identity
  id: string                    // ULID, stable across sessions
  lensId: string                // which lens owns this cell

  // Definition (from the Automerge doc)
  expression: DSLExpression     // the parsed DSL AST
  rendererId: string            // which renderer displays this cell
  
  // Runtime state
  state: CellState              // idle | fetching | fresh | stale | recomputing | failed | waiting
  value: CellValue | null       // last successful result
  error: CellError | null       // last error if state === 'failed'
  
  // Reactivity tracking
  dependencies: Set<string>     // cell IDs this cell reads from (auto-computed at eval time)
  dependents: Set<string>       // cell IDs that read from this cell (auto-computed inverse)
  observed: boolean             // is this cell currently being rendered?
  
  // Freshness
  lastFreshAt: Timestamp        // when did the value last become fresh
  staleAt: Timestamp | null     // when (if ever) will this cell become stale automatically
  ttl: number | null            // milliseconds; null means "manual refresh only"
  
  // Provenance
  provenance: ProvenanceRecord  // see provenance doc
  
  // Performance
  evaluationCount: number       // bumped each time eval runs
  lastEvalMs: number           // duration of last successful eval
  
  // Agent budget
  agentCallsThisRun: number    // how many LLM calls in current/last evaluation
}
```

The cell's *definition* (expression, renderer, freshness policy) is persisted in the Automerge document. The cell's *runtime state* is held in memory; it can be reconstructed by re-evaluating, so it doesn't need to be persisted.

This split matters: durable state (the lens definition) syncs across devices; ephemeral state (the value, the dependency graph) is rebuilt fresh on each device. A user opening Wovith on a second device sees the same lens definitions and immediately re-evaluates cells against their local view of the world.

---

## 3. The reactive algorithm

Wovith uses a hybrid push-pull algorithm derived from Adapton and the Incremental library at Jane Street, combined with the topological-sort approach used in spreadsheet engines.

### 3.1 The two-phase model

Reactivity has two distinct concerns: **invalidation** (figuring out which cells are stale) and **recomputation** (actually re-evaluating them).

In a pure push model, every change pushes downstream — invalidation and recomputation happen together. This works for small graphs but produces wasted computation when many cells are dirty but only a few are observed.

In a pure pull model, computation happens lazily — only when something is read. This avoids waste but makes "tell me when something changes" hard.

Wovith uses push-then-pull:

1. **Push phase (invalidation):** when a cell's source data changes, the runtime walks downstream marking every transitively-dependent cell as *stale*. This walk is cheap — it doesn't run the cell expressions, it just flips state.

2. **Pull phase (recomputation):** when the user observes a cell (the lens containing it is on screen), the runtime walks upstream to find any stale dependencies and evaluates them in topological order. Cells that are stale but not observed (nor needed by an observed cell) are *not* recomputed.

This is the same algorithm Solid uses, the same algorithm Adapton describes, and the same algorithm now codified in the TC39 Signals proposal.

### 3.2 Why this matters for Wovith specifically

Wovith cells are heterogeneous in cost. A "current time" cell evaluates in microseconds. A "recent emails" cell evaluates in milliseconds to seconds (one MCP call). An "agent-drafted replies" cell evaluates in seconds to tens of seconds (LLM calls). A "blind-spot lens" cell evaluates in even longer (deep mining).

Push-then-pull means:
- Cheap cells can evaluate eagerly (millisecond cost; might as well precompute)
- Expensive cells evaluate only when observed
- The user's experience of "this cell is up to date" matches what they're actually looking at, not what's globally maximal

### 3.3 Glitch avoidance

A *glitch* is when a cell briefly displays a value computed from inconsistent dependencies. Classic example: cells A and B both depend on cell X. Cell C depends on both A and B. When X changes, naive propagation might recompute A first, then C (using new A but old B), then B — C briefly displays a bad value.

Wovith avoids this with topological evaluation: when any cells are stale and being pulled, the runtime computes the full set of stale-and-observed cells, topologically sorts them, and evaluates in order. Within a single pull cycle, no cell evaluates until all of its dependencies have evaluated.

### 3.4 Asynchronous evaluation

Cells often involve async work (MCP calls, LLM calls). The runtime represents this with promises — evaluation returns `Promise<CellValue>`. During evaluation, the cell is in the `recomputing` state. Other cells that depend on this one wait on the promise.

The runtime imposes a per-cell timeout (default 30 seconds for non-agentic cells, 120 seconds for agentic ones). If a cell times out, it transitions to `failed` and dependents see the previous value (with a "last fresh N ago" marker) until the failure is resolved.

### 3.5 The observation set

The runtime maintains an *observed set* — cells that are currently being rendered on screen. Observation is tracked through a counter (each subscription bumps it up; unsubscription bumps down), so multiple renderers can observe the same cell without confusion.

When a cell joins the observed set:
1. If it's `fresh`, the value is delivered immediately.
2. If it's `stale`, it enters `recomputing` and pulls its dependencies.
3. If it's `idle` (never evaluated), it enters `fetching` and pulls its dependencies.
4. If it's `failed`, the user sees the error UI with a retry affordance.

When a cell leaves the observed set:
- Its value is retained for `valueRetentionMs` (default 5 minutes) in case the user navigates back.
- After retention, the value is discarded to free memory. The cell goes back to `idle`. Dependency edges are preserved.

---

## 4. Expression evaluation

The DSL expression in a cell evaluates to a `CellValue` — a typed result that the renderer interprets. Evaluation walks the expression AST in standard tree-interpreter style.

### 4.1 Expression types and their evaluation

The DSL doc specifies the grammar in detail; this section addresses what the runtime *does* with each construct.

**Source clauses** (`from drive.files`, `from gmail.threads`, `from calendar.events`, `from web.feed`, etc.):
- The runtime resolves the source identifier against the connected-services registry
- A "query plan" is constructed — the MCP call(s) that will fetch the underlying data
- Caching consults a cache key derived from the full expression hash; cached results are returned if fresh enough
- On cache miss, the MCP call is made; results are wrapped as a `RecordSet`

**Filter clauses** (`where ...`):
- Filters evaluate in JavaScript against the in-memory RecordSet (after the MCP call returns)
- Where possible, the runtime pushes filters down into MCP queries (e.g., `where date is after X` becomes a parameter on the Gmail search)
- Push-down is best-effort; unpushable filters apply locally

**Transform clauses** (`sort`, `take`, `group by`, `join`, etc.):
- Pure JavaScript operations on the RecordSet
- Sorted/grouped output is stable across re-evaluations with the same inputs

**Enrichment clauses** (`enrich each with agent(...)`):
- These are the most expensive evaluation step
- Each record in the RecordSet generates one agent call
- Agent calls are batched where the runtime can detect that batching is semantically equivalent
- Each call is tracked against the user's agent budget
- The budget tracker can throttle, queue, or reject calls

**Render clauses** (`show as feed`, `show as timeline`, `show as cards`):
- The runtime doesn't render — it produces a normalized `CellValue` with a renderer identifier
- The React layer subscribes to the value and picks the renderer

### 4.2 Determinism and reproducibility

Many cells are deterministic — same inputs, same expression, same output. These are cacheable in straightforward ways.

Some cells are non-deterministic — LLM calls produce different outputs each time. These are still cacheable (re-evaluation only happens on real input changes, not on every render), but the cache key includes the LLM seed/temperature so that "give me a different output" semantics work.

The runtime treats non-determinism conservatively: an LLM cell does not re-evaluate just because the user observed it again. It re-evaluates when (a) its DSL changes, (b) its inputs change, (c) the user explicitly asks for a refresh, or (d) its TTL expires.

### 4.3 The cell context

Every cell evaluation receives a context object:

```typescript
type EvalContext = {
  cellId: string
  lensId: string
  userId: string
  
  // Access to other cells
  readCell: (cellId: string) => Promise<CellValue>
  
  // Connector access (governed by scope)
  mcp: McpClient
  
  // Agent access (governed by budget)
  agent: AgentClient
  
  // Provenance recording
  recordRead: (source: string, payload: any) => void
  recordTransform: (description: string) => void
  recordCall: (target: string, params: any) => void
  
  // Current time (deterministic during a single evaluation)
  now: () => Date
  
  // Abort signal (set when the cell is unobserved mid-eval)
  signal: AbortSignal
}
```

`now()` returning a stable value during a single eval is intentional: a cell that reads "now" in two places should see the same time, so a result row's `"sent 3 minutes ago"` is consistent with its sibling's `"replied 5 minutes ago"`. The clock advances between evaluations, not within them.

`signal` lets long-running evaluations abort cleanly. If the user closes a lens mid-evaluation, the runtime calls `abort()` and the cell's MCP/LLM calls cancel; the cell state goes back to its prior state without partial-result pollution.

### 4.4 Dependency tracking

Dependencies are tracked automatically. When a cell evaluates and calls `context.readCell(otherId)`, the runtime records that this cell now depends on `otherId`. After evaluation, the runtime updates the dependency edges accordingly.

This is the same auto-tracking mechanism signals use: read access during the computation is the dependency signal. No explicit declaration needed.

Stale dependency edges (a cell that used to read from A but no longer does after expression changes) are pruned by comparing pre-eval dependencies with post-eval dependencies. If the new set is a strict subset, the removed edges are deleted.

---

## 5. The evaluation scheduler

The runtime evaluates cells through a scheduler that handles:
- Concurrency limits (no more than N cells evaluating at once)
- Priority (observed cells > unobserved cells)
- Backoff (retry failed cells with exponential delay, capped)
- Budget enforcement (agent calls beyond budget queue or fail)

### 5.1 The scheduler queue

Cells that need to be evaluated enter a priority queue:

```
priority = (observed ? 1000 : 0) 
         + (urgency ? 100 : 0) 
         + (age in seconds, capped at 60)
         - (cost estimate)
```

Higher priority cells get scheduled first. Cost is estimated from past evaluation duration — cells that historically take 30 seconds are deprioritized vs cells that take 200ms when both are observed, on the theory that cheap-and-fresh feels more responsive than slow-and-perfect.

### 5.2 Concurrency limits

Three limits, layered:

- **Per-cell**: a cell can have at most one evaluation in flight. Subsequent triggers wait.
- **Global**: at most 8 cells evaluating simultaneously by default. Configurable.
- **Per-connector**: at most 4 in-flight requests per MCP connector. This respects connector rate limits and avoids overwhelming any single source.

### 5.3 Failure handling

When a cell evaluation throws:

1. The cell transitions to `failed`
2. The error is recorded with a structured shape (see section 6)
3. Dependents stay in their previous state (last successful value, possibly marked stale)
4. The renderer shows an error UI for the failed cell

Retry behavior:

- Errors classified as *transient* (network timeout, 503, rate limit) auto-retry with exponential backoff. Up to 3 retries with delays of 1s, 4s, 16s.
- Errors classified as *permanent* (auth failure, malformed expression, MCP capability not granted) do not auto-retry; the cell remains failed until the user acts (reconnect, edit expression).
- The user can always manually retry from the cell's error UI.

### 5.4 Background evaluation

Some cells should refresh in the background even when the lens isn't on screen — examples include the Morning Brief lens (so it's ready when the user opens Wovith) and lenses with strict freshness contracts (the Live Threads lens that should show genuinely recent data).

A cell opts into background evaluation through its freshness policy (`background: true`). The background scheduler runs at lower priority and obeys all the same constraints, but it can update cells that aren't currently observed.

Background evaluation is gated by:
- The user being signed in
- The device being online
- The user not being in a "do not disturb" period (configurable)
- The user's agent budget not being depleted

When the user opens a lens with background-refreshed cells, those cells are already fresh.

---

## 6. Error classification

Errors from cell evaluation are typed for both UI display and retry policy:

```typescript
type CellError = 
  | { kind: 'connection_expired'; connector: string; reconnectUrl: string }
  | { kind: 'connection_not_granted'; connector: string; scope: string }
  | { kind: 'mcp_timeout'; connector: string; afterMs: number }
  | { kind: 'mcp_rate_limit'; connector: string; retryAfterMs: number }
  | { kind: 'mcp_error'; connector: string; status: number; message: string }
  | { kind: 'expression_syntax'; line: number; column: number; message: string }
  | { kind: 'expression_runtime'; message: string; stack?: string }
  | { kind: 'agent_budget_exceeded'; resetAt: Timestamp }
  | { kind: 'agent_call_failed'; provider: string; reason: string }
  | { kind: 'cell_dependency_failed'; failedCellId: string }
  | { kind: 'cell_eval_timeout'; afterMs: number }
  | { kind: 'unknown'; message: string }
```

Each error type maps to specific UI copy (per the voice doc) and retry behavior. The user sees a clear cause and a next action; the system internally knows how to handle the retry decision.

---

## 7. The cell registry

The runtime maintains a single in-memory registry of all cells, keyed by cell ID. The registry exposes:

```typescript
interface CellRegistry {
  // Lifecycle
  registerCell(definition: CellDefinition): Cell
  unregisterCell(id: string): void
  
  // Observation
  observe(id: string): Subscription
  unobserve(subscription: Subscription): void
  
  // State queries
  getCell(id: string): Cell | null
  getCells(lensId: string): Cell[]
  
  // Manual actions
  refresh(id: string): Promise<void>           // re-evaluate a cell
  refreshLens(lensId: string): Promise<void>   // re-evaluate all cells in a lens
  
  // Listeners
  onCellStateChange(callback: (id: string, oldState: CellState, newState: CellState) => void): Unsubscribe
  onCellValue(id: string, callback: (value: CellValue) => void): Unsubscribe
}
```

The React layer interacts with the runtime exclusively through this registry. There is no direct access to internal state.

---

## 8. The agentic budget model

Agent calls (LLM invocations) are the most expensive operation a cell can make. Wovith enforces a per-user budget to prevent unintended runaway costs and to bound free-tier abuse.

### 8.1 The budget object

```typescript
type AgentBudget = {
  userId: string
  tier: 'free' | 'pro' | 'trust'
  
  // Soft cap: warn the user and degrade behavior
  softCap: number              // e.g. 50 calls/day for free, 500 for pro
  
  // Hard cap: refuse calls
  hardCap: number              // e.g. 100 for free, 1000 for pro
  
  // Tracking
  callsToday: number
  callsThisHour: number
  rollingWindow: number[]      // last 24h hourly buckets
  
  // Reset timing
  resetsAt: Timestamp          // UTC midnight by default
}
```

Soft cap behavior: when the user crosses 80% of soft cap, a small ambient banner appears: *"You've used 40 of your 50 daily agent calls. Some cells may slow down."* Past the soft cap, the runtime begins to:
- Defer non-observed agent cells (background refresh stops working)
- Lengthen TTLs (cells re-evaluate less often)
- Skip enrichment on low-priority cells

Hard cap behavior: agent calls fail with `kind: 'agent_budget_exceeded'`. The user sees an inline message: *"You've used today's agent calls. They reset at midnight."* with a Pro upgrade affordance.

### 8.2 Why a soft cap

The free tier could be implemented as a hard cap only, but the soft cap is more user-friendly: it gives the user warning before they hit the wall, and degrades gracefully rather than failing abruptly. Most users will never hit the soft cap; those who do get a clear signal of value before being asked to pay.

### 8.3 Budget tracking granularity

Calls are tracked per provider (Anthropic, OpenAI, etc.) and per model tier (Haiku-class, Sonnet-class, Opus-class). Cost is approximated by mapping each call to a "unit" — a Haiku call is 1 unit, a Sonnet call is 5 units, an Opus call is 15 units. Limits are in units, not raw call counts.

This lets the runtime favor cheaper models when budget is tight (degrading to Haiku for routine drafting) without losing the ability to invoke Opus for the user's most demanding lens.

---

## 9. Caching

Three cache layers, each with distinct invalidation:

### 9.1 Source cache (MCP response cache)

The output of every MCP call is cached by:
- Connector ID
- Tool name
- Parameters hash

TTL is set per connector based on data volatility: Gmail and Drive default to 60 seconds; Calendar defaults to 300 seconds; web feeds default to 900 seconds. The TTL is overridable per cell.

This cache lives in IndexedDB (web) or SQLite (native). It's keyed deterministically so multiple cells that make the same MCP query share the cached result.

### 9.2 Cell value cache

The full output of a cell (the `CellValue`) is cached in memory, keyed by cell ID and expression hash. If the same expression evaluates again with the same inputs, the cached value is returned.

This cache is lazy — cells aren't pre-emptively cached, they're cached at evaluation time. Eviction is LRU with a configurable maximum (default 100 MB).

### 9.3 Agent call cache

LLM responses are cached by full input fingerprint (model + prompt + temperature + seed). Same input → same output, deterministically, as long as the cache is warm.

This cache is more aggressive: 24-hour TTL by default, since LLM responses are expensive and most user-facing LLM calls (drafting a reply, summarizing a thread) are reasonably stable over the short term.

The agent cache can be explicitly bypassed for cells that want fresh stochasticity (a "give me a new suggestion" affordance).

---

## 10. Implementation strategy

### 10.1 Library choices

Wovith's tech stack (React 18 + TypeScript + Vite) is fixed. Within that, the runtime is built on:

- **Signals library**: `signal-polyfill` (the TC39 polyfill). Stage 1 standardization gives us a future where Wovith's reactivity is on standard JavaScript primitives. The polyfill is production-grade now.
- **CRDT**: `@automerge/automerge` 2.x for document storage; `@automerge/automerge-repo` for repo management with IndexedDB/SQLite storage adapters and WebSocket sync adapter.
- **AST parser**: a hand-rolled recursive-descent parser for the DSL. Small enough to not need a library; explicit enough to give good error messages.
- **Queue / scheduler**: hand-rolled. The scheduling logic is too Wovith-specific to inherit from a generic library.
- **MCP client**: built on top of the official MCP TypeScript SDK (`@modelcontextprotocol/sdk`).

### 10.2 Module structure

The runtime is organized in five layers, inner-to-outer:

```
src/runtime/
├── core/           # Cell types, registry, state machine, no I/O
├── dsl/            # Parser, evaluator, expression types
├── reactive/       # Push-pull algorithm, dependency tracking, scheduler  
├── effects/        # MCP client, agent client, budget tracking
└── adapters/       # React hooks, Automerge persistence binding
```

Inner layers don't import from outer ones. Tests for `core` and `dsl` run with no I/O mocks. Tests for `reactive` use fake clocks and queues. Only `effects` and `adapters` need integration testing.

### 10.3 Worker thread consideration

A future optimization: move the runtime into a Web Worker. Capacitor supports Workers. The benefit: cell evaluation never blocks the React render loop. The cost: serialization overhead for every cell-result message.

For v1, the runtime runs on the main thread. Move-to-worker is a v2 task tracked as a known scaling concern. The module structure above is designed so the worker move requires changing only the `adapters/` layer.

### 10.4 Testing strategy

Three test tiers:

**Unit tests** — every `core` and `dsl` function. Pure logic; no async. Aim for >90% coverage. Vitest.

**Integration tests** — the runtime as a black box, with mocked MCP and agent clients. Verify state transitions, dependency tracking, scheduler ordering. Vitest with fake timers.

**Scenario tests** — full lens scenarios with synthetic MCP responses. Verify that "morning brief lens evaluates correctly across all four cells" or "blind-spot lens calibrates from dismiss signals." Playwright for end-to-end.

A specific testing fixture: a *synthetic MCP server* that returns canned data with controlled latency, error injection, and rate-limit simulation. Tests run against this synthetic server. The same fixture is used for development without burning real API credits.

---

## 11. Specific edge cases

### 11.1 Circular dependencies

The DSL parser detects circular dependencies at expression time when possible (cell A literally reads cell A). Runtime cycles (A reads B, B reads A through some indirection) are caught when the dependency edges close on themselves during evaluation: the cell is marked failed with `kind: 'expression_runtime'` and a clear message.

Wovith does not attempt to resolve cycles (there's no fixed-point iteration). Cycles are user errors.

### 11.2 Cells that read from no source

Some cells are pure UI (a Quick Capture cell with an empty initial state). These cells don't depend on anything external; they have value but no `from` clause. The runtime handles these trivially — eval returns the cell's persisted state, which only changes through explicit user action.

### 11.3 Cells that read mutable state

The Captures cell mutates over time as the user adds text or voice notes. This is implemented as the cell having an Automerge sub-document for its content; the cell's value is a function of that sub-document, and any change to it triggers downstream invalidation through the standard reactive path.

### 11.4 Network partition during evaluation

If the user goes offline mid-evaluation:
- MCP calls fail with a network error
- The cell transitions to `failed` with `kind: 'mcp_timeout'`
- The error UI shows "Can't reach [connector] right now. Will retry when you're back online."
- The runtime's network state listener triggers auto-retry when connectivity returns
- The retry runs in the background; if the cell is still observed, the UI updates seamlessly; if not, the value updates silently

### 11.5 The same cell expression in two different lenses

If two lenses contain a cell with identical DSL expressions, they're still different cells (different IDs, different lens membership). They evaluate independently but their underlying MCP calls hit the source cache, so the second one returns instantly.

This is a deliberate design choice. Sharing cell *values* across lenses would create subtle coupling that's hard to reason about. Sharing MCP *results* is fine because it's transparent — neither cell can tell the other exists, only the cache.

### 11.6 Time-zone handling

All times in the runtime are UTC internally. Display uses the user's local time zone (from device). DSL expressions that reference times (`where date is today`) resolve "today" in the user's time zone at evaluation time. Cross-time-zone artifacts (a meeting scheduled in Pacific when user is in Eastern) are rendered with both source and local times.

---

## 12. Performance budgets

The runtime targets these performance characteristics:

| Operation | Target |
|---|---|
| Cell registry lookup | < 1ms |
| Trivial cell evaluation (no I/O) | < 5ms |
| Dependency-edge update on evaluation | < 1ms per edge |
| Push-phase invalidation walk for 100 cells | < 10ms |
| Topological sort for 100 cells | < 5ms |
| MCP call dispatch (excluding network time) | < 10ms |
| Cache lookup (warm) | < 2ms |
| Cell observation subscribe/unsubscribe | < 1ms |

These targets are explicit so they can be enforced in CI with simple benchmarks. They're achievable because all the operations are at the JavaScript-level — no DOM, no network, no LLM. The actual user-facing latency is dominated by MCP and LLM I/O, which is outside the runtime's control but inside its responsibility to surface (the freshness palette tells the user *why* a cell is slow).

---

## 13. What this document does not yet cover

Important specifics that are deferred:

- **The exact DSL grammar.** The DSL doc has it; this runtime spec references it.
- **The renderer interface.** The renderer spec has it; this doc only describes what the runtime emits.
- **The MCP client implementation.** See `wovith_mcp_client.md`.
- **The agent client (LLM provider abstraction).** See `wovith_agentic_budget.md`.
- **The provenance graph data model.** See `wovith_provenance_graph.md`.
- **The exact Automerge schema.** See `wovith_data_architecture.md`.
- **The sync relay API.** See `wovith_sync_relay.md`.
- **The calibration state model.** See `wovith_calibration_state.md`.
- **Worker-thread migration plan.** Future v2 doc.

---

## 14. Cross-doc check

The runtime as specified here is consistent with:

- **Concept doc**: cells are "code-expressions that reactively evaluate to rendered views" — matches.
- **DSL doc**: the runtime evaluates DSL expressions; this doc specifies the evaluation semantics; no conflict.
- **Renderer spec**: the runtime emits `CellValue` with a renderer ID; the renderer layer subscribes and renders; no conflict.
- **Design system**: the six cell states map to the six visual treatments specified there; this doc names them the same.
- **Onboarding/mining**: mining proposes lens definitions; the runtime evaluates them; no conflict.
- **Security**: capability gating, sandbox boundaries, agent budget — this runtime enforces them; security doc specifies the policy.
- **Mobile**: the runtime is the same on mobile and desktop; the rendering layer differs.

No conflicts identified.

---

## References

- *How to Recalculate a Spreadsheet* (Lord, 2020) — the canonical writeup of the Adapton vs Incremental tradeoff
- *A Library for Incremental Computing* (Timi, 2022)
- Adapton: composable, demand-driven incremental computation (Hammer et al., POPL 2014)
- Jane Street's Incremental library
- *Reactive Imperative Programming with Dataflow Constraints* (Demetrescu et al.)
- TC39 Signals proposal (Eisenberg, Ehrenberg, Lesh, Gannaway)
- Observable Framework reactive runtime
- marimo reactive Python notebook (Agrawal et al., 2024)
- Solid.js reactive primitives
- Pluto.jl reactive Julia notebooks
- *Consistent Distributed Reactive Programming* (arXiv:2502.20534)
