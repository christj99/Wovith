# 17 — Improvements and Enhancements Backlog

**Status:** Living staged backlog  
**Date:** 2026-05-20  
**Purpose:** collect improvements that can make Wovith more novel, efficient, trustworthy, delightful, and durable over time.

This backlog is intentionally broad. Items are staged so the project can preserve ambition without overwhelming the first build.

## 1. Novelty-enhancing improvements

### 1.1 Make “Why am I seeing this?” a universal affordance

**Stage:** 0  
**Impact:** Very high  
**Reason:** This turns provenance from backend metadata into the product’s signature interaction.

Every item, summary, count, and recommendation should eventually support:

- why included
- why ranked here
- what source it came from
- what rule matched
- whether AI touched it
- what changed
- how to adjust it

### 1.2 Add “What changed since last time?”

**Stage:** 1.5–2  
**Impact:** High

Users often do not need full time travel. They need diffs.

Examples:

- “3 new unread messages matched this lens.”
- “This doc became stale because it has not changed in 14 days.”
- “This meeting moved from tomorrow to Friday.”

This is more useful and cheaper than complete historical replay.

### 1.3 Add lens calibration chips

**Stage:** 1  
**Impact:** High

Every item should expose quick calibration:

- pin
- hide
- mute source
- mute sender/person
- mark useful
- mark noisy
- explain more like this
- never show this rule again

Calibration should be inspectable, not hidden personalization.

### 1.4 Add a lens “nutrition label”

**Stage:** 1–1.5  
**Impact:** High

Each lens should show:

- sources read
- fields read
- AI used or not
- estimated cost
- refresh frequency
- snapshot retention
- permissions required
- last evaluation
- actions enabled

This would differentiate Wovith from opaque AI tools.

### 1.5 Lens confidence and ambiguity states

**Stage:** 1.5–2  
**Impact:** Medium-high

Cells should show confidence not as fake probability, but as operational clarity:

- deterministic rule
- AI-classified
- missing source
- stale source
- ambiguous schema
- partial results
- permission-blocked

### 1.6 Lens overlay/diff

**Stage:** 3  
**Impact:** High, later

Compare two lenses:

- Workday Lens vs Founder Lens
- This week vs last week
- My view vs shared team view
- Strict filter vs broad filter

Prerequisite: stable provenance/evidence snapshots.

### 1.7 Personal data map

**Stage:** 2–3  
**Impact:** High

A map of what Wovith knows and reads:

- connected sources
- active cells
- data fields used
- stale permissions
- unused connectors
- high-risk cells

This helps trust and admin UX.

### 1.8 Lens recipes

**Stage:** 2  
**Impact:** Medium-high

Recipes are not marketplace assets yet; they are explainable templates:

```text
Meeting Prep Lens = upcoming meetings + related docs + last thread + open tasks
```

Recipes should include required permissions and expected data shapes.

### 1.9 Lens review mode

**Stage:** 2  
**Impact:** Medium

A periodic review screen:

- noisy cells
- unused lenses
- expensive cells
- stale connectors
- actions awaiting approval
- permissions that can be reduced

This supports long-term product health.

## 2. Efficiency improvements

### 2.1 Query pushdown planner

**Stage:** 0.5–1.5  
**Impact:** High

The runtime should push filters/sorts/limits into connectors where safe.

Example:

```text
where received_at after days_ago(7)
take 20
```

should not fetch a full mailbox if the connector supports date queries.

### 2.2 Incremental evaluation

**Stage:** 1.5–2  
**Impact:** High

Cells should reevaluate only what changed when possible.

Inputs:

- source cursors
- item hashes
- predicate fingerprints
- previous output hash

### 2.3 Shared subqueries

**Stage:** 2  
**Impact:** Medium-high

If several cells use the same source slice, share the fetch.

Example:

- unread emails
- unread emails with attachments
- unread emails from VIPs

### 2.4 Renderer virtualization

**Stage:** 1–2  
**Impact:** Medium

List/table/feed renderers should virtualize long results to avoid sluggish dashboards.

### 2.5 Budget-aware scheduling

**Stage:** 1.5–2  
**Impact:** High

The scheduler should consider:

- user priority
- visible cells
- stale cells
- connector rate limits
- model budget
- source cost
- refresh recency

### 2.6 Offline-first edits

**Stage:** 1.5  
**Impact:** Medium-high

Lens edits, calibration, and captures should work offline. Connector refresh waits until online.

### 2.7 Structured-output caching

**Stage:** 1.5–2  
**Impact:** Medium

For AI classifications/summaries, cache by:

- prompt version
- model version
- input hash
- schema version
- policy version

### 2.8 Progressive hydration

**Stage:** 1–2  
**Impact:** Medium

Load lens shell and recent cached results first, then refresh live data. This makes Wovith feel fast without pretending data is fresh.

## 3. Trust and safety improvements

### 3.1 Taint labels in developer/debug mode

**Stage:** 0–1  
**Impact:** High

Display whether a value came from:

- user-authored rule
- Wovith system
- connector metadata
- external content
- agent output

### 3.2 Prompt-injection quarantine

**Stage:** 1–2  
**Impact:** High

If external content contains suspicious instructions, the system should:

- flag it in debug/evidence view
- continue treating it as data
- avoid action generation from it
- optionally warn user when a summary may be compromised

### 3.3 Permission minimization suggestions

**Stage:** 1.5–2  
**Impact:** High

Wovith should proactively say:

- “This lens only needs Gmail metadata, not message body.”
- “This connector has not been used in 30 days.”
- “This cell can run with a narrower Drive scope.”

### 3.4 Action dry-run

**Stage:** 2  
**Impact:** High

Before any external write:

- show target
- show exact payload
- show source of instruction
- show undo/compensation status
- require approval according to risk tier

### 3.5 Consent ledger

**Stage:** 2–3  
**Impact:** Medium-high

A user-readable ledger of permissions and action approvals:

- when granted
- why needed
- which lens/cell uses it
- last used
- revoke button

### 3.6 Tool reputation model

**Stage:** 3–4  
**Impact:** Medium

For marketplace/MCP ecosystem:

- trusted first-party
- reviewed partner
- user-added untrusted
- blocked

Tool descriptions should not be treated as trusted facts by default.

### 3.7 Red-team import format

**Stage:** 1  
**Impact:** Medium

Make it easy to add adversarial emails/docs/events as test fixtures.

## 4. UX improvements

### 4.1 Natural-language rule preview

**Stage:** 1  
**Impact:** High

Every DSL cell should have an English explanation:

```text
Show unread messages from the last 7 days, newest first, limited to 20.
```

### 4.2 Inline rule editing

**Stage:** 1.5–2  
**Impact:** Medium

Let users edit common parts without seeing DSL:

- source
- date range
- sender/person
- unread/complete status
- sort
- limit

### 4.3 Lens setup wizard with explicit data access

**Stage:** 1  
**Impact:** High

Do not ask for broad source access before explaining what the starter lens will read.

### 4.4 Empty-state intelligence

**Stage:** 1  
**Impact:** Medium-high

When a cell has no results, explain why:

- no data matched
- source disconnected
- permission missing
- rule impossible
- data stale

### 4.5 Cell health badges

**Stage:** 0–1  
**Impact:** Medium

Badges:

- fresh
- stale
- blocked
- expensive
- AI-used
- read-only
- action-enabled

### 4.6 Lens command palette

**Stage:** 2  
**Impact:** Medium

Power-user navigation:

- create cell
- inspect source
- show audit
- refresh lens
- copy DSL
- export lens

### 4.7 “Explain this lens to me” mode

**Stage:** 1.5  
**Impact:** Medium

A lens-level explanation:

- what it is for
- what data it reads
- why cells exist
- how to adjust it

### 4.8 Compact daily mode

**Stage:** 1.5–2  
**Impact:** Medium

A simplified reading mode for users who do not want the editor visible every day.

## 5. DSL/runtime improvements

### 5.1 Field capability hints

**Stage:** 0.5  
**Impact:** High

Each source field should advertise:

- filterable
- sortable
- searchable
- summarizable
- sensitive
- expensive
- external-content

### 5.2 Explainable query plan

**Stage:** 1.5  
**Impact:** Medium-high

Show how a cell will run:

- filters pushed to source
- filters applied locally
- AI enrichment steps
- cache usage
- estimated cost

### 5.3 Type-driven renderer suggestions

**Stage:** 1  
**Impact:** Medium

Suggest renderers based on result shape:

- event list → timeline
- scalar → count/text
- object list → list/table
- geo fields → map later

### 5.4 Lens linter

**Stage:** 1.5–2  
**Impact:** Medium

Detect:

- duplicate cells
- broad expensive queries
- impossible rules
- unused permissions
- stale source references
- unbounded AI enrichment

### 5.5 Safe import/export

**Stage:** 2  
**Impact:** Medium

Export lens definitions without tokens or private source data by default.

## 6. Connector improvements

### 6.1 Connector dry-run mode

**Stage:** 0.5–1  
**Impact:** Medium

Before connecting, show what fields a starter lens wants.

### 6.2 Connector health page

**Stage:** 1  
**Impact:** High

Show:

- connected status
- last refresh
- failed cells
- permissions granted
- scopes no longer used
- revoke/reconnect

### 6.3 Data minimization by cell

**Stage:** 1.5–2  
**Impact:** High

A lens should ask for message body only when a cell genuinely needs body text.

### 6.4 Source adapters with capability negotiation

**Stage:** 0.5–1  
**Impact:** High

Each connector reports:

- supports date filter
- supports text search
- supports labels
- supports pagination
- supports delta sync
- supports writes
- supports draft-only

### 6.5 Connector simulator

**Stage:** 0–1  
**Impact:** Medium-high

Keep synthetic connectors around for testing, demos, and onboarding without OAuth.

## 7. Mobile improvements

### 7.1 Mobile “wearing” mode

**Stage:** 1.5  
**Impact:** Medium-high

Mobile should first support consuming lenses:

- open daily lens
- refresh
- inspect Why
- pin/hide
- quick capture

### 7.2 Share-sheet capture

**Stage:** 2  
**Impact:** Medium-high

Capture email links, URLs, docs, snippets into Wovith without immediately needing full automation.

### 7.3 Notification summaries with provenance

**Stage:** 2–3  
**Impact:** Medium

Notifications should say why they fired and link to the cell/rule.

### 7.4 Widgets

**Stage:** 3  
**Impact:** Medium

Only after cells are stable and cheap to refresh.

## 8. Team/Trust improvements

### 8.1 Trust mode

**Stage:** 3  
**Impact:** High

Possible features:

- E2E sync
- local-only snapshots
- admin policy
- connector allowlist
- audit export
- stricter retention

### 8.2 Team lenses

**Stage:** 3  
**Impact:** Medium-high

Shared lens definitions without sharing private source tokens/data by default.

### 8.3 Policy-bound actions

**Stage:** 3  
**Impact:** High

Admins/users can define:

- no send without approval
- no delete ever
- draft only
- allowlist recipients/domains
- max budget per day

### 8.4 Lens review and approval workflow

**Stage:** 3–4  
**Impact:** Medium

For marketplace/team lenses:

- security review
- source requirements
- permission label
- test coverage
- version history

## 9. Marketplace/ecosystem improvements

### 9.1 Lens manifest format

**Stage:** 3  
**Impact:** High

A lens should be shareable as a manifest with:

- source requirements
- cell ASTs
- renderers
- permission requirements
- snapshot policy
- no secrets

### 9.2 Renderer SDK

**Stage:** 4  
**Impact:** Medium-high

Only after built-in renderer contracts are stable.

### 9.3 MCP server policy sandbox

**Stage:** 4  
**Impact:** High

Arbitrary MCP support should have:

- identity
- permission classification
- tool allowlists
- action previews
- audit
- taint boundaries
- untrusted tool-description handling

### 9.4 Lens marketplace trust labels

**Stage:** 3–4  
**Impact:** Medium

Labels:

- no AI
- uses AI
- read-only
- action-enabled
- reviewed
- community
- requires body content
- stores snapshots

## 10. Metrics improvements

### 10.1 Useful lens metric

**Stage:** 1  
**Impact:** High

Define “useful lens” as a user returning to a lens and taking a meaningful action:

- opened on two separate days
- pinned/hid item
- edited rule
- clicked Why
- used captured insight

### 10.2 Trust metric

**Stage:** 1  
**Impact:** Medium-high

Measure:

- permission abandonment
- Why panel opens
- revocations
- “this is wrong” feedback
- calibration actions

### 10.3 Cost/value metric

**Stage:** 1.5–2  
**Impact:** High

For each cell:

- refresh cost
- model cost
- connector call count
- user opens
- user actions

Suggest disabling expensive unused cells.

## 11. Highest-priority backlog items

The top 15 improvements to prioritize across early stages:

1. Universal Why panel.
2. AST-first DSL serializer/parser.
3. Source schema registry.
4. Evidence snapshots.
5. Field-level permission disclosure.
6. Taint model.
7. Starter lens packs.
8. Lens nutrition label.
9. Connector health page.
10. Calibration chips.
11. Prompt-injection red-team corpus.
12. Query pushdown planner.
13. Natural-language rule preview.
14. Empty-state explanations.
15. Budget-aware scheduling.

## 12. Backlog principle

An improvement belongs in Wovith if it makes the product more:

- inspectable
- useful every day
- privacy-honest
- source-aware
- user-controlled
- efficient
- composable
- trustworthy

An improvement should be deferred or rejected if it makes Wovith more:

- opaque
- magical in an uninspectable way
- permission-hungry
- expensive without clear value
- dependent on unstable APIs
- action-capable before trust is mature
