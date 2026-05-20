# Wovith Build Order

### Sequenced first 50 commits to get from empty repo to first working cell

---

## 0. About this document

This is the operational sequencing of how to build Wovith v1. It exists so a coding agent — or Chris working with one — knows what to build next without needing to re-plan from the docs each time.

The target milestone for this 50-commit sequence is:

> **A working Wovith app that displays one lens with one cell on Android (and web) reading live data from a synthetic in-memory MCP server, with the full freshness lifecycle visible.**

Why this milestone, not "ship v1"? Because the first 50 commits should establish the *spine* of the system — domain types, runtime, effects, adapters, one renderer, one cell, one synthetic source. Once that spine is in place, everything else is filling in: more renderers, real MCP connectors, the DSL inspector, onboarding, sync, etc. Those features get their own build-order documents once the spine is real.

### Commit hygiene

- Each commit is a coherent unit that compiles, passes its own tests, and doesn't break previous tests.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`).
- Each commit references the spec doc it implements (e.g., "implements §4.2 of wovith_cell_runtime.md").
- No commit introduces a `TODO` without a tracking issue.

### Phases

1. **Foundation** (commits 1–8): empty repo → typed, tested, layered scaffolding.
2. **Domain layer** (commits 9–18): types, DSL parser, value objects.
3. **Runtime core** (commits 19–28): cell registry, dependency graph, scheduler.
4. **Effects** (commits 29–40): storage, cache, synthetic MCP, agent client.
5. **UI layer** (commits 41–50): theme, hooks, one renderer, canvas shell.

---

## Phase 1 — Foundation (commits 1–8)

### Commit 1: `chore: initialize Vite + React + TypeScript project`

Files:
- `package.json` — React 18, Vite 5, TypeScript 5.4
- `vite.config.ts` — bare config
- `tsconfig.json` — strict mode on, target ES2022, module ESNext
- `index.html` — single root div, no copy
- `src/main.tsx` — renders `<App />`
- `src/App.tsx` — returns single `<div>Wovith</div>`
- `.gitignore` — node_modules, dist, .env, .DS_Store
- `README.md` — links to the 20 docs

Acceptance: `pnpm install && pnpm dev` opens a browser showing "Wovith".

### Commit 2: `chore: add ESLint + Prettier + boundaries enforcement`

Files:
- `eslint.config.js` — flat config; rules: TypeScript recommended, react-hooks, no-explicit-any, eslint-plugin-boundaries with these zones: `domain`, `runtime`, `effects`, `adapters`, `features`, `app`, `shared`.
- `.prettierrc` — single quotes, no semicolons, trailing commas, print-width 100
- `package.json` — adds lint, lint:fix, format scripts

Boundary rules (initial):
- `domain` may import only from `domain` and `shared`
- `runtime` may import from `domain`, `runtime`, `shared`
- `effects` may import from `domain`, `effects`, `shared`
- `adapters` may import from `domain`, `runtime`, `effects`, `adapters`, `shared`
- `features` may import from `domain`, `runtime`, `effects`, `adapters`, `features`, `shared`
- `app` may import from all
- `shared` may import only from `shared`

Acceptance: `pnpm lint` passes on an empty repo.

### Commit 3: `chore: add path aliases for layer separation`

Files:
- `tsconfig.json` — paths for `@domain/*`, `@runtime/*`, `@effects/*`, `@adapters/*`, `@features/*`, `@app/*`, `@shared/*`
- `vite.config.ts` — matching resolve.alias
- `src/` — creates empty directory per alias

Acceptance: an import like `import { foo } from '@domain/types/primitives'` resolves at compile time (even with an empty file).

### Commit 4: `chore: add Vitest + React Testing Library`

Files:
- `vitest.config.ts` — extends Vite config; setup file `tests/setup.ts`
- `tests/setup.ts` — testing-library/jest-dom matchers
- `package.json` — adds test, test:watch, test:coverage scripts
- `src/App.test.tsx` — smoke test: renders "Wovith"

Acceptance: `pnpm test` runs one passing test.

### Commit 5: `chore: add Tailwind CSS with design tokens`

Files:
- `tailwind.config.ts` — extends with Wovith's color tokens from the design system doc (Slate + Indigo palette, Radix scales)
- `postcss.config.js` — Tailwind + autoprefixer
- `src/styles/index.css` — `@tailwind` directives + CSS variable definitions
- `src/main.tsx` — imports `./styles/index.css`

Acceptance: a div with `class="bg-slate-9"` renders in the right color.

### Commit 6: `chore: add Capacitor 8 scaffolding`

Files:
- `capacitor.config.ts` — `appId: 'app.wovith'`, `appName: 'Wovith'`, `webDir: 'dist'`
- `android/` — initial Capacitor Android project (`npx cap add android`)
- `package.json` — adds Capacitor scripts: `build:android`, `run:android`
- `.gitignore` — Android build artifacts

Acceptance: `pnpm build && npx cap sync && npx cap run android` opens the empty app on an Android emulator.

### Commit 7: `ci: add GitHub Actions for lint, typecheck, test`

Files:
- `.github/workflows/ci.yml` — runs on push and PR; matrix: Node 20.x; steps: install, lint, typecheck, test
- `.github/dependabot.yml` — weekly dependency updates

Acceptance: a PR shows the green CI checkmark.

### Commit 8: `docs: copy design and engineering docs into /docs`

Files:
- `docs/` — all 20 product docs + schemas.ts + grammar + glossary + v1 scope + this build order
- `docs/README.md` — manifest

Acceptance: the docs are version-controlled with the code; a developer cloning the repo has the full reference.

---

## Phase 2 — Domain layer (commits 9–18)

### Commit 9: `feat(domain): add primitive types and IDs`

Files:
- `src/domain/types/primitives.ts` — `Timestamp`, `Ulid`, `UserId`, `DeviceId`, `CanvasId`, `LensId`, `CellId`, `ConnectionId`, `AutomergeUrl`, `RendererId`, `ConnectorId`, `ScopeTier`, `PricingTier`, `ModelClass`, `LlmProvider`

Source: `wovith_schemas.ts` section 1.

Acceptance: types compile; no runtime code yet.

### Commit 10: `feat(domain): add ULID generator with tests`

Files:
- `src/domain/values/ulid.ts` — wraps `ulid` npm package; exports `generateUlid()` and `isValidUlid(string)`
- `src/domain/values/ulid.test.ts` — tests for monotonicity, uniqueness, validity

Acceptance: `generateUlid()` returns a 26-char Crockford base32 string; 1000 generations are unique and monotonic.

### Commit 11: `feat(domain): add Automerge document type definitions`

Files:
- `src/domain/types/documents/user-profile-doc.ts`
- `src/domain/types/documents/canvas-doc.ts`
- `src/domain/types/documents/lens-doc.ts`
- `src/domain/types/documents/captures-doc.ts`
- `src/domain/types/documents/calibration-doc.ts`
- `src/domain/types/documents/agent-budget-doc.ts`
- `src/domain/types/documents/index.ts` — barrel export

Source: `wovith_schemas.ts` section 2.

Acceptance: types compile; document creation functions are NOT in this commit (they live in effects).

### Commit 12: `feat(domain): add cell and runtime types`

Files:
- `src/domain/types/cell.ts` — `Cell`, `CellState`, `VisualFreshnessState`, `CellValue` (all variants), `CellError` (all variants), `FieldDescriptor`
- `src/domain/types/runtime.ts` — `Subscription`, `EvalContext`, `EvalResult`, `Logger`, `CellRegistry` (interface)

Source: `wovith_schemas.ts` sections 3 and 5.

Acceptance: types compile; no implementations.

### Commit 13: `feat(domain): add DSL AST types`

Files:
- `src/domain/dsl/ast.ts` — `DSLExpression`, `SourceClause`, `Step` and subtypes, `Predicate` and subtypes, `ASTValue`, `RenderClause`, `EnrichmentClause`, `TimeWindow`, `TimeUnit`, `ComparisonOp`

Source: `wovith_schemas.ts` section 4.

Acceptance: types compile; no parser yet.

### Commit 14: `feat(domain): add MCP, agent, provenance, audit, calibration types`

Files:
- `src/domain/types/mcp.ts` — `ConnectorDescriptor`, `TokenSet`, `ConnectionHealth`, `ConnectionResult`, `CallOptions`, `TaskHandle`, `TaskState`, `ToolDescriptor`, `McpClient` (interface)
- `src/domain/types/agent.ts` — `AgentRequest`, `AgentResponse`, `CostEstimate`, `BudgetDecision`, `BudgetDenyReason`, `DegradationStrategy`, `BudgetSnapshot`, `AgentClient` and `BudgetTracker` interfaces
- `src/domain/types/provenance.ts` — `ProvEntity`, `ProvActivity`, `ProvAgent`, `ProvenanceRelation`, `ProvenanceRecord`, `ProvenanceNode`
- `src/domain/types/audit.ts` — `AuditLogEntry` (all variants), `AuditQuery`
- `src/domain/types/calibration.ts` — `CalibrationSignal`, `SourceIdentifier`
- `src/domain/types/storage.ts` — `AutomergeStore`, `CacheStore`, `AuditStore`, `TokenStorage`, `Clock`, `RuntimeEffects`

Source: `wovith_schemas.ts` sections 6–12.

Acceptance: types compile; the full domain type surface is in place.

### Commit 15: `feat(domain): add DSL tokenizer`

Files:
- `src/domain/dsl/tokenizer.ts` — produces a token stream with line/column
- `src/domain/dsl/tokenizer.test.ts` — tests covering keywords, identifiers, strings, numbers, comments, whitespace, all 16 error codes for lexical failures
- `src/domain/dsl/tokens.ts` — `Token`, `TokenKind`, `SourcePos`

Source: `wovith_dsl_grammar.md` sections 1–3.

Acceptance: tokenizer passes 30+ test cases covering all token types.

### Commit 16: `feat(domain): add DSL parser (recursive descent)`

Files:
- `src/domain/dsl/parser.ts` — hand-rolled recursive descent
- `src/domain/dsl/parser.test.ts` — test corpus from `wovith_dsl_grammar.md` (all 83 cases)
- `src/domain/dsl/parse-error.ts` — `ParseError`, error codes
- `src/domain/dsl/index.ts` — exports `parse(source: string): DSLExpression | ParseError`

Acceptance: all 83 corpus cases pass. `pnpm test src/domain/dsl` is green.

### Commit 17: `feat(domain): add DSL analyzer (static checks)`

Files:
- `src/domain/dsl/analyzer.ts` — post-parse semantic checks: unknown connectors, unknown fields (basic), undefined variables, invalid renderer for source shape (best-effort), duplicate clauses
- `src/domain/dsl/analyzer.test.ts` — 20+ test cases

Acceptance: a syntactically valid but semantically broken expression (e.g., `from bogus.thing show as list`) produces an `AnalysisError`.

### Commit 18: `feat(domain): add RecordSet value object`

Files:
- `src/domain/values/record-set.ts` — class with operations: filter, sort, take, group, distinct, map, union, join; deterministic and pure
- `src/domain/values/record-set.test.ts` — 30+ test cases including edge cases (empty, single item, duplicate keys, missing fields)

Acceptance: RecordSet methods correspond 1:1 to DSL steps; results are deterministic across runs.

---

## Phase 3 — Runtime core (commits 19–28)

### Commit 19: `feat(runtime): add signal-polyfill wrapper`

Files:
- `src/runtime/signals/signal.ts` — thin wrapper over `signal-polyfill` (TC39 Stage 1) with typed signals
- `src/runtime/signals/computed.ts` — computed-signal wrapper
- `src/runtime/signals/effect.ts` — effect wrapper with cleanup
- `src/runtime/signals/signal.test.ts`

Source: `wovith_cell_runtime.md` section 2 (the Adapton-flavored reactive primitives).

Acceptance: signals read/write/derive correctly; cleanup works.

### Commit 20: `feat(runtime): add cell registry (in-memory)`

Files:
- `src/runtime/cells/registry.ts` — implements `CellRegistry` interface; `registerCell`, `unregisterCell`, `getCell`, `getCells`, `observe`
- `src/runtime/cells/registry.test.ts` — covers cell lifecycle, observer counting, subscription lifecycle

Acceptance: 25+ tests; register → observe → state-change → unobserve → un-register works.

### Commit 21: `feat(runtime): add dependency graph`

Files:
- `src/runtime/deps/graph.ts` — directed graph; addEdge, removeEdge, topologicalOrder, findCycles
- `src/runtime/deps/graph.test.ts` — covers add/remove, cycle detection, topological order, invalidation propagation

Acceptance: cycles are detected and reported; propagation from a dirty node visits all dependents in topological order.

### Commit 22: `feat(runtime): add cell state machine`

Files:
- `src/runtime/cells/state-machine.ts` — transitions: idle → fetching → fresh → stale → recomputing → fresh|failed; fresh → waiting → fresh
- `src/runtime/cells/state-machine.test.ts` — exhaustive transition coverage

Acceptance: all valid transitions allowed; all invalid transitions throw with clear error messages.

### Commit 23: `feat(runtime): add scheduler (priority queue)`

Files:
- `src/runtime/scheduler/queue.ts` — priority queue: observed-and-stale > observed-and-fresh > unobserved
- `src/runtime/scheduler/scheduler.ts` — runs the queue; respects in-flight cap (4 concurrent evals)
- `src/runtime/scheduler/scheduler.test.ts` — covers priority ordering, concurrency cap, cancellation

Acceptance: when 10 cells are stale and observed, scheduler runs them in priority order with 4 concurrent.

### Commit 24: `feat(runtime): add evaluator (the core of the runtime)`

Files:
- `src/runtime/eval/evaluator.ts` — takes a `DSLExpression` and an `EvalContext`, returns an `EvalResult`
- `src/runtime/eval/evaluator.test.ts` — uses a fake `EvalContext` to test pure evaluation of all DSL constructs

Acceptance: 40+ tests covering each clause type, each predicate kind, each step, sort/take/group/distinct, enrichment integration (with mock agent client).

### Commit 25: `feat(runtime): wire registry + dep graph + state machine + scheduler + evaluator`

Files:
- `src/runtime/index.ts` — `createRuntime(effects: RuntimeEffects): WovithRuntime`
- `src/runtime/runtime.ts` — composition: registers cells, propagates dirtiness, schedules, evaluates, emits state
- `src/runtime/runtime.test.ts` — end-to-end with fake effects: register cell → observe → see fresh value → invalidate → see recomputed value

Acceptance: 15+ integration tests; the full reactive lifecycle works against fake effects.

### Commit 26: `feat(runtime): add freshness budget tracking`

Files:
- `src/runtime/freshness/budget.ts` — per-cell TTL; transitions fresh→stale when TTL expires
- `src/runtime/freshness/budget.test.ts`

Acceptance: a cell with TTL 1000ms transitions to stale at +1000ms; observed-stale cells are scheduled for refresh.

### Commit 27: `feat(runtime): add cancellation (AbortController integration)`

Files:
- `src/runtime/eval/cancellation.ts` — passes `AbortSignal` to all I/O; cancels in-flight evals when cell is unobserved or re-invalidated
- `src/runtime/eval/cancellation.test.ts`

Acceptance: cancelling an in-flight eval frees resources within 100ms; no orphan promises.

### Commit 28: `feat(runtime): add visual freshness state derivation`

Files:
- `src/runtime/cells/visual-state.ts` — derives `VisualFreshnessState` (Fresh/Steady/Stale/Recomputing/Working/Stuck/Failed/Suspended/Stub) from logical state + signals
- `src/runtime/cells/visual-state.test.ts` — covers the mapping table from `wovith_cell_runtime.md`

Acceptance: every (logical state, elapsed time, has-agent-call) combination maps to the correct visual state.

---

## Phase 4 — Effects (commits 29–40)

### Commit 29: `feat(effects): add storage adapter ports + IndexedDB implementation`

Files:
- `src/effects/storage/automerge-store.ts` — implements `AutomergeStore` using `@automerge/automerge-repo` + IndexedDB adapter
- `src/effects/storage/cache-store-indexeddb.ts` — implements `CacheStore` using IndexedDB
- `src/effects/storage/cache-store.test.ts` — uses fake-indexeddb in tests

Acceptance: load/save/subscribe work; cache TTL eviction works.

### Commit 30: `feat(effects): add SQLite implementation (Capacitor)`

Files:
- `src/effects/storage/cache-store-sqlite.ts` — same `CacheStore` interface, SQLite via `@capacitor-community/sqlite`
- `src/effects/storage/audit-store-sqlite.ts` — implements `AuditStore`
- `src/effects/storage/platform-detect.ts` — returns SQLite on Capacitor, IndexedDB on web

Acceptance: the storage adapter swap is transparent to consumers; tests use IndexedDB; on Android the SQLite implementation is selected at runtime.

### Commit 31: `feat(effects): add token storage (platform-aware)`

Files:
- `src/effects/storage/token-storage-native.ts` — uses `@capacitor-community/secure-storage-plugin`
- `src/effects/storage/token-storage-web.ts` — IndexedDB + WebCrypto-derived encryption
- `src/effects/storage/token-storage.test.ts`

Acceptance: tokens stored, retrieved, deleted; web encryption uses a per-user derived key.

### Commit 32: `feat(effects): add synthetic MCP server (for tests and dev)`

Files:
- `src/effects/mcp/synthetic-server.ts` — in-memory MCP server returning fixture data: synthetic Drive files, synthetic Gmail threads, synthetic Calendar events
- `src/effects/mcp/fixtures/drive-files.ts` — 50 fake files
- `src/effects/mcp/fixtures/gmail-threads.ts` — 100 fake threads
- `src/effects/mcp/fixtures/calendar-events.ts` — 30 fake events
- `src/effects/mcp/synthetic-server.test.ts`

Why this is critical: lets us build cells and runtime without OAuth or real network. The first working cell at commit 50 reads from this.

Acceptance: synthetic server responds to `search_files`, `list-threads`, `list-events` with realistic-shaped JSON.

### Commit 33: `feat(effects): add MCP client core (no transport yet)`

Files:
- `src/effects/mcp/client.ts` — implements `McpClient` interface; transports are pluggable
- `src/effects/mcp/transports/transport-memory.ts` — talks to the synthetic server
- `src/effects/mcp/client.test.ts`

Acceptance: `client.call('drive', 'search_files', {})` against the in-memory transport returns fixture data.

### Commit 34: `feat(effects): add HTTP transport (Streamable HTTP + SSE)`

Files:
- `src/effects/mcp/transports/transport-http.ts` — implements Streamable HTTP per MCP 2025-11-25
- `src/effects/mcp/transports/transport-http.test.ts` — uses MSW to mock HTTP

Acceptance: HTTP transport correctly parses SSE chunks; reconnects on transient failures.

### Commit 35: `feat(effects): add OAuth 2.1 flow (PKCE + Resource Indicators)`

Files:
- `src/effects/mcp/oauth/oauth-flow.ts` — PKCE+S256 code generation; auth URL building; token exchange
- `src/effects/mcp/oauth/resource-indicator.ts` — RFC 8707 binding
- `src/effects/mcp/oauth/oauth-flow.test.ts`

Acceptance: full PKCE flow against a mock authorization server completes successfully.

### Commit 36: `feat(effects): add token refresh logic`

Files:
- `src/effects/mcp/oauth/token-refresh.ts` — auto-refreshes near expiry; handles refresh-token rotation
- `src/effects/mcp/oauth/token-refresh.test.ts`

Acceptance: a token within 60s of expiry is refreshed transparently; rotation works.

### Commit 37: `feat(effects): add cache layer (memoization + key derivation)`

Files:
- `src/effects/cache/cache-key.ts` — derives stable hash keys from MCP params (canonical JSON)
- `src/effects/cache/cache-layer.ts` — wraps `CacheStore` with MCP-aware logic (3 cache tiers: signal, MCP, agent)
- `src/effects/cache/cache-layer.test.ts`

Acceptance: same params → same hash → same cached response; TTL eviction works per-cache-tier.

### Commit 38: `feat(effects): add Anthropic agent client`

Files:
- `src/effects/agent/anthropic-client.ts` — implements `AgentClient` against Anthropic SDK
- `src/effects/agent/anthropic-client.test.ts` — uses MSW; tests strict tool use, retry, error handling

Acceptance: agent calls return responses; errors are typed.

### Commit 39: `feat(effects): add budget tracker`

Files:
- `src/effects/agent/budget-tracker.ts` — implements `BudgetTracker`: RPM/TPM/units buckets, soft-cap degradation chain, circuit breaker
- `src/effects/agent/budget-tracker.test.ts` — 30+ tests covering Free/Pro/Trust caps, degradation order, breaker state machine, tenure bonus

Acceptance: budget decisions match the spec table in `wovith_agentic_budget.md`; tenure bonus auto-applies after Day 14.

### Commit 40: `feat(effects): add audit logger`

Files:
- `src/effects/audit/logger.ts` — typed wrapper over `AuditStore`; one method per audit event type
- `src/effects/audit/logger.test.ts`

Acceptance: every agent call, MCP call, user action produces an audit entry with correct shape.

---

## Phase 5 — UI layer (commits 41–50)

### Commit 41: `feat(app): add theme provider with design tokens`

Files:
- `src/app/theme/theme-provider.tsx` — provides CSS variables (Slate + Indigo, semantic colors, freshness palette)
- `src/app/theme/dark-mode.ts` — system/light/dark switching
- `src/app/theme/theme.test.tsx`

Source: `wovith_design_system.md`.

Acceptance: switching theme updates CSS variables; dark mode follows system.

### Commit 42: `feat(adapters): add React runtime adapter`

Files:
- `src/adapters/react/runtime-provider.tsx` — `<WovithRuntimeProvider>` exposes runtime via context
- `src/adapters/react/use-runtime.ts` — `useRuntime()` hook
- `src/adapters/react/runtime-provider.test.tsx`

Acceptance: a component inside the provider can access the runtime; outside throws clearly.

### Commit 43: `feat(adapters): add useCell hook`

Files:
- `src/adapters/react/hooks/use-cell.ts` — subscribes to a cell; returns `{ state, value, error, visualState }`; uses `useSyncExternalStore` for concurrent-mode compatibility
- `src/adapters/react/hooks/use-cell.test.tsx`

Acceptance: 15+ tests; component re-renders when cell state changes; unmount unsubscribes.

### Commit 44: `feat(adapters): add useLens and useConnection hooks`

Files:
- `src/adapters/react/hooks/use-lens.ts`
- `src/adapters/react/hooks/use-connection.ts`
- `src/adapters/react/hooks/use-budget.ts`
- Tests for each

Acceptance: hooks expose lens state, connection state, budget state with reactive updates.

### Commit 45: `feat(ui): add core UI primitives (Button, Surface, FreshnessIndicator)`

Files:
- `src/shared/ui/button.tsx`
- `src/shared/ui/surface.tsx` — the cell-container chrome
- `src/shared/ui/freshness-indicator.tsx` — 8px dot, all 9 visual states, pulse/breath animations
- Storybook stories for each (one file per component)
- Tests for each

Source: `wovith_design_system.md`, `wovith_renderer_spec.md` section 4.

Acceptance: each component renders in Storybook in all states; visual regression tests pass.

### Commit 46: `feat(ui): add the list renderer (first renderer end-to-end)`

Files:
- `src/features/renderers/list/list-renderer.tsx` — implements the list renderer per `wovith_renderer_spec.md` section 3.1
- `src/features/renderers/list/list-renderer.test.tsx`
- `src/features/renderers/list/list-renderer.stories.tsx`

Acceptance: given a `RecordSetValue`, renders rows with title, subtitle (optional), trailing (optional), divider; options work.

### Commit 47: `feat(features): add cell shell (the container around any renderer)`

Files:
- `src/features/cell/cell-shell.tsx` — the cell chrome: header strip with title and freshness indicator, footer on hover with timestamp
- `src/features/cell/cell.tsx` — composes cell-shell + the dispatched renderer
- `src/features/cell/renderer-dispatch.ts` — maps `CellValue.kind` → default renderer (when no `show as` clause)
- Tests for each

Acceptance: a cell with a list-shaped value renders with shell + list renderer; freshness indicator shows the right visual state.

### Commit 48: `feat(features): add the lens canvas (web) and lens stack (Android)`

Files:
- `src/features/canvas/canvas.tsx` — web layout: spatial grid of cells
- `src/features/canvas/lens-stack.tsx` — Android layout: vertical stack of cells
- `src/features/canvas/use-is-mobile.ts` — JS conditional detection
- Tests for each

Acceptance: on web viewport ≥768px, canvas renders; below 768px or on Capacitor, lens-stack renders.

### Commit 49: `feat(app): wire up composition root with synthetic MCP`

Files:
- `src/app/boot/compose-effects.ts` — composes the runtime with synthetic MCP, fake agent client, in-memory stores
- `src/app/boot/seed-data.ts` — creates one synthetic lens with one cell: `from drive.files where touched in last 7 days sort by touched desc take 10 show as list`
- `src/App.tsx` — renders the seeded lens

Acceptance: launching the app shows one lens with one cell displaying synthetic Drive files in a list. The freshness indicator shows green. Refresh works (after TTL).

### Commit 50: `test: end-to-end smoke test on Android and web`

Files:
- `e2e/first-cell.spec.ts` — Playwright (web) + Capacitor test (Android): app launches, lens visible, cell renders, freshness indicator visible, refresh on tap works
- `.github/workflows/e2e.yml` — runs e2e on PR

Acceptance: e2e test green on both platforms. **Milestone reached: a working Wovith app displaying one lens with one cell reading from synthetic MCP, with full freshness lifecycle.**

---

## What comes after commit 50

The next 50 commits (a separate build-order doc to be written when commit 50 lands) cover:

- Real Google OAuth and the three v1 connectors
- The remaining 12 renderers
- The cell inspector with NL + DSL view
- Onboarding flow + mining algorithm
- Calibration UI
- Audit log view
- Provenance lineage popover
- Intent Preview surface for Tier 2 actions
- Hold-to-confirm UI for Tier 3
- Multi-device sync via the relay
- Stripe billing for Pro
- Starter pack download + browse UI

Each of these will be 5–10 commits. The total v1 sequence is approximately 150 commits.

---

## Operational notes for the coding agent

1. **Don't skip commits.** If commit N depends on commit N-1, do them in order. The dependency graph is real: e.g., commit 24 (evaluator) depends on commits 18 (RecordSet), 16 (DSL parser), 23 (scheduler).

2. **Test before moving on.** Each commit lists an acceptance criterion. If it doesn't meet that criterion, fix it before starting the next commit.

3. **Don't refactor speculatively.** The architecture is laid out in the docs. Code to the spec; refactoring before the spine exists is wasted motion.

4. **Run lint and typecheck on every commit.** Boundary violations and type errors are caught at commit time, not later.

5. **When the spec is ambiguous, prefer the simpler implementation that satisfies the acceptance criterion.** Note the ambiguity in a code comment with a link to the doc section, and flag it for human review.

6. **Each phase should take roughly 1–2 weeks** of focused work for a single developer. Foundation is fastest (1 week); runtime core is the longest (2+ weeks). If a phase is taking 3x its estimate, stop and reassess.

7. **Don't introduce new dependencies without explicit justification.** The package.json should stay lean. Every new dep adds bundle size and supply-chain risk.

8. **Commit messages reference the spec.** Example: `feat(runtime): add cell state machine (implements §2.3 of wovith_cell_runtime.md)`. This makes the audit trail easy to follow.

---

## Cross-references

- Schema source of truth: `wovith_schemas.ts`
- DSL grammar source of truth: `wovith_dsl_grammar.md`
- Architecture details: `wovith_engineering_architecture.md`
- Runtime spec: `wovith_cell_runtime.md`
- Data spec: `wovith_data_architecture.md`
- Storage details: `wovith_data_architecture.md` section 7
- Design system: `wovith_design_system.md`
- Renderer spec: `wovith_renderer_spec.md`
- v1 acceptance criteria: `wovith_v1_scope.md`
