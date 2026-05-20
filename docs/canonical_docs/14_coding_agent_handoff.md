# 14 — Coding Agent Handoff

**Status:** Canonical implementation handoff  
**Date:** 2026-05-20  
**Audience:** coding agent, technical lead, or human builder beginning the repo implementation.

This document converts the reorganized Wovith plan into a buildable first-pass assignment. It intentionally narrows the first implementation while preserving advanced ideas for later stages.

## 1. Mission for the coding agent

Build the first Wovith prototype as a **lens-first runtime**, not as a chatbot, not as a generic dashboard, and not as a full AI agent platform.

The first working prototype should demonstrate this loop:

1. A user opens a Wovith workspace.
2. A synthetic source provides realistic personal/work data.
3. The user creates or loads a lens.
4. The lens contains cells.
5. Each cell has a validated AST and canonical DSL string.
6. The runtime evaluates the cell against the source.
7. The UI renders the result.
8. The user can ask, “Why am I seeing this?” for any item.
9. The user can save and reload the lens.

Do not build advanced connectors, Gmail writes, mobile breadth, marketplace features, arbitrary MCP support, or custom renderers in the first pass.

## 2. Read first

Read these in order:

1. `canonical_docs/00_product_contract.md`
2. `canonical_docs/03_v0_v1_build_order.md`
3. `canonical_docs/04_architecture_contract.md`
4. `canonical_docs/05_dsl_ast_runtime_contract.md`
5. `canonical_docs/07_provenance_snapshots_contract.md`
6. `canonical_docs/11_quality_risk_test_plan.md`
7. `schema_patches/wovith_schemas_vnext.ts`

Use the original docs for background only. If an original doc conflicts with a canonical doc, implement the canonical doc.

## 3. Non-negotiable implementation constraints

### 3.1 AST-first DSL

Do not ask a model to emit free-form DSL strings as the primary representation.

Implementation order:

1. Define typed AST.
2. Serialize AST to canonical DSL.
3. Parse canonical DSL back to AST.
4. Validate AST against source schemas.
5. Only then render/evaluate.

Later, NL may generate typed JSON AST candidates, but Stage 0 does not require model integration.

### 3.2 Canonical syntax only

Generated DSL should use one canonical form.

Use:

```text
from synthetic.mail.threads
where unread is true
where received_at after days_ago(7)
sort by received_at desc
take 20
show as list
```

Do not generate:

```text
messages | filter unread == true | first 20 | render list
```

The parser may accept a small amount of leniency later, but the serializer must always output canonical DSL.

### 3.3 External content is tainted

Even in the synthetic prototype, represent source text as `external-content`. This makes the safety model visible from the start.

External content may be displayed, filtered, summarized, or classified. It may not grant permissions, trigger tools, or override user/system rules.

### 3.4 Provenance is a product surface

Every rendered item should have a trace explaining why it is present.

Minimum Stage 0 explanation:

- source name
- item ID
- matched predicates
- sort rule if applicable
- evaluation time
- renderer

### 3.5 No hidden writes

Stage 0 has no external writes. Later writes require an Action Manifest and user approval.

### 3.6 No privacy claims beyond implementation

The code and copy should not imply E2E sync, complete time travel, or comprehensive local-first ownership unless implemented.

## 4. Recommended repository structure

```text
wovith/
  apps/
    web/
      src/
        app/
        components/
        lenses/
        renderers/
        runtime-ui/
        why/
  packages/
    core/
      src/
        ids.ts
        result.ts
        time.ts
        events.ts
    dsl/
      src/
        ast.ts
        source-schema.ts
        validate.ts
        serialize.ts
        parse.ts
        analyze.ts
        examples.ts
    runtime/
      src/
        evaluator.ts
        scheduler.ts
        freshness.ts
        lens-store.ts
        cell-store.ts
    sources/
      src/
        source-adapter.ts
        synthetic/
          synthetic-adapter.ts
          fixtures.ts
          schema.ts
    provenance/
      src/
        evidence.ts
        snapshot.ts
        why.ts
    security/
      src/
        trust-level.ts
        taint.ts
        action-manifest.ts
        permissions.ts
    renderers/
      src/
        list.tsx
        count.tsx
        table.tsx
        raw.tsx
    testing/
      src/
        golden-dsl.ts
        fixtures.ts
  docs/
    canonical/
    original/
```

This structure is a recommendation, not a rigid requirement. Maintain the boundaries even if filenames differ.

## 5. Stage 0 implementation tasks

### 5.1 Project bootstrap

Create a TypeScript repo with:

- strict TypeScript
- unit test runner
- React web app
- linting/formatting
- no production LLM integration yet
- no OAuth yet
- no server required for Stage 0

### 5.2 Core domain types

Implement:

- `LensId`
- `CellId`
- `SourceId`
- `RendererId`
- `EvaluationId`
- `ProvenanceEvidenceId`
- `LensDefinition`
- `CellDefinition`
- `CellAst`
- `CellEvaluationSnapshot`
- `ProvenanceEvidence`
- `TrustLevel`

Use branded strings or equivalent type-safety where practical.

### 5.3 Source schema registry

Implement source schemas before evaluation.

Minimum synthetic schemas:

```text
synthetic.mail.threads
synthetic.calendar.events
synthetic.drive.files
synthetic.tasks
```

Each schema should define:

- field name
- field type
- nullable status
- whether field may contain external content
- allowed operators
- sortable status
- renderer hints

### 5.4 DSL AST

Implement a Stage 0 AST supporting:

- source
- predicates
- sorting
- limit/take
- renderer
- optional select/project

Supported operators:

- `is`
- `is not`
- `contains`
- `before`
- `after`
- `on or before`
- `on or after`
- `greater than`
- `less than`

Supported functions:

- `today()`
- `now()`
- `days_ago(n)`
- `in_days(n)`

### 5.5 Serializer/parser

Build serializer first.

Round-trip invariant:

```text
AST -> serialize -> parse -> AST-equivalent
```

Do not optimize for broad language support before canonical output is stable.

### 5.6 Analyzer/validator

Validate:

- source exists
- fields exist
- operators compatible with field types
- renderer compatible with result shape
- take limit is within allowed bounds
- no unsupported transform is present
- no action/write is present

Return user-readable errors.

### 5.7 Synthetic source adapter

Build deterministic fixture data with enough variety to exercise the product:

- unread messages
- read messages
- messages with attachments
- newsletters
- project threads
- meetings with related docs
- recently modified docs
- stale docs
- tasks with due dates
- ambiguous items for tests

Do not use external APIs in Stage 0.

### 5.8 Runtime evaluator

Implement:

- filter evaluation
- sort evaluation
- limit/take
- renderer payload formation
- freshness state
- evaluation snapshots
- provenance evidence

Freshness states minimum:

- fresh
- stale
- recomputing
- failed
- blocked

### 5.9 Renderers

Implement only:

- list
- count
- table
- raw

Optional if trivial:

- feed/card

Each rendered item must expose the Why panel.

### 5.10 Why panel

Build the product’s signature interaction first, even if visually simple.

Minimum sections:

1. Plain-language explanation.
2. Rule trace.
3. Evidence fields.
4. Evaluation metadata.

Example:

```text
Included because it came from synthetic.mail.threads, unread is true, and received_at is after days_ago(7). It was sorted by received_at desc and included in the first 20 results.
```

### 5.11 Local persistence

Persist:

- lens definitions
- cell definitions
- calibration actions
- recent evaluation snapshots
- recent evidence records

Use browser storage or local database suitable for the first prototype. Do not build sync yet.

### 5.12 UI shell

Build a simple web UI:

- left lens list
- central cell stack/grid
- cell editor
- DSL inspector
- result renderer
- Why panel
- audit/debug drawer

Avoid over-polishing before the runtime works.

## 6. Stage 0 exit criteria

The prototype is complete when:

- A lens can be created, saved, reloaded, and deleted.
- A cell can be created from a typed AST or canonical DSL.
- The DSL serializer/parser round-trips golden examples.
- The cell evaluates synthetic data correctly.
- The user can inspect why each result appears.
- Basic freshness/error states work.
- Unit tests cover DSL, validation, runtime, and provenance.
- No hidden external writes exist.
- The UI demonstrates the lens loop clearly.

## 7. Stage 0.5 implementation tasks

After Stage 0 passes its exit criteria, add one real read-only connector.

Recommended first connector:

1. Calendar read-only, or
2. Drive metadata/read-only.

Avoid Gmail writes. Gmail body access should wait until the connector security and policy model are stable.

Stage 0.5 additions:

- connector descriptor schema
- OAuth flow
- token storage boundary
- source schema derived from connector
- read-only adapter
- connector health UI
- audit records for connector reads
- per-cell permission disclosure
- source cache
- no sync yet unless trivial

## 8. Stage 1 private alpha tasks

Stage 1 can add:

- second Google source
- Gmail read-only or Gmail metadata read
- starter lens packs
- NL-to-AST model bridge
- repair loop for invalid AST
- Action Manifest type, even if only draft/local actions exist
- budget meter stub
- prompt-injection test suite
- alpha onboarding

Stage 1 still should not add:

- Gmail send
- Gmail delete
- arbitrary MCP servers
- marketplace
- custom renderers
- hidden local scanning
- full mobile authoring
- E2E sync claims

## 9. Coding standards

### 9.1 Prefer explicitness

Wovith is an inspectability product. Avoid hidden magic in code.

Good:

```ts
validateCellAst(ast, sourceSchemaRegistry)
```

Bad:

```ts
runSmartCell(cell)
```

### 9.2 Separate transformation from rendering

Renderers should not query sources, mutate sources, or make decisions about trust. They render already-evaluated payloads and request provenance details by ID.

### 9.3 Avoid stringly typed permissions

Use explicit permission constants. Avoid broad categories such as `full`.

### 9.4 Never skip validation

Every AST from a model, user, import, or saved file must be validated before evaluation.

### 9.5 Make failures visible

A failed cell is not a blank cell. It should show:

- what failed
- when it failed
- whether data is stale
- what the user can do

## 10. Test requirements

Minimum test suites:

- DSL serializer tests
- DSL parser tests
- AST validator tests
- source schema tests
- runtime evaluator tests
- provenance evidence tests
- Why explanation tests
- renderer smoke tests
- persistence tests

Golden tests should include at least 50 Stage 0 DSL examples before adding NL.

## 11. Anti-goals for the coding agent

Do not spend early implementation time on:

- arbitrary MCP server support
- real Gmail write actions
- native mobile shell
- widgets
- marketplace
- custom renderer SDK
- chart/map/kanban renderers
- full provenance graph visualization
- team sharing
- payment/subscription code
- browser automation
- background autonomous agents
- “AI OS” marketing pages

These are staged ideas, not first-build requirements.

## 12. First demo script

Build toward this demo:

1. Open Wovith.
2. Select “Daily Work Lens.”
3. See cells:
   - unread important messages
   - upcoming meetings
   - recently changed docs
   - stale tasks
4. Open a cell editor.
5. Show canonical DSL.
6. Modify a predicate.
7. Re-evaluate.
8. Click “Why am I seeing this?” on an item.
9. Show evidence and rule trace.
10. Save, reload, and show state persists.

If this demo feels good, Wovith has a foundation.

## 13. Implementation handoff summary

Build a small, principled, inspectable Wovith runtime. The first implementation should prove the lens loop with synthetic data and strict DSL/provenance, not chase the entire original v1 scope.

Preserve the larger vision in docs and staged backlog. Ship the spine first.
