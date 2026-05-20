# 15 — Open Questions and Experiments

**Status:** Canonical discovery backlog  
**Date:** 2026-05-20  
**Purpose:** capture unresolved product, technical, security, and market questions without blocking the first prototype.

This document separates decisions that must be made before coding from questions that should be tested through prototypes or user research.

## 1. Questions that should not block Stage 0

The following are important, but Stage 0 can proceed without final answers:

- Which real connector should be first?
- Whether the first shipped mobile app is Android-only or web-first.
- Whether pricing starts at free, BYOK, or paid alpha.
- Whether sync is Automerge-only, relay-backed, or delayed.
- Whether Google Workspace MCP is production-stable enough for direct dependency.
- Whether Wovith later supports arbitrary MCP servers.
- Whether voice authoring becomes a major interaction mode.
- Whether marketplace/lens garden becomes a company-level wedge.

Stage 0 only needs a synthetic source, strict DSL, runtime, renderers, provenance, and persistence.

## 2. Product-market questions

### Q-PM-01 — Do users understand “lens” quickly?

**Hypothesis:** Users can understand a lens as a reusable view over their digital life.

**Risk:** “Lens runtime” may sound abstract. Users may understand “daily work dashboard” more quickly.

**Experiment:** Show 5–10 users a simple prototype with three labels:

1. Lens
2. Dashboard
3. View

Ask which term they understand, which feels novel, and which they would use daily.

**Stage:** 0.5–1.

### Q-PM-02 — Is the first killer use case daily work clarity?

**Hypothesis:** The strongest first use case is a daily work lens combining meetings, docs, follow-ups, and urgent messages.

**Risk:** Users may prefer narrow, high-value utilities such as meeting prep or follow-up tracking over a broad daily lens.

**Experiment:** Offer three starter lenses:

- Daily Work Lens
- Meeting Prep Lens
- Follow-Up Lens

Track which one users keep open after setup.

**Stage:** 1.

### Q-PM-03 — Will users inspect DSL/provenance?

**Hypothesis:** Inspectability increases trust even if most users do not edit DSL frequently.

**Risk:** DSL could scare mainstream users or feel developer-centric.

**Experiment:** Hide DSL by default behind “Inspect rule,” but make the generated explanation prominent. Track open/edit rates and ask trust questions.

**Stage:** 1.

### Q-PM-04 — Is Wovith better as a power-user tool or mainstream assistant?

**Hypothesis:** Early adopters are power users who already tolerate Notion, Obsidian, Raycast, Airtable, Linear, or custom scripts.

**Risk:** Mainstream users may need fully guided workflows and very little configurability.

**Experiment:** Recruit two cohorts: power users and mainstream knowledge workers. Compare activation and retention.

**Stage:** 1–1.5.

## 3. UX questions

### Q-UX-01 — What is the best creation flow?

Options:

1. Template-first: choose starter lens, then modify.
2. NL-first: describe what you want, then inspect.
3. Source-first: connect data, then suggestions appear.
4. Canvas-first: blank lens, add cells manually.

**Recommended initial default:** template-first with NL edit.

**Experiment:** A/B test template-first vs NL-first.

### Q-UX-02 — How visible should provenance be?

Options:

1. Always visible as small source chips.
2. One-click “Why?” per item.
3. Only in cell inspector.
4. Hidden unless error/conflict.

**Recommended initial default:** source chips + one-click Why panel.

### Q-UX-03 — How much spatial freedom should cells have?

Options:

1. Fixed vertical stack.
2. Responsive masonry.
3. Freeform canvas.
4. Dashboard grid.

**Recommendation:** start with vertical stack or simple grid. Freeform canvas is later.

### Q-UX-04 — Should NL edits feel like chat?

**Recommendation:** no global chatbot as primary UI. Use local NL edit boxes attached to cells and lenses.

## 4. Technical questions

### Q-TECH-01 — Direct APIs or MCP for first Google connector?

**Options:**

1. Direct Google Calendar/Drive/Gmail APIs.
2. Google Workspace MCP servers.
3. Adapter abstraction that can use either.

**Recommendation:** build a connector adapter abstraction and choose the most stable implementation per source. Do not make Stage 0.5 depend exclusively on a preview MCP server.

### Q-TECH-02 — Automerge from day one or later?

**Options:**

1. Use Automerge immediately for lens state.
2. Start with simple local storage and migrate.
3. Build repository interfaces and swap later.

**Recommendation:** define repository interfaces immediately. Use Automerge early if implementation cost is acceptable; otherwise keep the state format migration-ready.

### Q-TECH-03 — How much source data should be cached?

**Options:**

1. No source cache.
2. Metadata cache only.
3. Redacted summaries.
4. Full item cache.

**Recommendation:** Stage 0.5 default should be metadata/evidence cache only, with explicit opt-in for summary/full snapshots.

### Q-TECH-04 — Where should model calls run?

**Options:**

1. Client direct BYOK.
2. Wovith server proxy.
3. Hybrid.

**Recommendation:** prototype without model calls; later use hybrid. Paid hosted model usage needs server-side metering, while BYOK can satisfy power users.

### Q-TECH-05 — Should renderer payloads be generic or typed?

**Recommendation:** typed renderer schemas. Generic blobs are tempting but will weaken inspectability and validation.

## 5. Security questions

### Q-SEC-01 — Which permissions are acceptable for alpha?

**Recommendation:** read-only Calendar and Drive metadata/body as explicitly disclosed. Gmail metadata/read-only later. Gmail send/delete/modify not alpha.

### Q-SEC-02 — How should prompt injection be tested?

**Experiment:** maintain a red-team corpus of synthetic emails/docs/calendar descriptions that attempt to override system rules, request data exfiltration, or trigger actions.

### Q-SEC-03 — What is the user-facing permission granularity?

**Recommendation:** show cell-level data access when practical:

- reads subject lines only
- reads message bodies
- reads Drive metadata
- reads document contents
- creates draft
- sends message

### Q-SEC-04 — How should Wovith handle arbitrary MCP servers later?

**Recommendation:** require a trust tier, sandboxing, allowlists, server identity, tool categorization, policy review, and default denial for writes.

## 6. Data/provenance questions

### Q-DATA-01 — What is enough evidence for “Why?”

**Minimum:** source ID, item ID, matched predicates, source timestamps, evaluation time, field previews or hashes.

**Experiment:** Ask users whether the Why panel makes them trust the result. If not, add clearer natural-language explanations rather than more raw graph data.

### Q-DATA-02 — How long should evidence be retained?

**Options:** 7, 30, 90 days, indefinite local-only.

**Recommendation:** default 30 days for alpha evidence, configurable later. Avoid syncing evidence by default until privacy model is clear.

### Q-DATA-03 — How much time travel matters?

**Hypothesis:** Users want to know why something appeared recently more than they need full historical replay.

**Experiment:** Add “last evaluation” and “changed since yesterday” before full time travel.

## 7. Business-model questions

### Q-BIZ-01 — Free local-only vs paid early access?

**Options:**

1. Free local-only alpha.
2. Paid alpha with strict usage budget.
3. BYOK alpha.
4. Invite-only design partner cohort.

**Recommendation:** design partner cohort first, then free local-only or BYOK, then paid sync/model budget.

### Q-BIZ-02 — What is the first paid feature?

Candidates:

- multi-device sync
- higher model budget
- more connectors
- saved lens packs
- Trust privacy mode
- team sharing

**Recommendation:** paid sync + higher agent budget later; do not monetize before daily value is proven.

## 8. Experiments to run in order

### Experiment 1 — Static lens comprehension

Create a clickable Figma/prototype mock showing a daily work lens. No backend required.

Measure:

- Does the user know what it is?
- Can they explain what a cell is?
- Do they click Why?
- Which labels confuse them?

### Experiment 2 — Synthetic runtime usefulness

Use Stage 0 prototype with synthetic data.

Measure:

- Does the lens loop make sense?
- Does DSL inspection help or hurt?
- Are the renderers sufficient?
- Does provenance feel useful?

### Experiment 3 — First real connector

Connect Calendar or Drive.

Measure:

- OAuth completion
- first useful lens creation time
- permission trust
- daily return rate

### Experiment 4 — Gmail read-only trust test

Introduce Gmail metadata/body read to a small cohort.

Measure:

- consent hesitation
- perceived creepiness
- utility compared with Calendar/Drive
- prompt-injection behavior

### Experiment 5 — NL-to-AST authoring

Let users describe a cell and inspect the result.

Measure:

- valid AST rate
- correction rate
- user trust after preview
- whether users edit DSL or natural language

### Experiment 6 — Calibration loop

Add pin/hide/mute/explain feedback.

Measure:

- whether repeated lenses improve
- whether users understand calibration effects
- whether calibration creates hidden personalization concerns

## 9. Decisions to revisit after Stage 0

After Stage 0, decide:

- First real connector.
- Whether Automerge is in Stage 0.5 or Stage 1.5.
- Exact renderer set for private alpha.
- Whether NL compiler enters before or after real connector.
- Whether alpha is web-only or includes Android shell.
- Evidence retention default.

## 10. Decisions to revisit after Stage 1

After private alpha, decide:

- Pricing model.
- Sync architecture.
- Gmail body-read expansion.
- Draft creation support.
- Additional connectors.
- Mobile investment level.
- Lens sharing/export.
- Trust/E2E roadmap.

## 11. Questions that should remain closed unless evidence changes

These are effectively decided for now:

- Do not make Wovith primarily a chatbot.
- Do not start with broad Gmail writes.
- Do not build all renderers before shipping.
- Do not ship hidden local scanning.
- Do not promise universal undo.
- Do not allow arbitrary MCP servers in early stages.
- Do not claim E2E sync before implementing it.
- Do not let external content become instruction.
