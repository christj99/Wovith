# Wovith Engineering Architecture
### Module layout, layer boundaries, dependency direction

---

## 0. About this document

This document specifies how Wovith's code is organized. It covers the layered architecture (which modules depend on which), the directory structure, the dependency direction rules, the abstraction boundaries (what's behind an interface vs concrete), and the testability story. It's the doc you should read first before opening a code editor.

The architecture is constrained by the prior tier-1 docs (cell runtime, data architecture) and by Chris's tech stack commitments: React 18 + TypeScript + Vite + Tailwind + Supabase + Capacitor 8, Android-first. Within these, the architectural decisions left to make are:
- How is the codebase organized into modules and how do they depend on each other?
- What's behind an abstraction boundary vs directly imported?
- How does the runtime (which is non-React) integrate with React?
- How does the codebase support testing without painful mocking?

The architecture pattern committed: **a Feature-Sliced Design layout with a Hexagonal/Ports-and-Adapters core** — a 2026 consensus pattern for React apps with serious complexity that resemble runtime systems more than CRUD apps.

---

## 1. The big picture

Five layers, inner-to-outer:

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  Layer 5: app/                                             │
│  ─────────────────────────────────────                     │
│  React entry point, routing, top-level shell,              │
│  composition root (dependency wiring)                      │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │  Layer 4: features/                                  │  │
│  │  ─────────────────────────────────                   │  │
│  │  User-facing features as bundles of UI + logic.      │  │
│  │  Each feature is a folder; features can compose.     │  │
│  │                                                      │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │                                                │  │  │
│  │  │  Layer 3: ui-system/, adapters/                │  │  │
│  │  │  ─────────────────────────────                 │  │  │
│  │  │  Shared UI primitives (design system           │  │  │
│  │  │  components) and adapters connecting           │  │  │
│  │  │  runtime to React.                             │  │  │
│  │  │                                                │  │  │
│  │  │  ┌──────────────────────────────────────────┐  │  │  │
│  │  │  │                                          │  │  │  │
│  │  │  │  Layer 2: runtime/, effects/             │  │  │  │
│  │  │  │  ─────────────────────────────           │  │  │  │
│  │  │  │  The cell runtime (push-pull             │  │  │  │
│  │  │  │  reactive engine) and effect             │  │  │  │
│  │  │  │  modules (MCP client, agent client,      │  │  │  │
│  │  │  │  storage). Knows nothing about React.    │  │  │  │
│  │  │  │                                          │  │  │  │
│  │  │  │  ┌────────────────────────────────────┐  │  │  │  │
│  │  │  │  │                                    │  │  │  │  │
│  │  │  │  │  Layer 1: domain/                  │  │  │  │  │
│  │  │  │  │  ─────────────────                 │  │  │  │  │
│  │  │  │  │  Pure types and value              │  │  │  │  │
│  │  │  │  │  objects. The DSL AST,             │  │  │  │  │
│  │  │  │  │  cell value types, lens            │  │  │  │  │
│  │  │  │  │  shape. No I/O, no                 │  │  │  │  │
│  │  │  │  │  side effects.                     │  │  │  │  │
│  │  │  │  │                                    │  │  │  │  │
│  │  │  │  └────────────────────────────────────┘  │  │  │  │
│  │  │  └──────────────────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

**The dependency rule:** outer layers import from inner; inner layers never import from outer. Layer N can import from Layers 1 through N-1, never from N+1 or above.

This is the standard hexagonal/clean architecture pattern adapted to a React codebase. The benefits:
- Layer 1 (domain) has zero dependencies on anything. Compiles in isolation. Tests run in milliseconds.
- Layer 2 (runtime) depends only on the domain. Can be tested headlessly without React, without a browser, without MCP servers.
- Layer 3 (adapters) bridges runtime to React via hooks. Thin glue.
- Layer 4 (features) composes from layers 1-3 to deliver user-facing capabilities.
- Layer 5 (app) wires everything together at startup.

---

## 2. The directory structure

```
src/
├── domain/                          # Layer 1
│   ├── types/
│   │   ├── lens.ts                  # LensDoc shape
│   │   ├── cell.ts                  # CellDef, CellValue, CellState
│   │   ├── connection.ts            # ConnectionMetadata
│   │   ├── budget.ts                # AgentBudget
│   │   ├── audit.ts                 # AuditLogEntry
│   │   └── index.ts                 # public exports
│   ├── dsl/
│   │   ├── ast.ts                   # AST type definitions
│   │   ├── parser.ts                # source string → AST
│   │   ├── analyzer.ts              # static analysis (deps, scopes)
│   │   ├── serializer.ts            # AST → source string (for the inspector)
│   │   └── grammar.test.ts          # tests
│   ├── value-objects/
│   │   ├── recordset.ts             # the in-memory representation
│   │   ├── timestamps.ts            # time-zone-safe time handling
│   │   └── ids.ts                   # ULID generation
│   └── errors/
│       └── cell-errors.ts           # typed error definitions
│
├── runtime/                         # Layer 2
│   ├── core/
│   │   ├── cell-registry.ts         # the in-memory registry
│   │   ├── cell-state-machine.ts    # the six states + transitions
│   │   └── observation.ts           # subscription management
│   ├── reactive/
│   │   ├── dependency-graph.ts      # deps & dependents tracking
│   │   ├── push-phase.ts            # invalidation walk
│   │   ├── pull-phase.ts            # recomputation walk
│   │   ├── topological-sort.ts      # the sort itself
│   │   └── scheduler.ts             # priority queue + concurrency
│   ├── evaluator/
│   │   ├── eval-context.ts          # EvalContext construction
│   │   ├── interpret.ts             # AST tree-walker
│   │   ├── source-clauses.ts        # `from drive.files` etc
│   │   ├── filter-clauses.ts        # `where ...`
│   │   ├── transform-clauses.ts     # `sort`, `take`, `group`
│   │   ├── enrich-clauses.ts        # `enrich each with agent(...)`
│   │   └── render-clauses.ts        # `show as feed` etc
│   └── tests/
│       ├── reactive.test.ts
│       ├── scheduler.test.ts
│       └── evaluator.test.ts
│
├── effects/                         # Layer 2 (still inner; effects but isolated)
│   ├── mcp/
│   │   ├── client.ts                # MCP client interface
│   │   ├── connectors/
│   │   │   ├── drive.ts             # Google Drive specifics
│   │   │   ├── gmail.ts             # Gmail specifics
│   │   │   └── calendar.ts          # Calendar specifics
│   │   ├── transport-http.ts        # HTTP transport
│   │   ├── oauth.ts                 # OAuth 2.1 + PKCE flow
│   │   └── tokens.ts                # token storage interface
│   ├── agent/
│   │   ├── client.ts                # LLM provider interface
│   │   ├── providers/
│   │   │   ├── anthropic.ts
│   │   │   └── openai.ts            # if v2
│   │   ├── budget.ts                # budget tracker
│   │   └── prompts.ts               # prompt templates
│   ├── storage/
│   │   ├── automerge-store.ts       # Automerge repo wrapper
│   │   ├── cache-store.ts           # local cache layer
│   │   ├── audit-store.ts           # audit log
│   │   ├── platform/
│   │   │   ├── sqlite-native.ts     # Capacitor SQLite
│   │   │   ├── indexeddb-web.ts     # IndexedDB web fallback
│   │   │   └── platform-select.ts   # picks the right one at runtime
│   │   └── tokens-secure.ts         # OAuth token secure storage
│   └── network/
│       ├── sync-client.ts           # automerge-repo sync connection
│       ├── connectivity.ts          # online/offline detection
│       └── retry.ts                 # retry/backoff policies
│
├── ui-system/                       # Layer 3
│   ├── components/
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Surface/                 # the cell shell
│   │   ├── FreshnessIndicator/      # the freshness dot
│   │   ├── Icon/
│   │   ├── ...                      # one folder per primitive
│   ├── tokens/
│   │   ├── colors.ts                # the 12-step semantic palette
│   │   ├── typography.ts            # type scale
│   │   ├── spacing.ts               # 4pt grid values
│   │   └── motion.ts                # easing curves
│   ├── renderers/
│   │   ├── feed-renderer.tsx        # one of the 13 built-in renderers
│   │   ├── grid-renderer.tsx
│   │   ├── timeline-renderer.tsx
│   │   ├── ...
│   │   └── renderer-registry.ts     # map of rendererId → component
│   └── theme/
│       ├── theme.ts                 # ties tokens together
│       └── ThemeProvider.tsx
│
├── adapters/                        # Layer 3
│   ├── react/
│   │   ├── hooks/
│   │   │   ├── useCell.ts           # subscribe to a cell's value/state
│   │   │   ├── useLens.ts           # observe a lens
│   │   │   ├── useConnection.ts     # observe connector state
│   │   │   ├── useBudget.ts         # observe agent budget
│   │   │   └── useAuditLog.ts       # observe audit log
│   │   ├── context/
│   │   │   ├── RuntimeContext.tsx   # provides runtime to React tree
│   │   │   ├── DocsContext.tsx      # provides Automerge docs
│   │   │   └── ServicesContext.tsx  # provides services map
│   │   └── boundaries/
│   │       ├── ErrorBoundary.tsx
│   │       └── SuspenseBoundary.tsx
│   ├── capacitor/
│   │   ├── plugins.ts               # Capacitor plugin registry
│   │   ├── lifecycle.ts             # app pause/resume hooks
│   │   ├── deep-links.ts            # OAuth callback handling
│   │   └── notifications.ts         # local notification adapter
│   └── voice/
│       ├── voice-input.ts           # speech-to-text wrapper
│       └── audio-capture.ts         # mic capture
│
├── features/                        # Layer 4
│   ├── canvas/
│   │   ├── Canvas.tsx               # the spatial canvas
│   │   ├── LensSwap.tsx             # the iris swap animation
│   │   ├── CanvasGesture.tsx        # pan/zoom/tap gestures
│   │   └── components/
│   ├── lens-overview/
│   │   ├── LensOverview.tsx
│   │   ├── LensThumbnail.tsx
│   │   └── ...
│   ├── cell-inspector/
│   │   ├── CellInspector.tsx
│   │   ├── DSLEditor.tsx
│   │   └── ProvenancePanel.tsx
│   ├── onboarding/
│   │   ├── OnboardingFlow.tsx       # the 5-minute flow
│   │   ├── ConnectionStep.tsx
│   │   ├── MiningStep.tsx
│   │   └── ProposalStep.tsx
│   ├── connections/
│   │   ├── ConnectionsPanel.tsx
│   │   ├── ConnectorCard.tsx
│   │   ├── ConnectionDetail.tsx
│   │   └── ScopeUpgrade.tsx
│   ├── intent-preview/
│   │   ├── IntentPreviewModal.tsx
│   │   ├── ActionList.tsx
│   │   └── HoldToConfirm.tsx
│   ├── audit-log/
│   │   └── AuditLogView.tsx
│   ├── settings/
│   │   └── ...
│   ├── starter-pack/
│   │   ├── StarterPackBrowser.tsx
│   │   └── LensInstaller.tsx
│   ├── capture/
│   │   ├── QuickCapture.tsx
│   │   └── VoiceCapture.tsx
│   └── mining/
│       ├── MiningRunner.tsx         # the background mining algorithm
│       ├── ProposalCard.tsx
│       └── algorithm/
│           ├── deep-scan.ts
│           ├── theme-detection.ts
│           └── trigger-detection.ts
│
├── app/                             # Layer 5
│   ├── App.tsx                      # root component
│   ├── routes/                      # if using a router
│   │   ├── CanvasRoute.tsx
│   │   ├── SettingsRoute.tsx
│   │   └── OnboardingRoute.tsx
│   ├── boot/
│   │   ├── compose-runtime.ts       # wire runtime dependencies
│   │   ├── compose-effects.ts       # wire effects to runtime
│   │   ├── load-user.ts             # initial user state load
│   │   └── start.ts                 # boot orchestration
│   ├── config/
│   │   ├── env.ts                   # environment variables
│   │   ├── constants.ts             # app constants
│   │   └── feature-flags.ts         # feature flagging
│   └── main.tsx                     # Vite entry point
│
└── shared/                          # cross-cutting utilities (rare)
    ├── logger.ts                    # structured logging
    ├── error-reporting.ts           # crash reporter
    └── types.ts                     # truly app-wide types
```

The structure is deliberately verbose. The cost of an extra folder is small; the benefit of explicit boundaries is large. Anyone navigating the codebase can find what they need by following the structure.

---

## 3. Dependency rules

Beyond the layer rule (outer imports inner only), there are sub-rules within layers:

### 3.1 Within domain/

- `types/` can be imported by everything else in domain/
- `dsl/` can import from `types/` and `value-objects/`
- `value-objects/` can import from `types/`
- No file in domain/ imports anything outside domain/

### 3.2 Within runtime/ and effects/

- `runtime/core/` can be imported by everything in runtime/
- `runtime/reactive/` imports from `runtime/core/` and domain
- `runtime/evaluator/` imports from `runtime/core/`, `runtime/reactive/`, domain, and effects (through interfaces, see section 4)
- `effects/` modules import from domain and may use each other (e.g., `effects/agent/budget.ts` may use `effects/storage/audit-store.ts` to log calls)

### 3.3 Within ui-system/ and adapters/

- `ui-system/` imports from domain only (for types)
- `adapters/react/hooks/` imports from runtime, effects, and ui-system
- `adapters/capacitor/` imports from effects (e.g., for plugin instances)

### 3.4 Within features/

- Each feature folder is self-contained: its own components, its own logic, its own subfolders
- Features can import from domain, runtime, effects, ui-system, adapters
- Features should NOT import from each other directly. Cross-feature coordination happens through app-level composition or shared events

### 3.5 Within app/

- Imports from everywhere
- Wires dependencies through composition roots in `boot/`
- Contains the only `new Whatever()` calls for high-level infrastructure

### 3.6 Within shared/

- No imports from anywhere else in src/
- Pure utilities only

### 3.7 Enforcement

The rules are enforced by ESLint with `eslint-plugin-boundaries`:

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['boundaries'],
  settings: {
    'boundaries/elements': [
      { type: 'domain', pattern: 'src/domain/**' },
      { type: 'runtime', pattern: 'src/runtime/**' },
      { type: 'effects', pattern: 'src/effects/**' },
      { type: 'ui-system', pattern: 'src/ui-system/**' },
      { type: 'adapters', pattern: 'src/adapters/**' },
      { type: 'features', pattern: 'src/features/**' },
      { type: 'app', pattern: 'src/app/**' },
      { type: 'shared', pattern: 'src/shared/**' }
    ]
  },
  rules: {
    'boundaries/element-types': ['error', {
      default: 'disallow',
      rules: [
        { from: 'domain', allow: ['domain'] },
        { from: 'runtime', allow: ['domain', 'runtime', 'effects', 'shared'] },
        { from: 'effects', allow: ['domain', 'effects', 'shared'] },
        { from: 'ui-system', allow: ['domain', 'ui-system', 'shared'] },
        { from: 'adapters', allow: ['domain', 'runtime', 'effects', 'ui-system', 'shared'] },
        { from: 'features', allow: ['domain', 'runtime', 'effects', 'ui-system', 'adapters', 'shared'] },
        { from: 'app', allow: ['domain', 'runtime', 'effects', 'ui-system', 'adapters', 'features', 'shared'] },
        { from: 'shared', allow: ['shared'] }
      ]
    }]
  }
}
```

Build fails on violation. The rule is non-negotiable — the architecture only works if it's enforced.

---

## 4. Abstraction boundaries (ports and adapters)

A specific pattern: anywhere the runtime needs to make I/O calls, the runtime depends on an *interface*, not a concrete implementation. The concrete implementation is in `effects/` and is injected at composition time.

### 4.1 The McpClient interface

```typescript
// In runtime/core/ports.ts (the "port")
export interface McpClient {
  call(
    connectorId: string, 
    toolName: string, 
    params: any, 
    options?: { signal?: AbortSignal; cacheKey?: string }
  ): Promise<any>
  
  isHealthy(connectorId: string): boolean
  getHealth(connectorId: string): ConnectionHealth
  
  onHealthChange(callback: (id: string, h: ConnectionHealth) => void): Unsubscribe
}
```

The runtime imports `McpClient` and uses it. The concrete implementation in `effects/mcp/client.ts` *implements* `McpClient`. At app boot, `app/boot/compose-effects.ts` constructs the concrete and passes it to the runtime.

This is dependency inversion: the runtime defines what it needs; the effects layer provides what the runtime needs.

### 4.2 Benefits

- **Testing**: runtime tests substitute a `FakeMcpClient` that returns canned responses
- **Platform switching**: a future desktop port could swap `effects/mcp/transport-http.ts` for a `transport-stdio.ts` without touching the runtime
- **Mocking in development**: synthetic MCP server testing fixture from the runtime doc plugs in here

### 4.3 Other key ports

The runtime defines ports for:

- `McpClient` (as above)
- `AgentClient` (LLM calls)
- `BudgetTracker` (agent budget enforcement)
- `Storage<T>` (cache layer)
- `AuditLogger` (audit recording)
- `Clock` (for deterministic time in tests)
- `Logger`

Each has a single concrete implementation in production and a fake/mock implementation in tests.

---

## 5. The composition root

Dependency wiring happens in exactly one place: `app/boot/`.

```typescript
// app/boot/compose-effects.ts
import { McpClient } from '../../runtime/core/ports'
import { McpClientImpl } from '../../effects/mcp/client'
import { AnthropicAgentClient } from '../../effects/agent/providers/anthropic'
import { SqliteStorage } from '../../effects/storage/platform/sqlite-native'
// ... etc

export async function composeEffects(env: Environment) {
  const storage = await SqliteStorage.open(env.dbPath)
  const tokenStore = new SecureTokenStore()
  const mcp = new McpClientImpl(tokenStore, storage)
  const agent = new AnthropicAgentClient(env.anthropicApiKey)
  const budget = new BudgetTracker(storage)
  const audit = new AuditLogger(storage)
  
  return { storage, mcp, agent, budget, audit }
}

// app/boot/compose-runtime.ts
import { Runtime } from '../../runtime'

export function composeRuntime(effects: Effects) {
  return new Runtime({
    mcp: effects.mcp,
    agent: effects.agent,
    budget: effects.budget,
    audit: effects.audit,
    storage: effects.storage,
  })
}

// app/boot/start.ts
async function bootstrap() {
  const env = loadEnvironment()
  const effects = await composeEffects(env)
  const runtime = composeRuntime(effects)
  
  // Inject into React
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <RuntimeProvider runtime={runtime}>
      <EffectsProvider effects={effects}>
        <App />
      </EffectsProvider>
    </RuntimeProvider>
  )
}
```

This is the *one place* where concrete classes are instantiated. Everywhere else uses interfaces.

---

## 6. React integration

The React layer talks to the runtime through hooks (`adapters/react/hooks/`). Hooks subscribe to runtime state and trigger re-renders.

### 6.1 The useCell hook (the most important one)

```typescript
// adapters/react/hooks/useCell.ts
import { useEffect, useState, useContext } from 'react'
import { RuntimeContext } from '../context/RuntimeContext'

export function useCell(cellId: string) {
  const runtime = useContext(RuntimeContext)
  const [cell, setCell] = useState(() => runtime.cells.getCell(cellId))
  
  useEffect(() => {
    // Subscribe — this also marks the cell as observed
    const sub = runtime.cells.observe(cellId)
    
    // Listen for changes
    const unsub = sub.onChange((newCell) => {
      setCell(newCell)
    })
    
    return () => {
      unsub()
      sub.unsubscribe()
    }
  }, [cellId])
  
  return cell
}
```

A component that calls `useCell('abc')` gets the current cell state (state, value, error), and re-renders whenever it changes. The hook also signals to the runtime that this cell is observed, which triggers re-evaluation if stale.

### 6.2 Why useSyncExternalStore is also viable

React 18's `useSyncExternalStore` is designed for exactly this case. The implementation above can be rewritten with `useSyncExternalStore` for slightly better concurrent-rendering integration. The choice is implementation detail; the hook API to the rest of the codebase doesn't change.

### 6.3 React Compiler

The 2026 React Compiler (formerly React Forget) auto-memoizes components. Wovith uses it. This means components don't need manual `useMemo`/`useCallback` wrapping in most cases — the compiler handles it.

The implications:
- Hook returns can be unmemoized; the compiler stabilizes references
- Less boilerplate in components
- Compatible with the architecture above

### 6.4 Why not Redux / Zustand / Jotai?

Wovith's state has unusual characteristics:
- Most "state" is derived from CRDT documents (Automerge handles persistence)
- Reactivity needs to span async boundaries (cells await MCP calls)
- The reactivity model is push-pull, not pure reactive

A generic state library would either be too generic (require manual setup of subscriptions) or imposing the wrong model (Redux's pure-functional reducer model doesn't match cell evaluation).

Wovith's runtime *is* the state library. The hooks are the React adapter. No Redux, Zustand, Jotai, or Recoil layer in between.

---

## 7. Capacitor specifics

Capacitor 8 wraps the React app in a native WebView. The architecture treats Capacitor as a *platform* — code in `adapters/capacitor/` knows about Capacitor APIs; nothing else does.

### 7.1 The plugin pattern

Each Capacitor plugin Wovith uses gets a thin wrapper in `adapters/capacitor/`:

```typescript
// adapters/capacitor/plugins.ts
import { CapacitorSQLite } from '@capacitor-community/sqlite'
import { SecureStoragePlugin } from '@capacitor-community/secure-storage-plugin'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Filesystem } from '@capacitor/filesystem'

export const plugins = {
  sqlite: CapacitorSQLite,
  secureStorage: SecureStoragePlugin,
  app: App,
  browser: Browser,
  fs: Filesystem,
}
```

Effect modules import `plugins.x` rather than importing the Capacitor plugin directly. This indirection allows substitution in tests and on web (where many plugins have no-op implementations).

### 7.2 Platform detection

```typescript
// adapters/capacitor/platform.ts
import { Capacitor } from '@capacitor/core'

export function getPlatform(): 'android' | 'ios' | 'web' | 'desktop' {
  if (Capacitor.getPlatform() === 'android') return 'android'
  if (Capacitor.getPlatform() === 'ios') return 'ios'
  // ... etc
  return 'web'
}

export const isNative = getPlatform() === 'android' || getPlatform() === 'ios'
```

Effect modules check `isNative` to decide whether to use SQLite or IndexedDB, secure storage or WebCrypto-encrypted IndexedDB.

### 7.3 OAuth deep links

OAuth flows use Capacitor's Browser plugin to open the system browser. The callback URL is registered with Capacitor's deep-link handler:

```typescript
// adapters/capacitor/deep-links.ts
App.addListener('appUrlOpen', (data) => {
  const url = new URL(data.url)
  if (url.pathname === '/oauth-callback') {
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    oauthFlow.handleCallback(code, state)
  }
})
```

This is the cleanest pattern for OAuth on Capacitor — embedded WebView OAuth is discouraged for both security and UX reasons.

---

## 8. Testing strategy

### 8.1 Unit tests (Vitest)

Pure-logic modules in `domain/` and `runtime/core/` have unit tests:

- AST parser: feed it strings, assert AST shape
- Topological sort: feed it dependency graphs, assert ordering
- State machine transitions: assert state-X with event-Y produces state-Z

Coverage target: >90% on `domain/` and `runtime/core/`. These are pure logic and should always pass tests fast.

### 8.2 Integration tests (Vitest with fakes)

The full runtime is tested with fake effects:

```typescript
// runtime/tests/scenarios/morning-brief.test.ts
import { Runtime } from '../../index'
import { FakeMcpClient } from '../../../tests/fakes/fake-mcp-client'
import { FakeAgentClient } from '../../../tests/fakes/fake-agent-client'

test('morning brief lens evaluates correctly', async () => {
  const mcp = new FakeMcpClient({
    'gmail.threads': mockGmailThreads(),
    'calendar.events': mockCalendarEvents(),
    'drive.files': mockDriveFiles(),
  })
  const agent = new FakeAgentClient({ /* canned responses */ })
  
  const runtime = new Runtime({ mcp, agent, /* ... */ })
  
  const lensDef = readFixture('morning-brief-lens.json')
  await runtime.lenses.load(lensDef)
  
  const observation = runtime.lenses.observe(lensDef.lensId)
  await observation.waitForFresh()
  
  expect(observation.cellValues['decisions-today']).toMatchObject({
    items: expect.arrayContaining([/* expected shape */])
  })
})
```

These run in CI on every PR. They're the primary safety net.

### 8.3 Component tests (Vitest + Testing Library)

UI components render in JSDOM with the runtime mocked. Assertions on what the user sees.

### 8.4 End-to-end tests (Playwright)

The full app, real browser, real (synthetic) MCP server:

- A `synthetic-mcp-server` Node.js process serves canned MCP responses
- Playwright drives the Capacitor WebView (or browser build) through real user flows
- Assertions cover: install → onboard → see first lens → author cell → swap lens → disconnect → reconnect

E2E runs nightly and on release branches; too slow for every PR.

### 8.5 The fakes folder

Fake implementations of all the ports live in `tests/fakes/`:

- `FakeMcpClient`: returns canned responses keyed by tool+params
- `FakeAgentClient`: returns canned LLM responses keyed by prompt fingerprint
- `FakeBudgetTracker`: in-memory budget for tests
- `FakeStorage`: in-memory key-value
- `FakeAuditLogger`: in-memory ring buffer
- `FakeClock`: time you can advance manually

The fakes are kept simple. They don't try to simulate every nuance — they implement enough to support the tests that use them.

---

## 9. Build and bundling

### 9.1 Vite configuration

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    react(),
    visualizer(),               // bundle analysis
    // React Compiler is on
  ],
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'runtime': ['./src/runtime/index.ts'],
          'vendor-automerge': ['@automerge/automerge', '@automerge/automerge-repo'],
          'vendor-react': ['react', 'react-dom'],
        }
      }
    }
  },
  resolve: {
    alias: {
      '@domain': '/src/domain',
      '@runtime': '/src/runtime',
      '@effects': '/src/effects',
      '@ui': '/src/ui-system',
      '@adapters': '/src/adapters',
      '@features': '/src/features',
      '@app': '/src/app',
      '@shared': '/src/shared',
    }
  }
})
```

Imports use the path aliases. This:
- Makes layer-violation visually obvious in code review
- Keeps imports short
- Plays nicely with the eslint-boundaries enforcement

### 9.2 Capacitor build

`npx cap sync` after each Vite build copies assets into the Android project. CI builds the APK from the synced project.

### 9.3 Code splitting

Each feature in `features/` is its own chunk. Routes lazy-load:

```typescript
// app/routes/SettingsRoute.tsx
const SettingsPanel = lazy(() => import('@features/settings/SettingsPanel'))
```

Initial bundle is the runtime + canvas feature + lens-overview + auth — everything else lazy-loads. Target: under 300 KB for the initial chunk (gzipped).

---

## 10. Cross-cutting concerns

### 10.1 Logging

Structured logging via `shared/logger.ts`:

```typescript
import { logger } from '@shared/logger'

logger.info('cell.evaluated', { cellId, durationMs, cacheHit })
logger.warn('mcp.timeout', { connectorId, toolName })
logger.error('cell.failed', { cellId, error })
```

Log levels: `trace`, `debug`, `info`, `warn`, `error`. Configurable per-environment. In production, only `warn` and `error` ship to telemetry (opt-in).

### 10.2 Error reporting

`shared/error-reporting.ts` wraps a crash reporter (Sentry, BugSnag, or self-hosted). Errors are reported with:
- The error itself
- Breadcrumbs (the last N log entries)
- The user's masked ID
- The app version, platform, OS version
- No user data, no document contents

Opt-in by default. The first crash prompts the user to send.

### 10.3 Feature flags

`app/config/feature-flags.ts` reads from environment + remote config:

```typescript
export const features = {
  E2E_ENCRYPTION: env.E2E_ENCRYPTION_ENABLED === 'true',
  BACKGROUND_MINING: remote.background_mining_rolled_out === true,
  AGENT_TEAMS_PREVIEW: false,
}
```

Used at composition time to choose code paths or implementations.

### 10.4 Internationalization

`shared/i18n.ts` wraps a translation library (likely `react-intl` or `lingui`). English strings are the source; localized strings come from translator-authored JSON files.

The voice doc commits to English at v1, so i18n infrastructure is in place but lightly used.

---

## 11. Development workflow

### 11.1 Local development

```bash
pnpm dev          # vite dev server, web-only
pnpm dev:android  # vite + cap run android
pnpm test         # vitest in watch mode
pnpm test:e2e     # playwright
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
```

### 11.2 The synthetic MCP server

`tools/synthetic-mcp-server/` is a Node.js MCP server that serves canned responses:

```bash
pnpm synthetic-mcp     # starts on localhost:8888
```

In development, Wovith's `effects/mcp/client.ts` can be configured to point at `localhost:8888` for any connector. This lets you develop without burning real API calls, with deterministic data, and with controllable error injection.

### 11.3 Pre-commit hooks

Husky + lint-staged:
- ESLint with autofix
- Prettier with autofix
- TypeScript check (only changed files)
- Tests related to changed files

Pre-push:
- Full type check
- Full lint
- Full unit tests

### 11.4 CI

GitHub Actions:
- On every PR: typecheck + lint + unit tests + integration tests
- On main: above + e2e tests + Android build
- On release tag: above + Play Store upload (manual approval)

---

## 12. The dependency direction in one diagram

A simpler visualization, dependency arrows pointing inward:

```
                  ┌────────────────┐
                  │      app       │
                  └───────┬────────┘
                          ↓
            ┌─────────────┼─────────────┐
            ↓             ↓             ↓
       ┌─────────┐   ┌─────────┐   ┌─────────────┐
       │features │   │adapters │   │  ui-system  │
       └────┬────┘   └────┬────┘   └──────┬──────┘
            │             │               │
            └─────┬───────┴───────┬───────┘
                  ↓               ↓
            ┌─────────┐     ┌─────────┐
            │ runtime │ ←── │ effects │
            └────┬────┘     └────┬────┘
                 │               │
                 └───────┬───────┘
                         ↓
                   ┌──────────┐
                   │  domain  │
                   └──────────┘
```

Arrows mean "may import from." All arrows point toward the domain. The domain depends on nothing.

---

## 13. What about monorepos and workspaces?

Wovith starts as a single package. There's no current need to split into multiple workspaces.

A natural future split, when justified:

- `@wovith/runtime` (the runtime + domain) — could be open-sourced
- `@wovith/effects` — internal
- `@wovith/ui` — could be open-sourced as a component library
- `@wovith/app` — the actual product

But this is a refactor for later, when the boundaries between these are stable enough to lock in a package API. v1: single repo.

---

## 14. Migration path for early code

Chris already has Pack Connect using this stack. Some patterns will be familiar, some new:

**Already in place:**
- React 18 + TypeScript + Vite + Tailwind
- Supabase auth and DB
- Capacitor 8 with Android target
- The general directory hygiene

**New for Wovith:**
- The strict layer separation (Pack Connect is more conventional React)
- The runtime layer (Pack Connect doesn't have a runtime; CRUD apps don't need one)
- Automerge in addition to Supabase tables
- The hexagonal pattern with explicit ports

The first weeks of coding should establish the layer structure and enforce it with ESLint *before* much code is written. Adding the boundaries discipline retroactively is painful; getting it right at the start is mostly free.

---

## 15. Cross-doc check

Consistent with:
- **Cell runtime doc**: the runtime layer is exactly the structure specified there
- **Data architecture doc**: storage adapters in `effects/storage/`, the Automerge schema lives in domain types
- **Concept**: local-first, MCP-native, agentic — all manifest through this architecture
- **DSL**: parser lives in `domain/dsl/`
- **Renderer spec**: renderers live in `ui-system/renderers/`
- **Design system**: tokens in `ui-system/tokens/`
- **Voice**: copy lives wherever the surface is (in features); the voice principles are documented separately
- **Security**: capability gating sits in `effects/mcp/`, scope enforcement at the OAuth flow level
- **Onboarding**: the mining algorithm lives in `features/mining/algorithm/`
- **Connector UX**: each connector has its module in `effects/mcp/connectors/`
- **GTM**: no overlap

No conflicts identified.

---

## 16. What this document does not cover

- The MCP client implementation details (see `wovith_mcp_client.md`)
- The agent client implementation details (see `wovith_agentic_budget.md`)
- The provenance graph data model (see `wovith_provenance_graph.md`)
- The sync relay API surface (see `wovith_sync_relay.md`)
- The calibration state computation (see `wovith_calibration_state.md`)
- The agent budget enforcement specifics (see `wovith_agentic_budget.md`)
- Specific CI configurations
- Deployment infrastructure (TestFlight, Play Store, web hosting)
- The legal docs (TOS, Privacy Policy)

---

## References

- *Hexagonal-Inspired Architecture in React* (Alex Kondov)
- *Atomic Hexagonal Architecture on the Frontend with React* (Kong To, 2025)
- Feature-Sliced Design methodology (feature-sliced.design)
- *The Best React.js Architecture for 2026* (Albert Barsegyan, Apr 2026)
- *Frontend Architecture Patterns* (Udara Senarath, Mar 2026)
- React 18 concurrent rendering docs
- React Compiler documentation (formerly React Forget)
- `eslint-plugin-boundaries` documentation
- Capacitor 8 documentation
- The cell runtime and data architecture docs (sibling foundational specs)
