# 19 — Final Handoff Readiness Checklist

**Status:** Final pre-coding checklist  
**Date:** 2026-05-20  
**Audience:** project owner, coding agent, technical lead

## Verdict

The project is ready to hand to a coding agent for **Stage 0 only**.

It is not yet ready to hand off as a broad production implementation of all Wovith concepts. The current pack intentionally narrows implementation to the runtime spine while preserving later-stage ideas.

## What the coding agent should build first

The first implementation should prove this loop:

```txt
synthetic source → cell AST → canonical DSL → validation → evaluation → renderer → provenance/Why panel → local persistence
```

The agent should not start with OAuth, Gmail, MCP, mobile, sync, marketplace, custom renderers, payments, or autonomous actions.

## Required handoff files

Give the coding agent these files first:

1. `README.md`
2. `canonical_docs/00_product_contract.md`
3. `canonical_docs/01_project_lifecycle_staging.md`
4. `canonical_docs/03_v0_v1_build_order.md`
5. `canonical_docs/04_architecture_contract.md`
6. `canonical_docs/05_dsl_ast_runtime_contract.md`
7. `canonical_docs/06_connectors_permissions_security_contract.md`
8. `canonical_docs/07_provenance_snapshots_contract.md`
9. `canonical_docs/11_quality_risk_test_plan.md`
10. `canonical_docs/14_coding_agent_handoff.md`
11. `schema_patches/wovith_schemas_vnext.ts`
12. `prompts/coding_agent_prompt.md`

Use `original_docs/` only for background. If original docs conflict with canonical docs, canonical docs win.

## Final consistency decisions

The canonical Stage 0 synthetic source IDs are:

```txt
synthetic.mail.threads
synthetic.calendar.events
synthetic.drive.files
synthetic.tasks
```

The canonical Stage 0 renderers are:

```txt
list
count
table
raw
```

The canonical Stage 0 DSL style is:

```txt
from synthetic.mail.threads
where unread is true
where received_at after days_ago(7)
sort by received_at desc
take 20
show as list
```

Do not generate aliases such as `==`, `first`, `top`, `render`, pipe syntax, or free-form SQL-like expressions in Stage 0.

## Stage 0 ready criteria

Stage 0 is complete only when:

- the app runs locally;
- a synthetic Daily Work Lens loads;
- lens and cell definitions persist locally;
- a user can inspect and edit canonical DSL;
- the parser and serializer round-trip canonical examples;
- semantic validation rejects unknown sources, fields, operators, and unsupported renderers;
- the runtime evaluates filters, sort, and take over deterministic fixtures;
- list, count, table, and raw renderers work;
- every rendered item has a `Why am I seeing this?` explanation;
- freshness/error states are visible;
- tests cover parser, serializer, analyzer, evaluator, provenance, Why explanations, and persistence.

## Non-blocking choices the coding agent may make

The following choices are intentionally left flexible for implementation practicality:

- Vite React app versus another lightweight React setup.
- localStorage versus IndexedDB for Stage 0 persistence.
- monorepo package layout versus a simpler single-app layout, as long as domain/runtime/UI boundaries remain clear.
- exact styling system, as long as the UI remains calm, readable, and state-forward.

## Choices the coding agent should not make alone

The coding agent should not independently decide to add:

- production Google OAuth;
- Gmail body access;
- Gmail write/send/delete;
- arbitrary MCP server support;
- hosted model proxy;
- sync relay;
- E2E privacy claims;
- marketplace or custom renderer system;
- mobile app implementation;
- autonomous background actions;
- hidden local app/browser scanning.

Those belong to later stages and require explicit product/security review.

## Pre-handoff owner checklist

Before handing off, the project owner should decide or accept defaults for:

- package manager: recommended default is `pnpm`;
- Node version: recommended default is current LTS or the platform version required by the chosen stack;
- first UI framework: recommended default is React + TypeScript;
- persistence default: localStorage is acceptable for the smallest Stage 0, IndexedDB is better if easy;
- test runner: recommended default is Vitest;
- whether the coding agent should create a new repo or work inside an existing repo.

None of these choices should change the product contract.

## Main remaining risk

The main remaining risk is not documentation quality. It is scope creep during implementation.

The coding agent should be judged by whether it completes the Stage 0 spine cleanly, not by how many future features it anticipates.

