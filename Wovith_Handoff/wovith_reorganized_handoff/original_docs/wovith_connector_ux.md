# Wovith Connector UX Patterns
### Google Drive, Gmail, and Google Calendar as the first three integrations

---

## 0. About this document

This document specifies how Wovith integrates with the first three connectors: Google Drive, Gmail, and Google Calendar. These three are the v1 priority because their combination covers about 80% of the data sources a typical user wants their personal lenses to draw from, and because Google's first-party MCP servers (`drivemcp.googleapis.com`, `gmailmcp.googleapis.com`, and the corresponding calendar service) mean Wovith doesn't have to ship its own connector code for them.

The document covers, for each connector: the MCP server Wovith uses, the OAuth scope strategy, the connection flow UX, how data from that connector surfaces in lens cells, the renderers commonly used with it, edge cases, and connector-specific security considerations.

The patterns described here are intended to generalize. When the fourth, fifth, and tenth connectors arrive (Slack, GitHub, Notion, Linear, etc.), the same UX vocabulary applies. The three-connector v1 set is the proving ground.

---

## 1. Shared patterns across all connectors

A small set of patterns is consistent regardless of which connector is being added. These patterns are described here once, then assumed in the connector-specific sections below.

### 1.1 The connector card

Every connector — connected or not — appears as a card on the Connections settings panel. The card shows:

- The connector's name and a small mark (logo or icon)
- Its connection state (*Not connected*, *Connected*, *Reconnect needed*, *Limited access*)
- A one-line summary of what's connected (*"Read-only on personal Gmail"*, *"Full access on Workspace Drive"*)
- The lenses currently using this connector, listed by name
- An action button: *Connect*, *Reconnect*, *Manage*, or *Disconnect*

Card visuals follow the cell shell aesthetic from the design system — slate-1 background, slate-6 border, 12px radius, 16px padding.

### 1.2 The OAuth handoff

When a user taps *Connect* on a connector card, Wovith opens a system browser to the provider's OAuth consent screen, following the OAuth 2.1 + PKCE flow specified in the security doc. The user authenticates with the provider, reviews the scopes Wovith is requesting, and approves or denies.

The browser handoff is intentional — Wovith does not embed an OAuth webview. Users are more likely to recognize the legitimate consent screen of the provider when it appears in their own browser, and the cookies that authenticate them there are not exposed to Wovith.

After approval, the browser returns to a Wovith callback URL with the authorization code, and the device exchanges it for tokens. The user sees a "Connected to [provider]" confirmation in Wovith and is returned to the Connections panel.

### 1.3 The scope-tier choice

For each connector, Wovith offers the user a scope-tier choice at connection time:

- **Read-only** (default; recommended for most users)
- **Read and write** (required for cells that take actions like sending mail or creating events)
- **Read, write, and delete** (rare; required only for cells that explicitly archive or delete; flagged with a warning at connection time)

This is a Wovith-specific framing over the underlying provider scopes. The user does not need to understand `gmail.modify` vs `gmail.send` vs `gmail.compose` — they choose a tier and Wovith requests the appropriate combination of underlying scopes.

The default is always read-only. The user can upgrade later when a cell requires more.

### 1.4 The provenance disclosure on connection

Every connection flow surfaces a plain-language disclosure of what Wovith will do with the connector, before the OAuth handoff. This is voice-doc compliant copy.

Example for Gmail read-only:

> *Connecting Gmail will let me read your messages and metadata. I won't send anything, modify labels, or delete messages — those would need a separate connection upgrade. You can disconnect anytime.*
>
> **[ Continue ]   [ Cancel ]**

Tapping *Continue* moves to the OAuth handoff. Tapping *Cancel* returns to the Connections panel.

### 1.5 The connection health indicator

Each connected service has a small health indicator on its card that surfaces:

- **Healthy** (green dot): connection is live, recent calls succeeded
- **Degraded** (amber dot): recent calls failed intermittently
- **Expired** (amber dot with refresh icon): token expired, needs reconnection
- **Revoked** (red dot): the user revoked access on the provider's side; reconnection required to restore

Tapping the indicator opens a per-connector activity log: the last 50 API calls, with timestamps, the cell that initiated each, and the result. This is the per-connector audit referenced in the security doc.

### 1.6 The disconnection flow

Tapping *Disconnect* on a connector card opens a confirmation that surfaces consequences:

> *Disconnecting Gmail will stop these 3 lenses from refreshing:*
>
> *— Morning Brief*
>
> *— VIP Threads*
>
> *— Decisions Today*
>
> *You can reconnect anytime. Your lens definitions stay; they'll just go quiet until you reconnect.*
>
> **[ Disconnect ]   [ Cancel ]**

Disconnection revokes the tokens at Wovith's end and, where the provider supports programmatic revocation, also revokes them server-side. The user is told if they should also revoke from the provider's security settings for full removal.

---

## 2. Google Drive

### 2.1 The integration's purpose

Drive is the most common file substrate for personal and small-team work in 2026 — documents, spreadsheets, presentations, PDFs, images, all synced and shared. Wovith uses Drive as the canonical "files I care about" source for lenses about work-in-progress, reference material, deliverables, and the long tail of artifacts a user touches week to week.

The integration is read-heavy. Most cells that draw from Drive want to find files matching some criterion (recently modified, in this folder, shared with these people) and render them. Some cells want to add files (a Quick Capture cell that saves a note as a Drive document).

### 2.2 The MCP server

Wovith uses Google's first-party Drive MCP server (`drivemcp.googleapis.com`) for v1. This is the same server pattern referenced in Google Workspace's MCP configuration documentation and used by Gemini CLI, Claude Desktop, and other AI clients. The benefit of using the first-party server is that the OAuth client is registered as a Google product, so users see Google's own consent screen language at authorization.

For users in Workspace environments where admins want different controls, Wovith also supports the open-source [taylorwilsdon/google_workspace_mcp](https://github.com/taylorwilsdon/google_workspace_mcp) as an alternative for self-hosted or custom-deployed setups. The choice is invisible to most users — they connect "Google Drive" and Wovith picks the appropriate server based on the OAuth flow returned.

### 2.3 OAuth scopes

The scope tiers map to Google scopes as follows:

| Wovith tier | Google scopes |
|---|---|
| Read-only | `drive.readonly` (read all files), `drive.metadata.readonly` (file lists, sharing info) |
| Read and write | adds `drive.file` (create/edit files this app made) |
| Read, write, and delete | adds `drive` (full access including delete) |

The default is read-only. The `drive.file` scope is a notable choice for the write tier: it limits Wovith to files it specifically created, rather than granting write access across the entire Drive. This is meaningfully safer than the default `drive` scope and aligns with the security doc's least-privilege principle. The full `drive` scope is offered only for users who explicitly want lenses that can edit or delete arbitrary files.

### 2.4 Connection flow UX

The connection flow follows the shared OAuth handoff pattern (section 1.2), with Drive-specific disclosure copy at the pre-flow step:

> *Connecting Drive will let me read files you've created or have access to. I'll never create or modify files unless you specifically upgrade this connection. You can disconnect anytime.*

The user taps Continue, sees Google's consent screen, approves the read-only scopes, and is returned. The card now shows "Connected" with a green health dot.

### 2.5 How Drive surfaces in lens cells

Drive is one of the more flexible sources because the underlying objects (files) have rich metadata. Typical cell expressions:

```
from drive.files
where modified is in last 7 days
sort by modified descending
take 10
show as cards
```

```
from drive.files
where folder is "Active Projects"
  and shared with includes me
sort by modified descending
show as feed
```

```
from drive.files
where type is "spreadsheet"
  and i opened in last 30 days
take 5
show as grid
```

Drive's polymorphism makes cards a common renderer choice — a file card shows the file name, last modified time, the file's icon by type (doc, sheet, slide, PDF, image), the folder it's in, and a small preview where available. The cards renderer pulls thumbnails from Drive's thumbnail API where the file supports it.

### 2.6 Common Drive lens patterns

A few patterns that appear repeatedly in user-authored Drive lenses:

- **Working documents lens**: files modified by the user in the last few days, sorted by recency, rendered as cards.
- **Shared with me lens**: files recently shared with the user, separated by sharer, with unread (uncommented, unopened) ones highlighted.
- **Project folder lens**: a specific folder's contents, rendered as a list or grid, with subfolder navigation.
- **Search lens**: a saved Drive search ("invoices from 2026", "files containing 'OKR'"), rendered as a feed.
- **Receipt collection lens**: files matching common receipt patterns (subject lines, filenames, content), rendered as a grid with date-grouped sections.

### 2.7 Drive-specific UX patterns

**File preview in cells.** When a Drive file appears in a cell card or feed item, hovering or tapping shows a quick preview without opening the file in Drive. Wovith uses Drive's preview API for the lightweight render. A "Open in Drive" affordance is always one tap away.

**File actions from cells.** A Drive file card has a small action menu (three dots, top-right) with: *Open in Drive*, *Copy link*, *Remove from this cell*. Users who have read-write access also see: *Move*, *Rename*, *Share*. These actions go through the standard Tier 2 (Review) confirmation pattern from the security doc — except *Copy link* and *Open in Drive* which are local-only and require no confirmation.

**Folder navigation.** A folder-based lens can be authored to allow navigation: clicking a subfolder in the cell drills into that subfolder's contents, with a breadcrumb to return. This is a renderer affordance, not a separate cell — the same `from drive.files where folder is X` query updates its X parameter on navigation.

### 2.8 Edge cases and quirks

**Workspace vs personal Drive.** A user with both a personal Gmail account and a Workspace account often has two Drives. Wovith treats these as separate connections — the user can connect both, and cells declare which Drive to query (the default is "my primary Drive"). The Connections panel shows both with the account email next to the Drive label.

**Shared drives (formerly Team Drives).** Workspace shared drives appear alongside the user's personal Drive. The same cell syntax (`from drive.files where folder is "Active Projects"`) can resolve to either. Wovith disambiguates by drive name or shared-drive ID where ambiguous.

**Large folders.** A folder with 10,000+ files would time out a naive query. Wovith pages through results internally and caps cell results at 500 items unless the user explicitly raises the limit. Cells that hit the cap show a small badge: *Showing 500 of an estimated 12,000. Refine the filter to see more specifically.*

**File access changes.** A file the user previously had access to may have been unshared. The cell silently drops items it can no longer access, but the per-cell activity log records the dropped attempts. If a cell's underlying files have been substantially unshared (more than 50% missing), the cell surfaces a small banner: *This cell can't reach some files anymore. Want me to suggest a refresh?*

### 2.9 Security considerations specific to Drive

The security doc covers OAuth, scope enforcement, and prompt injection generally. Drive-specific risks:

**Documents as injection vectors.** A document a user reads in a cell may contain prompt injection content targeting the cell's agent. The mitigation is the "noise quarantine" pattern from the security doc — agentic cells process one document's content at a time, with no ambient cross-cell access.

**Sensitive file types.** Drive sometimes holds extremely sensitive material — financial statements, legal documents, identity verification scans. Wovith does not specially detect these, but does honor the security doc's principle of not surfacing sensitive-pattern lenses automatically. A user who explicitly authors a lens that filters on financial document patterns has consented; the mining algorithm does not propose such lenses without explicit prompting.

**Files with PII.** When a cell exports as a lens-as-prompt-export (security doc section 7), Drive file contents in the snapshot are sanitized like any other data. The redaction pass strips PII detected via the standard patterns.

---

## 3. Gmail

### 3.1 The integration's purpose

Gmail is the most consequential connector for personal AI use cases. Email is where decisions arrive, where commitments are made, where context lives, and where the user's attention is most often interrupted. A good email integration is the difference between a personal AI being useful versus being an extra place to check.

For Wovith, Gmail is the source of most "what needs attention" lenses, most VIP/contact-aware lenses, and most reply-drafting cells. It's also the most security-sensitive connector — the scopes that let an agent send mail on the user's behalf are scopes that, misused, do real damage.

### 3.2 The MCP server

Wovith uses Google's first-party Gmail MCP server (`gmailmcp.googleapis.com`) for v1. As documented in Google's Workspace MCP configuration, this is the canonical path for AI clients integrating with Gmail.

A complication worth naming: as of mid-2026, there are known bugs in some clients where the Gmail MCP integration routes through a Drive-named OAuth client, causing the user to see "Claude for Google Drive wants additional access" when granting Gmail permissions. This is a Google-side OAuth client naming issue, not a Wovith bug, but Wovith's pre-OAuth disclosure copy explicitly tells the user what to expect:

> *On the next screen, Google may show the consent as "Wovith for Google Workspace" while requesting Gmail-specific permissions. Confirm that Gmail permissions are listed before approving.*

This is the kind of detail that builds trust with users who pay attention to OAuth screens.

### 3.3 OAuth scopes

The scope tiers map as follows:

| Wovith tier | Google scopes |
|---|---|
| Read-only | `gmail.readonly`, `gmail.metadata` |
| Read and draft | adds `gmail.compose` (create drafts but cannot send without explicit user action) |
| Read, draft, and send | adds `gmail.send` |
| Full | `gmail.modify` (read, modify labels, send, archive — but not delete) |
| Full + delete | `https://mail.google.com/` (the full scope including permanent delete) |

The defaults: read-only at first connection. Read-and-draft is the most common upgrade tier — it lets the Inbox Decisions cell draft replies without ever sending them autonomously. The send scope is added only when the user accepts a lens that includes a send-capable cell, with an explicit upgrade confirmation. The full + delete scope is rare and surfaces a strong warning.

The `mail.google.com` scope (full + delete) is intentionally distinguished from `gmail.modify` because of the OpenClaw incident discussed in the security doc — bulk delete of an inbox is one of the most damaging agentic mistakes, and the full delete scope should require a deliberate user decision.

### 3.4 Connection flow UX

The pre-OAuth disclosure for Gmail read-only:

> *Connecting Gmail will let me read your messages and metadata. I won't draft, send, or modify anything. You can upgrade later if a lens needs to do more.*

For an upgrade to read-and-draft:

> *This lens wants to draft email replies for your review. Upgrading this connection will let me create drafts (not send). Sending still requires your specific confirmation each time.*

For an upgrade to send:

> *This lens wants to send emails on your behalf. Sending will still happen only after you specifically confirm each send (or each batch). I'll never send autonomously.*

For full + delete:

> *This lens wants to be able to archive and delete emails. Deletion is permanent on Gmail's side. Wovith's hold-to-confirm pattern will still apply — bulk deletions ask for a 1.5 second hold to commit.*

Each disclosure includes a *Continue* and *Cancel* button. *Continue* proceeds to Google's consent screen with the appropriate scope list.

### 3.5 How Gmail surfaces in lens cells

Gmail's data model — threads, messages, labels, attachments — shapes the cell vocabulary. Typical cell expressions:

```
from gmail.threads
where state is unread
  and from is in vip-contacts
sort by latest descending
take 10
show as feed
```

```
from gmail.threads
where i replied in last 30 days
  and they haven't replied in last 7 days
show as list
```

```
from gmail.messages
where label is "Receipts"
  and date is in this quarter
sort by date descending
show as table
```

```
from gmail.threads
where i started
  and there's no reply
  and age is more than 5 days
show as feed
```

The last example is the classic "dropped threads" pattern — threads where the user sent something but the recipient didn't reply, useful for follow-ups.

### 3.6 Common Gmail lens patterns

- **Inbox Decisions lens**: threads with active replies needed, from VIP contacts, with the agent having drafted suggested responses. Rendered as a feed with each thread expandable.
- **VIP threads lens**: all recent activity from a defined set of important contacts. Rendered as a feed grouped by contact.
- **Dropped threads lens**: threads the user started where no reply has come back, aged 5+ days. Rendered as a list with one-click "follow up" affordances.
- **Receipts lens**: messages auto-detected as transactional, filtered by quarter or year. Rendered as a table with amount, vendor, date columns.
- **Newsletter digest lens**: messages from subscriptions, summarized by the agent, rendered as text cards.

### 3.7 Gmail-specific UX patterns

**Threading.** Gmail's thread model is preserved in lens cells. When a cell shows a thread, the user sees the latest message preview with a count of total messages in the thread (*"6 in thread"*). Expanding the thread in the cell shows all messages without leaving Wovith.

**Reply drafting.** A cell that includes `enrich each with agent("draft a reply")` produces an agent-drafted response for each thread. The draft appears inline in the cell, expandable for full text, with three actions: *Edit*, *Send*, *Skip*. Send routes through the Tier 2 Intent Preview pattern, batching multiple sends if the user wants.

**Label-based filtering.** Cells can filter by Gmail labels, including the system labels (INBOX, IMPORTANT, STARRED, etc.) and user labels. Label autocomplete is offered in the DSL editor.

**The unsubscribe affordance.** When a cell surfaces a message that includes a `List-Unsubscribe` header (most newsletters), an *Unsubscribe* affordance appears alongside the standard actions. Tapping it triggers the unsubscribe through Gmail's standard unsubscribe handler — this is Wovith helping the user clean up, with no agent involvement.

### 3.8 Edge cases and quirks

**Attachments.** Email attachments are referenced in cells but not automatically downloaded or rendered. A message card shows attachment count and types; tapping an attachment opens it in Gmail's preview. Cells that want to process attachment content (an invoice parser, for example) declare this explicitly and run a Drive-style preview/processing flow.

**Large mailboxes.** Mailboxes with hundreds of thousands of messages need careful query bounding. Wovith's Gmail queries are always time-bounded by default (last 30 days), and the user can extend. Queries hit the API in pages and cap at a configurable item count.

**Forwarded and BCC'd messages.** Cells that filter on "from" or "to" need to handle Gmail's quirks around forwarded mail and BCC. The DSL semantics: `from is X` matches the Sender header; `to includes me` matches To, CC, or BCC. The DSL doc has the canonical specification.

**Workspace vs personal Gmail.** Same pattern as Drive — users may have multiple connected Gmail accounts. Cells specify which by account or default to the primary.

**Mailbox not yet indexed.** Brand-new Gmail accounts or accounts that have just been opened can return empty results for queries that would normally have matches. Wovith handles this by showing the empty state and a note: *Your Gmail account doesn't have much in it yet. Cells will fill up as messages arrive.*

### 3.9 Security considerations specific to Gmail

**Email bodies as injection vectors.** This is the most-discussed prompt injection surface in 2026. The mitigation is multi-layered, as covered in the security doc:
1. Capability gating — cells without send scope cannot be tricked into sending
2. Content/instruction separation — email bodies are wrapped as data, not interpreted as instructions
3. Action confirmation — even successful injection that produces a "send X to Y" plan still has to clear the user's Intent Preview confirmation

**Bulk operations.** Following the OpenClaw lesson, all Gmail bulk operations (archive 50+ messages, delete any, label-modify 100+) require hold-to-confirm.

**Send-as identities.** Users with "Send as" configurations in Gmail can send from multiple addresses. Wovith's send action surfaces the chosen send-as identity in the Intent Preview, so the user can verify they're sending from the right account.

**Read receipts.** Wovith does not trigger read receipts when displaying mail in cells. The user reads in Wovith; the sender sees no signal unless the user explicitly opens the message in Gmail.

---

## 4. Google Calendar

### 4.1 The integration's purpose

Calendar provides the time scaffold for most personal lenses. A Morning Brief needs to know what's coming up; a meeting-prep cell needs to know which meeting; a free-time lens needs to know when the user is open. Calendar is one of the most reliable data sources because its content is structured by design — events have start times, durations, attendees, locations, descriptions.

The integration is roughly half read, half write — many users want lenses that *create* calendar events (a "block focus time" cell, a "schedule from these emails" cell), not just read them.

### 4.2 The MCP server

Wovith uses Google's first-party Calendar MCP server (`calendarmcp.googleapis.com`) for v1. This is the same Google Workspace MCP family used by Drive and Gmail.

Wovith also supports the `google_workspace_mcp` open-source server as an alternative for users with custom deployment needs.

### 4.3 OAuth scopes

| Wovith tier | Google scopes |
|---|---|
| Read-only | `calendar.readonly` |
| Read and create | adds `calendar.events` (create new events, edit own events) |
| Full | `calendar` (full access including delete) |

The default is read-only. Read-and-create is the most common upgrade because event creation is a high-value cell capability. Full access is rare; most calendar destruction happens accidentally and the user prefers the friction of a separate scope.

### 4.4 Connection flow UX

The pre-OAuth disclosure for Calendar read-only:

> *Connecting Calendar will let me see your events, including recurring ones, attendees, and time blocks. I won't create or modify events unless you upgrade.*

For an upgrade to read-and-create:

> *This lens wants to create calendar events for you. I'll never create events autonomously — each one will ask for your confirmation before it's added. Editing existing events still needs a separate upgrade.*

### 4.5 How Calendar surfaces in lens cells

Typical cell expressions:

```
from calendar.events
where start is in next 6 hours
sort by start ascending
show as timeline
```

```
from calendar.events
where start is in next 7 days
  and attendees include "Maya"
show as list
```

```
from calendar.events
where i am attendee
  and i haven't responded yet
show as feed
```

```
from calendar.freebusy
where between 9am and 5pm
  and weekday is true
  and date is in next 14 days
show as timeline
```

The last is a free-busy lens — useful for finding open time blocks across multiple calendars.

### 4.6 Common Calendar lens patterns

- **Next 6 Hours lens**: events between now and now+6h, with conflict highlighting. Rendered as a timeline.
- **Day Ahead lens**: today's full schedule with a prep checklist. Rendered as a timeline with cells per event.
- **Meeting Prep lens**: today's meetings with VIP attendees, with agent-summarized prep notes. Rendered as cards.
- **Focus Time lens**: open time blocks in the coming week, suitable for deep work. Rendered as a calendar grid.
- **Decline-frequent lens**: events the user has declined in the last several weeks, surfaced for review. Rendered as a list.
- **No-response lens**: invitations the user hasn't responded to. Rendered as a feed with one-tap accept/decline.

### 4.7 Calendar-specific UX patterns

**The timeline renderer.** Calendar events are most naturally rendered as a timeline — a horizontal or vertical track with events as bars positioned by time. The timeline renderer (specified in the renderer doc) handles time-of-day, multi-day events, overlapping events, and all-day events.

**Event creation.** A cell that creates events surfaces a small inline form within the cell: title, start, duration, attendees, location. The agent can pre-fill from context (a "schedule from this email" cell uses email content to draft the event). Submission goes through the Tier 2 Intent Preview:

> *I'd like to add this event to your primary calendar.*
>
> *Title: 1:1 with Maya*
>
> *Tuesday May 26, 2:00 - 2:30pm*
>
> *Attendees: maya@example.com*
>
> *Location: Zoom*
>
> **[ Create event ]   [ Edit ]   [ Skip ]**

**Recurring events.** Cells handle recurring events with attention to the recurrence pattern. A "next instance of weekly meeting" cell needs to identify the next concrete occurrence, not just the recurring event definition. The DSL handles this automatically via the `next instance` modifier.

**Time zones.** All calendar operations are time-zone aware. Cells default to the user's primary time zone (detected from the device). Events with different time zones (a meeting scheduled in Pacific when the user is in Eastern) display the local time prominently with the source time zone in a subscript.

**Free/busy queries.** Calendar's free/busy API returns time blocks marked busy without disclosing event details — useful for cross-calendar lenses where the user wants to find open time without exposing what they're busy with. The DSL's `from calendar.freebusy` query uses this API.

### 4.8 Edge cases and quirks

**Multiple calendars.** Users often have multiple calendars within one Google account — primary, work, family, holidays, subscribed external calendars. Cells specify which calendar(s) to query by name or selection. The default is "all calendars I subscribe to" for read; "my primary calendar" for write.

**Workspace calendar policies.** Some Workspace organizations restrict calendar sharing, third-party access, or write operations. Wovith handles permission failures gracefully — if a write operation is denied by policy, the cell explains: *Can't create the event because your organization restricts third-party calendar writes. You can create it in Calendar directly.*

**External calendars (subscribed feeds).** Users sometimes subscribe to public calendars (holidays, sports schedules). These appear in queries but are read-only by definition. Wovith treats them as a separate calendar tier.

**Time zones during DST transitions.** Daylight Saving transitions occasionally produce ambiguous times. Wovith's time handling explicitly disambiguates per IANA TZ database rules and surfaces a small note when displaying events around transition boundaries.

**Conflicting events.** A cell showing the day's events should make conflicts visible. The timeline renderer overlaps conflicting events visually and shows a small "conflicts" badge. Calendar's native conflict resolution rules apply — Wovith doesn't try to resolve, just to surface.

### 4.9 Security considerations specific to Calendar

**Event descriptions as injection vectors.** Like email bodies, event descriptions can contain prompt injection content. The same mitigations apply: capability gating, content/instruction separation, action confirmation.

**Calendar-based exfiltration.** A specific concern: an attacker who can create events on a user's calendar (e.g., through a meeting invitation accepted casually) could potentially craft event details that influence agents. The defense is the same — agents process event details as data, not instructions.

**Public calendar visibility.** Users who have public calendars exposed should understand that Wovith's reads of their calendar are tied to their authenticated session, not the public view. The connection disclosure is explicit: *I'll read events visible to you — including private ones — when authorized.*

**Cross-organizational meeting attendance.** Events with external attendees may include details the user's organization considers confidential. Wovith does not specially detect or filter this; it's the user's responsibility to author lenses with appropriate scope.

---

## 5. The combined experience: lenses that span connectors

The most useful lenses combine multiple connectors. A few canonical examples and how they're handled.

### 5.1 The Morning Brief lens

```
lens "Morning Brief":
  cell "Next 6 Hours": from calendar.events where start in next 6 hours, show as timeline
  cell "Decisions Today": from gmail.threads where active and from in vip-contacts, show as feed
  cell "Working Documents": from drive.files where modified in last 48 hours, show as cards
  cell "Quick Capture": (empty, voice-enabled), show as text
```

Three connectors are touched. The lens requires Drive read-only, Gmail read-only, and Calendar read-only — all the defaults. No upgrades needed.

### 5.2 The Meeting Prep lens

```
lens "Meeting Prep":
  cell "Today's Meetings": from calendar.events where today and i attend, show as list
  cell "Their Recent Mail": for each meeting attendee, from gmail.messages where from is attendee and last 30 days, show as feed
  cell "Shared Documents": for each meeting, from drive.files where shared with attendees and recent, show as cards
```

Three connectors again. This lens cross-references — the calendar event provides the attendees, who feed the Gmail and Drive queries. The DSL handles the cross-reference declaratively.

### 5.3 The "Schedule from email" lens

```
lens "Schedule From Email":
  cell "Scheduling-shaped emails": from gmail.threads where contains "let's meet" or "available" or "schedule", show as feed
  cell "Draft events": for each scheduling thread, enrich with agent("draft a calendar event"), show as form
```

This lens requires Calendar read-and-create scope and Gmail read-only. The user is prompted to upgrade Calendar when accepting this lens. The agent drafts events but never creates them autonomously — each event creation goes through Intent Preview.

### 5.4 Cross-connector authentication state

Wovith handles the case where one connector in a multi-connector lens is unhealthy. If Gmail is expired but Drive and Calendar are fine, the Morning Brief lens still shows three of its four cells, with the Decisions Today cell showing:

> *Can't reach Gmail because the connection expired. [Reconnect Gmail]*

The lens degrades gracefully rather than failing entirely.

---

## 6. The connection settings panel

Pulling these patterns together: how does the Connections settings panel look?

The panel is a single scrollable list of connector cards. At the top, a search/filter field. Below, the cards grouped by:

- **Connected** (cards shown first, with health indicators)
- **Suggested for you** (connectors recommended by the mining algorithm based on what's on the device — see onboarding doc)
- **All connectors** (the full registry, paginated, with a search affordance)

Each connected card has its scope tier indicator (a small badge: *Read-only*, *Read & Draft*, *Full*), its lens-usage count, and quick-action buttons. Tapping a card opens a detail view with the per-connector activity log and granular settings (scope tier change, account email, etc.).

The panel uses the design system tokens directly — cards follow cell shell aesthetic, health indicators use the freshness palette colors mapped to connection states (green = healthy, amber = degraded/expired, red = revoked).

---

## 7. Adding more connectors

The connector vocabulary established with Drive, Gmail, and Calendar generalizes. When v2 adds Slack, GitHub, Notion, Linear, and others:

- Same scope-tier framing (read-only, read-and-write, full)
- Same OAuth handoff pattern
- Same pre-OAuth disclosure copy structure
- Same connection-card layout
- Same per-connector activity log
- Same Intent Preview pattern for writes

The connector-specific work is naming the scope tiers in language the user understands (a Notion "read-only" feels different from a Gmail "read-only") and identifying the specific cell patterns common to each.

When the lens garden ships in v3+, community-contributed connectors will follow the same vocabulary by enforcement — Wovith's connector framework expects these patterns, and a contributed connector that deviates is flagged in review.

---

## 8. What this document does not cover

A few areas that need separate specification:

- **Self-hosted MCP connectors.** Users running local MCP servers (e.g., a personal notes database via stdio MCP) need a separate connection flow without OAuth. v2 territory.
- **Workspace admin controls.** When Wovith is used inside a Google Workspace organization with admin policies, the admin's enforced scope restrictions need explicit UX. v2 territory.
- **Outlook / Microsoft 365.** The non-Google equivalent ecosystem. v1.5 priority — many users live in M365 rather than Workspace, and the patterns described here largely transfer.
- **The fourth and fifth connector specifics.** Slack and GitHub are the priority additions after the Google three. Their connection UX inherits the patterns here; their cell vocabulary needs separate documentation.

---

## 9. Cross-doc consistency check

Other Wovith design docs that touch connector concepts:

- The **onboarding** doc describes connector cards proposed during the first-run flow. The card structure described there is consistent with section 1.1 here.
- The **security** doc describes OAuth 2.1, scope enforcement, and the Intent Preview pattern. Sections 1.2 through 1.6 here align with that doc's specifications.
- The **DSL** doc specifies the cell expression syntax. The example expressions throughout this document use the DSL doc's canonical forms.
- The **voice and copy** doc specifies the language used. All copy snippets here are voice-doc compliant.
- The **design system** doc specifies visual tokens. The connector card aesthetic follows the cell shell pattern from there.

No conflicts identified. Where this doc adds new specifics (the scope-tier framing, the pre-OAuth disclosure pattern, the connection health indicator), those specifics are net new and intentional.

---

## References

- Google Workspace MCP Servers configuration (developers.google.com/workspace/guides/configure-mcp-servers)
- Google Drive API authentication (developers.google.com/workspace/drive/api/auth)
- Gmail API scopes (developers.google.com/workspace/gmail/api/auth)
- Google Calendar API scopes (developers.google.com/workspace/calendar/api/auth)
- taylorwilsdon/google_workspace_mcp (open-source alternative)
- Google MCP server (ngs/google-mcp-server)
- piotr-agier/google-drive-mcp
- MCP Specification 2025-11-25
- OAuth 2.1 Specification (IETF, 2025)
