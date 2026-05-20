# Wovith Calibration State
### How cells learn from user signals, kept local, kept simple

---

## 0. About this document

This document specifies how Wovith's cells learn from the user's signals — dismisses, pins, mutes, explicit preferences — and use that learning to filter and rank what's shown. The onboarding/mining doc commits to cells getting smarter over time as the user calibrates them; this is the underlying state model.

Two principles govern the design:

1. **Local-only by default.** The calibration state never leaves the device. Privacy is preserved by the absence of data flow, not by elaborate anonymization or federation. The whole class of "what should we collect for personalization" questions becomes moot.

2. **Simple at v1, room to grow.** Sophisticated recommender systems use embeddings, contextual bandits, federated learning. All of that is overkill for the cell calibration problem in 2026. A counter-and-flag model gets 80% of the value with 1% of the complexity. Sophistication is a v2+ direction if and when it's needed.

The calibration data structure was specified in the data architecture doc (section 2.6) as `CalibrationDoc`. This doc specifies how that state is *used* — the algorithms that read it and apply it to cell evaluations.

---

## 1. The signals Wovith captures

Three classes of signal, with different weight:

### 1.1 Explicit signals (high weight)

The user performs a deliberate action whose purpose is to teach the cell:

- **Dismiss this item** — "less like this in this cell"
- **Pin this item** — "more like this; keep this visible"
- **Mute this source** — "stop showing me anything from this person/topic"
- **Mark as VIP** — "always show me messages from this person"
- **Block this topic** — "don't surface this topic for me"

These signals are unambiguous. They're recorded with full weight.

### 1.2 Implicit signals (medium weight)

The user's behavior reveals preference even without deliberate intent:

- **Tap-through** — the user opened the source artifact (read the email, opened the file). Implicit positive signal.
- **Scroll-past without interaction** — neutral; recorded as exposure-without-engagement.
- **Long dwell** — the user lingered on this item. Implicit positive.
- **Quick dismiss without interaction** — the cell value was on screen briefly and the user moved away. Implicit negative (mild).

Implicit signals are noisy. Research consistently shows implicit feedback has high false-positive rates (a user might dismiss because they were busy, not because they disliked the item). Wovith weighs them at ~25% of explicit signals.

### 1.3 Ambient signals (low weight)

The user's context shifts in ways that suggest changes:

- **Time-of-day patterns** — items the user engages with at 7 AM differ from items at 7 PM.
- **Recency** — items getting attention this week vs months ago.
- **Connection drift** — sources the user used to use but no longer does.

These signals are weighted lowest because they're inferential. They're used for ranking ties, not for filtering decisions.

---

## 2. The calibration state model

From the data architecture doc:

```typescript
type CalibrationDoc = {
  perCell: {
    [cellId: string]: {
      dismissedItemIds: string[]
      pinnedItemIds: string[]
      lastCalibratedAt: number
    }
  }
  perSource: {
    [sourceId: string]: {
      preferredCount: number
      dispreferredCount: number
      muted: boolean
    }
  }
  topics: {
    [topicId: string]: {
      preferred: boolean
      lastSignal: number
    }
  }
  schemaVersion: number
}
```

At v1, this is the entire calibration model. Counters and flags. No matrices, no embeddings, no learned parameters.

### 2.1 Why counters and not learned models

The argument against immediate sophistication:

- **Sparse data.** A user has tens-to-hundreds of signals, not millions. ML models trained on small data tend to overfit. Simple heuristics generalize better.
- **Cold start.** A new user has zero signals. A model needs bootstrapping; counters work fine at zero (just no signal to apply).
- **Interpretability.** "I'm hiding this source because you dismissed it 5 times" is explainable. "I'm hiding this source because the latent factor model decided so" isn't.
- **Compute cost.** Running ML inference per cell evaluation, on-device, costs cycles. Counters cost nothing.
- **Local-first compatibility.** Federated learning, the privacy-preserving way to train models across users without centralizing data, is complex and still actively researched. Counters need none of it.

The simple model is enough until evidence shows it's not.

### 2.2 What v2+ might add

When the evidence appears, the upgrade path:

- **Per-cell weight learning**: instead of all dismisses being equally weighted, learn which dismiss patterns predict future dismisses
- **Embedding-based similarity**: "items like the ones you've dismissed" rather than "items literally dismissed"
- **Contextual bandits**: when there's uncertainty (this source is new), explore vs exploit
- **Cross-cell transfer**: dismissing items in cell A informs cell B's filtering

All of these can be added without breaking the v1 counter model — they augment, not replace.

---

## 3. The algorithms

### 3.1 Filtering: should this item be shown?

When a cell's evaluation produces a candidate set of items, the filter pass removes:

```typescript
function shouldShowItem(item: Item, cell: Cell, calib: CalibrationDoc): boolean {
  const cellCalib = calib.perCell[cell.id]
  
  // Was this specific item dismissed in this cell? Hide.
  if (cellCalib?.dismissedItemIds.includes(item.stableId)) {
    return false
  }
  
  // Is this item's source muted? Hide.
  const sourceId = item.sourceIdentifier  // e.g., 'gmail-sender:alice@example.com'
  const sourceCalib = calib.perSource[sourceId]
  if (sourceCalib?.muted) {
    return false
  }
  
  // Is this item's topic blocked? Hide.
  for (const topic of item.topics ?? []) {
    if (calib.topics[topic]?.preferred === false) {
      return false
    }
  }
  
  // Otherwise, show.
  return true
}
```

This runs in the cell runtime's transform clause evaluation. Filtering happens after the source fetch and before sorting, so the ranking step sees only the kept items.

### 3.2 Ranking: how should items be ordered?

Default ranking is whatever the cell's DSL specifies (`sort by date desc`, `sort by score`, etc.). Calibration *adjusts* this by adding a small bias to the sort score:

```typescript
function rankAdjustment(item: Item, calib: CalibrationDoc): number {
  let bias = 0
  
  const sourceCalib = calib.perSource[item.sourceIdentifier]
  if (sourceCalib) {
    // Preferred sources get bumped up; dispreferred get pushed down
    const net = sourceCalib.preferredCount - sourceCalib.dispreferredCount
    bias += Math.sign(net) * Math.log(Math.abs(net) + 1) * 0.1
  }
  
  // Topic preferences contribute similarly
  for (const topic of item.topics ?? []) {
    if (calib.topics[topic]?.preferred === true) {
      bias += 0.05
    }
  }
  
  // Pinned items get a strong bump
  const cellCalib = calib.perCell[item.cellId]
  if (cellCalib?.pinnedItemIds.includes(item.stableId)) {
    bias += 1.0
  }
  
  return bias
}
```

The bias is small enough that it doesn't override the explicit sort order — a "sort by date desc" cell still primarily sorts by date — but ties are broken in favor of preferred sources.

For cells without an explicit sort (`show as cards` with no `sort by` clause), the bias has more weight because there's no primary signal to be subordinate to.

### 3.3 Recording signals

When the user performs an action, the runtime updates the calibration doc:

```typescript
async function recordDismiss(item: Item, cell: Cell) {
  await updateCalibrationDoc((doc) => {
    // Per-cell record
    const cellCalib = doc.perCell[cell.id] ?? {
      dismissedItemIds: [],
      pinnedItemIds: [],
      lastCalibratedAt: 0,
    }
    if (!cellCalib.dismissedItemIds.includes(item.stableId)) {
      cellCalib.dismissedItemIds.push(item.stableId)
    }
    cellCalib.lastCalibratedAt = Date.now()
    doc.perCell[cell.id] = cellCalib
    
    // Per-source record
    const sourceId = item.sourceIdentifier
    const sourceCalib = doc.perSource[sourceId] ?? {
      preferredCount: 0,
      dispreferredCount: 0,
      muted: false,
    }
    sourceCalib.dispreferredCount += 1
    doc.perSource[sourceId] = sourceCalib
  })
  
  // Trigger re-evaluation of affected cells
  runtime.invalidateCalibration(cell.id)
}
```

The update is wrapped in the Automerge change function — it's a CRDT change. If the user dismisses on two devices concurrently, both signals are merged (deduplicated for itemIds, summed for counters via Automerge Counter).

### 3.4 Decay: signals get older

Signals from 6 months ago shouldn't weigh as heavily as signals from yesterday. Without an explicit decay mechanism, the counter model would grow unboundedly and lose responsiveness to recent preferences.

Decay is applied as a periodic background task (once per week):

```typescript
async function applyDecay() {
  const halfLifeMs = 90 * 24 * 60 * 60 * 1000  // 90 days
  const now = Date.now()
  
  await updateCalibrationDoc((doc) => {
    for (const [sourceId, calib] of Object.entries(doc.perSource)) {
      if (!calib.muted) {
        const age = now - (calib.lastSignal ?? now)
        const decayFactor = Math.pow(0.5, age / halfLifeMs)
        // Round down; counters can't be fractional in the persisted state
        calib.preferredCount = Math.floor(calib.preferredCount * decayFactor)
        calib.dispreferredCount = Math.floor(calib.dispreferredCount * decayFactor)
      }
    }
  })
}
```

90-day half-life means a signal from 90 days ago contributes half as much as a signal from today; from 180 days ago, a quarter; from a year ago, ~6%. This matches normal preference drift.

Muted sources don't decay — a mute is an explicit, sticky preference.

---

## 4. Stable item identification

For the filter to work, each item must have a stable ID across cell re-evaluations. An email thread's ID is stable (Gmail's thread ID); a file's ID is stable (Drive's file ID); a calendar event's ID is stable (Calendar's event ID).

For items that don't have natural stable IDs (a generated agent insight, a derived statistic), the stable ID is computed:

```typescript
function computeStableId(item: any): string {
  return sha256(JSON.stringify({
    sourceType: item.sourceType,
    primaryFields: pickPrimaryFields(item),  // depends on the item's type
  }))
}
```

For example, a "blind spot" detected by the mining engine ("you haven't followed up with Alice in 2 weeks") gets a stable ID derived from `{type: 'follow-up-needed', subject: 'alice@example.com'}` so the same blind spot a week later (still no follow-up) gets the same ID — and a previous dismiss persists.

---

## 5. Source identification

The `sourceIdentifier` for an item is a structured string that the calibration system can match. The format:

```
<connector>:<aspect>:<identifier>
```

Examples:

- `gmail:sender:alice@example.com` — a Gmail sender
- `gmail:label:work` — a Gmail label
- `drive:owner:bob@example.com` — a Drive file owner
- `calendar:organizer:alice@example.com` — a calendar event organizer
- `web:domain:nytimes.com` — a web source

Multiple identifiers per item:

- An email thread has `gmail:sender:X` for each participant, `gmail:label:Y` for each label
- A meeting has `calendar:organizer:X` and `calendar:attendee:Y1, Y2, ...`

The calibration system records signals against each applicable source identifier. Muting `gmail:sender:newsletter@example.com` mutes all messages from that sender, regardless of which cell they appear in.

This structure lets the user reason about their calibration: "I muted the newsletter sender" is concrete and reversible. They can view their muted list in settings and unmute.

---

## 6. Topic detection

Topics are higher-level than sources — "all messages about Q4 planning" is a topic, regardless of who sent them.

At v1, topics come from explicit user labeling:

- The user marks a thread as "Q4 planning" → that topic now exists
- All future threads matching similar content might be tagged with the same topic (via a Haiku call, opt-in)

At v2+, topics can be auto-detected via embedding clustering. The user sees the cluster, names it (or accepts a suggested name), and the topic is created.

The calibration model already supports topics in the data structure. The detection mechanism is layered on top.

---

## 7. The user-visible calibration surface

### 7.1 Per-cell settings

From within a cell, the user can:

- See dismissed items (and un-dismiss them)
- See pinned items (and un-pin them)
- See "items hidden because of source/topic mutes" (and unmute)

### 7.2 Global calibration view

In Settings → Calibration, the user sees:

- All muted sources (`gmail:sender:newsletter@example.com`, etc.) — unmutable
- All preferred sources — adjustable
- All blocked topics — adjustable
- A "reset all calibration" affordance for users who want to start fresh

This is the user's window into what Wovith has learned. Transparency is the whole point — the user can see and modify everything.

### 7.3 No surprise filtering

Wovith never silently filters items in a way the user can't see. The calibration view always shows what's been hidden and why. If a cell would have shown 50 items but 12 are filtered by calibration, a small affordance shows "12 hidden by your preferences" with a tap to reveal.

---

## 8. Calibration as a feedback loop

The mining algorithm proposes lenses based on patterns it detected. Once the user is using those lenses, calibration kicks in:

- Dismisses in a mined lens flow back into the calibration doc
- Future mining runs can use the calibration state to avoid re-proposing things the user already dismissed
- A lens whose items are mostly dismissed over a week is flagged: "you're dismissing a lot in this lens. Want to tweak it?"

This is how cells get smarter over time. Not through a learned model, but through the user's deliberate calibrations accumulating and being respected.

---

## 9. Anti-patterns avoided

A few patterns Wovith deliberately doesn't do:

- **Engagement maximization.** Wovith's calibration goal is "show the user what they want," not "maximize the user's time in the app." No reward function on dwell time.
- **Implicit topic profiling beyond what the user can see.** Wovith doesn't build a hidden interest profile that affects future cells without the user's awareness.
- **Cross-user learning.** Wovith doesn't aggregate signals across users to improve any single user's calibration. Each user's model is theirs alone.
- **Server-side reranking.** Items aren't sent to a server to be reranked. All ranking happens locally.

---

## 10. Specific edge cases

### 10.1 The user changes their mind

Calibration is not permanent. The user can unmute a source, un-dismiss an item, or reset all calibration. The interface explicitly affords these reversals.

### 10.2 Calibration across multiple devices

Calibration is in the Automerge document, so it syncs. A dismiss on the phone applies to the laptop within seconds (after sync).

### 10.3 Calibration during onboarding

A new user has no calibration. The first cells they see are unfiltered. After 1-2 weeks of use, calibration starts having a noticeable effect.

### 10.4 Shared lenses

A lens shared from User A to User B doesn't carry A's calibration. B's lens starts with empty calibration and accumulates B's signals. (This is the privacy-correct choice and also the practically correct one — A and B have different preferences.)

### 10.5 The "everything is dismissed" failure mode

If a user dismisses everything in a cell, the cell shows empty. The renderer detects this and shows a helpful message: *"Everything in this cell is filtered by your preferences. Want to reset calibration for this cell?"*

---

## 11. Performance

| Operation | Target |
|---|---|
| Filter pass over 100 items | < 5ms |
| Rank adjustment for 100 items | < 5ms |
| Recording a dismiss | < 20ms (writes to Automerge) |
| Reading calibration doc | < 2ms (in memory) |
| Weekly decay pass | < 500ms |

Calibration doc size for a power user: < 100 KB (well within the document size targets in the data architecture doc).

---

## 12. Cross-doc consistency

- **Onboarding/mining doc**: dismisses in mined lenses flow back here. Mining uses calibration to avoid re-proposing.
- **Cell runtime**: filter and rank are runtime transform clauses. Calibration is an input.
- **Data architecture**: calibration doc is one of the Automerge documents per user. Syncs.
- **Voice**: user-facing copy in the calibration view follows voice-doc rules.
- **Security**: never leaves the device by default; even with sync, only this user's devices see it.
- **GTM**: not tier-gated; all tiers get calibration.

No conflicts.

---

## References

- *Personalized Denoising Implicit Feedback for Robust Recommender System* (WWW 2025) — for the noise in implicit signals
- *Beyond Explicit and Implicit: How Users Provide Feedback to Shape Personalized Recommendation Content* (CHI 2025) — for the user's mental model of feedback
- *Bayesian Local Differential Privacy for Implicit Feedback Recommendation* (2025) — for the privacy-preserving alternative (which Wovith chooses to avoid by being local-only)
- W3C PROV (for stable identifiers, indirectly)
- *Stronger Privacy for Federated Collaborative Filtering* (RecSys 2021)
