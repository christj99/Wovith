# Wovith Reorganized Handoff Pack

**Generated:** 2026-05-20  
**Purpose:** preserve the original Wovith idea archive while adding a sharper, staged, research-backed product and engineering plan that can be handed to a coding agent.

This pack is additive. The original documents are not deleted, rewritten out of existence, or treated as mistakes. They are preserved under `original_docs/`. The new documents in `canonical_docs/` define the current build contract and staging model.

## What changed

The old `wovith_v1_scope.md` attempted to ship too much in one release: Google connectors, MCP, local-first state, sync, DSL, NL authoring, provenance, audit, mobile, onboarding mining, action governance, all renderers, pricing, and advanced agent behavior. The new plan keeps those ideas but moves them into a lifecycle:

- **Stage -1:** documentation consolidation and coding-agent contract.
- **Stage 0:** synthetic-source runtime prototype.
- **Stage 0.5:** first real read-only connector.
- **Stage 1:** private alpha that proves daily personal lenses.
- **Stage 1.5:** beta hardening, sync, budgets, and more reliable onboarding.
- **Stage 2:** richer Pro product: more connectors, more renderers, limited actions.
- **Stage 3:** Trust/team/productization: E2E option, marketplace/lens garden, advanced policy.
- **Stage 4:** ecosystem: custom renderers, user-added MCP, richer automation, public extensibility.

No advanced idea is discarded merely because it is too large for v1. It is either staged, gated behind prerequisites, or explicitly marked as a bad idea if it undermines the product’s trust, novelty, or safety.

## Reading order for a coding agent

Read these first, in order:

1. `canonical_docs/00_product_contract.md`
2. `canonical_docs/01_project_lifecycle_staging.md`
3. `canonical_docs/02_feature_stage_matrix.md`
4. `canonical_docs/03_v0_v1_build_order.md`
5. `canonical_docs/04_architecture_contract.md`
6. `canonical_docs/05_dsl_ast_runtime_contract.md`
7. `canonical_docs/06_connectors_permissions_security_contract.md`
8. `canonical_docs/07_provenance_snapshots_contract.md`
9. `canonical_docs/11_quality_risk_test_plan.md`
10. `canonical_docs/14_coding_agent_handoff.md`
11. `prompts/coding_agent_prompt.md`

Use `original_docs/` for background and idea provenance, not as the current implementation scope. If any original doc conflicts with a canonical doc, the canonical doc wins.

## Most important non-negotiables

1. **Wovith is a personal lens runtime, not a chatbot.** Chat/NL is an authoring and explanation surface, not the primary product.
2. **The first build must prove the lens loop.** Connect/simulate source → create cell → inspect DSL → render → see provenance → adjust → save → return.
3. **External content is data, never instruction.** Email/doc/web text can be summarized or classified but cannot grant authority to tools or actions.
4. **The DSL is AST-first.** Models generate validated typed AST, not free-form DSL strings.
5. **All user-facing AI must be inspectable.** Every item should support “Why am I seeing this?”
6. **No hidden writes.** Writes require an Action Manifest and user approval according to risk tier.
7. **No overpromised privacy.** Do not claim E2E sync, complete time travel, or unrestricted local-first ownership unless the implementation actually supports it.
8. **Original big ideas are preserved in the staged backlog.** Cutting from v1 means “not yet,” not “gone.”

## Folder map

- `original_docs/` — exact copy of the uploaded archive contents.
- `canonical_docs/` — staged current product/engineering contract.
- `schema_patches/` — TypeScript schema additions/replacements for the next implementation pass.
- `prompts/` — ready-to-use handoff prompt for a coding agent.

## Research basis

The canonical docs cross-reference `canonical_docs/13_research_compendium.md`. That file summarizes relevant current sources on Google Workspace MCP, MCP security, OAuth/Gmail restrictions, OWASP/NIST AI risk, Automerge/local-first, structured outputs, Capacitor requirements, provenance standards, and the competitive landscape.

## Current recommendation

Build Wovith as a narrow, strong alpha first:

> A private, inspectable daily lens over personal work data, with local-first lens definitions, canonical DSL, basic renderers, and provenance.

Everything else returns when the prerequisites are in place.

## Final pre-coding gate

Before giving the project to a coding agent, read:

- [canonical_docs/19_final_handoff_readiness_checklist.md](canonical_docs/19_final_handoff_readiness_checklist.md)

This file states what is ready, what is intentionally deferred, and the final Stage 0 source IDs/renderers.

