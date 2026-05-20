# Wovith Documentation Set

This is the complete Wovith design and engineering documentation as of May 19, 2026. Twenty product/design docs plus five build-readiness artifacts that turn the spec into something a coding agent can execute against.

## Reading order

### Start here (foundational)
1. `wovith_concept.md` — the founding doc. Why Wovith exists, what it is, the Ink & Switch frame, the v1/v3+ scoping.

### Product experience
2. `wovith_design_and_workflow.md` — 23-section UX walkthrough, from install to power use
3. `wovith_dsl.md` — the cell DSL grammar with worked examples
4. `wovith_renderer_spec.md` — 13 built-in renderers + freshness visual grammar
5. `wovith_mobile.md` — phone UX, voice-first authoring, Android specifics
6. `wovith_onboarding_mining.md` — 5-minute onboarding flow, mining algorithm
7. `wovith_security.md` — threat model, OAuth posture, action tiers, Intent Preview
8. `wovith_design_system.md` — color palette, typography, spacing, motion, components

### Strategy and voice
9. `wovith_voice_and_copy.md` — first-person voice, vocabulary tiers, copy rules
10. `wovith_connector_ux.md` — Drive, Gmail, Calendar at v1
11. `wovith_positioning_gtm.md` — competitive map, pricing, launch sequence

### Technical foundation
12. `wovith_cell_runtime.md` — reactive engine, cell states, scheduler, budget
13. `wovith_data_architecture.md` — Automerge schema, storage layers, sync model
14. `wovith_engineering_architecture.md` — module layout, layer boundaries, testing

### Technical depth (subsystem specs)
15. `wovith_mcp_client.md` — MCP 2025-11-25, OAuth 2.1, transport, tokens
16. `wovith_nl_to_dsl_bridge.md` — NL → DSL translation, prompt engineering
17. `wovith_provenance_graph.md` — W3C PROV-DM, lineage UI
18. `wovith_sync_relay.md` — minimal WebSocket relay, E2E for Trust tier
19. `wovith_calibration_state.md` — counter-based learning from user signals
20. `wovith_agentic_budget.md` — RPM+TPM buckets, soft cap degradation, circuit breaker

### Build-readiness artifacts (read before any code is written)
21. `wovith_schemas.ts` — authoritative TypeScript types for the entire codebase. The single source of truth for type shapes across all subsystems.
22. `wovith_dsl_grammar.md` — formal PEG grammar + 83 test corpus cases. The parser regression suite lives here.
23. `wovith_glossary.md` — alphabetical vocabulary reference. Prevents terminology drift.
24. `wovith_v1_scope.md` — what's in v1, what's deferred, with testable acceptance criteria.
25. `wovith_build_order.md` — sequenced first 50 commits to reach "first working cell on screen reading from synthetic MCP."

## How to use this set with a coding agent

1. Point the agent at `docs/` with `wovith_build_order.md` as the entry point.
2. The agent should read `wovith_v1_scope.md` and `wovith_glossary.md` first to understand the cut line and the vocabulary.
3. For each commit, the agent reads the referenced spec doc(s) in `wovith_build_order.md` and follows them as the authoritative reference.
4. `wovith_schemas.ts` is the type contract — every subsystem imports from here. Don't redefine types.
5. `wovith_dsl_grammar.md` is the parser contract — every corpus case must pass.

## Terminology

The docs use several "tier" systems that should be kept distinct:

- **Action tiers** (security doc, sections 4.1–4.4): Tier 0 (read-only), Tier 1 (notify), Tier 2 (review), Tier 3 (hold-to-confirm). Governs agent action confirmation.
- **Storage layers** (data architecture doc): synced docs / local cache / runtime state. Three layers with different durability and sync characteristics.
- **Vocabulary tiers** (voice and copy doc, section 3): Tier 1 (universal), Tier 2 (Wovith-native), Tier 3 (technical). Restricts language by UI surface.
- **Pricing tiers** (GTM doc, section 6): Free, Pro, Trust. Explicitly named.
- **Scope tiers** (connector doc): read-only / read-and-write / full. OAuth scope grants.

Context always makes the meaning clear; the glossary (`wovith_glossary.md`) has full definitions.

## Versioning

These docs target Wovith v1 unless explicitly noted. References to "v2", "v2+", or "v3+" indicate deferred features. The v1/v3+ scoping is consistent across all docs and codified in `wovith_v1_scope.md`.

## Tech stack baseline

- React 18 + TypeScript 5.4 + Vite 5
- Tailwind CSS for styling
- Supabase for auth and the sync relay
- Capacitor 8 for native (Android first; iOS v1.5; native desktop v2+)
- Automerge 2.x for CRDT documents
- `@capacitor-community/sqlite` for native storage
- `signal-polyfill` for the reactive engine (TC39 Stage 1)
- `@modelcontextprotocol/sdk` for MCP client
- Anthropic API (Claude Sonnet 4.6+ default, Haiku 4.5 fast, Opus 4.7 premium)
- ESLint with `eslint-plugin-boundaries` for architectural enforcement
- Vitest for unit tests; Playwright for e2e

## Audit history

**May 19, 2026** — Initial 20-doc set + 5-artifact build-readiness pass.

Cross-doc audit resolved these conflicts:
1. Platform priority unified to "Android + web at v1; iOS v1.5; native desktop v2+"
2. Cell type count corrected (concept said "ten", renderer spec has 13)
3. Budget terminology unified across GTM and agentic_budget (using "units")
4. Trust tier soft-cap behavior reconciled (hard cap only, no degradation)
5. Day-14 tenure bonus specified in agentic_budget doc
6. "Tier" terminology collision resolved (storage layers renamed; meta-tier doc references replaced)
7. Free tier connector limit framing clarified
8. Free tier single-device commitment made explicit
9. Audit log retention unified at 90 days
10. Logical vs visual cell state mapping clarified
11. DSL syntax forms (pipe vs keyword-prefix) noted as equivalent
12. Stale section cross-references updated

Build-readiness pass added five artifacts:
- Authoritative TypeScript types (schemas.ts)
- Formal DSL grammar with test corpus (dsl_grammar.md)
- Alphabetical glossary (glossary.md)
- In-scope/out-of-scope with acceptance criteria (v1_scope.md)
- Sequenced first 50 commits (build_order.md)

The docs are now ready to hand to a coding agent.
