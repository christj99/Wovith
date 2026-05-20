# Wovith — Design and Workflow Walkthrough
### How the product manifests in every way a user can experience it

---

## 0. About this document

This document walks through Wovith as a user encounters it — from the first install through advanced use, edge cases, mobile, sharing, and failure modes. It contains no code. Its purpose is to describe the product at the resolution where a designer, engineer, or stakeholder can picture exactly what we're building and how it feels in the hand.

Each section describes a piece of the user experience. Where design decisions exist, they're stated explicitly as decisions rather than left implicit. Where alternatives were considered and rejected, the reasoning is noted briefly.

---

## 1. First open: install and onboard

The user downloads Wovith from Google Play (Android, via Capacitor) or visits wovith.app (web build, same codebase). v1 ships Android and web simultaneously; iOS follows once Android is stable; desktop (macOS, Windows, Linux) is v2+.

On first open, the user sees a single screen with one sentence: *"Wovith reads from your stuff and shows it to you the way you want to see it. Let's connect a few things."*

Below that is a single button: **"Show me what's worth connecting."**

Clicking the button does not take the user to a generic catalog of MCP servers. It opens a permissions-light scanner: with the user's consent, Wovith looks at what's already installed on the device (mail clients, calendar apps, cloud sync folders) and what the user has signed into on their default browser. Based on that, it proposes 3-5 connections worth making — Google Drive because there's a synced folder, Gmail because Mail.app is configured, Calendar because there's a Google account active, GitHub because the .git folder lives in Documents.

The user confirms or declines each one. Confirmations go through the standard OAuth or local-permission flows for the corresponding MCP server. Wovith does not see credentials — it sees only what the connected MCP server allows it to see.

When at least one connection is live, Wovith offers: **"Want me to look through this and propose a few lenses?"**

This is the *inverse lens mining* step. Wovith reads the connected sources locally, looks for patterns in the user's recent activity (files touched, threads with recent replies, calendar density, recurring topics), and proposes 3-5 candidate lenses by name:

- *Today's Live Threads* (5 cells over Gmail, Calendar, recent docs)
- *This Week's Work* (4 cells over Drive, GitHub, calendar)
- *Reading Pile* (3 cells over Drive, Pocket-style links, RSS)
- *Family Stuff* (2 cells over shared Drive folders, shared calendars)

Each candidate lens shows a preview of the cells it would contain, with sample data fetched live. The user can accept, reject, or modify any of them. Accepting one means: Wovith creates the lens, makes it the current lens, and shows it to the user filled with their real data within seconds.

This is the entire onboarding flow. From install to first useful lens, under five minutes. No empty canvas. No tutorial. No "build your first cell" tutorial mode.

**Design call:** the first lens a user ever sees must be *theirs*, populated with *their* data. Template lenses don't generalize, and they're the wrong mental model for what Wovith is.

---

## 2. The destination canvas: what you see

Wovith has two zoom levels: the **lens overview** and the **lens interior**. Both live inside the same destination app.

### The lens interior (default view)

When you open Wovith, you land in the interior of your current lens. The canvas fills the window. Cells are arranged spatially — not in a grid, not in a list, but at the positions where you (or Wovith's onboarding) placed them. You can pan and zoom within the canvas.

The top bar shows:
- Current lens name (left) — clickable to open the lens overview
- A search field (center) — searches both within the current lens and across all of Wovith
- A status indicator (right) — heartbeat showing the runtime is healthy, click for diagnostics

The bottom edge has a thin "lens dock" with previews of your other recent lenses. Tap a preview to swap; long-press to pin.

There is no chrome around individual cells until you hover. Cells live on the canvas like cards laid on a desk — visible but not bordered. Hover reveals the cell's affordances: drag handle, resize edges, expression inspector icon.

### The lens overview

Clicking the current lens name (or pressing a keyboard shortcut) zooms out to the overview. The overview shows all your lenses as living previews — small thumbnails that actually re-render at low resolution, showing current data.

The overview has:
- A grid of lens previews, sorted by recency or pinned status
- A "+ new lens" affordance at the end of the grid
- A "Browse starter lenses" link in the corner — opens the curated lens pack that ships with Wovith (v1); becomes the lens garden surface in v3+

Tapping a lens preview swaps to that lens with an animated zoom-in transition. The animation matters: it should feel like changing the glass on a camera, not like switching tabs.

**Design call:** the overview is not a settings screen, it's a gallery. The visual emphasis is on seeing your lenses as alive, not on managing them as files.

---

## 3. Anatomy of a cell

A cell has four facets, available at different levels of engagement:

### The card surface

The default view of a cell. This is what fills your canvas. It shows the rendered output of the cell's expression — a list of files, a stream of messages, a card with a single object, a chart, a custom component. The card surface has no chrome until you hover.

### The cell handle (hover state)

On hover, the cell shows:
- A drag handle (top-left) for repositioning
- Resize edges
- A small **freshness indicator** (bottom-right) — a colored dot that shows the cell's data status (described below in section 8)
- An "inspect" icon (top-right) that opens the expression inspector

### The expression inspector (one click in)

Clicking the inspect icon (or pressing a keyboard shortcut while a cell is selected) slides a panel in from the right side of the canvas. The panel shows the cell at its second level of resolution:

- **Natural language summary** at top: "Show invoices I touched this week, newest first"
- **DSL expression** below: the actual code, syntax-highlighted
- **Sources** section: which connectors the cell reads from
- **Last refreshed** timestamp
- **Output preview** of the current rendered result, mirrored from the canvas

You can edit either the NL summary or the DSL directly. The other updates in response, with a brief animation showing the sync. This is the bidirectional bridge (section 7).

### The provenance panel (two clicks in)

Inside the inspector, a "Why is this here?" link opens the provenance panel. This is the cell's third level of resolution: a lineage view showing each item currently displayed, with the trail of why it surfaced. For a list of three invoices, you'd see something like:

- *Invoice_Acme_Mar.pdf*
  - Source: Google Drive
  - Filter: "tagged invoice" matched (1.0)
  - Filter: "touched this week" matched (last opened: 2 days ago)
  - Order: "newest first" → rank 1
- *Invoice_GlobalCo_Mar.pdf*
  - Source: Google Drive
  - ...

This is the trust mechanism. Anything Wovith shows you, you can interrogate down to the source.

**Design call:** provenance is opt-in viewing, not always-visible chrome. Most of the time the user trusts the cell; provenance is the safety net for when they don't.

---

## 4. Authoring a cell from natural language

The most common authoring path. The user invokes a "+ new cell" affordance (button on the canvas, or keyboard shortcut, or voice on mobile). A focused input field appears.

The user types or speaks:

> "show me articles I've saved this week, grouped by topic"

Wovith does the following in sequence, visibly:

1. **Compiler parse.** The LLM-hardened DSL compiler interprets the request, choosing sources (Pocket via MCP, browser bookmarks via MCP, Drive for any saved PDFs), filters ("this week"), and a grouping ("by topic" using local clustering or LLM-assisted tagging).
2. **Provisional cell appears** on the canvas in a "drafting" visual state — slightly translucent, with a "preview generating" label.
3. **Output renders** within 1-3 seconds for fast slots, longer if any slow sources are involved.
4. **Cell solidifies** to its final state. The user can drag it, resize it, or open the inspector.

If the compiler is uncertain about any part of the request, it asks a single clarifying question inline: *"Did you mean articles you saved, or articles you read?"* — never a barrage of clarifications, always one decision at a time, and always with a sensible default the user can accept.

**Design call:** the NL path is the default, optimized for the common case. The DSL path exists for power and is never the obstacle.

---

## 5. Authoring from DSL

The user invokes "+ new cell" and presses Tab (or clicks a small "code" toggle). The input field switches from natural language to a DSL editor.

The DSL editor provides:

- **Syntax highlighting** for the Wovith language
- **Autocomplete** for sources (typing `from ` shows connected MCPs), keywords (`where`, `as`, `enrich with`), and known fields
- **Inline type checking** with errors underlined as you type
- **Live preview** in a small inset on the right showing what the cell will render
- **A "show me the NL summary" toggle** to see what this expression reads as in English

When the user is satisfied, they press Enter and the cell is added to the canvas.

Power users live here. The DSL is the back room where compositions get refined, where one cell that produces a useful output gets turned into a reusable template.

**Design call:** the DSL editor is not a separate IDE. It's the same affordance as the NL editor, with a one-key toggle between modes. The cell is the unit; the editing mode is just a representation.

---

## 6. The bidirectional bridge

Every cell has two equivalent representations: NL summary and DSL expression. The user can edit either; the other updates.

### Editing NL → DSL updates

The user edits the NL summary in the inspector from "show invoices I touched this week, newest first" to "show invoices I touched this month, by client." Wovith recompiles. The DSL expression visibly updates — old tokens fade, new tokens appear with a brief highlight. The cell's output re-renders.

If the recompilation produces a DSL expression that differs from the user's prior expression in a non-trivial way (e.g., the user previously hand-tuned the DSL), Wovith pauses and asks: *"Your previous DSL had a custom filter. Should I keep it or replace it with what the new description implies?"* — preserving user intent over compiler convenience.

### Editing DSL → NL updates

The user edits the DSL directly. As soon as they pause typing, the NL summary updates beneath the DSL editor. Subtle animation — the words don't jump, they shift. If the change is large, the entire summary regenerates.

### Conflict resolution

The bidirectional bridge round-trips cleanly for the common case but has known limits. When the DSL contains expressions that don't reduce to clean NL (custom components, complex provenance weighting, niche connector calls), the NL summary shows a fallback like: *"Show invoices, with custom display logic"* — and the inspector marks the cell as "DSL-primary." Editing the NL on a DSL-primary cell prompts the user before overwriting.

**Design call:** the bridge is *bidirectional but not lossless in edge cases.* The user always knows which side is canonical and is asked before destructive changes.

---

## 7. The reactive runtime

Cells update reactively — when their inputs change, they recompute. The user doesn't manage this; it just happens. But the behavior is legible.

### Freshness, abstractly

Every cell has a freshness state, visible via the small indicator in the cell's hover state:

- **Green pulse**: Fresh, recently computed, data current
- **Steady green**: Fresh, no pulse, computed but no recent change
- **Yellow**: Stale beyond the cell's freshness budget; recomputing soon
- **Yellow with spinner**: Currently recomputing
- **Orange**: Slow agentic fetch in progress (see section 8)
- **Red**: Failed; see the cell for details

### Freshness budgets

Each cell has a freshness budget — how stale its output can get before triggering a refresh. The default is heuristic (5 minutes for active sources, 1 hour for slow ones, manual for very-slow agentic ones). Users can override per cell.

The budget is shown in the inspector but not on the canvas itself.

### Push and pull

Some MCP servers support subscriptions (push); others require polling (pull). The runtime handles both uniformly. From the cell's perspective, its inputs change and it recomputes.

### Lens-level rhythm

Each lens has an overall *rhythm* — calm, normal, aggressive. The rhythm modulates all default freshness budgets in the lens. A "Sunday Lens" runs calm; a "Trading Lens" runs aggressive. The rhythm is set in the lens overview.

**Design call:** the user controls rhythm at the lens level and budgets at the cell level. The runtime doesn't ask the user to think about polling, sockets, or sync. Freshness is the surface.

---

## 8. Agent-pull cells (slow lens slots)

Some cells involve work that can't happen in milliseconds: browser-use, computer-use, multi-step LLM reasoning, scraping a site that has no API. These are *slow lens slots.*

A slow cell looks visually distinct on the canvas:

- The freshness indicator is **orange** instead of green
- The cell has a subtle **breathing animation** on its border while work is in progress
- A small **progress hint** at the bottom of the cell shows what the agent is currently doing ("checking calendar.example.com…", "extracting from page 3 of 7…")
- The **last successful fetch timestamp** is always visible at the bottom of the card

When a slow cell fails — and it will, sometimes — it doesn't disappear or show a generic error. It shows what it tried, where it stopped, and a "retry" button. If the failure is structural (the site changed, the connector is misconfigured), the cell offers to escalate to a "fix this cell" flow that involves the agent re-orienting against the new site, or asking the user to update credentials.

### Permission gates

Slow cells that take meaningful actions (sending an email, booking a meeting, posting somewhere, modifying a file) always show a confirmation step before acting. The confirmation includes what the agent intends to do, in plain language, and is dismissible.

For read-only slow cells (extracting info from a site), no per-action confirmation is needed; the cell is granted scope at authoring time.

**Design call:** slow cells are tier-2 citizens of the canvas, not hidden away. Users learn to distinguish "fast lens slot" (sub-second, deterministic) from "slow lens slot" (asynchronous, sometimes flaky) within minutes. The visual grammar is what carries the trust.

---

## 9. The provenance graph

Already introduced in section 3. The provenance panel is the cell's third level of detail — the lineage from raw source to rendered output.

### What the panel shows

For each item currently displayed in the cell:
- The source connector and the specific resource (file ID, message ID, URL)
- The filter chain that admitted it
- The sort or grouping that placed it where it is
- The weight or score, if any, that the cell uses for ranking

For the cell as a whole:
- Sources, in order of contribution to the visible output
- Total items considered → total items shown (e.g., "47 invoices in scope; showing 3")
- Last refresh timestamp and duration

### Editing through provenance

If the user sees something in the lineage they disagree with — "this email shouldn't be in this cell" — they can dismiss the item directly from the provenance panel. The dismissal becomes a calibration signal (section 14). Repeated dismissals of items matching a pattern teach the cell to filter that pattern out without the user touching the DSL.

**Design call:** provenance is read-mostly-but-actionable. You can correct the cell through it. The correction goes into the cell's calibration, not its DSL — so the cell's expression stays clean and the learned filtering is separately inspectable.

---

## 10. Lens overview and swapping

The overview is the gallery view of all your lenses. Already introduced in section 2.

### Swapping animation

Swapping lenses is the most distinctive interaction in Wovith. The animation matters because it's how the product communicates that lenses are *real things* and not just saved filters.

When the user swaps from Lens A to Lens B:

1. Current cells dim slightly and shrink toward their center
2. A subtle iris animation suggests a "lens" closing and opening (the visual metaphor isn't subtle; we lean into it)
3. New cells fade in at their saved positions
4. The new lens's name appears in the top bar

The animation is 400-500ms — long enough to feel intentional, short enough to not be annoying. Users can disable it in settings if they want to be efficient.

### What carries over

By default, almost nothing carries over between lenses. Each lens is a fresh perspective on your stuff. The only exceptions are:

- The **selected cell** if one was active and exists in the new lens (rare)
- **Time-travel state** if the user has scrubbed back; carries over so they can see "what did Lens B look like at the same moment Lens A did?"
- **Notifications** queued from background-running lenses (see below)

### Background-running lenses

By default, only the current lens is computing. But the user can mark a lens as "always alert" — it computes in the background and pings the user if a defined condition is met. *"If my Watching Lens detects a new mention of [topic], notify me."*

Notifications appear as small badges on the lens dock, not as system notifications. The user opts in per-lens to system notifications.

**Design call:** Wovith is not a notification engine. It's a place you go. Background alerts exist for power users but are off by default.

---

## 11. Time travel

Because every cell's expression and rendered output history live in CRDT, the user can scrub back to any prior state.

### The history scrub bar

At the bottom of the canvas, when activated (keyboard shortcut or menu), a horizontal time scrubber appears. The scrubber's range defaults to the current week; the user can zoom out to month, year, or all-time.

As the user drags the scrubber backward, the canvas re-renders to show what the current lens looked like at that moment. Cells show their historical data. The provenance panel, if open, shows the lineage at that moment.

### Per-cell time travel

Inside any cell's inspector, a smaller time scrubber lets the user walk that specific cell back through its history without affecting the rest of the lens. This is useful for "what changed?" investigations.

### Forking from a past state

If the user finds a past state they want to keep working from, they can fork it: "Make this past view a new lens." The fork takes the historical state as the starting point and lets the user continue authoring from there. The original lens continues uninterrupted.

**Design call:** time travel is not just an undo. It's a first-class navigation dimension. Most users will never use it; the ones who do will use it constantly. The substrate (Automerge) makes it free.

---

## 12. Lens overlay

The user can apply Lens A on top of Lens B. The result is a composed lens that includes both their cells, with overlap resolution rules.

### How overlay works

Activated by dragging a lens preview from the dock onto the current canvas, or via menu: "Overlay another lens here."

The overlaid lens's cells appear on the canvas alongside the current lens's cells. Where they collide spatially, the overlay's cells offset slightly to remain visible. Where they read from the same source with the same filter, the overlay deduplicates.

### Saving an overlay

The user can save the composed view as a new lens: "Save this overlay as a new lens." The new lens is treated as fully its own thing, not a reference to the originals.

### Conflict resolution

If two cells in the overlay want to occupy the same canvas position, the bottom lens's cell stays put and the top lens's cell offsets. If two cells produce duplicate content (same file, same email), they're deduplicated with the more recent timestamp winning. If two cells have explicit "show only" filters that conflict, both run and both display — the user can see both interpretations side by side.

**Design call:** overlay is compositional but not magical. It's a way to look at your stuff through two lenses at once, see what the overlap is, and decide whether the combination is worth keeping.

---

## 13. Lens diff

A focused mode for comparing two lenses. Activated by selecting two lenses in the overview and choosing "Diff."

### The diff view

The canvas splits into three regions:

- **Left:** what's only in Lens A
- **Center:** what's shared (with the cells from both, side by side)
- **Right:** what's only in Lens B

For shared cells, the diff also shows how each lens treats the same source differently — e.g., Lens A filters by "this week" while Lens B filters by "this month."

### Adopting from another

In the diff view, the user can right-click any cell unique to the other lens and "adopt" it into the current lens. The adoption brings the cell over with its expression intact.

**Design call:** diff is a power-user feature, especially useful for the "I have three Research Lenses that drifted apart; which one is best?" scenario. Surfaced via menu, not on the main canvas.

---

## 14. Calibration over time

Each cell quietly learns from how you interact with it. Over weeks, your Research Lens gets sharper without explicit tuning.

### Signals the cell collects

- **Dwell time:** how long you look at an item before moving on
- **Open / expand:** whether you click through to the source
- **Dismiss:** explicit removal (down-arrow on an item, or dismissal from provenance)
- **Pin:** explicit prioritization (up-arrow on an item)
- **Re-author:** changes to the cell's expression and how they propagate

### How calibration manifests

Calibration is a layer on top of the cell's DSL expression — it doesn't modify the expression itself. Instead, it adds a ranking nudge: items that match patterns the user has dismissed are deprioritized; items matching patterns they've pinned float up.

The calibration is always inspectable. The inspector shows a "calibration" tab that lists the learned signals as plain English: *"You dismiss items from [domain] 4 times — these are now deprioritized."*

### Resetting

Calibration can be reset per-cell or per-lens. The DSL expression is untouched by reset; only the learned ranking nudges are removed.

**Design call:** calibration is invisible until you ask about it. It's the compound interest of the product — users won't notice it on day 7 but it's why their lens still works on day 70.

---

## 15. The mobile experience

At v1, Wovith ships as an Android app (via Capacitor) and a web build (the same codebase, running in a browser). The Android experience collapses the spatial canvas into a tall scrollable feed; the web build retains the full canvas on larger viewports. iOS and native desktop are v2+.

### The stacked-cell scroll

Cells stack vertically, sorted by user-set priority and freshness. The same cell that's a small panel on the web canvas becomes a phone-width card on Android. Pinch-to-zoom and side-scrolling within a cell handle horizontal data (charts, wide lists).

The lens dock becomes a top-edge tab strip — swipe horizontally on the top to switch lenses.

### Voice-first authoring

Mobile authoring is voice-first. A persistent "tap-and-hold to speak" affordance at the bottom of the screen, or a system-wide shortcut. The user speaks:

> "Add a lens cell that shows me messages from [contact] this week"

Cell scaffolded → appears at the top of the current lens → syncs to other devices instantly.

### Quick-capture

Beyond authoring, mobile supports quick capture into the current lens. The user can share content from any app (Share menu) → "Add to Morning Lens." The shared content becomes a cell or an item within a cell, depending on type.

### Continuity across devices

CRDT makes continuity free. The user authors on mobile in voice, opens the web build on their laptop, the cell is there. They drag it to a better position on the canvas; mobile updates. Time travel works across devices.

### Phone-specific lenses

Some lenses make more sense on the phone than on a larger screen — a "Driving Lens" that's just three big cells with audio playback, navigation, and an incoming-call summary. Wovith supports tagging a lens as "primary mobile" or "primary large-screen" to control where it appears in each environment's dock by default.

**Design call:** mobile is not a degraded large-screen experience. It's a different optimal form factor for the same lens. The lens is the source of truth; the form factor is the projection.

---

## 16. Sharing: starter pack at v1, lens garden at v3+

Sharing lenses ships in three layers, on different timelines.

### 16.1 The starter lens pack (v1)

A curated set of 30-50 lenses authored by the Wovith team and the preview cohort, shipped *as part of the product*. Accessible from the lens overview via "Browse starter lenses." A new user can install any starter lens with a single tap — Wovith prompts to connect any required MCP servers, then fills the lens with the user's own data.

The starter pack is not user-publishable. It is curated demo content (analogous to Notion templates or Figma starter projects), refreshed quarterly. Users see this as "lenses that ship with Wovith," not as "a marketplace."

### 16.2 Private lens export and sharing (v1)

A user who builds a useful lens can export it as a `.wovith-lens` file. This file contains:
- The lens structure (cells, expressions, layout)
- The required MCP connectors
- Optional documentation the author wrote
- *No* personal data (data is sanitized on export)
- *No* arbitrary code (cells are DSL expressions, sandboxed at runtime)

The file can be shared by any out-of-band channel — email, DM, GitHub gist. The recipient imports the file in Wovith, authorizes the required connectors against their own accounts, and runs the lens locally with their own data.

This is genuine lens-sharing without marketplace infrastructure. It tests whether users actually want to share lenses, in a way that doesn't require building the moderation, publishing, ratings, and discovery layers a full marketplace needs.

This mechanism is the same one used for lens-as-prompt-export (see the security doc, section 7) — same underlying serialization, deployed for two purposes.

### 16.3 Co-lenses (v2)

A lens can be shared with specific named collaborators via the cloud sync relay. Co-lenses sync via Automerge across all collaborators. The classic use case: family co-lenses sharing photos, calendars, and household reminders.

Co-lenses respect per-user privacy — each collaborator can have private cells in the shared lens that only they see, while shared cells appear to everyone. Co-lenses are not public; they are explicitly invited.

### 16.4 The lens garden (v3+)

The full lens garden — public publishing, forking, ratings, discovery, community moderation, supply-chain security review — is v3+ work. The architecture is described in the security doc section 9; the rationale for the timing is in the concept doc section 10.

When the garden ships, published lenses will have:
- A title, description, and category
- A list of required MCP connectors
- Sample synthetic data showing the lens populated
- The original author's name (optional)
- Fork count, install count, and ratings
- Lineage tracking across forks

Forks will remain forks — retaining a link to the original. When the original is updated, fork-users will be notified and can pull the changes.

**Design call:** the garden is the network-effects bet, but it's not the v1 launch. The starter pack delivers most of the day-one social proof that a full garden would deliver, without requiring the marketplace infrastructure. v1 ships with the pack, v2 adds co-lenses, v3 opens the garden.

---

## 17. The blind-spot lens (worked example)

A specific lens worth describing, because it illustrates the kind of thing Wovith makes possible that no other product does.

### What it is

A lens whose cells deliberately show the user what their other lenses filter out. The cells use the *inverse* of the user's calibration signals — items the user usually dismisses, sources the user usually ignores, topics absent from the user's recent activity that were once active.

### How it's authored

A user can build this lens manually, but it's also one of the lenses Wovith proposes during onboarding to power users who connect substantial data. The default cells include:

- **Dropped Threads** — Gmail conversations from contacts you've corresponded with regularly but haven't replied to in 14+ days
- **Stagnant Files** — Drive documents you opened repeatedly until a month ago and haven't returned to
- **Untouched Calendar** — calendar invites you've declined or no-response'd that match historic acceptance patterns
- **Quiet Connections** — contacts in your address book you've fallen out of recent rhythm with
- **Topic Drift** — recurring topics in your activity that suddenly stopped appearing

### How it feels in use

The blind-spot lens isn't a daily lens. It's a once-a-week or once-a-month lens — opened deliberately as an act of attention hygiene. The visual design reflects this: cells in this lens have slightly larger spacing, less density, and present each item with more breathing room than a typical lens.

The lens is not judgmental. It doesn't say "you forgot to reply to your mom." It shows the dropped thread, the user makes their own decision.

**Design call:** this lens is on the official template list at launch, and it's the marketing showcase for "Wovith helps you see your digital life differently, not just more efficiently." Most products optimize for what you do; Wovith uniquely supports a lens that shows what you don't.

---

## 18. Failure modes the user encounters

### A cell fails

The cell's freshness indicator turns red. The cell's content shows what it tried, where it stopped, and what would help. Three options:

- **Retry** — re-run the cell
- **Fix** — open the inspector to the failed step; agent-assisted repair if applicable
- **Suspend** — pause the cell temporarily so it doesn't keep failing

Failed cells don't disappear silently. They stay on the canvas, marked red, until the user takes action.

### A connector goes down

The MCP server times out or returns errors. All cells that depend on that connector show a single banner at the top: *"Google Drive isn't responding right now. 4 cells are affected."* — with options to retry, see which cells, or suspend Drive-dependent cells temporarily.

When the connector recovers, the banner dismisses itself and affected cells resume.

### A lens is too aggressive on data sources

If a lens is fetching from a paid API or a rate-limited service, Wovith monitors usage. When approaching a known limit (50% of monthly quota for a connector), a banner appears: *"Your Calendar lens is at 50% of monthly quota. Want to relax its rhythm?"* — with a one-click action to drop the lens's rhythm from aggressive to normal.

### Conflicting edits (CRDT merging)

When the same lens is edited on two devices simultaneously, Automerge handles the merge. For non-conflicting edits (different cells, different positions), the merge is invisible. For conflicting edits to the same cell, both versions are preserved and Wovith presents the user a conflict resolution affordance the next time they open the lens: *"This cell was edited in two places. Choose one to keep, or merge by hand."*

### Bad agentic output

Agentic cells sometimes return garbage — a scraped page that's noise, an extraction that hallucinated. The user can dismiss individual items from the cell (provenance-driven), or mark the entire output as bad. Marking-bad re-runs the agent with explicit feedback ("the previous result included noise; try again with stricter extraction").

**Design call:** failure is legible, always actionable, never anxious. The visual grammar makes failure feel like a moment of agency ("I can fix this") rather than a moment of breakage.

---

## 19. End-of-life of a cell or lens

### Deleting a cell

The user removes a cell from the canvas. Wovith does not immediately delete — it archives. The cell remains in the lens's history (recoverable via time travel) for 90 days, then is hard-deleted.

During the 90-day window, the cell is "gone" from the user's perspective but recoverable: open the lens, scrub backward, find the moment before deletion, right-click → "restore this cell to the current lens."

### Archiving a lens

A lens can be archived without deletion. Archived lenses don't appear in the overview by default but are accessible via a "show archived" toggle. Restoring is one click.

### Exporting a lens

Any lens can be exported to a file (.wlens, a structured JSON-ish format). The exported file contains:

- The lens definition (cells, positions, expressions)
- The lens documentation
- The list of required MCP connectors and how they were used (without credentials)
- Optional: a snapshot of the rendered output at export time
- Optional: a portable prompt + connector spec (the lens-as-prompt-export feature; see section 21)

The exported file can be re-imported elsewhere, shared, archived outside Wovith, or used as a backup.

**Design call:** the user owns their lenses. Export is a first-class operation, not a "data takeout" feature buried in settings.

---

## 20. The settings and connectors panel

The settings panel is accessed from the corner of the lens overview. It contains:

### Connected services

A list of every MCP server connected, with:
- Status (active, paused, error)
- What permissions Wovith has on it
- Last successful fetch
- A "disconnect" button

Adding a new connector opens the MCP registry browser, which lists public servers by category. The user selects one, runs through OAuth or local auth, and the connector becomes available to lens cells.

### Permission scopes

Cells can be granted different scopes per connector — read-only, read-and-write, or specific write actions. Default is read-only; write requires explicit per-action user confirmation as described in section 8.

### Rhythm defaults

Default lens rhythm (calm, normal, aggressive) and default cell freshness budgets. Per-lens and per-cell overrides take precedence.

### Privacy and data

- Local data location (where the Automerge document lives)
- Sync configuration (which sync server, or self-hosted)
- Export and backup options
- Calibration data management (review or reset learned signals)

### Appearance

- Light / dark / system theme
- Reduced motion (disables swap animations and heartbeats)
- Font and density preferences

### About / version / diagnostics

Standard housekeeping. The diagnostics view shows the runtime's status: connected MCPs, recent fetches, errors in the last 24 hours, CRDT sync state.

**Design call:** settings are deep but never blocking. Defaults are good; advanced users can tune.

---

## 21. The lens-as-prompt-export feature

A lens's value is partly that it's a curated context window over your stuff. That makes it portable — to another AI, to another user, to your future self.

### What it does

The user selects a lens and chooses "Export as portable context." Wovith generates a structured artifact:

- A high-quality prompt describing the lens (what it surfaces, what it filters, why each cell exists)
- A specification of the MCP connectors the prompt expects to have access to
- The rendered current state of the lens (data snapshot) as an attachment
- The provenance metadata

### How another AI uses it

The exported artifact can be:

- **Pasted into Claude, ChatGPT, or any chat AI** as a context preamble — the AI now has your projection
- **Loaded into another Wovith instance** as a forked lens
- **Consumed by an MCP-compatible host** as a self-describing app (because Wovith lenses can be packaged as MCP apps)

### Why someone would use this

- Sharing context with a collaborator without giving them access to your raw data
- Briefing an AI for a specific task using your existing lens as the scaffold
- Backing up a lens in a format that survives Wovith
- Building agent workflows in other tools that consume your projection

**Design call:** lens export turns Wovith from a destination app into a *context-authoring tool* for the wider AI ecosystem. This is the long strategic bet: every AI in the world ends up consuming Wovith lenses as portable context bundles.

---

## 22. The keyboard shortcuts and the rhythm of daily use

For users who become fluent, Wovith is a keyboard-first product. The default shortcuts are designed to support fast lens swapping and authoring without leaving the keyboard.

### Global

- `Cmd/Ctrl + Space` — Summon Wovith as overlay from any app
- `Cmd/Ctrl + Shift + L` — Open Wovith full-screen at the current lens

### Inside Wovith

- `1` through `9` — Swap to the corresponding lens in the dock
- `Cmd/Ctrl + O` — Open the lens overview
- `Cmd/Ctrl + N` — New cell (NL mode)
- `Cmd/Ctrl + Shift + N` — New cell (DSL mode)
- `Cmd/Ctrl + K` — Search across lenses
- `Cmd/Ctrl + T` — Time travel scrubber on/off
- `?` — Show keyboard shortcuts overlay

### Cell-focused

- `Enter` — Open inspector
- `Shift + Enter` — Open provenance
- `Delete` — Archive cell
- `Cmd/Ctrl + D` — Duplicate cell to canvas
- `Cmd/Ctrl + Shift + C` — Copy cell expression for sharing

**Design call:** mouse and keyboard are equally first-class. Power users live on the keyboard; new users on the mouse. Both paths reach the same destinations.

---

## 23. The "what's it like to use Wovith for a week" narrative

To close the walkthrough, a brief sketch of what daily use feels like after the first week.

**Day 1.** User installs Wovith. Inverse lens mining proposes three lenses. User accepts "Today's Live Threads" and starts using it as a morning home. Two cells are weirdly off; user dismisses items via provenance.

**Day 3.** User notices the Today's Live Threads lens is sharper than yesterday. Dismissed-item patterns have started to compound into the calibration. User authors their first custom cell via NL: "show me anyone I haven't replied to in 3+ days."

**Day 5.** User creates a second lens, "Research." It picks up active threads from Drive and a few RSS feeds. User finds that swapping between Morning and Research mid-day cleanly separates contexts in a way no other app has managed.

**Day 7.** User opens the inspector on a cell and looks at the DSL for the first time. It reads understandably. User changes one keyword to tweak the filter. Now they know they can edit DSL when they want to.

**Day 10.** User installs Wovith mobile. Voice-authors a third lens during a walk: "Show me podcasts I've saved and how long they are." The cell appears in their stack. They author two more cells the same way. Continuity across devices just works.

**Day 14.** User opens the starter lens pack to look for something new. Installs a "Reading Hour" lens from the pack. The starter lens connects to their existing Drive and immediately works. User exports their own "Today's Live Threads" lens as a `.wovith-lens` file and shares it with a colleague who's also on Wovith.

**Day 30.** User has four active lenses. The Today's Live Threads lens has invisibly tuned itself to their actual rhythm. They've stopped opening half a dozen apps in the morning; they open Wovith. They notice they think about their digital life differently — less as apps and more as perspectives.

**Day 60.** User authors a cell in DSL because they want a custom join across three sources that NL didn't get right. They've crossed the fluency threshold without noticing. They are starting to think of cells as a unit of thought.

**Day 90.** User has exported three of their own lenses. They've sent one to a friend who installed it and tweaked it. The colleague's tweaked version made its way back. The user is participating in lens-sharing without a marketplace yet existing — the v3+ garden, when it ships, will codify what's already happening informally.

That is the arc Wovith is designed to support. Everything in this document is in service of making that arc feel inevitable for the people who would value it most.

---

## End

This document describes the product at the resolution required to start building it seriously. Every section reflects a real design call. Where calls were made, they're stated explicitly and the reasoning is available. Where alternatives were rejected, the trade-off is noted.

The next layer of detail — DSL grammar, cell rendering technical spec, MCP integration patterns, sync protocol, mobile UX wireframes — belongs in separate documents that this one references rather than contains. The purpose here is to make the whole product visible at once, in a form that someone reading start-to-finish can carry in their head.
