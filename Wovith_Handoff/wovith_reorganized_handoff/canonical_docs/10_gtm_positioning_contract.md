# 10 — GTM and Positioning Contract

**Status:** Canonical  
**Purpose:** sharpen Wovith’s initial market wedge while preserving broader ambitions.

## 1. Positioning statement

For AI-native knowledge workers who are overwhelmed by scattered personal work context, Wovith is a private lens runtime that creates persistent, inspectable views across their tools. Unlike chat-first AI assistants or workspace-specific agents, Wovith lets users see, tune, and trust the rules behind each view.

## 2. Plain-language positioning

Primary:

> **See your stuff, your way.**

Secondary:

> A private lens over your work apps.

Power-user:

> Programmable personal views with provenance.

Technical:

> A local-first, DSL-backed lens runtime for personal digital context.

## 3. What not to claim early

Avoid:

- “AI operating system for everyone.”
- “Fully autonomous personal assistant.”
- “Connects to everything.”
- “End-to-end encrypted sync” unless implemented.
- “Full time travel across your apps” unless snapshots are implemented.
- “Undo every agent action.”

## 4. Initial ICP

Start with people who already understand the value of configurable views:

- Notion/Raycast/Obsidian/Tana/Airtable users;
- developers and product builders;
- solo founders;
- researchers;
- managers with many meetings;
- freelancers/consultants with client context.

These users are more likely to tolerate setup and inspection in exchange for daily clarity.

## 5. First wedge use case

The strongest first wedge is not “build any lens.” It is:

> **Daily work lens: meetings, prep docs, follow-ups, and stale threads in one inspectable view.**

This is concrete, habit-forming, and uses the best early connectors.

## 6. Competitive landscape

### 6.1 Notion

Notion now markets AI agents that use docs/databases and connected apps such as Slack, Mail, Calendar, and MCP integrations. It is strong inside the workspace and increasingly agentic. Wovith should not compete by saying “we also connect apps.” Wovith’s difference is user-owned inspectable lenses, not a Notion-contained workspace.

Research: R-COMP-01, R-COMP-02.

### 6.2 Raycast

Raycast is a powerful OS/productivity command surface with AI, extensions, local storage, and local models. Wovith should not compete as a faster launcher. Wovith’s difference is persistent spatial lenses and provenance.

Research: R-COMP-03.

### 6.3 Microsoft 365 Copilot

Microsoft has enterprise data, Graph connectors, admin controls, and agent infrastructure. Wovith should not start with enterprise breadth. Wovith can win on personal/private malleability and inspectable views for individuals before teams.

Research: R-COMP-04, R-COMP-05.

### 6.4 Zapier MCP

Zapier offers massive app/action breadth through MCP and automation. Wovith should not try to out-integrate Zapier early. Wovith can later use breadth providers, but its wedge is seeing and understanding, not simply acting.

Research: R-COMP-06.

### 6.5 Airtable

Airtable is increasingly an AI app/agent builder over structured data. Wovith should not become a general business app builder early. Wovith is a personal lens over external context.

Research: R-COMP-07.

### 6.6 Obsidian Bases

Obsidian Bases shows demand for database-like views over personal notes. Wovith can borrow the “views over your own stuff” intuition, but extends beyond notes into connected live sources and provenance.

Research: R-COMP-08.

## 7. Differentiation stack

Wovith is differentiated only if these stay together:

1. Persistent lenses instead of one-off answers.
2. DSL-backed cells instead of hidden prompts.
3. Spatial/rendered views instead of linear chat.
4. Provenance-first answers instead of opaque summaries.
5. Local-first definitions instead of cloud-owned config.
6. Explicit calibration instead of invisible personalization.
7. Permission-aware connectors instead of broad agent access.

If Wovith drops too many of these, it becomes another AI productivity wrapper.

## 8. Messaging hierarchy

### Audience-facing

- “See what needs attention today.”
- “Turn Gmail, Drive, and Calendar into private views.”
- “Know why every item appears.”
- “Tune the lens instead of re-prompting the bot.”

### Power-user

- “Persistent cells over your tools.”
- “Natural language in, inspectable DSL out.”
- “Provenance for every result.”
- “Local-first lens definitions.”

### Developer/technical

- “Typed AST, source schemas, and deterministic rendering.”
- “MCP-capable connector architecture with Wovith-side policy.”
- “Action manifests for safe tool execution.”

## 9. Pricing staging

Do not finalize complex pricing before usage is proven.

Possible future model:

| Tier | Stage | Concept |
|---|---:|---|
| Free/local | 1 | Local-only, limited connectors, limited AI/BYOK optional |
| Pro | 1.5/2 | Sync, more connectors, more agent budget, richer lenses |
| Trust | 3 | E2E option, compliance/audit export, teams, admin controls |
| Marketplace revenue | 3+ | Lens packs/templates/extensions |

Early alpha should focus on usefulness, not monetization optimization.

## 10. Launch sequence

### Pre-alpha

- Build synthetic prototype.
- Recruit 5–10 power users.
- Test if “lens” is understandable.

### Private alpha

- 20–50 users.
- One daily lens use case.
- Measure return and trust.

### Beta

- 100–500 users.
- Add sync if needed.
- Add more starter lenses.
- Improve onboarding.

### Public v1

- Narrow promise.
- Clear privacy disclosure.
- No broad automation claims.
- Show examples of “Why am I seeing this?”

## 11. Success metrics

### Product value

- User creates first useful lens.
- User returns next day.
- User keeps lens after 7 days.
- User opens/uses lens repeatedly.
- User edits/calibrates cell.

### Trust

- User opens “Why?” and understands it.
- User does not disconnect because of permission fear.
- User can explain what Wovith reads.
- User accepts generated DSL after preview.

### Efficiency

- Time to first rendered real cell.
- Time to first accepted lens.
- Connector failure rate.
- Cell refresh latency.
- LLM cost per active user.

### Novelty validation

- Users prefer a persistent lens over asking a chatbot repeatedly.
- Users mention provenance/inspectability as valuable.
- Users reuse/tune cells.

## 12. Research cross-references

- Competitors: R-COMP-01 through R-COMP-08.
- Google/MCP market direction: R-MCP-01, R-MCP-06.
- Local-first differentiation: R-LOCAL-01, R-LOCAL-02.
