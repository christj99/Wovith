# Current Stage

## Stage 0: Synthetic Runtime Prototype

Wovith is currently at **Stage 0**. This repo now contains a working local web prototype that proves the core lens loop with deterministic synthetic data:

```text
synthetic source -> cell AST -> canonical DSL -> validation -> evaluation -> renderer -> provenance/Why panel -> local persistence
```

The current prototype is intentionally small. It is a lens-first runtime, not a chatbot, not a broad connector platform, and not an automation system.

## Current Outcome

The app runs as a Vite + React + TypeScript web app. The first usable screen is the **Daily Work Lens**, which contains four starter cells:

- **Unread Important Messages** from `synthetic.mail.threads`
- **Upcoming Meetings** from `synthetic.calendar.events`
- **Recently Changed Docs** from `synthetic.drive.files`
- **Stale Tasks Due Soon** from `synthetic.tasks`

Each cell is backed by a typed AST and a deterministic canonical DSL string. Users can inspect and edit the DSL in the cell editor, save it, re-evaluate the cell, and see validation errors when a rule is invalid.

The UI currently supports:

- lens list/sidebar
- Daily Work Lens detail view
- cell cards with freshness state
- manual cell refresh and refresh-all
- canonical DSL editor
- renderer output for `list`, `count`, `table`, and `raw`
- item-level **Why** buttons
- Why panel with plain-language reason, rule trace, evidence details, evaluation metadata, and raw evidence
- local browser persistence for lens definitions and recent evaluation results

## What Was Implemented

### Project Foundation

Added a strict TypeScript frontend project:

- Vite
- React
- TypeScript strict mode
- Vitest
- ESLint
- Prettier config/script
- path alias support through `@/*`

The canonical handoff docs were copied into:

- `docs/canonical_docs/`
- `docs/schema_patches/`

Stage tracking files were added:

- `CURRENT_STAGE.md`
- `DEFERRED_FEATURES.md`
- `README.md`

### Domain Model

Implemented core Stage 0 domain types under `src/domain/`, including:

- branded IDs for lenses, cells, sources, evaluations, evidence, snapshots, and timestamps
- `CellAst`
- `LensDefinition`
- `CellDefinition`
- source schema types
- renderer payload types
- freshness state
- evaluation result type
- provenance evidence and snapshot types
- trust/taint labels for source values

Synthetic fixture text that represents external/user-originated content is labeled as `external-content` or connector metadata rather than trusted system instruction.

### Source Schema Registry

Implemented Stage 0 source schemas for:

- `synthetic.mail.threads`
- `synthetic.calendar.events`
- `synthetic.drive.files`
- `synthetic.tasks`

Each schema defines fields, field types, allowed operators, sortability, sensitivity, external-content flags, and renderer hints.

### Synthetic Source Adapter

Implemented deterministic fixture data and a local synthetic adapter under `src/sources/`.

The fixtures include:

- unread/read mail threads
- important and newsletter-like messages
- calendar events, including past and future meetings
- Drive-style file metadata
- stale and recently modified docs
- tasks with due dates, completion state, project, and priority

No external APIs are used in Stage 0.

### Canonical DSL

Implemented AST-first canonical DSL support under `src/dsl/`.

Current supported clauses:

```text
from <source>
where <field> is <value>
where <field> is not <value>
where <field> contains <value>
where <field> before <time_expr>
where <field> after <time_expr>
where <field> on or before <time_expr>
where <field> on or after <time_expr>
where <field> greater than <number>
where <field> less than <number>
sort by <field> asc|desc
take <number>
show as list|count|table|raw
```

Current supported value forms:

- quoted strings
- numbers
- booleans
- `null`
- `now()`
- `today()`
- `days_ago(n)`
- `in_days(n)`

The serializer emits one deterministic canonical form. The parser intentionally accepts only canonical Stage 0 syntax.

### Validation

Implemented AST validation against the source schema registry.

Validation currently catches:

- unknown sources
- unknown fields
- operators not allowed for a field
- type mismatches
- unsupported renderers
- invalid `take` limits
- unbounded query warnings
- external-content-read warnings

Invalid cells fail visibly instead of rendering blank output.

### Runtime Evaluation

Implemented a deterministic local evaluator under `src/runtime/`.

The evaluator currently:

- validates the AST before execution
- reads from the synthetic source adapter
- filters records in memory
- sorts records
- applies `take`
- creates renderer payloads
- records provenance evidence for every rendered item
- creates evaluation snapshots
- returns typed freshness/error state

Stage 0 evaluation is read-only and has no external side effects.

### Renderers

Implemented the four Stage 0 renderers:

- `list`
- `count`
- `table`
- `raw`

Renderers receive already-evaluated typed payloads. They do not query sources, write data, or make trust decisions.

### Provenance and Why Panel

Implemented item-level provenance and Why explanations under `src/provenance/`.

Every rendered item has evidence that can explain:

- source
- item ID
- matched predicates
- sort evidence
- source timestamp when available
- evidence recording time
- selected fields
- redacted previews for sensitive fields
- evaluation snapshot metadata

The UI exposes this through the **Why** panel.

### Local Persistence

Implemented a replaceable Stage 0 local store in `src/storage/local-store.ts`.

The store currently persists:

- lens definitions
- cell definitions
- recent evaluation results
- recent snapshots/evidence attached to evaluation results

The current backing store is browser `localStorage`, with an in-memory storage implementation for tests.

## Verification

The current implementation was verified with:

```text
corepack pnpm test
corepack pnpm build
corepack pnpm lint
```

Current test status:

- 5 test files passing
- 69 tests passing
- 50+ valid golden DSL examples
- invalid DSL syntax cases
- parser/serializer round-trip tests
- AST validation tests
- source schema compatibility tests
- synthetic runtime evaluation tests
- renderer payload tests through runtime coverage
- provenance and Why explanation tests
- local persistence tests

The local app was also opened in the browser at:

```text
http://127.0.0.1:5173
```

Browser sanity checks confirmed:

- Wovith page loads
- Daily Work Lens renders
- canonical DSL editor appears
- result items render
- Why panel opens
- no browser console errors were observed during the check

## Current Demo Script

The current prototype supports this Stage 0 demo:

1. Open Wovith.
2. Select **Daily Work Lens**.
3. See cells for unread messages, upcoming meetings, recent docs, and stale tasks.
4. Open or use the cell editor.
5. Inspect canonical DSL.
6. Modify a predicate.
7. Save the cell.
8. Re-evaluate the cell.
9. Click **Why** on a rendered item.
10. Inspect source, predicate evidence, rule trace, and evaluation metadata.
11. Reload the browser and see the saved lens/cell definitions persist locally.

## Important Boundaries

Stage 0 deliberately does **not** include:

- real Google connectors
- OAuth
- Gmail send/delete/modify
- arbitrary MCP servers
- marketplace
- mobile app
- widgets
- custom renderers
- sync relay
- E2E sync claims
- hidden local/browser/app scanning
- autonomous background actions
- model/NL integration

The current code should not make privacy or connector claims beyond what is implemented. Wovith is local-first here for lens definitions and local evaluation state only. External sources are synthetic fixtures in Stage 0.

## Known Limitations

- There is no real connector or OAuth flow yet.
- There is no natural-language-to-AST compiler yet.
- The evaluator does all filtering/sorting in memory.
- Persistence uses browser `localStorage`, not IndexedDB or Automerge.
- The scheduler is simple manual/on-open evaluation, not a full background scheduler.
- Freshness states are present but minimal.
- UI polish is functional prototype quality.
- There are no Playwright E2E tests yet, only browser sanity checks plus unit/runtime tests.

## Best Next Steps

Recommended next implementation work:

1. Add a small runtime scheduler abstraction for duplicate in-flight prevention and TTL stale marking.
2. Add focused UI tests or Playwright E2E coverage for edit/save/reload/Why.
3. Improve the DSL editor feedback with structured validation warnings.
4. Add a cache/evidence clear command.
5. Add `STAGE_0_DEMO.md` with acceptance checklist and screenshots.
6. Only after Stage 0 hardening, begin Stage 0.5 with one read-only real connector.

Out-of-scope features remain listed in [DEFERRED_FEATURES.md](DEFERRED_FEATURES.md).
