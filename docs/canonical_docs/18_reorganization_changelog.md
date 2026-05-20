# 18 — Reorganization Changelog

**Status:** Record of changes made in this handoff pack  
**Date:** 2026-05-20

This changelog describes what changed relative to the original uploaded Wovith docs. It does not replace the original docs, which remain preserved in `original_docs/`.

## 1. Preserved original archive

All original files were copied into `original_docs/` unchanged:

- `README.md`
- `wovith_agentic_budget.md`
- `wovith_build_order.md`
- `wovith_calibration_state.md`
- `wovith_cell_runtime.md`
- `wovith_concept.md`
- `wovith_connector_ux.md`
- `wovith_data_architecture.md`
- `wovith_design_and_workflow.md`
- `wovith_design_system.md`
- `wovith_dsl.md`
- `wovith_dsl_grammar.md`
- `wovith_engineering_architecture.md`
- `wovith_glossary.md`
- `wovith_mcp_client.md`
- `wovith_mobile.md`
- `wovith_nl_to_dsl_bridge.md`
- `wovith_onboarding_mining.md`
- `wovith_positioning_gtm.md`
- `wovith_provenance_graph.md`
- `wovith_renderer_spec.md`
- `wovith_schemas.ts`
- `wovith_security.md`
- `wovith_sync_relay.md`
- `wovith_v1_scope.md`
- `wovith_voice_and_copy.md`

## 2. Added canonical docs

Added a new canonical layer in `canonical_docs/`:

1. `00_product_contract.md`
2. `01_project_lifecycle_staging.md`
3. `02_feature_stage_matrix.md`
4. `03_v0_v1_build_order.md`
5. `04_architecture_contract.md`
6. `05_dsl_ast_runtime_contract.md`
7. `06_connectors_permissions_security_contract.md`
8. `07_provenance_snapshots_contract.md`
9. `08_onboarding_calibration_contract.md`
10. `09_mobile_platform_contract.md`
11. `10_gtm_positioning_contract.md`
12. `11_quality_risk_test_plan.md`
13. `12_decision_records.md`
14. `13_research_compendium.md`
15. `14_coding_agent_handoff.md`
16. `15_open_questions_and_experiments.md`
17. `16_old_v1_preservation_index.md`
18. `17_improvements_enhancements_backlog.md`
19. `18_reorganization_changelog.md`

## 3. Added schema patch

Added:

- `schema_patches/wovith_schemas_vnext.ts`

This patch proposes stricter types for:

- explicit connector permissions
- source schemas
- AST-first DSL
- evaluation snapshots
- provenance evidence
- trust/taint labels
- Action Manifest
- audit records
- lens discovery proposals
- repository/service ports

## 4. Added prompts

Added:

- `prompts/coding_agent_prompt.md`
- `prompts/future_research_prompt.md`

These are ready-to-use prompts for coding and research agents.

## 5. Scope reorganization

The original v1 was replaced by a staged lifecycle:

- Stage -1: documentation consolidation and handoff.
- Stage 0: synthetic-source runtime prototype.
- Stage 0.5: first real read-only connector.
- Stage 1: private alpha.
- Stage 1.5: beta hardening.
- Stage 2: Pro expansion.
- Stage 3: Trust/team/productization.
- Stage 4: ecosystem/extensibility.

Advanced ideas were preserved and moved to later stages unless they were trust-damaging in their original form.

## 6. Major architectural decisions added

- AST-first DSL.
- Canonical DSL output.
- Source schema registry.
- External content taint model.
- Evidence snapshots by default.
- “Why am I seeing this?” as signature interaction.
- Explicit connector permissions instead of broad scope tiers.
- Action Manifest for writes.
- Guided starter lenses instead of hidden onboarding mining.
- Web/runtime prototype before mobile breadth.
- Sync and E2E privacy claims delayed until implementation supports them.

## 7. Major contradictions resolved

| Original tension | Resolution |
|---|---|
| v1 too broad | Split into lifecycle stages. |
| DSL prose vs grammar conflict | AST-first canonical DSL. |
| Multiple equality syntaxes | Canonical `is` / `is not`. |
| Enrichment placement ambiguity | Enrichment is a transform before render. |
| All renderers in v1 | Stage renderers gradually. |
| Voice deferred but accepted in v1 criteria | Voice moved later. |
| Time travel without snapshots | Add explicit snapshot tiers. |
| Sync/privacy promise ambiguity | Define local-only/plain sync/E2E modes. |
| Gmail writes in early scope | Move writes later behind security/compliance gates. |
| Onboarding mining creepiness | Reframe as explicit Lens Discovery. |

## 8. Ideas reframed rather than deleted

- “Mining” became explicit Lens Discovery.
- Chat became local authoring/explanation, not the main UI.
- Full time travel became opt-in snapshot tiers.
- Universal undo became compensating actions where possible.
- Broad scope tiers became explicit field/permission labels.
- Marketplace became a Trust-stage feature.
- Arbitrary MCP became ecosystem-stage with policy/sandboxing.

## 9. Ideas marked avoid

These are considered bad ideas unless fundamentally redesigned:

1. Hidden local/browser/app scanning.
2. Silent external writes.
3. Executing model-generated free-form DSL without typed validation.
4. Universal undo claims for irreversible actions.
5. E2E/privacy claims before implementation.
6. Broad `full access` tiers as a substitute for clear permissions.
7. Arbitrary MCP tool execution without Wovith-side policy.
8. Treating source content as instruction.
9. Shipping all old v1 features as first release.
10. User-facing “mining” language.

## 10. Handoff state

The project is now ready to hand to a coding agent for Stage 0 implementation, provided the coding agent follows:

- `canonical_docs/14_coding_agent_handoff.md`
- `prompts/coding_agent_prompt.md`
- `schema_patches/wovith_schemas_vnext.ts`
