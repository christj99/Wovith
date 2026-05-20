# 16 — Old v1 Preservation Index

**Status:** Canonical preservation map  
**Date:** 2026-05-20  
**Purpose:** ensure ideas from the original broad v1 are preserved, staged, or explicitly reframed rather than silently lost.

The original `wovith_v1_scope.md` was too large for an initial ship, but most ideas remain valuable. This index maps major original ideas to their new lifecycle stage.

## 1. Legend

| Label | Meaning |
|---|---|
| Stage 0 | synthetic-source runtime prototype |
| Stage 0.5 | first real read-only connector |
| Stage 1 | private alpha |
| Stage 1.5 | beta hardening |
| Stage 2 | Pro expansion |
| Stage 3 | Trust/team/productization |
| Stage 4 | ecosystem/extensibility |
| Research | keep exploring; do not implement yet |
| Reframe | original idea is useful but needs safer wording or design |
| Avoid | likely bad for Wovith at any stage unless fundamentally changed |

## 2. Core product ideas

| Original idea | New status | Notes |
|---|---:|---|
| Personal lens runtime | Stage 0 | Core identity. Keep. |
| Lens as primary object | Stage 0 | Core identity. Keep. |
| Cells inside lenses | Stage 0 | Core implementation unit. |
| Persistent views over personal data | Stage 0–1 | Start synthetic, then real read-only. |
| AI as authoring/explanation helper | Stage 1 | Not required for Stage 0. |
| Chat-like interaction | Reframe | Local cell/lens edit surface, not primary product. |
| Spatial dashboard/canvas | Stage 1–2 | Start with simple stack/grid. Freeform canvas later. |
| Lens packs/templates | Stage 1 | Essential for onboarding. |
| Lens sharing | Stage 2–3 | After privacy/permissions are clear. |
| Lens marketplace/garden | Stage 3 | Requires quality, safety, permission model. |

## 3. DSL and runtime

| Original idea | New status | Notes |
|---|---:|---|
| DSL | Stage 0 | Required. |
| NL-to-DSL | Stage 1 | Implement as NL-to-AST. |
| Model-generated DSL strings | Avoid | Use typed AST then deterministic serializer. |
| DSL grammar aliases/synonyms | Reframe | Parser may accept limited aliases; serializer emits one canonical form. |
| All examples accepted as grammar | Reframe | Canonical examples should be updated after AST contract. |
| Reactive cells | Stage 0 | Basic runtime. |
| Fresh/stale/recomputing states | Stage 0 | Core trust behavior. |
| Agent enrichment | Stage 1.5–2 | Useful after non-agentic runtime works. |
| Multi-step agent workflows | Stage 2–3 | Requires budget, safety, audit. |
| Agent budget | Stage 1 | Stub early; enforce later. |
| Agent budget as client-only control | Reframe | Server-side or BYOK required for paid hosted usage. |

## 4. Sources and connectors

| Original idea | New status | Notes |
|---|---:|---|
| Synthetic connector | Stage 0 | First implementation. |
| Google Calendar | Stage 0.5–1 | Recommended first real source. |
| Google Drive | Stage 0.5–1 | Good first/second source. |
| Gmail read-only | Stage 1 | High value but higher risk. |
| Gmail draft creation | Stage 2 | First external write candidate. |
| Gmail send | Stage 3+ | High compliance/trust bar. |
| Gmail delete/modify labels | Stage 3+ | Requires mature action governance. |
| Slack | Stage 2–3 | Useful for work users; permission complexity. |
| Notion | Stage 2–3 | Competitive overlap; useful connector. |
| GitHub | Stage 2 | Strong for developer ICP. |
| Browser/local app discovery | Reframe | Explicit opt-in Lens Discovery only. |
| Hidden scanning of local apps/browser sessions | Avoid | Trust-damaging. |
| Arbitrary user-added MCP servers | Stage 4 | Requires sandbox/policy/trust tier. |
| First-party curated MCP connectors | Stage 2–3 | Safer path. |

## 5. Renderers

| Original renderer | New status | Notes |
|---|---:|---|
| list | Stage 0 | Required. |
| count | Stage 0 | Required. |
| raw | Stage 0 | Required for debugging. |
| table | Stage 0–0.5 | Required for inspection. |
| feed/cards | Stage 1 | Useful for human-readable updates. |
| timeline | Stage 1 | Add with Calendar. |
| text | Stage 1.5 | Useful for summaries. |
| chart | Stage 2 | Requires stable metrics. |
| grid | Stage 2 | Useful but not core. |
| kanban | Stage 2–3 | Dangerous if it implies writes; use Action Manifest. |
| map | Stage 3 | Niche. Add when location data matters. |
| custom renderers | Stage 4 | Requires SDK/security review. |
| all 13 renderers in v1 | Avoid | Too much scope. |

## 6. Provenance, snapshots, and time travel

| Original idea | New status | Notes |
|---|---:|---|
| Provenance graph | Stage 0 | Evidence and Why panel first. |
| Full graph visualization | Stage 2–3 | Debug/advanced view. |
| “Why am I seeing this?” | Stage 0 | Make signature interaction. |
| Evaluation evidence snapshots | Stage 0 | Required for trustworthy explanations. |
| Full historical output replay | Stage 3 | Requires storage/snapshot policy. |
| Complete time travel by default | Avoid | False unless full snapshots are enabled. |
| Local audit log | Stage 0.5–1 | Add with connectors. |
| Synced audit log | Stage 1.5–3 | Privacy-sensitive. |
| 90-day audit default | Research | Choose after alpha. |

## 7. Security and actions

| Original idea | New status | Notes |
|---|---:|---|
| Connector permission tiers | Reframe | Use explicit permission constants, not broad tiers. |
| Scope transparency | Stage 0.5 | Required with real connectors. |
| Intent Preview | Stage 2 | Required before writes. |
| Action governance | Stage 1 | Type/system first; active writes later. |
| Action Manifest | Stage 1 | Add before real writes. |
| Undo every agent action for 24h | Reframe | Some actions cannot be undone. Use compensating actions where possible. |
| External content isolation | Stage 0 | Must be in architecture from day one. |
| Prompt-injection red team suite | Stage 1 | Before real Gmail/body data. |
| Arbitrary tool trust | Avoid | Never trust tool descriptions alone. |

## 8. Local-first, sync, privacy

| Original idea | New status | Notes |
|---|---:|---|
| Local-first lens definitions | Stage 0–1 | Keep. |
| Automerge | Stage 0–1.5 | Add early if feasible. |
| Sync relay | Stage 1.5 | After local runtime. |
| Plain sync | Stage 1.5 | Be honest that relay may see data unless E2E. |
| E2E sync | Stage 3 | Trust/privacy product tier. |
| Trust tier | Stage 3 | Good later idea. |
| Sync OAuth tokens | Avoid | Tokens remain device/account secure storage, not lens docs. |
| Full local archive of external data | Stage 3 | Opt-in only. |

## 9. Mobile and voice

| Original idea | New status | Notes |
|---|---:|---|
| Android app | Stage 1 optional / Stage 1.5 | Shell only at first. |
| Mobile lens wearing | Stage 1–1.5 | Good. |
| Mobile lens building | Stage 2 | Later. |
| Widgets | Stage 3 | Needs stability and notification policy. |
| Quick capture | Stage 2 | Good mobile-native feature. |
| Voice input for NL edit | Stage 2 | Lightweight. |
| Voice-first authoring | Stage 3 | Needs UX maturity. |
| Android Auto / CarPlay | Research / Stage 4 | Very late, if at all. |

## 10. Onboarding and discovery

| Original idea | New status | Notes |
|---|---:|---|
| Inverse lens mining | Reframe | Rename to Lens Discovery; make opt-in. |
| Starter lens generation | Stage 1 | Good. |
| Role/context onboarding | Stage 1 | Good. |
| Scan local apps/browser sign-ins | Reframe | Explicit opt-in only; likely later. |
| Silent device behavior inference | Avoid | Trust-damaging. |
| Blind-spot lens | Stage 2–3 | Good if framed as optional insight, not judgment. |
| Five minutes to useful lens | Stage 1 metric | Good target, not hard requirement. |

## 11. GTM/business

| Original idea | New status | Notes |
|---|---:|---|
| Wovith as personal AI OS | Reframe | Too broad for launch. Use internally or later. |
| “See your stuff, your way” | Stage 1 | Good user-facing copy. |
| $24/month Pro | Research | Validate value first. |
| Free local-only | Stage 1–1.5 | Good possible wedge. |
| Paid sync/budget | Stage 1.5–2 | Likely monetization. |
| Teams/enterprise | Stage 3 | Requires security maturity. |

## 12. Ideas marked Avoid unless fundamentally redesigned

These are not merely “later”; they conflict with Wovith’s trust posture as originally framed.

1. Hidden local/browser/app scanning.
2. Silent external writes.
3. Model-generated executable DSL without typed validation.
4. Universal undo promise for irreversible external actions.
5. E2E/privacy marketing before implementation.
6. Broad `full` connector permission tiers as user-facing truth.
7. Arbitrary MCP/tool execution without Wovith-side policy.
8. Letting source content instruct agents or tools.
9. Shipping all original v1 features as first release.
10. User-facing “mining” language for onboarding.

## 13. Preservation summary

Almost everything valuable from the original broad v1 survives. It is now distributed across stages with prerequisites. The core principle is:

> Cut from first build, not from the vision.

The few ideas marked Avoid are not rejected because they are ambitious. They are rejected because they would make Wovith less trustworthy, less inspectable, or less safe.
