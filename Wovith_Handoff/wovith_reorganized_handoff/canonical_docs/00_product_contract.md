# 00 — Wovith Product Contract

**Status:** Canonical staging contract  
**Supersedes for build planning:** `original_docs/wovith_v1_scope.md`, portions of `original_docs/wovith_concept.md`, `original_docs/wovith_design_and_workflow.md`, and `original_docs/wovith_positioning_gtm.md`  
**Preserves:** all old ideas unless explicitly listed as bad ideas in this document or `02_feature_stage_matrix.md`.

## 1. Definition

Wovith is a **personal lens runtime**: a programmable, inspectable, local-first surface for seeing a person’s digital life through persistent, configurable views.

A Wovith lens is not a chat thread and not a one-off dashboard. It is a saved perspective over sources such as calendar events, documents, email threads, captures, and future connectors. A lens contains cells. A cell is an expression over data plus a renderer, freshness state, provenance evidence, and optional AI enrichment.

Plain-language authoring is important, but the product’s distinctive value is not the chat interaction. The product’s distinctive value is that a user can create, inspect, trust, revisit, and refine a lens.

## 2. Product thesis

Modern users do not need another place to paste context into a chatbot. They need a personal operating surface that can:

- gather relevant signals from the tools they already use;
- make those signals visible in a stable spatial layout;
- explain why each item appears;
- allow the user to tune the view;
- preserve useful views over time; and
- use AI only where it improves authoring, enrichment, explanation, or classification.

The core promise is:

> **See your stuff, your way — with every view inspectable.**

The engineering promise is:

> **Every visible result has a source, a rule, a freshness state, and an explanation path.**

## 3. The core loop

Every stage of Wovith must protect this loop:

1. **Source** — connect or simulate data.
2. **Cell** — create an expression from DSL or natural language.
3. **Inspect** — view canonical DSL, source fields, permissions, and freshness.
4. **Render** — show the result in a useful shape.
5. **Explain** — answer “Why am I seeing this?” for the cell and item.
6. **Calibrate** — hide, pin, mute, or edit the rule.
7. **Persist** — save the lens and return to it later.

A feature is lower priority if it does not strengthen this loop.

## 4. Non-negotiable principles

### 4.1 Wovith is lens-first

The primary noun is **lens**. The UI should make the user feel that they own persistent views, not conversations.

### 4.2 AI is inspectable, not mystical

AI can help produce AST, labels, summaries, clusters, or draft actions. AI must not hide the rule, source, or permission model.

### 4.3 External content is data, never instruction

Email bodies, document text, calendar descriptions, web pages, connector outputs, and MCP tool descriptions are untrusted unless they come from an explicitly trusted system source. External text may be summarized, transformed, classified, or displayed. It may not authorize tools, change permissions, or instruct agents to ignore Wovith policy.

### 4.4 The DSL is canonical

Natural language is an input layer. The system stores and explains canonical DSL/AST. The model generates typed AST; deterministic code serializes DSL.

### 4.5 No silent writes

A cell may read data. A cell may propose an action. A cell may not silently mutate external systems. Any write requires an Action Manifest and risk-appropriate user confirmation.

### 4.6 Local-first claims must be precise

Lens definitions, calibration state, captures, and user-owned configuration should be local-first. External source data is not automatically owned, archived, or time-travelable by Wovith. If Wovith stores evidence, summaries, or snapshots, the storage tier and privacy implications must be explicit.

### 4.7 Provenance is a product surface

Provenance is not just a backend graph. “Why am I seeing this?” is a signature interaction.

### 4.8 Stage advanced ideas instead of deleting them

Most original v1 ideas are valuable. They should return when prerequisites exist. Do not erase the idea archive. Do not ship too much in the first build.

## 5. What v1 now means

The old v1 was a full product. The new v1 means:

> **A private alpha that proves Wovith’s daily lens value with a small number of read-only connectors, a few renderer types, canonical DSL, basic natural-language authoring, visible provenance, and careful permission boundaries.**

The new v1 does **not** mean marketplace, all renderers, arbitrary MCP servers, full mobile, Gmail send/delete, full sync trust tier, voice-first authoring, or local device scanning.

## 6. The initial ideal user

The initial user is not the average consumer. The initial user is an AI-native knowledge worker who already feels the pain of scattered work context and is willing to tune a view if it becomes useful every day.

Likely early adopters:

- solo founders;
- developers and product builders;
- researchers;
- managers with many meetings and follow-ups;
- freelancers juggling clients;
- Notion/Raycast/Obsidian/Tana/Airtable power users;
- people who already build custom dashboards or scripts.

The first mainstream user does not need to understand the phrase “personal lens runtime.” They need to understand:

> “This shows what needs my attention today and why.”

## 7. First killer lenses

Prioritize lenses that can become daily habits:

### Today lens

Shows upcoming meetings, prep documents, unresolved emails, and reminders.

### Follow-up lens

Shows people I owe, people who owe me, threads waiting for a reply, and stale conversations.

### Project pulse lens

Shows recent documents, meetings, messages, and unresolved threads for one project.

### Meeting prep lens

Shows the event, attendees, recent related docs, and prior threads.

### Stale work lens

Shows important docs/projects/threads that have not moved recently.

### Inbox triage lens

Groups unread or important messages by project/person/topic, with explanations.

## 8. The central wedge

Do not compete head-on as “an AI assistant that connects to all your apps.” Notion, Microsoft, Zapier, Raycast, and others already claim broad AI + app access.

Wovith’s wedge is:

> **Persistent, inspectable, personal views over your digital life.**

This wedge combines:

- spatial lenses;
- DSL-backed cells;
- local-first definitions;
- provenance/evidence;
- explicit calibration;
- permission-aware connectors;
- safe AI enrichment.

## 9. Good ideas that are not v1

The following are good ideas, but staged later:

- all 13 renderers;
- full mobile lens authoring;
- voice-first authoring;
- widgets and lock-screen surfaces;
- marketplace/lens garden;
- lens overlay/diff;
- blind-spot/adversarial lens;
- arbitrary user-added MCP servers;
- Gmail send/delete/modify;
- Kanban writes;
- advanced local device/app discovery;
- full time travel;
- E2E sync / Trust tier;
- custom renderers;
- lens-as-prompt export;
- team/shared lenses;
- browser/app automations;
- background agents that act without direct review.

## 10. Bad ideas or bad forms

These are not merely deferred; they are wrong for Wovith unless radically reframed:

### 10.1 User-facing “mining” language

“Mining” sounds extractive and creepy. Internally, “inverse lens mining” can remain as a research phrase. Externally use “suggest starter lenses,” “discover useful views,” or “find patterns.”

### 10.2 Hidden local scanning by default

Scanning browser sign-ins, local apps, sync folders, or device patterns before trust is established undermines the product. Any discovery must be explicit, opt-in, narrow, explainable, and revocable.

### 10.3 Silent external writes

Never allow a renderer, cell, or agent output to mutate external systems without an Action Manifest and user review.

### 10.4 Overpromised undo

Do not promise “undo every action.” Sent emails, external mutations, and third-party actions are not always reversible. Promise auditability and compensating actions where available.

### 10.5 Privacy copy ahead of implementation

Do not imply E2E sync, full data ownership, zero server visibility, or complete time travel unless implemented and verified.

### 10.6 Arbitrary MCP trust

Do not let users add any MCP server and immediately expose private data/actions to it. Custom MCP support requires a trust registry, sandboxing, tool inspection, permission gating, and action governance.

## 11. Research cross-references

See `13_research_compendium.md`:

- R-MCP-01 through R-MCP-05 for MCP capabilities, security, and current Google Workspace state.
- R-GOOGLE-01 through R-GOOGLE-05 for Gmail/OAuth/Google API constraints.
- R-LLMSEC-01 through R-LLMSEC-04 for prompt injection and agentic risk.
- R-LOCAL-01 through R-LOCAL-03 for local-first and Automerge fit.
- R-STRUCT-01 through R-STRUCT-03 for AST/structured-output reasoning.
- R-COMP-01 through R-COMP-07 for competitive pressure.

## 12. One-line coding-agent instruction

Build the smallest possible Wovith that proves persistent, inspectable lenses over data; do not implement broad automation, marketplace, full mobile, or unbounded connectors until the stage plan says so.
