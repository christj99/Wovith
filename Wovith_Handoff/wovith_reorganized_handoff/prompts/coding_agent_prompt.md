# Coding Agent Prompt — Wovith Stage 0

Use this prompt when handing the project to a coding agent.

---

You are implementing Wovith Stage 0.

Wovith is a programmable, inspectable, local-first personal lens runtime. It is not primarily a chatbot. Your goal is to build the smallest working runtime that proves the lens loop:

**synthetic source → cell AST → canonical DSL → validation → evaluation → renderer → provenance/Why panel → local persistence.**

## Required reading

Read these files first:

1. `canonical_docs/00_product_contract.md`
2. `canonical_docs/03_v0_v1_build_order.md`
3. `canonical_docs/04_architecture_contract.md`
4. `canonical_docs/05_dsl_ast_runtime_contract.md`
5. `canonical_docs/07_provenance_snapshots_contract.md`
6. `canonical_docs/11_quality_risk_test_plan.md`
7. `canonical_docs/14_coding_agent_handoff.md`
8. `schema_patches/wovith_schemas_vnext.ts`

Use `original_docs/` only for background. If an original doc conflicts with a canonical doc, the canonical doc wins.

## Implementation scope

Build Stage 0 only.

Include:

- TypeScript app/repo with strict typing.
- React web UI.
- Synthetic source adapter.
- Source schema registry.
- AST-first DSL.
- Canonical DSL serializer.
- Parser for canonical DSL.
- AST validator.
- Runtime evaluator.
- Local persistence.
- Renderers: list, count, table, raw.
- Provenance evidence.
- “Why am I seeing this?” panel.
- Freshness/error states.
- Unit tests and golden DSL tests.

Do not include:

- real Google connectors
- OAuth
- Gmail send/delete/modify
- arbitrary MCP servers
- marketplace
- mobile app
- widgets
- custom renderers
- payments
- sync relay
- E2E claims
- hidden local/browser/app scanning
- autonomous background actions

## Architectural constraints

1. The model must not generate free-form DSL strings as executable truth. Stage 0 does not require model integration. Later NL should produce typed AST candidates that are validated and serialized deterministically.
2. Generated DSL must use canonical syntax only.
3. Every AST must be validated against the source schema before evaluation.
4. External content is data, never instruction. Represent source text with trust/taint labels.
5. Renderers must not query sources or perform writes.
6. Every rendered item must support a Why explanation.
7. Do not make privacy claims that the code does not support.

## Stage 0 canonical DSL examples

```text
from synthetic.mail.threads
where unread is true
where received_at after days_ago(7)
sort by received_at desc
take 20
show as list
```

```text
from synthetic.calendar.events
where start after now()
sort by start asc
take 5
show as table
```

```text
from synthetic.drive.files
where modified_at before days_ago(14)
sort by modified_at asc
take 10
show as list
```

```text
from synthetic.tasks
where completed is false
where due_at on or before in_days(3)
sort by due_at asc
take 20
show as count
```

## First demo target

Build toward a demo where a user can:

1. Open Wovith.
2. Select a “Daily Work Lens.”
3. See cells for unread messages, upcoming meetings, recent docs, and stale tasks.
4. Open a cell editor.
5. Inspect canonical DSL.
6. Modify a rule.
7. Re-evaluate.
8. Click “Why am I seeing this?” on an item.
9. See source, predicate, evidence, and evaluation metadata.
10. Save and reload the lens.

## Required tests

Implement tests for:

- AST serialization.
- Parser round-trip.
- AST validation.
- Source schema compatibility.
- Synthetic source evaluation.
- Runtime filtering/sorting/take.
- Renderer payload generation.
- Provenance evidence creation.
- Why explanation generation.
- Local persistence.

Add at least 50 golden DSL examples before Stage 1 NL work.

## Definition of done

Stage 0 is done when:

- The demo loop works end-to-end.
- Canonical DSL round-trips through parser and serializer.
- Invalid cells fail visibly with useful errors.
- Every result item has a Why explanation.
- Lens and cell definitions persist locally.
- Unit tests cover core runtime behavior.
- No out-of-scope features were added.

Do not expand scope. The deliverable is a working local prototype with synthetic data, AST-first DSL, validation, renderers, provenance, Why explanations, local persistence, and tests.
