# Current Stage

## Stage 0.5: Google Calendar Read-Only Connector

Wovith is currently at **Stage 0.5**. This repo contains the hardened Stage 0 local web prototype plus exactly one real read-only connector: Google Calendar events.

```text
source -> cell AST -> canonical DSL -> validation -> scheduler/evaluation -> renderer -> provenance/Why panel -> redacted local persistence
```

The current prototype remains intentionally small. It is a lens-first runtime, not a chatbot, not a broad connector platform, and not an automation system.

## Current Outcome

The app runs as a Vite + React + TypeScript web app. The first usable screen is still the **Daily Work Lens**, which contains four synthetic starter cells:

- **Unread Important Messages** from `synthetic.mail.threads`
- **Upcoming Meetings** from `synthetic.calendar.events`
- **Recently Changed Docs** from `synthetic.drive.files`
- **Stale Tasks Due Soon** from `synthetic.tasks`

Stage 0.5 adds an optional **Google Upcoming Events** cell from `google.calendar.events` after the user connects Google Calendar read-only access. If the cell exists while the connector is disconnected, it shows a visible blocked state instead of falling back to synthetic data.

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
- Google Calendar connector panel with setup, connect, connected, disconnect, expired/error, and blocked states

## Stage 0 Hardening Status

Stage 0 has now been hardened for the first read-only connector later, without starting Stage 0.5.

The hardening pass added:

- snapshot-aware persistence that stores redacted evaluation records by `snapshotPolicy.tier`
- explicit cache/evidence clearing from storage and UI
- a runtime scheduler with duplicate in-flight refresh prevention
- refresh-all and on-open refresh paths through the scheduler
- TTL stale marking support in the scheduler
- visible blocked results for missing source schemas or source adapters
- stricter canonical DSL parsing for duplicate/late clauses
- documented AST comparison normalization for typed date/datetime/enum literals
- null/invalid date predicate safety
- explicit `EvaluationClock` with Stage 0 demo timezone `America/New_York`
- renderer/display-field warnings for external or sensitive display output
- truthful synthetic source capabilities set to `local-only`
- Playwright E2E coverage for the golden Daily Work Lens loop
- basic GitHub Actions CI for lint, format, unit tests, build, and E2E

The hardening pass did **not** add real connectors, OAuth, Gmail, MCP, NL/model integration, mobile, sync, Automerge, marketplace, widgets, payments, or background autonomous actions.

## Stage 0.5 Status

Stage 0.5 adds only:

- `google.calendar.events` source schema
- Google Calendar read-only browser token flow using Google Identity Services
- in-memory access-token handling
- Google Calendar REST `events.list` adapter for the primary calendar
- optional Google Upcoming Events cell using canonical DSL bounded to the next 90 days
- connector setup/connect/disconnect UI
- readable table labels and date/time display while preserving raw values in evidence
- blocked state when Google Calendar is not connected
- renderer/display warnings for external or sensitive event fields
- provenance/Why support for rendered event rows
- evidence-tier redaction tests for real-calendar-shaped event text
- mock Google Calendar connector path for E2E and CI
- setup documentation in `STAGE_0_5_GOOGLE_CALENDAR.md`

Stage 0.5 does **not** add Gmail, Drive, Tasks, Google Workspace MCP, arbitrary MCP servers, calendar writes, event create/update/delete, NL/model integration, mobile, sync, Automerge, marketplace, widgets, custom renderers, payments, or autonomous background actions.

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

Implemented source schemas for:

- `synthetic.mail.threads`
- `synthetic.calendar.events`
- `synthetic.drive.files`
- `synthetic.tasks`
- `google.calendar.events`

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

No external APIs are used by the synthetic Stage 0 cells. Stage 0.5 uses Google Calendar `events.list` only after explicit user connection.

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

Stage 0 and Stage 0.5 evaluation are read-only and have no external write side effects.

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

The current implementation should be verified with:

```text
corepack pnpm lint
corepack pnpm format
corepack pnpm test
corepack pnpm build
corepack pnpm test:e2e
```

Current automated coverage includes:

- unit/runtime tests for DSL, validation, scheduler, persistence, dates, provenance, and source schemas
- 50+ valid golden DSL examples
- invalid DSL syntax cases
- parser/serializer round-trip tests
- AST validation tests
- source schema compatibility tests
- synthetic runtime evaluation tests
- Google Calendar schema, auth, adapter, runtime, and persistence tests
- renderer warning tests through validation coverage
- provenance and Why explanation tests
- local persistence redaction tests
- Playwright E2E demo loop test

The local app can be opened in the browser at:

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
3. See cells for unread important messages, upcoming meetings, recent docs, and stale tasks.
4. Open or use the cell editor.
5. Inspect canonical DSL.
6. Modify a predicate.
7. Save the cell.
8. Re-evaluate the cell.
9. Click **Why** on a rendered item.
10. Inspect source, predicate evidence, rule trace, and evaluation metadata.
11. Reload the browser and see the saved lens/cell definitions persist locally.
12. Optionally connect Google Calendar and evaluate **Google Upcoming Events**.

## Important Boundaries

Stage 0.5 deliberately does **not** include:

- Google connectors other than Google Calendar events read-only
- OAuth beyond the in-memory Google Calendar browser token flow
- Google Drive
- Google Tasks
- Gmail send/delete/modify
- Gmail access
- calendar event create/update/delete
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

The current code should not make privacy or connector claims beyond what is implemented. Wovith is local-first here for lens definitions and local evaluation state only. External source data remains in the connected service unless the user explicitly enables a storage tier, and evidence-tier persistence redacts event text.

## Known Limitations

- There is exactly one real connector: Google Calendar events read-only.
- Google Calendar tokens are in-memory only; reload requires reconnecting.
- Google Calendar is primary-calendar only.
- There are no calendar writes, calendar list browsing, sync tokens, or push notifications.
- There is no natural-language-to-AST compiler yet.
- The evaluator does all filtering/sorting in memory.
- Persistence uses browser `localStorage`, not IndexedDB or Automerge, but evaluation records are now redacted by snapshot policy.
- The scheduler is intentionally small manual/on-open/refresh-all logic, not a background job system.
- Freshness states and TTL stale marking are present but minimal.
- UI polish is functional prototype quality.
- Renderer/display warnings are summarized in the UI with expandable details.
- Playwright E2E coverage is a focused golden path, not exhaustive UI coverage.

## Best Next Steps

Recommended next implementation work:

1. Add a small accessibility pass over keyboard/focus behavior.
2. Expand Playwright coverage if the UI grows beyond the current golden path.
3. Add performance sanity tests for 1k/10k synthetic records.
4. Improve previous-evaluation metadata display after cache clearing.
5. Move toward Stage 1 only after the Google Calendar Stage 0.5 path remains green.

Out-of-scope features remain listed in [DEFERRED_FEATURES.md](DEFERRED_FEATURES.md).
