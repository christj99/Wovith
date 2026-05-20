# Wovith
### A personal lens runtime for the AI era

---

## 1. The problem

For forty years, the personal computer was supposed to be clay. What we got instead were appliances — software built far away, in sealed packages, by people who couldn't possibly know how you actually work.

Ink & Switch put it precisely in their 2025 *Malleable Software* essay:

> The original promise of personal computing was a new kind of clay. Instead, we got appliances: built far away, sealed, unchangeable.

Their proposed alternative — tools the user can reshape with minimal friction, where modification is routine rather than exceptional, where adaptation happens at the point of use rather than through engineering teams at distant corporations — is the right diagnosis of what went wrong and what could go right. Their prototypes (Patchwork, Potluck, Embark) demonstrate that the foundations are buildable. What's missing is a product, aimed at end users rather than research peers, that takes the bet seriously enough to ship.

The AI moment threatens to make the problem worse before it makes it better. Most "AI assistant" products in 2026 — Lindy, Vellum, Personal AI Assistant, Claude Cowork — are agents-bolted-onto-someone-else's-application-model. They do more on your behalf, but they don't expand your agency over *how you see and interact with your stuff*. The application paradigm survives intact; the agent just becomes another sealed appliance, somewhere between you and your data.

There is, however, a real seam to work in. The infrastructure has finally caught up to a vision that was technically impossible five years ago:

- **MCP has become the universal protocol for AI-to-tool integration.** By early 2026, the registry counts over 200 public servers covering Google Drive, Gmail, Slack, Notion, GitHub, calendar, file system, browser, and beyond. All major model vendors support it. The Linux Foundation governs it under the Agentic AI Foundation. The connector problem that used to be a sealed-app moat is now a public standard.
- **Local-first infrastructure has matured.** Automerge 3.0 (May 2025) made CRDT-backed documents practical in the browser. PowerSync, ElectricSQL, and Cloudflare Agent Memory provide production-grade sync. User-owned data is a reasonable engineering choice in 2026, not a research project.
- **Computer-use agents are reliable enough for production.** Claude Sonnet 4.6 produces zero hallucinated links in computer-use evals where Sonnet 4.5 produced one in three. The accessibility-tree-plus-screenshot pattern has standardized across Claude, Operator, and Gemini Computer Use.
- **DSLs designed for LLM authorship outperform general-purpose languages.** Recent research (Anka, DSL-Xpert 2.0) shows that LLM-hardened DSLs can hit 100% accuracy on multi-step pipelines where Python-based generation hits 60%. The implication: design the DSL for the LLM, let the natural-language editor be the human ergonomics layer.

All of which is to say: the building blocks exist. The question is what to build on top of them.

---

## 2. The Wovith vision

Wovith is a **personal lens runtime**.

A *lens* is a programmable, swappable way of seeing your digital world — your files, your calendar, your messages, your services, the open web. Each lens is a saved configuration: which sources to draw from, how to filter and arrange them, what to surface and what to ignore. You wear one lens at a time. You switch lenses the way a photographer changes glass.

- A **Morning Lens** shows you the next decisions of the day, the threads that need attention before 10am, the calendar events that aren't quite right yet.
- A **Research Lens** surfaces your active threads, the papers in your watch list, the open tabs you abandoned last Thursday that are still relevant.
- A **Family Lens** foregrounds shared photos, the kids' school messages, the weekend plans, the medications running low.
- A **Sunday Lens** quiets the work signal entirely and brings forward the long-running projects you've been meaning to think about.

A lens is built from *cells*. A cell is the atomic unit: a small expression in the Wovith DSL that, when evaluated, produces a rendered view. Cells live spatially on a canvas. They are reactive — when their inputs change, they recompute. They are agent-capable — they can include fetches into external services via MCP, or into apps without APIs via computer-use. They are inspectable — you can always see the expression behind a cell, edit it in natural language or in DSL syntax, and the two views round-trip cleanly.

A user becomes *fluent in Wovith* the way one becomes fluent in Excel, Emacs, or APL: by living in it long enough that the primitives become second nature, the compositions start to suggest themselves, and the DSL stops feeling like syntax and starts feeling like notation. Fluency is rewarded, never required. Most users will live at the natural-language layer indefinitely, and that's fine — the natural-language layer is real.

---

## 3. Core concepts

### The lens cell

Wovith's atomic unit is the cell. Each cell is an expression that evaluates to a rendered view. The rendering is polymorphic on the result type:

- An expression returning a list of files renders as file rows
- An expression returning a chronological stream renders as a feed
- An expression returning a single structured object renders as a card
- An expression returning a chart spec renders as a chart
- An expression returning a custom component renders that

The cell does not have a fixed *type*. The data determines its surface. This is the Mathematica/Jupyter/Observable lineage applied to a spatial canvas, with agent-pull and live-presence properties layered on.

Cells are first-class. They have spatial positions on a canvas. They have history — every output they've ever produced is recoverable from CRDT. They have provenance — they know where their data came from, what was filtered out, what was emphasized. They are remixable, forkable, shareable.

### The lens

A lens is a saved bundle: a collection of cells with positions, the configuration of which sources they read from, and any global filters or transforms. Lenses have names ("Morning," "Research," "Family"). Switching lenses is a single action — your canvas re-paints to the new configuration, cells re-evaluate against current data, and the previous lens is preserved unchanged for when you swap back.

### The substrate

Wovith does not store your data. It reads from where your data already lives: files in Drive, notes in Notion, messages in Slack, calendar in Google Calendar, photos on disk, the open web. The lens reads; the lens shows.

Wovith's own state — your cells, your lenses, your history, your calibration data — lives in a local Automerge document on your device, synced through a cloud relay you can self-host. The cloud is a relay, not a source of truth.

### The runtime

The Wovith runtime is:

- **Reactive.** Cells update when their inputs change, not on a polling schedule.
- **MCP-native.** Connectors are standard MCP servers from the public registry.
- **Agent-capable.** Cells can include slow expressions that involve browser-use or computer-use.
- **Tiered.** Cells are split into *fast lens slots* (cached, deterministic, sub-second) and *slow lens slots* (agentic, may take seconds or fail, clearly marked).

### The author surface

Users author cells through two equivalent representations:

- A natural-language description ("show invoices I touched this week, newest first")
- A DSL expression in the Wovith language

The two are bidirectionally synced. Edits to either propagate to the other. Natural language is the front door for new users; the DSL is the back room for power users; both work simultaneously, on the same cell, at the same time. The NaturalEdit research (Tang et al., 2025) is the closest published precedent for the round-trip integrity properties we need.

---

## 4. Architecture at a high level

### Form factor: destination canvas with universal invocation

Wovith is a persistent app you open and dwell in, reachable from any other app via global shortcut. Inside Wovith are two zoom levels:

- A **lens overview** showing all your lenses with live previews
- A **lens interior** showing the current lens's cells laid out spatially on a canvas

Outside Wovith, the universal-invocation shortcut summons your current lens as a slide-over panel inside whatever app you were using. You see your stuff, take action if needed, dismiss back.

Why destination over ambient: OS sandboxing forbids true HUD-style overlays on most platforms, and the fluency promise requires somewhere to dwell. Fluency doesn't form from glances.

### Cell as code-that-renders

Every cell is an expression in the Wovith DSL. The expression is evaluated against the substrate; the result is rendered polymorphically. The DSL has a small, regular core (sources, filters, joins, transforms, renderers) and a controlled expansion vocabulary (agent calls, schedule triggers, custom components).

### LLM-hardened DSL with NL bridge

The DSL is designed for *LLM generation first*, not human ergonomics first. This means: verbose keywords, explicit naming, canonical forms, predictable structure. The reasoning is empirical — Anka (Mazrouei, 2025) demonstrates that DSLs designed for LLM authoring can achieve 100% accuracy on multi-step pipelines where Python-based generation hits 60%. The human ergonomics layer is the natural-language editor, which handles the "feels natural" job. This is the *inverse* of how DSLs have historically been designed, and it is the right inversion for a product where every cell is co-authored by an LLM.

### MCP-native connector layer

Wovith does not ship its own connectors. It speaks MCP and consumes the public registry. On install, users connect the MCP servers they care about. Future connectors are zero-engineering for the Wovith team — they show up when the ecosystem ships them.

### Local-first CRDT substrate

Lens definitions, cell expressions, spatial positions, output history, calibration data — all of it lives in an Automerge document on the user's device. Sync is via standard local-first infrastructure. This enables time travel, multi-device continuity, undo across sessions, and a privacy story that beats any cloud-first competitor.

### Agent integration tiered into fast and slow lens slots

Cells that read from indexed local data or cached MCP results are *fast lens slots* — sub-second, deterministic, presented without ambiguity. Cells that involve browser-use, computer-use, or live agent reasoning are *slow lens slots* — clearly marked, with visible progress, graceful failure, and freshness indicators showing how recently they were updated. The visual grammar makes this distinction legible at a glance.

---

## 5. Why this combination is novel

Every individual ingredient in Wovith exists somewhere in the 2026 product landscape:

| Ingredient | Where it exists |
|---|---|
| Spatial canvas with arrangeable units | Miro, Figma, Notion, tldraw, Obsidian Canvas |
| Reactive code-cells | Observable, Jupyter, Pluto, marimo |
| Agent-callable fetches | Claude Cowork, Lindy, Vellum, Personal AI Assistant |
| NL ↔ DSL round-trip | Cursor, v0, Replit Agent, NaturalEdit (research) |
| Swappable view-bundles | Emacs modes, Stage Manager, Notion saved views, iOS Focus modes |
| Local-first malleable substrate | Ink & Switch's Patchwork / Potluck / Embark; Automerge ecosystem |

No product combines all six. Each recent attempt picks one or two axes and ignores the rest:

- **Cursor and v0** are excellent at NL↔code but trapped inside code editors
- **Notion** has spatial+swappable but isn't real programmable beyond formulas
- **Raycast** is agentic and fast but ephemeral
- **Observable** is reactive but trapped in linear notebooks
- **tldraw computer** is spatial + AI + composable but content-workflow-shaped, not lens-shaped
- **Tana** has lightweight types and AI but is outline-shaped and has a multi-week onboarding cliff
- **Lindy and Vellum** have agent + memory but chat/email surface and no programmability

The Wovith bet is that the *integration* is the product, not any individual component. The cell is the unit, the canvas is the surface, the DSL is the medium, the agent is the engine, and the lens is the package. All six axes at once, or it isn't Wovith.

---

## 6. Why it's necessary, not just novel

The unmet need in personal computing is not "another dashboard" or "another assistant." It is *personal projection at scale*.

Every major piece of software the average person uses today was configured by someone else — a product manager, a sysadmin, a UX team, a default. The user is a tenant of someone else's interpretation of how the work should be done. The work bends to fit the tool.

The AI moment makes a different model possible. With LLMs as compilers, with MCP as a universal connector, with computer-use as a fallback for apps without APIs, the technical preconditions for *user-authored projection of their own digital world* exist for the first time. The personal-software movement — Ink & Switch's research, the local-first community, Tana, Logseq, the Notion mod scene — has been telegraphing demand for this for years. What's missing is a product that takes the bet seriously enough to build the substrate, the cell, the DSL, and the agent integration as one coherent thing rather than as features.

Wovith is that bet.

---

## 7. Differentiated enhancements

These are the features that emerge from the architecture, that no incumbent can retrofit without re-architecting, and that constitute the actual moat.

### Provenance graph per cell

Every cell knows where its data came from, what got filtered, what got emphasized. Right-click any cell → "why is this here?" → a lineage view shows the full path from source to surface, with the weighting that produced the current ordering. This is the trust mechanism for agentic surfaces. No current personal-AI product does this; they tell you what they did but not *why* a specific item was surfaced over another. Lens cells, because they're code, can.

### Time travel for lenses

Because every cell's expression and rendered output history live in CRDT, scrubbing backward is free. "What did my Research Lens show me 2 weeks ago when I was thinking about X?" No current dashboard does this — they're stateless. This is impossible to retrofit into Lindy or Tana; it's a property of choosing local-first from the start.

### Inverse lens mining

Point Wovith at a folder, an inbox, a calendar, a Slack workspace. It proposes lens cells you'd find interesting *over what you have*. AI-suggested lens authoring. This solves the cold-start problem that kills malleable-software products — the user goes from install to working lens in minutes, not weeks. Privacy-preserving because the analysis happens locally over the local-first data substrate.

### Lens overlay and diff

Apply Lens A on top of Lens B. Diff two lenses: "what does my client-work lens emphasize that my research lens hides?" Compositional. This is the algebraic-lens move from functional programming, made user-visible. Stage Manager doesn't compose. Focus modes don't compose. Notion views don't compose. Lenses do.

### Live presence visual grammar

A cell isn't just "loaded" or "loading." It has a heartbeat. Recently-pulled cells pulse subtly; stale cells fade; agentic cells doing slow work show their progress visibly; failed cells show what they tried. This is calm-tech aesthetics applied to agentic UI — the antidote to the spinner-or-error binary that makes current agent products feel anxious to use. Almost nobody has designed this grammar well; getting it right makes the product feel completely different on first use.

### Lens marketplace / lens garden

Public lens library. Fork, remix, share. The Glamorous Toolkit precedent shows this works — when you open GT, you get 6,000+ contextual tools that GT's developers built for their own work, and that you can immediately use or fork. The lens garden is the network effect: power users build lenses, novices fork them, the ecosystem compounds. It's also the hedge against the fluency cliff: if 90% of users never write a lens but pick from 10,000 published ones, the product still works.

### Calibration loops

Each cell quietly learns from what you keep, dismiss, expand, return to. Over weeks, the Research Lens gets sharper without you tuning it. Memory infrastructure for this (Mem0, Cloudflare Agent Memory) is mature in 2026. The novelty is applying it to *lens calibration* rather than agent chat memory.

### Lens-as-prompt-export

Your morning lens, exported as a structured prompt plus connector spec, becomes a portable context bundle. Hand it to Claude, ChatGPT, a coworker's instance — they get your projection. With MCP Apps now standardizing UI delivery from MCP servers, your lens could itself become an MCP app — exposing your projection to other AI clients. Strategic optionality.

### Voice-first lens authoring on mobile

On mobile, the canvas collapses to a tall scroll of stacked cells. Authoring is voice-first: "I want a lens that shows me articles I've saved this week, grouped by topic" → cell scaffolded, appears on canvas, syncs to desktop. Tana validates the UX with their voice-chat for iOS; Wovith applies it to lens authoring rather than note capture.

### Adversarial / blind-spot lens

A lens whose explicit job is to show you what your other lenses filter out. Built-in red-team for your own attention. Nobody is shipping anti-confirmation-bias as a feature. A strong differentiator for a product that takes user agency seriously.

---

## 8. Positioning relative to adjacent products

**What Wovith is not:**

- **Not a workflow tool.** n8n, Zapier, Make, Lindy — these are batch automation across time. Wovith is continuous projection over context.
- **Not a note app.** Notion, Obsidian, Roam, Logseq — these are storage with views. Wovith doesn't store your data; it projects your existing data through programmable lenses.
- **Not a personal AI assistant.** Lindy, Vellum, Personal AI Assistant, Claude Cowork — these are agents in chat/email surfaces with memory. Wovith is a spatial canvas of programmable cells.
- **Not a knowledge graph.** Tana, Mem.ai — these are typed, queried personal data. Wovith reads across all your stuff, doesn't ask you to migrate it.
- **Not an infinite canvas app.** Miro, Figma, tldraw — these are creative surfaces for shapes and ideas. Wovith's canvas hosts running code.
- **Not a launcher.** Raycast, Alfred — these are ephemeral command bars. Wovith is a persistent dwelling.

**What Wovith is:** a **personal lens runtime** — the way you see your digital world, made of swappable, programmable views, authored in natural language or in a learnable DSL, running over your existing data.

The honest one-line: *"Wovith is to your digital life what Excel is to a spreadsheet — a programmable surface that becomes second nature, and that you can never look at the world the same way without."*

---

## 9. Risks and how to think about them

### The cold-start problem

Malleable-software products fail because the empty-canvas state is hostile. Tana's onboarding cliff is multi-week even for sophisticated users. Wovith's answer is inverse lens mining: the first thing a user does is point Wovith at their stuff, and Wovith proposes 3-5 lens cells worth keeping. The user is *consuming a lens* in minute one, before they author anything. Authoring is unlocked progressively, never demanded.

### The positioning problem

With no incumbent and no obvious analogy, prospective users will reach for the wrong frame. "Notion competitor" is wrong. "Zapier competitor" is wrong. "Tana competitor" is wrong. The "personal lens runtime" framing has to be set in the founding documents, the website, the demo, and the first 30 seconds of every conversation about the product.

### The fluency promise on mobile

Phones are where most users will first encounter Wovith. A stacked-cell scroll on a phone screen has two paths: feel like "the future of how I live in my stuff" or feel like "another widget board." The first three cells a user sees are everything. They must be specific, useful, slightly delightful, and obviously their own (not generic).

### The agent reliability tail

Sonnet 4.6 is much better than 4.5; computer-use is much better than 2024. But the long tail of "the website redesigned itself, the cell fails silently, the user is confused" remains. The mitigation is visual grammar: never let a user wonder whether something is fresh, stale, failing, or waiting. Show the work, the time, the lineage. Make failure legible.

### The DSL design ceiling

The DSL is the hardest single piece of the project. If it's badly designed, the NL bridge papers over it for novices but fluency never compounds for experts, and the long-term moat evaporates. Designing it well is partly a research problem. The right move is to commit early to LLM-hardened design principles (regular, explicit, verbose), prototype with real cells, and iterate against actual NL-to-DSL accuracy benchmarks.

---

## 10. What to build first

In priority order, the things that determine whether Wovith works at all:

1. **The DSL.** Get the core right. Sources, filters, transforms, renderers, agent calls. LLM-hardened from day one. Build a tiny corpus of canonical cell examples and measure NL→DSL accuracy continuously.
2. **The cell rendering and live-presence grammar.** This is what makes the product feel different on first use. The fresh / stale / recomputing / failed / waiting visual vocabulary, the heartbeat animations, the cell inspector, the provenance panel. Invest disproportionately.
3. **MCP plumbing.** First three connectors are the demo: Google Drive, Gmail, Calendar. Make them flawless. The rest of the registry is a bonus.
4. **Provenance UI.** Right-click → why → lineage. Trust moat and debugger in one.
5. **Inverse-lens-mining onboarding.** The first lens a user sees must be over *their* data, not a template. Solves cold start.
6. **Local-first substrate.** Automerge document per user. Sync via standard infra. Enables time travel, multi-device continuity, undo.
7. **Time travel + overlay + diff.** Defer to v2 in terms of UI, but design the substrate so they're possible from day one. They're the long-term moat.
8. **Lens marketplace.** Real network-effects play. v3+.

The shape of an honest v1: an Android app (via Capacitor) and a web build at wovith.app sharing the same codebase, a destination canvas, thirteen well-designed renderers, three rock-solid MCP connectors, NL authoring with DSL inspector, provenance lineage, inverse-lens-mining onboarding, local-first state. iOS follows once Android is stable; desktop is v2+. Time travel, overlay, diff, marketplace, computer-use cells, voice authoring all come later. Ship the v1, learn from real users, then unlock the long tail.

---

## 11. The closing frame

Ink & Switch ended *Malleable Software* with a line worth carrying forward:

> Everyone deserves the right to evolve their digital environments. It's an important way to fulfill our creative potential and maintain a sense of agency in a world that is increasingly defined in code.

Wovith is one attempt at making that right legible, daily, and worth dwelling in. The thing computing currently lacks is not capability — capability is everywhere — but *agency over what gets surfaced and why*. A lens is the smallest unit of that agency. A lens runtime is what makes building, swapping, and growing fluent in your own lenses a thing a person can actually do.

If the bet is right, ten years from now most people's relationship with their digital life will look more like wearing different lenses than like opening different apps. If it's wrong, it'll still have been worth shipping the prototype that proved one way or the other.

---

### References and prior art

- Litt, Horowitz, van Hardenberg, Matthews (2025). *Malleable Software: Restoring User Agency in a World of Locked-Down Apps.* Ink & Switch.
- Patchwork, Potluck, Embark — Ink & Switch research prototypes.
- Glamorous Toolkit (feenk) — moldable development environment; closest "fluency-rewarding programmable environment" precedent.
- tldraw computer — closest existing cousin to spatial cells; content-workflow focused.
- Tana — closest PKM cousin; outline-shaped with supertags.
- Observable Framework / marimo — reactive cell precedents.
- NaturalEdit (Tang et al., 2025) — bidirectional NL↔code editing research.
- Anka, DSL-Xpert 2.0 (2025) — LLM-hardened DSL design research.
- Automerge 3.0, PowerSync, ElectricSQL — local-first infrastructure.
- Model Context Protocol (Anthropic, 2024; Linux Foundation, 2025) — connector standard.
- Mem0, Cloudflare Agent Memory — agent memory infrastructure.
