# 08 — Onboarding and Calibration Contract

**Status:** Canonical  
**Purpose:** keep Wovith’s “inverse lens mining” ambition while making early onboarding trustworthy and buildable.

## 1. Core decision

Early Wovith should use **guided lens seeding**, not hidden local scanning or user-facing “mining.”

The original inverse lens mining idea remains valuable, but it moves to later stages as an explicit, opt-in discovery system.

## 2. User-facing language

Avoid:

- “mining your apps”;
- “scanning your computer”;
- “watching your behavior”;
- “we found patterns in your life” without context.

Use:

- “Suggest starter lenses”;
- “Discover useful views”;
- “Choose what Wovith can look at”;
- “Build a lens from your Calendar”;
- “Find follow-ups from Gmail metadata.”

## 3. Stage 0 onboarding

Goal: demonstrate the loop with synthetic data.

Flow:

1. Welcome.
2. Choose a demo context:
   - founder;
   - researcher;
   - manager;
   - freelancer.
3. Wovith creates a synthetic starter lens.
4. User edits a cell.
5. User opens “Why am I seeing this?”

No OAuth. No real scanning.

## 4. Stage 0.5 onboarding

Goal: connect one real source and create one useful lens.

Flow:

1. Ask what the user wants help seeing:
   - upcoming meetings;
   - documents needing review;
   - follow-ups;
   - stale work;
   - project pulse.
2. Recommend one connector.
3. Show exact data classes Wovith will read.
4. OAuth.
5. Suggest 2–3 cells.
6. Show DSL and permissions before creating.
7. Save first lens.

## 5. Stage 1 onboarding

Goal: first daily lens.

Flow:

1. Role/use-case selection.
2. Connector selection.
3. Permission explanation.
4. Candidate lens proposals.
5. User reviews each proposed cell:
   - summary;
   - DSL;
   - fields used;
   - AI usage;
   - permissions.
6. User accepts, edits, or rejects.
7. Wovith teaches calibration controls: pin, hide, mute, edit rule.

## 6. Candidate starter lenses by role

### Founder/operator

- Today lens.
- Investor/customer follow-ups.
- Project pulse.
- Stale docs.

### Manager

- Meeting prep.
- Follow-ups owed.
- Team/project pulse.
- Decisions waiting.

### Researcher/student

- Recent docs.
- Upcoming deadlines.
- Reading queue.
- Meeting/seminar prep.

### Freelancer/consultant

- Client follow-ups.
- Deliverables due.
- Recent docs by client.
- Invoice/admin reminders.

### Developer/product builder

- Project pulse.
- GitHub/Linear later.
- Recent docs/specs.
- Meetings needing prep.

## 7. What to ask in onboarding

Ask a small number of high-signal questions:

1. What do you want Wovith to help you see first?
2. Which source should Wovith use first?
3. Should Wovith read only metadata, or also content when needed?
4. Do you want AI summaries, or just structured views for now?

Do not ask users to design a full lens from scratch.

## 8. Calibration model

Calibration is explicit tuning of a lens.

Stage 0–1 actions:

- Pin item.
- Hide item.
- Mute source/sender/person/project.
- Edit rule.
- Change sort.
- Change limit.

Later actions:

- Prefer topic.
- Block topic.
- Increase/decrease source weight.
- Accept/reject generated lens proposals.
- Explain ranking.

## 9. Calibration principles

### 9.1 No surprise filtering

If calibration hides or ranks items, users should be able to inspect why.

### 9.2 Explicit signals beat implicit signals

A pin/hide/mute should matter more than dwell time or taps.

### 9.3 Calibration is local-first

Calibration should live in user-owned state and not be used to train external models by default.

### 9.4 Reversible

Users can undo muting/hiding and inspect calibration state.

### 9.5 Explainable

Example:

> Ranked lower because you hid three similar messages from this sender.

## 10. Calibration data model

```ts
type CalibrationSignal =
  | { kind: 'pin'; cellId: CellId; stableItemId: string; at: Timestamp }
  | { kind: 'hide'; cellId: CellId; stableItemId: string; at: Timestamp }
  | { kind: 'mute-source'; source: SourceIdentifier; at: Timestamp }
  | { kind: 'unmute-source'; source: SourceIdentifier; at: Timestamp }
  | { kind: 'prefer-topic'; topicId: string; at: Timestamp }
  | { kind: 'block-topic'; topicId: string; at: Timestamp }
  | { kind: 'edit-rule'; cellId: CellId; expressionHashBefore: string; expressionHashAfter: string; at: Timestamp };
```

## 11. Stable item IDs

A stable item ID should be deterministic where possible:

```txt
<sourceId>:<externalItemId>
```

Examples:

```txt
google.gmail.threads:thread_abc123
google.calendar.events:event_xyz789
google.drive.files:file_456
```

If the source lacks stable IDs, derive a hash from stable metadata and label confidence.

## 12. Later inverse lens discovery

The original inverse lens mining concept returns in Stage 2+ as **Lens Discovery**.

Allowed later sources if explicit and opt-in:

- connected app metadata;
- user-selected folders;
- Wovith captures;
- existing lens usage;
- explicit role/use-case answers;
- optionally browser extension capture if installed and permitted.

Not allowed by default:

- broad local app scanning;
- browser sign-in scraping;
- covert behavior tracking;
- reading files without user-selected folders;
- surprise content analysis.

## 13. Lens Discovery proposal object

```ts
type LensProposal = {
  id: string;
  title: string;
  reason: string;
  cells: ProposedCell[];
  dataAccess: DataAccessSummary[];
  aiUse: AiUseSummary[];
  confidence: number;
  canPreviewWithoutSaving: boolean;
};
```

Every proposal should answer:

- Why is Wovith suggesting this?
- What data will it read?
- What AI will it use?
- What will be saved?
- How can I reject it?

## 14. Blind-spot lens

The blind-spot/adversarial lens idea is interesting but risky. It can feel judgmental or creepy.

Earliest stage: Stage 2 as an opt-in power-user lens.

Safer framing:

- “What might I be missing?”
- “Stale work I may have forgotten.”
- “Follow-ups that may need attention.”

Avoid framing:

- “You are neglecting...”
- “Your blind spots are...”
- “Wovith knows what you missed.”

## 15. Onboarding metrics

Measure:

- time to first rendered cell;
- time to first accepted lens;
- percent of users who inspect DSL;
- percent of users who open “Why?”;
- percent who edit/hide/pin;
- next-day return rate;
- lens retained after 7 days;
- connector disconnect rate;
- permission refusal/drop-off.

Do not optimize only for speed. Trust comprehension matters.

## 16. Onboarding copy examples

### Permission explanation

> Wovith can build this lens from Calendar event titles, times, attendees, and descriptions. Descriptions may contain private notes. You can start with titles and times only.

### DSL preview

> Here is the rule Wovith will save. You can edit it later.

### AI summary disclosure

> This cell can use AI to summarize event descriptions. Source events are not changed.

### Rejection

> No problem. Wovith will not create this lens or save its proposed cells.

## 17. Stage acceptance criteria

### Stage 0

- Demo onboarding teaches lens/cell/why.
- User can create or edit one DSL cell.

### Stage 0.5

- User can connect one source and create one cell.
- Permission explanation appears before OAuth.
- Candidate cell preview includes DSL.

### Stage 1

- User can create a starter daily lens without knowing DSL.
- User can inspect and adjust it.
- Onboarding never performs hidden scanning.

## 18. Research cross-references

- Google API Limited Use / prominent user-facing feature requirement: R-GOOGLE-02, R-GOOGLE-05.
- Prompt injection and external content handling: R-LLMSEC-01, R-LLMSEC-02.
- Competitive onboarding pressure: R-COMP-01 through R-COMP-07.
