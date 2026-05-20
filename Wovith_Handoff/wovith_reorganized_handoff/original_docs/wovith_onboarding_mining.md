# Wovith Inverse Lens Mining and Onboarding
### How a new user gets from install to first useful lens in under five minutes

---

## 1. The problem being solved

Malleable software products fail at the onboarding step more often than at any other step. The empty-canvas problem is real and well-documented: Tana's onboarding cliff is multi-week for sophisticated users. Notion's first hour overwhelms most users with template choices. Glamorous Toolkit ships with 6,000+ tools because its creators learned the hard way that "build your own" is a non-starter for anyone who isn't a researcher.

The conventional answers — guided tutorials, template galleries, sample data — all fail in characteristic ways. Tutorials are skipped or forgotten. Templates feel generic. Sample data isn't yours, so it doesn't teach anything about your situation. Progressive disclosure helps reveal complexity, but only after the user is engaged enough to want to discover.

Wovith's answer is **inverse lens mining**: instead of asking the user to build a lens, Wovith looks at the user's actual data and *proposes a lens* worth keeping. The user's first interaction with the product is *consumption*, not *authoring*. They see something useful, populated with their own stuff, within minutes of install. Authoring unlocks progressively from there.

The bet is that anyone who looks at a well-proposed lens of their own stuff and feels "this is useful, and I would not have built this myself" will stay. Anyone who looks at the same lens and feels "this is generic" will leave. So the proposal has to be specific, has to read someone's actual situation, and has to surface something they couldn't easily have surfaced themselves.

---

## 2. The onboarding flow at a glance

The flow from install to first useful lens consists of seven steps. The target end-to-end time is under five minutes; the target user feeling at each step is described.

| Step | Time | User feeling |
|---|---|---|
| 1. Open Wovith | 0:00 | Curious |
| 2. See a single welcoming sentence | 0:05 | Oriented |
| 3. Light scan of installed apps | 0:10 | Surprised in a good way (it knows what's worth connecting) |
| 4. Connect 2-3 MCP servers | 1:30 | Capable |
| 5. Wait briefly for mining (with visible progress) | 2:30 | Patient, anticipating |
| 6. Review proposed lenses | 3:30 | Recognizing themselves in the proposals |
| 7. Accept one lens, see it filled with their data | 4:30 | Hooked |

Every step is skippable for advanced users (a "set things up manually" affordance is always available). The default flow is what's described here.

---

## 3. Step-by-step UX

### 3.1 The welcome screen

A single short paragraph, centered, with one call-to-action button. No imagery. No marketing language. The full text:

> Wovith reads from your stuff and shows it to you the way you want to see it. Let's connect a few things so I can find what's worth looking at.
>
> **[ Show me what's worth connecting ]**

The button is the only interactive element. A small "I'd rather set things up manually" link sits below it for users who want to skip.

Calm tech principle applied: respect attention. The welcome screen does not try to dazzle. It tells the user what's about to happen and lets them proceed.

### 3.2 The local scan

When the user taps the button, Wovith requests minimal permissions to inspect the local environment:

- What apps are installed (or what URLs are signed in via the default browser, where the OS permits)
- The default sync folder structure (Drive, Dropbox, iCloud)
- Whether mail clients are configured

These checks happen locally. Nothing is sent over the network. The user sees a 2-3 second progress indicator with a friendly status line: *"Looking at what's already set up on your device..."*

### 3.3 The connector proposal

Wovith proposes 3-5 MCP connectors based on what the scan found. Each proposal is a card showing:

- Name of the service (Google Drive, Gmail, GitHub)
- A one-line reason for the proposal (*"You have a Google Drive folder synced at ~/Drive"*)
- An estimate of what it would contribute to lenses (*"Adds about 1,200 files across 8 folders for lens content"*)
- A toggle to accept or decline

The user reviews the proposals, toggles each on or off, and taps **Connect selected**. Each acceptance triggers the corresponding OAuth or local-permission flow for that MCP server.

This step deliberately *names what's already on the device*. The user feels seen. The product feels like it's paying attention. This is the first small moment of trust.

### 3.4 Connection completion

For each connector, the user goes through the standard authentication flow. Wovith waits patiently in the background. As each connector comes online, the connection card shifts to a "connected" state with a small green indicator.

If a connection fails (user denies permission, OAuth times out), the card shows the failure and offers retry. Wovith proceeds with whatever did connect — partial onboarding is better than blocked onboarding.

### 3.5 The mining phase

Once at least one connector is live, Wovith offers:

> **Ready to find some lenses? I'll look through what you've connected and propose a few worth keeping.**
>
> **[ Find lenses ]**

The user taps. Wovith begins mining. The user sees a progress display — not a generic spinner, but a status feed showing what's actually happening:

- *"Looking at recent activity in Gmail..."*
- *"Finding files you touch most often in Drive..."*
- *"Noticing recurring topics in your messages..."*
- *"Identifying people you correspond with regularly..."*
- *"Detecting time patterns in your calendar..."*

This phase typically takes 30-90 seconds. The status messages are not fake progress — each one corresponds to a real analysis pass running locally. The user reads them and gets a sense of what kinds of patterns Wovith is looking for, which subtly seeds the mental model of what a lens is.

If the user is reading the status closely, they notice that the analysis is happening locally — no spinner says *"Sending your data to the cloud"*. Privacy is signaled by the language of the status display.

### 3.6 The lens proposals

When mining completes, Wovith presents 3-5 proposed lenses. Each proposal is a card showing:

- A name for the lens (concrete and specific: *"Today's Live Threads"*, not *"Daily Briefing"*)
- A one-line description of what it covers (*"5 conversations with recent replies and 3 calendar items needing decisions"*)
- A live preview showing the actual cells the lens would contain, populated with the user's real data
- An *Accept* / *Modify* / *Skip* trio of actions

The previews are not mockups. They are the actual rendered cells, fetched live from the user's connected sources, displayed at thumbnail scale. The user sees their actual data in the proposal. This is the moment that distinguishes inverse mining from a template gallery.

### 3.7 The first lens

The user taps **Accept** on one proposal. Wovith creates the lens, makes it the current lens, and opens it on the canvas (or stacks it on the screen on mobile). Cells appear with their real data, freshly fetched. The freshness indicators turn green one by one.

The user is now using Wovith. They have not authored anything. They have not read a tutorial. They've connected a few services and accepted a proposal. Four to five minutes have elapsed. The product is alive with their stuff.

---

## 4. The mining algorithm

The algorithm has three layers: signals, patterns, and lens generation.

### 4.1 Signals

The mining process collects a set of signals from each connected source. Signals are designed to be cheap to compute and to require minimal data movement.

**From Gmail (or any messaging source):**
- Frequency of correspondence per contact (last 30 / 90 / 365 days)
- Unread count, unread by sender importance
- Threads with recent activity (last 7 days)
- Threads with one-sided activity (you sent but haven't received a reply)
- Threads with mentions of upcoming dates or commitments
- Domains the user replies to vs ignores
- Common subjects or topics (via local keyword extraction)

**From Drive (or any file source):**
- File touch frequency over the last 90 days
- Folders with high churn
- Files tagged or labeled
- Files matching common semantic patterns (invoices, receipts, drafts, designs)
- Recently created vs recently modified vs recently opened
- Co-edited files with specific collaborators

**From Calendar:**
- Event frequency per category
- Recurring events
- Events with high prep value (meetings with VIPs, presentations)
- Events that were declined or no-response'd
- Time blocks consistently busy or consistently free

**From the device locally:**
- The user's actual time zone and recent waking pattern (from device usage)
- Time of day patterns of app activity

These signals are simple statistics over the user's existing data. None of them involves training a model or sending data to a server. All computation happens locally.

### 4.2 Patterns

Signals get composed into patterns. A pattern is a structural insight about the user's situation. Example patterns:

- *"This user has 4-6 active threads at any given time that require a reply"* — the basis for an *Inbox Decisions* cell
- *"This user has a recurring Tuesday-Thursday client meeting cluster"* — the basis for a *Client Day Prep* cell
- *"This user has a set of 8-12 frequent correspondents whose messages they prioritize"* — the basis for a *VIP Mail* cell
- *"This user keeps invoices in a specific folder pattern"* — the basis for an *Invoices* cell
- *"This user reviews documents in the morning and produces them in the afternoon"* — informs the rhythm of a *Morning Lens*
- *"This user has 3-5 dormant threads with active contacts"* — the basis for a *Dropped Threads* cell (the blind-spot lens material)

Patterns are detected via a fixed library of pattern templates. Each template specifies what signals it depends on and what threshold it needs to meet to be considered "present" for this user.

The pattern library is curated by the Wovith team and updated over time. New patterns are added based on usage data (more on the privacy of usage data below) and community proposals. The library is small at v1 — maybe 30-50 patterns — and grows deliberately.

### 4.3 Lens generation

Once patterns are detected, the algorithm composes them into proposed lenses. A lens proposal is a coherent bundle of cells, named in a way that reads as a recognizable purpose.

The composition rules:

- A proposal lens has 3-7 cells (never just one, never more than 7 on first impression)
- Cells within a proposal must be thematically coherent — they should share a use case
- Each cell maps to one or more detected patterns
- The lens name is generated from the dominant theme

The algorithm produces a candidate set of 6-10 lenses, scores them by relevance (based on how strongly the underlying patterns matched), and presents the top 3-5 as proposals. The user sees what scored highest for them.

### 4.4 The fallback proposal

If no strong patterns emerge — a user with a near-empty Drive, a sparsely used Gmail, a Calendar with few events — Wovith proposes a single *Captures* lens with three cells: a quick-capture cell for new notes, a "things to read later" cell that's empty but ready, and a "today's calendar" cell. This is the always-present fallback.

The user is never shown the empty canvas. The fallback is always populated, even if minimally.

---

## 5. The proposal as a teaching moment

Each accepted lens is a small teaching moment about how Wovith works. The user learns through use:

- **Cells exist and they're polymorphic.** The proposal lens shows multiple renderer types (a list, a feed, a card, a chart) so the user encounters the variety on day one.
- **Cells can be dragged and resized.** The accepted lens has cells the user can rearrange. Small hover hints appear the first few times the user hovers a cell.
- **Cells can be inspected.** A subtle one-time tooltip appears the first time the user opens a cell's inspector, pointing out the NL summary and the DSL.
- **The lens overview exists.** A small "show me other lenses" affordance points the user to the overview after a few minutes in the first lens.
- **Authoring is possible.** A "+ new cell" affordance is visible from the start, but never aggressively highlighted. Users notice it when they're ready.

The principle: teaching happens by exposure, not by instruction. The user touches each capability when curiosity drives them to, not when a tutorial demands they do.

---

## 6. The "modify" flow

If the user taps **Modify** on a proposed lens, they enter a lightweight editor for the lens before committing. The modify flow is intentionally simple:

- Each proposed cell is shown with a toggle (keep / drop)
- Cell names are editable
- A "what about..." section at the bottom suggests 2-3 cells that didn't make the proposal but could be added (the next-most-relevant patterns detected)

The user toggles, edits names, optionally adds, and taps **Save lens**. The lens is created with those modifications. The next-most-relevant pattern proposals are how the mining algorithm gracefully handles users who want a slightly different scope.

Modify is not a full authoring flow. It's a curation flow. Authoring comes later, after the user has lived with their first lens for a few days.

---

## 7. Re-mining over time

Inverse lens mining is not a one-time event. It runs on a slow background cadence and surfaces new lens proposals when meaningful patterns emerge.

### 7.1 When re-mining runs

Background re-mining runs once a week by default. It uses the same algorithm but applies a "what's new since last time" filter — it only proposes lenses for patterns that didn't exist (or weren't strong enough) at the last mining pass.

The user can trigger a re-mine manually from the lens overview ("Find me more lenses to consider").

### 7.2 How new proposals are surfaced

New proposals don't auto-appear on the canvas. They show up as a small badge in the lens overview: *"Wovith found 2 new lenses worth considering."* The user opens the overview to see them, with the same accept / modify / skip controls as during onboarding.

This is calm: new lenses are offered, not pushed. The user discovers them when they next think about their lens setup.

### 7.3 Lens evolution

Wovith also notices when an existing lens has drifted away from its original purpose — the cells in it haven't been used in weeks, or the underlying patterns have changed. When this happens, the lens overview shows a small "this lens has gone quiet" badge with options to refresh, retire, or modify.

This is the slow gardening of a user's lens collection. It's invisible most of the time; visible only when meaningful change has occurred.

---

## 8. The blind-spot lens as a special proposal

The blind-spot lens described in the design walkthrough is a special case in the mining algorithm. It's not proposed during onboarding (users aren't ready for it in their first five minutes), but it's proposed within the first week of active use, once the user has demonstrated they understand the basics.

The trigger: the user has accepted at least two lenses, has been actively using Wovith for 4-7 days, and has dismissed enough items that the calibration system has learned what they typically filter out.

At that point, Wovith surfaces a one-time proposal: *"Want to see a lens that shows you what your other lenses filter out?"* — with a clear description of what the blind-spot lens does. The user can accept, decline, or "show me later."

This is a *deliberate teaching moment*. The blind-spot lens is the strongest single demonstration of what makes Wovith different from other personal AI products, and the algorithm surfaces it at the moment the user is most likely to find it interesting rather than confusing.

---

## 9. Privacy and trust during mining

The mining process is privacy-sensitive by design. Three commitments shape the implementation:

### 9.1 Local analysis

All signal collection and pattern detection happens on the user's device. The signals themselves and the patterns derived from them are never sent to a Wovith server. The lens proposals, generated locally, are presented to the user before any persistent record of them is made.

The reason this is possible: the pattern library is shipped with the app. The algorithm runs against local data using a local model where ML is needed. The only network calls are to the connected MCP servers (whose data the user has authorized).

### 9.2 No surveillance signals

The mining algorithm does not collect signals that would constitute surveillance of the user's activity beyond what the connectors already grant. It does not analyze message content for sentiment, doesn't infer personal attributes, doesn't classify the user's life-stage or interests for any purpose other than direct lens proposal.

The algorithm's transparency principle: every signal and pattern is explainable in one sentence to the user, and the user can see what's been computed about them in a "what Wovith has noticed" panel in settings.

### 9.3 Telemetry, if any

If Wovith collects any telemetry about which lens proposals are accepted (to improve the algorithm over time), it does so only in aggregate, only with explicit user opt-in, and never with identifying information about the user. The default is no telemetry. The opt-in copy is honest about what's collected and why.

---

## 10. What gets shown, what gets hidden

A subtle but important decision in the mining algorithm: not everything that can be detected should be shown.

### 10.1 Sensitive patterns

Patterns involving health information, financial accounts, romantic communications, family conflicts, or other sensitive topics are detected (because they may produce useful lenses) but are *never proposed automatically*. The user must explicitly ask Wovith to look at those domains via a "show me what else you noticed" flow that has its own consent gate.

The default proposal set is intentionally conservative: work, productivity, content consumption, calendar management. Sensitive personal stuff is opt-in.

### 10.2 The "I would never have built this" test

Before any pattern becomes a proposed lens, the algorithm applies a heuristic: would this lens feel insightful or surveillance-y? Lenses that surface stuff the user clearly already knows ("here are your unread emails") fail the insight test. Lenses that surface uncomfortable truths ("here's everyone you've stopped responding to") fail the surveillance test for first proposal, though they may be appropriate later (the blind-spot lens).

The sweet spot is lenses that are genuinely useful and slightly delightful — they show the user something true about their own life that they couldn't easily have surfaced themselves.

---

## 11. The composition of a proposed lens

A specific example, to make the algorithm concrete. The user has Gmail, Drive, and Calendar connected. The mining algorithm detects the following patterns:

- 6 active conversations with recent replies needed
- 4 calendar events within 24 hours
- 3 documents being actively edited in the last 48 hours
- A cluster of 8 frequent correspondents from work
- A pattern of morning email-review activity

The algorithm composes a proposed *Morning Brief* lens:

- **Cell: Next 6 Hours** — calendar events between now and now + 6 hours, sorted by start, rendered as a timeline. Backed by the calendar-events pattern.
- **Cell: Decisions Today** — Gmail threads with active replies needed, filtered to the work correspondent cluster, taking the top 5. Rendered as a feed.
- **Cell: Working Documents** — Drive files modified in the last 48 hours, top 3, rendered as cards.
- **Cell: Quick Capture** — an empty cell for adding notes via voice or text throughout the day. Always present as the morning lens's "scratchpad."

The lens has a calm rhythm (refreshes every 5 minutes), a sensible refresh budget, and a name that matches the underlying patterns. The user sees this proposal and can recognize themselves in it: yes, that's what my morning looks like.

---

## 12. Onboarding failure modes

A few specific failures the algorithm and UX should anticipate and handle gracefully:

### 12.1 Connections fail mid-flow

If a connector authentication fails or times out, the user is shown which one failed and given retry / skip options. Mining proceeds with whatever connected.

### 12.2 No data to mine

If a user connects accounts that are essentially empty (new Gmail, empty Drive), the algorithm falls back to the *Captures* lens (see section 4.4). The user is told gently: *"Your accounts don't have much in them yet — I'll set up a simple capture lens for now, and we can find more lenses as your activity grows."*

### 12.3 The user skips the proposal step

If the user dismisses all proposed lenses, the algorithm offers a fallback: a *Captures* lens by default, with a note saying *"Skipped? No problem. I'll keep an eye out and propose new lenses as your activity tells me what's worth showing you."*

### 12.4 Re-onboarding

If a user uninstalls and reinstalls, the previous lens definitions (stored in their Automerge document on the cloud relay) are restored on first sync. The user is greeted with their existing lenses, not a fresh onboarding. The onboarding only runs for genuinely new users.

---

## 13. Measuring success

The metrics that matter for the onboarding flow:

- **Time-to-first-lens**: target under 5 minutes. P90 should be under 8 minutes.
- **Activation rate**: percentage of users who accept at least one proposed lens. Target above 85%.
- **Day-7 retention**: percentage of users still using Wovith one week after install. Target above 60%.
- **Lens-author rate**: percentage of users who author their own cell within 14 days. Target above 30%.
- **Re-mining engagement**: percentage of users who accept at least one re-mined lens proposal in the first month. Target above 40%.

These are the leading indicators of whether inverse lens mining is doing its job. They should be measured continuously and the pattern library should be tuned against them.

---

## 14. The bigger principle

Inverse lens mining is one specific solution to a more general problem: malleable software is hostile on first encounter. The user has to see something working before they'll commit to learning the system. The traditional answer is to make the system simpler. Wovith's answer is to *meet the user with something useful, made from their own data, on day one* — and let the complexity reveal itself only as the user wants more.

This is the inverse of how most powerful software products try to onboard. Most products say: "look how powerful this is, here are 12 features to explore." Wovith says: "look at this useful thing I made for you using your stuff. There's more you can do — explore when you're ready."

If the algorithm does its job, this is the moment the product earns the right to ask the user to learn anything at all.

---

## References

- Progressive disclosure research (Nielsen Norman Group)
- Tana onboarding observations (community user reviews, 2025-2026)
- Glamorous Toolkit's "ships with 6,000+ tools" pattern (feenk)
- Ink & Switch malleable software essays (Litt et al., 2025)
- Pendo, UserPilot, ChameleonHQ onboarding completion rate research (2025-2026)
- Calm Technology principles (Amber Case)
