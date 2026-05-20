# Wovith on Mobile
### How the product manifests on a phone

---

## 1. Design philosophy

Mobile is where most users will first encounter Wovith. It is the device they reach for in the morning, between meetings, on the train, in line for coffee. The desktop is where lenses are authored at depth; the phone is where lenses are *worn*.

The temptation in mobile design is to treat the phone as a shrunk-down desktop — fewer features, smaller text, hide the complexity. Wovith rejects that. The phone is a different optimum for the same product. The spatial canvas of the desktop has no place here; what replaces it must be genuinely native to the form factor, not a compromise.

Three principles guide the mobile design:

1. **The phone is for wearing lenses, not building them.** Most authoring happens on desktop (or via voice on mobile). Most consumption — looking at what your lenses are showing you — happens on phone. The mobile UI is optimized for the second job, not the first.
2. **Voice is the authoring path of choice.** Where authoring does happen on mobile, it's voice-first. Typing a DSL expression on a phone keyboard is hostile; speaking what you want is natural and matches the moment-of-use.
3. **Continuity is invisible.** Author on phone, the cell appears on desktop. Adjust on desktop, the change is on phone next time you look. CRDT sync makes this free; the UI must not draw attention to it.

The Android app ships first via Capacitor (matching the dev stack). At v1, the "larger-screen experience" is the web build of the same codebase, accessed via browser at wovith.app — the full canvas experience renders there. iOS follows once Android is stable. Native desktop apps (Electron/Tauri) are v2+. Throughout this doc, references to "desktop" or "large-screen" mean the web build on a laptop/desktop browser at v1.

---

## 2. The home view: the stacked-cell scroll

When the user opens Wovith on their phone, they land on the current lens, rendered as a vertical scroll of cells.

### 2.1 The layout

Cells stack top-to-bottom, full-width on the screen, each at a height appropriate to its content. The stack is ordered by *priority*, not by spatial position from the desktop. Priority comes from a few signals:

- Pinned cells first
- Then cells the user has interacted with most recently
- Then cells with the most-recent data changes
- Then everything else, in the order the user (or onboarding) authored them

The user can drag cells to reorder them. The order is per-user, not shared across devices — desktop has spatial positions, mobile has stack order.

### 2.2 The chrome

At the top of the screen:

- **Current lens name** in large bold type (tap to open the lens overview)
- **A small status dot** showing the runtime's overall freshness (green pulse if cells are mostly fresh)

At the bottom of the screen:

- **A persistent voice-and-search bar.** Tap to type a query or a new cell description. Long-press to dictate.

The bottom bar is anchored — it doesn't scroll away. It's the user's entry point for any authoring or search action.

### 2.3 The scroll behavior

Standard vertical scroll. As cells leave the viewport, they pause their reactive computation to save battery — they keep their last data, but they don't re-evaluate until the user scrolls back. Pull-to-refresh at the top forces all visible cells to re-evaluate.

Long swipe down from the top reveals the lens overview without leaving the lens.

---

## 3. Lens navigation on mobile

The lens overview on mobile takes a different shape than on desktop.

### 3.1 The lens overview

Accessed by tapping the lens name at the top of the home view, or swiping down from the top. The overview shows:

- A horizontal carousel of lens previews at the top of the screen, with the current lens centered
- Below the carousel, a vertical list of all lenses with names, brief descriptions, and live status indicators

The user swipes the carousel to swap lenses; or taps a name in the list. Swapping is instantaneous — the home view re-paints to the new lens. There is no animated iris transition on mobile by default; the carousel + tap pattern is already legible without one. Users can enable the iris transition in settings if they like it.

### 3.2 Pinned lenses

The bottom edge of the screen, just above the voice bar, can show 2-4 small lens dots. These are pinned lenses for one-tap access. Tap a dot to swap. The current lens is indicated by a brighter dot.

This is intentionally a small affordance — not a tab bar, not a navigation rail. Most users won't pin more than 2-3 lenses; the rest live in the overview.

### 3.3 Lens-context detection (optional)

For users who enable it, Wovith can auto-swap to a lens based on context — a "Driving Lens" when CarPlay or Android Auto is active, a "Sleep Lens" between 10pm and 6am, a "Work Lens" during work hours from work locations. This is opt-in per lens, configured on desktop.

Auto-swap is announced subtly — a small banner at the top of the screen says *"Switched to Driving Lens"* with an undo affordance. Auto-swap never overrides a user-initiated swap from the last hour.

---

## 4. The cell on mobile

Each cell on mobile is a full-width section of the scroll. Its visual treatment follows the freshness grammar from the renderer spec, adapted to touch.

### 4.1 Cell anatomy on mobile

A cell on mobile shows:

- **A small header strip** at the top: cell name on the left, freshness indicator on the right
- **The cell's rendered content** in the body
- **A footer strip** with the last-refreshed timestamp (small, dim), only visible on long-press

The header and footer are minimal — just enough to anchor the cell without competing with content.

### 4.2 Touch interactions

- **Tap an item** within a cell → opens the source app or an inline detail
- **Long-press an item** → reveals the action menu (open, dismiss, pin, fork, copy reference)
- **Swipe an item left** → dismiss (with undo toast)
- **Swipe an item right** → pin (with undo toast)
- **Long-press a cell header** → reveals cell-level actions (edit, inspect, fork, suspend, archive)
- **Pinch on a cell** → expand to fullscreen view of the cell
- **Two-finger swipe on a cell** → reorder cells in the stack

The swipe-left-to-dismiss and swipe-right-to-pin gestures are deliberately mirror-symmetric and natural. Users discover them within a session.

### 4.3 The fullscreen cell

Pinching a cell expands it to fill the screen. In fullscreen, the cell has more room for content — more rows in a list, more cards in a `cards` renderer, denser detail in a timeline. The freshness indicator, header, and footer all expand to match.

Fullscreen also reveals the cell's inspector affordance: a small "edit cell" button in the top corner that opens the inspector overlay. The user can edit the cell's NL summary or DSL right there.

---

## 5. Voice-first authoring

Authoring a new cell or lens from the phone is voice-first. This is where the mobile experience genuinely differentiates.

### 5.1 The voice flow

The user activates voice in one of three ways:

1. Long-press the bottom voice-and-search bar
2. From the lock screen, invoke the system voice trigger ("Hey Google, add to Wovith…")
3. From a Wovith home-screen widget that's set to voice-capture

The phone shows a clean voice-input UI — minimal, just a waveform and a transcript-as-you-speak. The user speaks:

> "Add a cell that shows me articles I've saved this week, grouped by topic."

The transcript appears in real time. When the user pauses for >1.5 seconds or taps "done," Wovith stops listening and processes the request.

### 5.2 The compilation and preview

The natural-language compiler produces a DSL expression. Wovith shows a brief preview screen:

```
Adding to: Reading Lens

[Show me articles I've saved this week, grouped by topic]

Compiled from:
  pocket.articles
    where saved_at in this_week
    | group by extract_topic(title, summary)
    | show as cards

Sources used: Pocket
```

The user can tap "Add" to commit, "Edit" to revise, or "Cancel" to abort. The preview is fast — sub-2-second from end of speech to preview render in the common case.

### 5.3 Inline clarification

If the request is ambiguous on one specific dimension, the preview asks one inline question:

> "Articles you saved, or articles you read? *(I'll use 'saved' if you don't pick.)*"

The user can tap "saved" or "read" or just commit with the default. Never a barrage of clarifications — one decision at a time, always with a sensible default.

### 5.4 Voice authoring of full lenses

The user can also voice-author a new lens entirely. Saying *"Create a new lens for tracking my freelance projects"* triggers the lens-creation flow. Wovith may follow up with one question — *"What sources should this lens read from?"* — and then propose 3-5 initial cells based on those sources, in the same inverse-lens-mining pattern used in desktop onboarding.

### 5.5 What voice authoring is not for

Voice is excellent for adding a cell, creating a lens, or making a small change to an existing cell. It is not great for:

- Composing a complex multi-cell lens with precise positions
- Fine-tuning a custom renderer's options
- Anything requiring the user to inspect or debug DSL

For those, the user opens the lens on desktop. Continuity makes this friction-free — voice on phone hands off naturally to keyboard on desktop.

---

## 6. Quick capture

Beyond authoring new cells, mobile supports quick capture of content from other apps into existing lenses.

### 6.1 Share-sheet integration

When the user shares any content from any app (an article URL, a photo, a Slack message, a tweet), Wovith appears in the share sheet. Tapping Wovith reveals:

- A list of lenses with "Add to" affordances
- A "New lens with this" option

Tapping a lens adds the shared content as an item to the most relevant cell in that lens — or as a standalone "Saved items" cell if no relevant cell exists. The lens updates immediately.

### 6.2 Voice capture from anywhere

The Wovith Android widget (and on iOS the lock-screen control once that ships) can be set to "voice capture." Tapping it starts voice input that goes into the current lens, like saying:

> "Note: the conference room booking system is unreliable on Wednesdays."

The voice note becomes an item in a designated "Captures" cell or, if Wovith detects a more relevant existing cell, into that cell.

### 6.3 Photo capture

Taking a photo from within Wovith adds it to the current lens as an item. The photo can be tagged on-the-fly via voice (*"This is for the family lens — note the receipt date"*). If a relevant cell exists ("Receipts"), the photo lands there; otherwise it goes to "Captures."

---

## 7. Notifications and alerts

Wovith is not a notification engine by default. Notifications are opt-in per lens and per cell.

### 7.1 The notification model

A lens can be marked as "alert-active." When marked, the lens runs in the background at its normal rhythm. If any cell in the lens detects a condition that the user has flagged for alerts, a notification is sent.

Cells can be flagged for alerts with simple conditions:

- *Alert when this cell has new items*
- *Alert when this cell exceeds N items*
- *Alert when this cell's data matches a specific pattern*
- *Alert at a specific time of day if the cell has items*

Notifications appear as standard Android (later iOS) system notifications. They link directly to the relevant cell in the relevant lens.

### 7.2 Notification design

Notification content is brief and includes the cell's most-recent state. *"Morning Brief: 3 new urgent emails from VIPs"* — not just *"Wovith has an update."* The notification is the cell's state, summarized.

Tapping a notification opens Wovith directly to the cell, with the new items pre-highlighted. Dismissing the notification doesn't affect the cell's state.

### 7.3 Notification budgets

Each user has a default notification budget — at most 5 per day from Wovith, across all lenses. The user can raise or lower the budget in settings. When the budget is reached, additional alerts queue silently in the Wovith inbox; the user sees them next time they open the app.

This is intentional. A notification engine is a slippery slope toward demanding attention. Wovith is a place you go because you want to know — not a place that interrupts because it wants you to.

---

## 8. Widgets and lock-screen

### 8.1 Home-screen widgets (Android)

Android home-screen widgets are first-class. Widget types include:

| Widget | Content |
|---|---|
| **Lens preview** | The top 3 cells of a chosen lens, refreshed coarsely (every 15-30 min) |
| **Single cell** | One specific cell, full-width, refreshed at its normal rhythm |
| **Voice capture** | A tap-to-speak button that records into the current lens |
| **Lens picker** | Quick-swap between pinned lenses |

Widgets are configured from Android's standard widget management UI. Tapping any widget content opens Wovith to the relevant lens.

### 8.2 Lock-screen presence

On Android (and iOS once that platform's APIs allow), Wovith can show:

- **A lock-screen widget** for at-a-glance lens content (one cell, very compact)
- **Live activities** for slow-running agent operations in progress
- **A notification group** that's persistent until dismissed

These respect the user's lock-screen privacy settings — sensitive content is hidden when the device is locked unless the user explicitly opts in.

### 8.3 The Quick Settings tile

Android Quick Settings can include a Wovith tile that toggles between the user's most-recent lens and a chosen always-on lens. This is useful for users who use Wovith as their "morning landing" — a single tap from anywhere brings up the day's lens.

---

## 9. Continuity with desktop

CRDT sync makes continuity free. The user experience must make it invisible.

### 9.1 The standard moment

User authors a cell via voice on phone. Cell appears in the phone's stack. User opens desktop later. The cell is there, positioned at a sensible default (typically near the bottom-right of the canvas, in an open area). The user drags it to a better position. Phone updates within seconds.

There is no "sync now" button. There is no spinner. There is no "device switch" notification. It just works.

### 9.2 Handoff

When both devices are active and the user is looking at the same lens on both, edits propagate live. Phone user dismisses an item; desktop user sees the item disappear within a second. This is the same Automerge sync that handles co-lens collaboration — the same machinery, just one user across two devices.

### 9.3 What carries over and what doesn't

Carries over:

- All lens definitions and cell expressions
- All cell positions and sizes (on desktop) and stack orders (on mobile)
- All calibration signals
- All connected MCP servers (with credential prompts on first use of a new device)
- All history and time travel state
- All pinned items, dismissals, and other interaction state

Does not carry over:

- Device-specific UI preferences (text size, theme, reduced motion)
- Active sessions (which lens you have open right now on each device is independent)
- Notification settings (each device manages its own)

### 9.4 Offline-aware sync

When a device is offline, all interactions happen locally and queue. Once the device comes back online, the queue replays through Automerge sync. Conflicts are resolved by Automerge's CRDT semantics — non-conflicting changes merge transparently; conflicting changes to the same cell are surfaced to the user for resolution next time they open the lens.

---

## 10. Specific mobile-optimized lenses

Some lenses are inherently better on mobile than desktop. These are the ones users will reach for most often. Examples:

### 10.1 Morning Lens

The lens a user opens first thing. Big-text cells, calm rhythm, low cognitive load. Typical cells:

- A `card` showing today's first calendar event
- A `count` showing unread VIP emails
- A `feed` showing top 5 overnight messages, summarized
- A `text` cell with an agent-generated one-paragraph briefing of yesterday's loose ends

Designed for one-hand use, on a phone, before coffee.

### 10.2 Commute / Driving Lens

Voice-and-audio-first. Cells are large, simple, and audio-readable. Typical cells:

- A `text` cell with a podcast playback selector (next episode in your subscription)
- A `card` showing the next calendar event with directions
- A `count` showing miles to destination if navigating

This lens opens automatically when CarPlay/Android Auto is detected (if the user has enabled context-detection).

### 10.3 Walking / Loose Time Lens

For idle moments — coffee line, between meetings. Cells with content you might browse but not act on:

- A `cards` cell of articles you've saved
- A `feed` cell of low-priority social activity
- A `text` cell with a daily prompt or quote

Designed for casual scrolling, low-stakes engagement.

### 10.4 Evening Lens

For wind-down. Quieter rhythm. Cells emphasize closing loops rather than opening them:

- A `list` of unanswered messages with a "respond" affordance
- A `card` showing tomorrow's first event
- A `text` cell with the day's accomplishments (agent-summarized)

Designed for closure, not new activity.

### 10.5 Travel Lens

When location detection sees the user is far from home (or the user activates it manually):

- A `card` with the day's flights/transit
- A `feed` with hotel-related messages
- A `list` of restaurants nearby (via web.search)
- A `map` of saved POIs

Replaces the Morning Lens automatically while traveling, restores when home.

---

## 11. Offline behavior

A phone is offline often — subway, plane, parking garage, weak signal. Wovith must work.

### 11.1 What works offline

- All cached cell content from the last successful evaluation
- Reading, scrolling, dismissing, pinning items
- Lens swapping (all data is local)
- Authoring new cells (cached and synced when online)
- Voice authoring (compilation runs locally with a smaller model, or queues for compilation when online)
- Inspecting cells and provenance
- Time travel through cached history

### 11.2 What doesn't work offline

- Cells with computer-use or web fetches that aren't cached
- Real-time MCP fetches from cloud services
- Cells that depend on agent calls if the local model can't handle them
- Sync to other devices (queued until online)

### 11.3 The offline visual indicator

When offline, the top status indicator turns into a small "offline" badge. Cells that depend on online sources show a slightly dimmed appearance with a "showing cached data from <timestamp>" footer. The user always knows what's stale and why.

### 11.4 Reconciliation on reconnect

When the device reconnects, Wovith silently re-evaluates online-dependent cells in the background and updates them. New data shimmers in (the renderer-spec's "something changed here" indicator). The offline badge dismisses. The user notices the freshness indicators turn green again.

---

## 12. Performance and battery

### 12.1 Battery-aware behavior

Wovith is aware of the device's battery state and adapts:

- **Above 30% battery, charging or not:** Normal behavior. Cells refresh on their rhythm.
- **Below 30% battery, not charging:** All lenses except the current one stop background computation. The current lens's cells refresh on a slower rhythm (2-3x their normal budget).
- **Below 15% battery:** Wovith enters a minimal mode. Only manual refreshes happen. Slow agentic cells are paused. Widgets stop updating.

The user is informed of mode transitions via a small banner the first time each session.

### 12.2 Memory and CPU budgets

Wovith targets a memory footprint under 200MB in active use, under 50MB when backgrounded. Cells that would push beyond these limits (large agent enrichments, huge data fetches) are throttled or paused with user notification.

CPU budgets are similar — Wovith aims for less than 5% CPU when idle, with bursts during refresh that complete within seconds.

### 12.3 Network awareness

On metered connections, Wovith reduces refresh frequency and skips fetching large assets (images, embeds). The user can override per-lens for cases where they want full fidelity over mobile data.

---

## 13. Platform-specific considerations

### 13.1 Android (first native platform)

Built with Capacitor for cross-platform reuse from the shared web codebase. Specific Android integrations:

- **Share-sheet integration** for quick capture from any app
- **Home-screen widgets** for lens previews and voice capture
- **Quick Settings tile** for fast lens swapping
- **Android Auto integration** for Driving Lens
- **System voice activation** ("Hey Google, ask Wovith…")
- **Foreground service** for lenses marked as alert-active
- **CRDT sync** uses Android-friendly background sync APIs

### 13.2 iOS (second native platform)

Once Android is stable, iOS follows. Different integration patterns:

- **Shortcuts integration** for voice-triggered cell creation
- **Lock-screen widgets and Live Activities**
- **iCloud-aware sync** (with explicit user opt-in vs. self-hosted sync)
- **Siri integration** for voice authoring
- **CarPlay** for Driving Lens
- **Standard share-sheet integration**

iOS is a bigger lift due to platform constraints (background processing limits, more restrictive permissions). The Android-first sequencing reflects this.

### 13.3 Cross-platform consistency

The same lens looks like the same lens on Android and iOS. The same DSL works on both. The same CRDT sync handles both. Differences are in OS-integration touchpoints, not in the core product.

---

## 14. A day in the life: the morning ritual

To close, a concrete walkthrough of how a user lives with Wovith on a phone, day by day.

**6:30am.** Alarm goes off. User picks up phone, sees the lock-screen Wovith widget showing the top three items from their Morning Lens — the day's first meeting, the count of overnight VIP emails, a one-line agent briefing.

**6:35am.** User unlocks phone. Wovith is the first thing they open. Morning Lens fills the screen. They scroll: the meeting card, the VIP emails (3 items, swipe-dismiss one as irrelevant), the briefing paragraph (read), an evening event reminder, a calendar conflict needing attention.

**6:45am.** While brushing teeth, user long-presses the voice bar. *"Note for today's lens: ask Maya about the design review timing."* Wovith adds it as a quick-capture item in the Morning Lens's "Captures" cell. Sync to desktop happens in the background.

**7:30am.** User leaves home. Phone connects to Android Auto. Driving Lens auto-swaps in. A banner briefly confirms. Three cells: the day's first meeting with directions, a podcast playback selector, a count of saved articles to read later (it's just visible at the bottom). They tap the podcast cell, drive to work listening.

**9:00am.** At desk. User opens desktop Wovith. The Morning Lens is on screen — same data they saw on phone, but now spatially arranged on a 1920x1080 canvas with seven cells visible at once. They drag the "ask Maya" note from where it auto-placed to the top of their Captures column.

**10:30am.** In a meeting, user feels their phone buzz once. Glance: a Wovith notification saying "Research Lens: 2 new papers from your watch list." Tap, opens Wovith → Research Lens → top of stack, the two new papers with agent-extracted one-line summaries. They tap one, opens the PDF in the default reader. Back to meeting.

**12:15pm.** Lunch. User scrolls Walking Lens — a curated feed of saved articles to browse during loose time. They read one, swipe to dismiss the rest. Wovith's calibration takes note: this domain is interesting, that domain less so.

**3:00pm.** Afternoon. User long-presses voice bar. *"Add a cell to the Research Lens that shows GitHub repos I've starred this month."* Wovith compiles, shows the preview, user taps Add. The cell appears at the top of the Research Lens stack on phone, and shows up on desktop in an open area of the canvas next time they look.

**6:00pm.** Heading home. Driving Lens auto-swaps in for the commute. Evening Lens auto-swaps in when home.

**9:30pm.** On the couch. User opens Evening Lens. Three soft cells: unanswered messages, tomorrow's first event, today's accomplishments (agent-summarized: "Replied to 14 emails, attended 3 meetings, started revising the proposal"). They reply to two messages from the cell directly. Wovith makes the actions through the connected Gmail MCP with confirmations.

**10:30pm.** Phone goes on the bedside. Wovith's background activity quiets — only the alert-active lenses keep watching for the morning-relevant signals. The user falls asleep.

**Next morning, 6:30am.** Alarm. Lock-screen widget shows the day's first thing, an updated count, a fresh briefing. The ritual begins again. The Morning Lens has subtly tuned itself overnight based on what the user dismissed yesterday.

---

## 15. The closing principle

The phone is not a smaller desktop. The phone is the canonical *moment of use* for almost every Wovith user. Designing the mobile experience as if it were the primary surface — not the secondary — is the discipline that makes the product work for the people who will most depend on it.

If the phone experience is right, the desktop becomes the place users go when they want to build, refine, or think slowly. If the phone experience is wrong, the product never makes it past install for most of its potential audience.

This is where the most concentrated design attention should go in the first six months. Every interaction described in this document is a chance to either feel like home or feel like a compromise. There is no third option.

---

## References

- Material Design (Google) — Android UX baseline
- Apple Human Interface Guidelines — iOS UX standards (for later platform)
- Tana mobile voice capture — UX reference for voice-first authoring
- Apple Shortcuts — voice-triggered automation precedent
- Android widget API — home-screen widget capabilities
- Capacitor — cross-platform framework for the implementation
- Automerge — CRDT sync substrate for continuity
- Calm Technology (Mark Weiser) — design philosophy for ambient presence on mobile
