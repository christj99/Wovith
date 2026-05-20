# 12 — Architecture and Product Decision Records

**Status:** Canonical  
**Purpose:** record major decisions so a coding agent and future contributors understand why the project is staged this way.

## ADR-001 — Preserve original docs, add canonical overlay

**Decision:** Keep all original documents under `original_docs/` and add `canonical_docs/` as the current build contract.

**Rationale:** The original archive contains valuable long-term product ideas. Deleting them would lose creative work. But the old v1 is too broad for implementation.

**Implication:** If original docs conflict with canonical docs, canonical docs win for implementation. Original docs remain idea/provenance sources.

## ADR-002 — Redefine v1 as private alpha, not full product

**Decision:** v1 now means a narrow private alpha proving daily lens value.

**Rationale:** The old v1 combined too many hard problems: connectors, MCP, DSL, local-first, sync, AI, mobile, actions, renderers, pricing, and onboarding. The new v1 proves the lens loop first.

**Implication:** Many original v1 ideas move to Stage 1.5, 2, 3, or 4.

## ADR-003 — AST-first DSL

**Decision:** Natural language produces typed AST candidates, not free-form DSL strings.

**Rationale:** AST-first enables deterministic validation, canonical serialization, tests, and safer permissions.

**Implication:** Build AST schema, parser, serializer, analyzer, and golden tests before broad NL authoring.

## ADR-004 — Canonical DSL uses one syntax

**Decision:** Generated DSL uses `is`, `is not`, `contains`, `after`, `before`, `take`, and `show as` as canonical forms.

**Rationale:** The original grammar allowed too many aliases. That weakens predictability and model output.

**Implication:** Parser aliases may be accepted later, but serializer never emits them.

## ADR-005 — Synthetic source first

**Decision:** Stage 0 starts with synthetic data, not Google OAuth.

**Rationale:** The runtime, DSL, renderers, and provenance can be proven without external compliance/security complexity.

**Implication:** Synthetic adapter remains permanently as test/demo source.

## ADR-006 — Calendar/Drive before Gmail writes

**Decision:** First real connector should be Calendar read-only or Drive metadata/read-only. Gmail write actions are deferred.

**Rationale:** Gmail content/actions are high compliance, privacy, and prompt-injection risk.

**Implication:** Gmail read-only can enter Stage 1 after safety gates. Send/delete/modify are Stage 2+.

## ADR-007 — Field-level permissions replace broad scope tiers

**Decision:** Runtime uses explicit connector permissions instead of only `read-only`, `read-write`, `full` tiers.

**Rationale:** Users need to know whether Wovith reads metadata, content, drafts, sends, labels, etc. OAuth scope reality is granular.

**Implication:** Source schemas include required permissions per field/action.

## ADR-008 — External content is tainted

**Decision:** External content is data, never instruction.

**Rationale:** Prompt injection is central risk for a product that ingests emails, docs, calendar descriptions, web pages, and tool outputs.

**Implication:** Taint metadata must flow through values. External content cannot authorize tool calls or policy changes.

## ADR-009 — Action Manifest required for writes

**Decision:** Every external write/action must be represented by an Action Manifest before execution.

**Rationale:** This makes writes inspectable, auditable, risk-tiered, and reviewable.

**Implication:** Even early architecture should define Action Manifest, though Stage 0/0.5 may have no writes.

## ADR-010 — No universal undo promise

**Decision:** Do not promise all actions can be undone.

**Rationale:** Some actions, such as sent emails or external deletes, cannot be fully undone.

**Implication:** Promise audit and compensating actions where supported.

## ADR-011 — Provenance evidence snapshots by default

**Decision:** Store lightweight evidence snapshots for real sources; full snapshots are opt-in later.

**Rationale:** “Why?” requires evidence, but full content snapshots create privacy/storage/compliance burdens.

**Implication:** Stage 0.5+ default is evidence tier: IDs, hashes, timestamps, matched predicates, safe previews.

## ADR-012 — Time travel claim is limited

**Decision:** Wovith can time-travel lens definitions by default, but not full external source history unless snapshots are enabled.

**Rationale:** External data changes outside Wovith. Re-querying cannot reconstruct past truth.

**Implication:** Product copy must be precise.

## ADR-013 — Guided lens seeding before inverse lens mining

**Decision:** Early onboarding uses guided role/use-case lens seeding. Inverse lens mining becomes opt-in Lens Discovery later.

**Rationale:** Hidden scanning can damage trust and is platform-complex. Guided seeding is simpler and clearer.

**Implication:** Avoid user-facing “mining” language.

## ADR-014 — Web before mobile breadth

**Decision:** Build web first. Mobile is optional Stage 1 and narrow if included.

**Rationale:** Full mobile doubles complexity. The core lens loop should be validated first.

**Implication:** Android shell only wears lenses initially; full voice/mobile authoring is deferred.

## ADR-015 — Sync delayed until core loop works

**Decision:** Sync is Stage 1.5, not Stage 0.

**Rationale:** Sync adds privacy, conflict, and token-per-device complexity. It does not prove the core product.

**Implication:** Do not claim multi-device/E2E early.

## ADR-016 — E2E sync is Trust-stage unless implemented sooner

**Decision:** E2E sync is Stage 3 by default.

**Rationale:** Key management and recovery are difficult. Privacy copy must match reality.

**Implication:** Plain sync must be described honestly.

## ADR-017 — MCP is an adapter strategy, not product identity

**Decision:** Wovith remains MCP-capable but not MCP-dependent.

**Rationale:** MCP is important and growing, but specific servers may be preview/unstable or unsafe without policy.

**Implication:** Build source/action ports that can use direct APIs or MCP.

## ADR-018 — Arbitrary user-added MCP deferred to Stage 4

**Decision:** No arbitrary MCP servers in v1.

**Rationale:** Tool descriptions, resource exposure, and actions require trust/sandbox/policy review.

**Implication:** User-added MCP returns only with trust registry and action governance.

## ADR-019 — Renderer library grows progressively

**Decision:** Stage 0/1 use a small renderer set.

**Rationale:** Every renderer adds UI, data-shape, accessibility, provenance, and mobile work.

**Implication:** Start with list/count/raw/table/feed/cards/timeline; defer map/kanban/chart/custom.

## ADR-020 — Wovith differentiates on inspectable lenses

**Decision:** Wovith should not position as a generic AI assistant or app automation platform.

**Rationale:** Competitors already cover AI agents, broad app access, and automation. Wovith’s wedge is persistent, inspectable personal views.

**Implication:** Messaging and feature priority should reinforce lens/provenance/calibration.

## ADR-021 — Budget enforcement cannot be client-only for paid hosted model use

**Decision:** If Wovith pays model costs, authoritative budget enforcement must be server-side or use BYOK.

**Rationale:** Client-side counters can be bypassed or desynchronized.

**Implication:** Stage 1 can track locally; Stage 1.5+ needs server metering for paid plans.

## ADR-022 — Agent-free runtime

**Decision:** Wovith’s core runtime must function without LLM calls.

**Rationale:** Reduces cost, improves reliability, and supports local-first/product trust.

**Implication:** DSL cells and synthetic runtime must work before NL/agents.

## ADR-023 — “Why am I seeing this?” is signature interaction

**Decision:** Every cell/item should have an explanation path.

**Rationale:** It ties together provenance, DSL, permissions, calibration, and trust.

**Implication:** Renderers must carry provenance handles and support item explanation.

## ADR-024 — Bad ideas are reframed, not quietly kept

**Decision:** Some ideas are marked harmful in their original form: hidden scanning, user-facing mining language, silent writes, universal undo, arbitrary MCP without policy.

**Rationale:** Preserving all ideas without judgment would recreate the overloaded v1.

**Implication:** These can return only if reframed under explicit safeguards.
