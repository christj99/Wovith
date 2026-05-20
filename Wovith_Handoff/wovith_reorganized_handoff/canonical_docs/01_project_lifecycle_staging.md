# 01 — Project Lifecycle Staging

**Status:** Canonical  
**Purpose:** shrink the initial build while preserving the original idea space for later stages.

## Stage taxonomy

| Stage | Name | Primary question | Outcome |
|---:|---|---|---|
| -1 | Pre-code contract | Do we know what not to build yet? | Coding-agent-ready docs, staged backlog, canonical contracts |
| 0 | Synthetic runtime prototype | Can a lens/cell runtime work at all? | Working local app with fake data, DSL, renderers, provenance |
| 0.5 | First real connector | Does the loop work with real user data? | One read-only connector, OAuth, source schema, NL→AST |
| 1 | Private alpha | Does a daily lens become useful? | Narrow Google-based personal lens app with provenance |
| 1.5 | Beta hardening | Can users rely on it repeatedly? | Sync, durability, better onboarding, budgets, tests, privacy hardening |
| 2 | Pro product | Can Wovith expand safely? | More renderers/connectors, limited actions, richer mobile |
| 3 | Trust / teams / marketplace | Can Wovith become a governed ecosystem? | E2E option, lens sharing, Trust tier, marketplace controls |
| 4 | Extensible runtime | Can third parties build on it? | Custom renderers, arbitrary MCP with policy, APIs, advanced automation |

## Stage -1 — Pre-code contract

### Goal

Create a coherent contract before implementation begins.

### In scope

- Preserve original docs under `original_docs/`.
- Define canonical build/staging docs.
- Create feature stage matrix.
- Create architecture contract.
- Create AST-first DSL contract.
- Create connector/security contract.
- Create provenance/snapshot contract.
- Create coding-agent prompt.
- Create schema patch file.
- Mark contradictions in the old v1 but do not erase them.

### Out of scope

- Production code.
- New design mocks.
- New product promises beyond the staged docs.

### Exit criteria

- A coding agent can start Stage 0 without asking what to build first.
- Deferred ideas have explicit future stages.
- Bad ideas are clearly marked.

## Stage 0 — Synthetic runtime prototype

### Goal

Prove the core loop without OAuth, Google, mobile, sync, billing, or live agent risk.

### Product promise

A local demo where a user can create a lens, add cells over fake/synthetic data, inspect canonical DSL, render values, and see provenance explanations.

### In scope

#### Platform

- Web app only.
- Local persistence only.
- No mobile shell yet.

#### Sources

- Synthetic source adapter with fixture data:
  - fake calendar events;
  - fake emails/threads;
  - fake Drive-like documents;
  - fake captures.

#### Runtime

- Cell registry.
- Evaluation scheduler.
- Fresh/stale/error states.
- Local cache for evaluation results.
- Basic provenance record.
- Basic source schema registry.

#### DSL

- AST types.
- Deterministic parser and serializer.
- Canonical DSL surface.
- Static analyzer.
- Golden parser round-trip tests.
- No LLM required.

#### Renderers

- `list`
- `count`
- `raw`
- `table` if cheap; otherwise Stage 0.5.

#### UX

- Lens list.
- Lens detail.
- Cell card.
- DSL inspector.
- “Why am I seeing this?” panel.
- Manual refresh.
- Empty/error states.

#### Provenance

- Cell-level trace: source → filter → transform → render.
- Item-level evidence for fixture records.

### Explicitly out of scope

- OAuth.
- MCP remote servers.
- Gmail/Drive/Calendar real data.
- NL authoring.
- Agents.
- Sync.
- Mobile.
- Billing.
- Marketplace.
- External writes.
- User-added MCP.
- Full time travel.

### Exit criteria

- User can create a cell from DSL and save/reload it.
- Cell evaluates over synthetic data.
- Renderer displays result.
- User can inspect canonical DSL.
- User can open “Why am I seeing this?” for a result.
- Golden tests cover parser/serializer/analyzer.
- Runtime has no side effects beyond local storage.

### Original ideas preserved for later

- All connectors, NL authoring, mobile, voice, marketplace, sync, action governance, all renderers.

## Stage 0.5 — First real connector

### Goal

Prove Wovith works with real personal data while keeping risk low.

### Recommended first connector

Use **Google Calendar read-only** or **Google Drive metadata/read-only** before Gmail. Calendar is structured and lower-risk. Drive metadata/content can be useful but must be explicit. Gmail is high-value but higher compliance/security risk.

### In scope

#### Platform

- Web app.
- Local-only storage by default.

#### Connectors

- One Google connector, read-only.
- OAuth Authorization Code + PKCE.
- Store tokens securely for the platform.
- Source schema registry for the connector.
- Connector health state.
- Minimal audit log.

#### MCP/API strategy

- Prefer a direct connector adapter if official Google Workspace MCP is still preview/unstable for production.
- Keep MCP abstraction behind the connector port so MCP can be swapped in later.

#### DSL and NL

- NL→typed AST using structured output.
- Deterministic AST validation.
- Deterministic DSL serialization.
- Repair/refusal loop for invalid requests.
- 100+ golden NL→AST examples.

#### Renderers

- `list`
- `count`
- `raw`
- `table`
- optional `cards/feed` if useful.

#### Provenance

- Evidence tier snapshots: source IDs, timestamps, matched predicates, hashes, redacted preview if permitted.

### Explicitly out of scope

- Gmail send/delete/modify.
- Arbitrary MCP servers.
- Full sync.
- Full mobile.
- Marketplace.
- Full agent actions.
- Full time travel.
- All renderers.

### Exit criteria

- User connects one real source.
- User creates a useful cell from natural language.
- User sees the generated DSL before accepting.
- User can inspect why a real item appeared.
- User can disconnect source and delete local cache/evidence.
- No write actions exist.

## Stage 1 — Private alpha

### Goal

Find whether Wovith creates daily value for a narrow early-adopter group.

### Product promise

A private, inspectable daily work lens over a few Google sources.

### In scope

#### Platforms

- Web app.
- Android shell only if strategically necessary, with limited functionality.

#### Connectors

- Google Calendar read-only.
- Google Drive read-only with explicit metadata/content boundaries.
- Gmail read-only only after security model is implemented.
- Gmail draft creation may be considered late Stage 1 if Google verification and safety requirements are understood; no send/delete/modify.

#### Lenses

Starter lenses:

- Today.
- Follow-up.
- Project pulse.
- Meeting prep.
- Stale work.
- Inbox triage if Gmail read-only is ready.

#### Renderers

- `list`
- `feed` or `cards`
- `count`
- `table`
- `raw`
- optional `timeline` once Calendar is strong.

#### DSL/NL

- AST-first NL authoring.
- DSL inspector.
- Edit/repair flow.
- Canonical examples.

#### Security and trust

- Taint model.
- Action Manifest type even if writes are mostly unavailable.
- Audit log.
- Permission summary per cell.
- Source/content trust labeling.

#### Provenance

- “Why am I seeing this?” for every cell/item.
- Evidence snapshots.
- Freshness status.

#### Onboarding

- Guided lens seeding by role/use case.
- No hidden local scanning.
- Explicit connector permission explanation.

### Explicitly out of scope

- Marketplace.
- Custom renderers.
- Arbitrary MCP servers.
- Widgets.
- Full voice-first workflows.
- Full local device/app discovery.
- Gmail send/delete/modify.
- Background agents that act.
- Team sharing.
- Trust/E2E tier claims.

### Exit criteria

- Private users create at least one useful daily lens.
- Users return to the lens repeatedly.
- Users understand why items are shown.
- Users can correct the lens without support.
- No major prompt-injection or permission failures in adversarial tests.
- Cost and latency are measurable.

## Stage 1.5 — Beta hardening

### Goal

Prepare for broader beta while preserving trust.

### In scope

- Multi-device sync for lens definitions and calibration.
- Clear privacy mode: local-only vs plain sync vs E2E sync if implemented.
- Server-side budget metering if Wovith pays model costs.
- Better connector health/repair flows.
- More robust audit retention.
- Improved golden test suite.
- Red-team suite for prompt injection, tool abuse, data leakage.
- BYOK experiment for advanced users.
- Optional Android app if Stage 1 web validates demand.

### Out of scope unless proven necessary

- Marketplace.
- Arbitrary MCP.
- Broad external writes.
- Consumer-scale onboarding claims.

### Exit criteria

- Sync works reliably without overpromising privacy.
- Source permissions are understandable.
- Budget cannot be bypassed by client bugs.
- Prompt injection tests pass with documented mitigations.
- A small beta group can self-onboard.

## Stage 2 — Pro product

### Goal

Expand Wovith’s utility without losing inspectability.

### In scope

- Additional connectors: Slack, Notion, GitHub, Linear, Microsoft 365, web capture, local files where platform permits.
- More renderers: timeline, chart, grid, text.
- Limited writes with Action Manifest:
  - create Gmail draft;
  - create calendar event draft/review;
  - create task;
  - label or archive only with explicit approval.
- Mobile quick capture.
- Notifications with budgets.
- Lens overlay/diff for power users.
- Lens-as-prompt export if safe and useful.
- More advanced calibration.

### Gated ideas returning here

- Voice authoring as assistive input.
- More onboarding discovery.
- Kanban as read-only or draft-write only.
- Stale/blind-spot lenses if positioned carefully.

### Exit criteria

- Wovith has a repeatable Pro use case.
- Users can safely authorize limited actions.
- Expanded renderers do not degrade simplicity.
- Compliance plan for restricted scopes is in place.

## Stage 3 — Trust, teams, and marketplace

### Goal

Turn Wovith from a private tool into a governed product and ecosystem.

### In scope

- E2E sync if implemented and audited.
- Trust tier.
- Team/shared lenses.
- Lens Garden / marketplace.
- Lens export/import signing.
- Admin controls.
- Policy packs for connectors/actions.
- Compliance exports.
- Marketplace moderation and permission review.
- Advanced provenance graph view.

### Gated ideas returning here

- Full lens overlay/diff.
- Shared calibration controls.
- Trusted lens packs.
- Public templates.
- Team audit log.

### Exit criteria

- Shared lenses cannot silently exfiltrate data.
- Imported lenses declare permissions and actions before use.
- Marketplace has a review/security model.
- E2E claims are backed by actual implementation and docs.

## Stage 4 — Extensible runtime

### Goal

Make Wovith a broader platform without sacrificing safety.

### In scope

- User-added MCP servers with sandbox/trust registry.
- Custom renderers with capability sandbox.
- Public extension API.
- More autonomous agents with bounded authority.
- Advanced local-first collaboration.
- Browser automation only with strict policy.
- Deep personal knowledge modeling if user-controlled.

### Gated ideas returning here

- Arbitrary MCP.
- Custom cells/renderers.
- Browser/app automation.
- Rich agent workflows.
- Advanced blind-spot/adversarial lenses.

### Exit criteria

- Extension model has threat review.
- User consent remains intelligible.
- Tool/action boundary is enforced by code, not copy.
- Wovith can reject or quarantine unsafe extensions.

## Stage gates summary

| Capability | Earliest stage | Required prerequisites |
|---|---:|---|
| Synthetic source | 0 | None |
| Real read-only connector | 0.5 | OAuth, source schema, audit |
| Gmail read-only | 1 | Prompt-injection model, Google scope plan, evidence limits |
| Gmail draft creation | 1 or 2 | Action Manifest, user approval, Google verification understanding |
| Gmail send/delete/modify | 2+ | Restricted-scope compliance, irreversible-action UX, audit, security review |
| Sync | 1.5 | Clear privacy copy, conflict model, token-per-device UX |
| E2E sync | 3 | Key management, recovery policy, tested implementation |
| Marketplace | 3 | Lens permission manifest, review process, import sandbox |
| Arbitrary MCP | 4 | Trust registry, sandbox, consent, tool inspection, policy engine |
| Custom renderers | 4 | Renderer sandbox, permission model, accessibility/test contract |
| Hidden local discovery | Never by default | Must be explicit, narrow, opt-in, explainable |

## Research cross-references

- MCP/Google Workspace: R-MCP-01, R-MCP-02, R-MCP-03.
- Gmail/OAuth compliance: R-GOOGLE-01 through R-GOOGLE-05.
- Prompt injection/agent risk: R-LLMSEC-01 through R-LLMSEC-04.
- Local-first: R-LOCAL-01 through R-LOCAL-03.
- Competitive pressure: R-COMP-01 through R-COMP-07.
