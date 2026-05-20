# 03 — Revised v0 to v1 Build Order

**Status:** Canonical for coding-agent handoff  
**Purpose:** replace the old “first 50 commits to everything” with a staged path that proves the core loop before breadth.

## Build philosophy

The first implementation should not prove that Wovith can connect to every app. It should prove that a lens is a durable, inspectable, useful way to see data.

Every commit should keep the app runnable. Every phase should have tests. Avoid speculative UI breadth.

## Repository conventions

Recommended initial structure:

```txt
/src
  /app              # app shell, routes, composition root
  /domain           # pure types, AST, source schemas, value objects
  /runtime          # cell registry, scheduler, evaluator
  /dsl              # tokenizer, parser, serializer, analyzer
  /sources          # synthetic and connector adapters
  /renderers        # list/count/raw/table components
  /provenance       # evidence, snapshots, why engine
  /security         # taint, permissions, action manifest
  /ui               # shared components, tokens
  /storage          # local persistence adapters
  /nl               # NL->AST adapter, initially mockable
/tests
  /golden
  /fixtures
/docs
```

Rules:

- Domain modules cannot import UI.
- DSL parser/serializer/analyzer must be deterministic and unit-tested.
- Runtime can depend on source ports, not concrete Google/MCP code.
- Renderers receive typed cell values and provenance handles.
- Agent/NL code is optional and mockable until Stage 0.5.

## Phase -1 — Project contract ingestion

This phase is already represented by this handoff pack. If a coding agent starts from an empty repo, copy `canonical_docs/` and `schema_patches/` into `/docs` first.

Deliverables:

- `/docs/canonical_docs/*`
- `/docs/schema_patches/wovith_schemas_vnext.ts`
- README pointing to current stage.

## Stage 0: synthetic runtime prototype

### Phase 1 — Repo foundation

**Commit 1 — initialize app**

- Vite + React + TypeScript.
- Strict TS.
- No backend.
- Minimal route: `/` shows placeholder.

**Commit 2 — tooling**

- ESLint.
- Prettier.
- Vitest.
- Testing Library.
- Path aliases.
- CI script placeholders.

**Commit 3 — design tokens**

- Basic Tailwind or CSS variable setup.
- Include only tokens needed for calm cards, freshness states, spacing.
- Do not overbuild component library.

**Commit 4 — docs in repo**

- Add canonical docs.
- Add `CURRENT_STAGE.md` with `Stage 0`.
- Add `DEFERRED_FEATURES.md` copied/summarized from feature matrix.

### Phase 2 — Domain contracts

**Commit 5 — primitive IDs and result types**

- ULID helper.
- Timestamp helper.
- Branded ID aliases if desired.
- Basic tests.

**Commit 6 — source schema registry types**

- `SourceSchema`
- `FieldSchema`
- `SourceCapability`
- `PushdownCapability`
- synthetic schemas for:
  - `synthetic.calendar.events`
  - `synthetic.mail.threads`
  - `synthetic.drive.files`
  - `synthetic.tasks`

**Commit 7 — cell value model**

- `RecordSetValue`
- `RecordValue`
- `TextValue`
- `NumberValue`
- `RawValue`
- field descriptors.

**Commit 8 — lens/cell definitions**

- `LensDoc`
- `CellDef`
- `RendererConfig`
- local schema version.
- No Automerge required yet; plain storage acceptable for Stage 0 if CRDT is stubbed.

### Phase 3 — AST-first DSL

**Commit 9 — AST types**

- Source clause.
- Filter/sort/take/group/map steps.
- Render clause.
- Enrichment placeholder type, but no agent execution.

**Commit 10 — tokenizer**

- Tokenize canonical DSL subset.
- Include location info.
- Tests for common examples.

**Commit 11 — parser**

Parse this Stage 0 subset:

```txt
from synthetic.mail.threads
where unread is true
where received_at after days_ago(7)
sort by received_at desc
take 20
show as list
```

Do not support aliases as canonical output.

**Commit 12 — serializer**

- AST → canonical DSL.
- Stable ordering.
- Tests for AST snapshots.

**Commit 13 — parser/serializer round-trip tests**

- DSL → AST → DSL.
- AST → DSL → AST.
- Golden corpus.

**Commit 14 — semantic analyzer**

- Source exists.
- Field exists.
- Operator allowed for field type.
- Renderer compatible with value shape.
- No action/write clauses.

### Phase 4 — Synthetic source and evaluator

**Commit 15 — synthetic fixtures**

- Deterministic fixture data.
- Keep IDs stable.
- Include enough variation for filters/sorts.

**Commit 16 — source adapter port**

- `SourceAdapter.query(astSource, plan, context)`.
- Synthetic adapter implementation.
- Return records plus evidence handles.

**Commit 17 — simple query planner**

- Converts AST steps to source query + in-memory transforms.
- Stage 0 may do everything in-memory.
- Track matched predicates.

**Commit 18 — evaluator**

- Evaluate AST over synthetic source.
- Return `CellValue`.
- No agent enrichment.
- No external side effects.

**Commit 19 — evaluation error taxonomy**

- Syntax error.
- Semantic error.
- Source error.
- Runtime error.
- Unsupported feature error.

### Phase 5 — Runtime core

**Commit 20 — cell registry**

- Register/unregister cells.
- Observe cell state.
- Manual refresh.

**Commit 21 — scheduler**

- Evaluate on demand.
- Avoid duplicate in-flight evaluations.
- Abort support.

**Commit 22 — freshness state**

- `idle`, `fetching`, `fresh`, `stale`, `recomputing`, `failed`.
- TTL support.
- Manual refresh.

**Commit 23 — dependency graph stub**

- Cell references can be deferred, but architecture should not block them.
- Detect cycles once cell refs exist.

### Phase 6 — Provenance and snapshots

**Commit 24 — provenance evidence types**

- `ProvenanceEvidence`.
- `CellEvaluationSnapshot`.
- `matchedPredicates`.
- `sourceTimestamp`.
- `contentHash`.
- `redactedPreview`.

**Commit 25 — provenance recorder**

- Capture source, filters, transforms, renderer.
- Capture item-level evidence from synthetic source.

**Commit 26 — Why engine**

- Converts evidence to plain-language explanation.
- Example: “Included because unread is true and received_at is within the last 7 days.”

### Phase 7 — Local persistence

**Commit 27 — local store adapter**

- Store lens definitions and cells locally.
- IndexedDB/localStorage acceptable for Stage 0; architecture should permit Automerge replacement.

**Commit 28 — save/reload lens**

- Create a lens.
- Add/edit/delete cells.
- Reload app and preserve definitions.

**Commit 29 — cache store**

- Cell result cache.
- Evidence cache.
- Clear cache command.

### Phase 8 — UI prototype

**Commit 30 — app shell**

- Lens list.
- Lens detail.
- Cell grid or stack.

**Commit 31 — cell card**

- Title.
- Freshness badge.
- Renderer area.
- Error state.
- Refresh button.

**Commit 32 — renderer: list**

- Display record set.
- Show primary/secondary fields.
- Item click opens Why panel.

**Commit 33 — renderer: count**

- Display number/count.

**Commit 34 — renderer: raw**

- JSON debug view.

**Commit 35 — renderer: table**

- Useful for inspection; can be basic.

**Commit 36 — DSL editor/inspector**

- Textarea or code editor.
- Parse/validate feedback.
- Save cell.

**Commit 37 — Why panel**

- Cell-level explanation.
- Item-level explanation.
- Raw evidence debug toggle.

**Commit 38 — starter demo lens**

- Today/follow-up synthetic example.
- Demonstrates lens loop.

### Phase 9 — Stage 0 hardening

**Commit 39 — golden e2e tests**

- Create cell.
- Evaluate.
- Inspect why.
- Save/reload.

**Commit 40 — accessibility pass**

- Keyboard access.
- Labels.
- Focus states.

**Commit 41 — performance sanity**

- Fixture data at 1k/10k records.
- Basic virtualization if needed.

**Commit 42 — Stage 0 demo checklist**

- Write `STAGE_0_DEMO.md`.
- Include screenshots if available.
- Mark Stage 0 complete only if exit criteria pass.

## Stage 0.5: first real connector

### Phase 10 — OAuth and connector spine

**Commit 43 — connector descriptor model**

- Replace broad scope tier with explicit permission list.
- Add connector health.
- Add source schema for first connector.

**Commit 44 — OAuth flow skeleton**

- Authorization Code + PKCE.
- Platform-appropriate token storage.
- No broad scopes.

**Commit 45 — connector adapter interface**

- `connect`, `disconnect`, `query`, `health`, `permissions`.
- Keep MCP behind adapter.

**Commit 46 — first read-only Google connector**

- Recommended: Calendar read-only.
- Alternative: Drive metadata read-only.
- Do not start with Gmail send/modify.

**Commit 47 — audit log minimal**

- Record reads.
- Record connector state changes.
- Record permission upgrades.

**Commit 48 — real source schema validation**

- Analyzer checks fields and permissions.
- User sees missing permissions.

### Phase 11 — NL→AST

**Commit 49 — structured-output AST schema**

- JSON schema for AST.
- Provider adapter interface.
- Mock model for tests.

**Commit 50 — NL compiler**

- NL request → AST candidate.
- Validate.
- Serialize DSL.
- Show preview.

**Commit 51 — repair/refusal loop**

- If invalid field/source/permission, return correction or clarification.
- Do not hallucinate sources.

**Commit 52 — golden NL corpus**

- 100 examples minimum.
- Include impossible requests.
- Include permission-limited requests.

### Phase 12 — Stage 0.5 UX

**Commit 53 — connect source flow**

- Pre-OAuth disclosure.
- Scope summary.
- Disconnect and clear cache.

**Commit 54 — cell permission panel**

- What this cell reads.
- What fields it uses.
- Whether AI touches content.

**Commit 55 — real-data Why panel**

- Evidence snapshots.
- Redacted previews.
- Source timestamp.

**Commit 56 — starter lens generation**

- Guided role/use case form.
- Suggest 2–3 cells from first connector.
- Show DSL preview before creation.

**Commit 57 — Stage 0.5 demo checklist**

- Connect source.
- Create NL cell.
- Inspect DSL.
- See result.
- Inspect provenance.
- Disconnect source.

## Stage 1: private alpha

### Phase 13 — Google source expansion

**Commit 58 — second read-only connector**

- Calendar + Drive, or Drive + Gmail metadata.

**Commit 59 — Gmail read-only plan implementation**

- Only after compliance/security review.
- Separate metadata/body permissions.
- Treat email body as untrusted external content.

**Commit 60 — starter daily lenses**

- Today.
- Follow-up.
- Meeting prep.
- Project pulse.

### Phase 14 — safety and alpha readiness

**Commit 61 — taint model enforcement**

- Trust levels on values.
- External content cannot authorize tools.

**Commit 62 — Action Manifest type and UI stub**

- Even if actions are not active.
- Show proposal shape.

**Commit 63 — prompt-injection test suite**

- Malicious emails/docs fixtures.
- Ensure no tool call/action is authorized by external text.

**Commit 64 — budget model stub**

- Track NL and enrichment calls.
- UI snapshot.
- Server-side metering deferred to Stage 1.5 if no hosted model proxy yet.

**Commit 65 — private alpha polish**

- Error copy.
- Onboarding copy.
- Logging for support without collecting sensitive content.

**Commit 66 — Stage 1 alpha checklist**

- Write acceptance report.
- Document known limitations.
- Confirm no deferred features leaked in.

## Hard “do not build yet” list for coding agent

Do not implement these in Stage 0 or Stage 0.5:

- Gmail send/delete/modify.
- Arbitrary MCP servers.
- Marketplace.
- Custom renderers.
- Full mobile authoring.
- Widgets.
- Hidden local scanning.
- Full time travel.
- E2E sync claims.
- Background autonomous agents.
- Browser automation.
- Team sharing.

It is acceptable to define interfaces for future support, but not to ship behavior.

## Minimum acceptance tests by stage

### Stage 0

- Parser round-trip.
- Analyzer rejects invalid field.
- Synthetic cell evaluates correctly.
- Renderer displays result.
- Why explanation matches evidence.
- Lens persists and reloads.

### Stage 0.5

- OAuth connects and disconnects.
- Token storage path exists and is not in synced lens docs.
- Real connector query returns typed records.
- Analyzer rejects permissions not granted.
- NL compiler emits valid AST or refusal.
- Evidence snapshot stores only allowed fields.

### Stage 1

- Prompt-injection fixtures cannot trigger actions or policy changes.
- Gmail body content, if used, is tainted external content.
- User can delete local cache/evidence.
- Starter lens works for at least one daily workflow.
- Audit log records reads and agent calls.

## Research cross-references

- Structured output and AST reliability: R-STRUCT-01, R-STRUCT-02, R-STRUCT-03.
- Google and Gmail staging: R-GOOGLE-01 through R-GOOGLE-05.
- MCP safety and consent: R-MCP-02, R-MCP-03, R-MCP-05.
- Local-first and Automerge fit: R-LOCAL-01, R-LOCAL-02.
