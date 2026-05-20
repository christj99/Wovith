# 07 — Provenance and Snapshot Contract

**Status:** Canonical  
**Purpose:** make provenance useful to users and technically honest about history/time travel.

## 1. Core decision

Wovith should not promise full time travel unless it stores enough evidence or snapshots to reconstruct past outputs.

Default v1 promise:

> Wovith preserves your lens definitions and records lightweight evidence for recent cell evaluations. It does not archive full external source history unless you explicitly enable snapshots.

## 2. Four things that must not be confused

### 2.1 Lens definition

The saved cell expression, layout, renderer, and settings.

### 2.2 Source data

External data in Gmail, Drive, Calendar, Slack, etc. This may change or disappear outside Wovith.

### 2.3 Evaluation result

The cell output computed at a point in time.

### 2.4 Provenance evidence

The explanation trail: source IDs, matched fields, predicates, timestamps, hashes, and redacted previews.

If these are conflated, Wovith will overpromise.

## 3. Signature user interaction

Every visible item should support:

> **Why am I seeing this?**

The answer should be layered:

1. Plain-language reason.
2. Rule trace.
3. Evidence details.
4. Raw provenance/debug view.

## 4. Plain-language explanation

Example:

> Included because this thread is unread, was received within the last 7 days, and matched your “Project Atlas” lens rule.

This layer should be readable without knowing the DSL.

## 5. Rule trace

Example:

```txt
google.gmail.threads
  → where unread is true
  → where received_at after days_ago(7)
  → sort by received_at desc
  → take 20
  → show as list
```

## 6. Evidence details

Example:

```txt
Source: Personal Gmail
Item ID: gmail-thread:abc123
Matched predicates:
  - unread is true
  - received_at after 2026-05-13T00:00:00-04:00
Source timestamp: 2026-05-19T14:22:00-04:00
Evidence recorded: 2026-05-20T09:15:00-04:00
Content preview: redacted / not stored
```

## 7. Snapshot tiers

| Tier | Stored | Default? | Good for | Privacy/storage cost |
|---|---|---:|---|---|
| None | Current output only | No, except debug | Maximum privacy | Low utility for history |
| Evidence | IDs, hashes, timestamps, matched predicates, source cursor, redacted preview | Yes for real sources | Explainability and debugging | Low/medium |
| Summary | Evidence plus user-approved summary of output | Optional | Time travel without full content | Medium |
| Full output | Complete output payload | Off by default | Local archive / Trust mode | High |

Stage 0 can store full fixture evidence because data is synthetic. Stage 0.5+ should default to evidence tier.

## 8. CellEvaluationSnapshot

```ts
type CellEvaluationSnapshot = {
  id: string;
  cellId: CellId;
  lensId: LensId;
  evaluatedAt: Timestamp;
  expressionHash: string;
  sourceCursors: Record<string, string | null>;
  inputEvidenceIds: string[];
  outputHash: string;
  outputKind: CellValue['kind'];
  outputCount: number | null;
  outputSummary: string | null;
  storageTier: 'none' | 'evidence' | 'summary' | 'full-output';
  cacheHit: boolean;
  durationMs: number;
};
```

## 9. ProvenanceEvidence

```ts
type ProvenanceEvidence = {
  id: string;
  snapshotId: string;
  sourceId: string;
  connectionId: ConnectionId | null;
  externalItemId: string;
  stableItemId: string;
  matchedPredicates: string[];
  sourceTimestamp: Timestamp | null;
  observedAt: Timestamp;
  contentHash: string | null;
  redactedPreview: string | null;
  fieldEvidence: FieldEvidence[];
  trustLevel: TrustLevel;
};
```

## 10. FieldEvidence

```ts
type FieldEvidence = {
  field: string;
  valueHash: string | null;
  valuePreview: string | number | boolean | null;
  sensitivity: 'public' | 'metadata' | 'private' | 'secret';
  stored: boolean;
};
```

Do not store previews for sensitive fields unless the user has enabled that storage tier.

## 11. Provenance storage

Stage 0:

- local store;
- fixture evidence can be verbose.

Stage 0.5:

- local-only evidence;
- no syncing;
- clear cache/delete source evidence.

Stage 1:

- local evidence;
- optional summary tier for non-sensitive records;
- audit separate from evidence.

Stage 1.5:

- if sync exists, evidence sync must be a separate user choice;
- evidence may contain sensitive metadata.

Stage 3:

- Trust tier can support encrypted evidence/snapshots.

## 12. Time travel wording

Allowed:

> Wovith can show how your lens definition changed over time.

Allowed if evidence exists:

> Wovith can explain why this item appeared in a recent evaluation using stored evidence.

Allowed if summary/full snapshots enabled:

> Wovith can show previous cell outputs using saved snapshots.

Disallowed unless implemented:

> Wovith can fully time-travel your Gmail/Drive/Calendar history.

## 13. Provenance and calibration

Calibration actions should be recorded as evidence too:

- user pinned item;
- user hid item;
- user muted sender/source;
- user changed rule;
- user accepted generated DSL.

This lets Wovith explain:

> Hidden because you muted this sender on May 12.

or:

> Ranked higher because you pinned similar project updates.

## 14. Provenance and AI enrichment

If AI touched a result, show it.

Example:

> The summary was generated by an AI model from the title and description fields. The source event itself was not changed.

Evidence should include:

- model/provider;
- prompt fingerprint;
- fields sent;
- output hash;
- budget units;
- cache hit;
- whether output was user-edited.

Do not expose full prompts with sensitive content by default.

## 15. Provenance and actions

If an action is proposed or executed, provenance links to the Action Manifest.

Example:

> Draft created from thread abc123 after you confirmed the action.

For actions, evidence should include:

- action manifest ID;
- user confirmation status;
- exact target;
- write summary;
- irreversible flag;
- undo/compensation plan.

## 16. Raw graph view

The original provenance graph idea is valuable but should be a power-user/debug/compliance view, not the default.

Stage 0–1 default:

- plain explanation;
- rule trace;
- evidence list.

Stage 3+:

- full graph visualization;
- export to W3C PROV-like format if useful.

Research cross-reference: R-PROV-01, R-PROV-02.

## 17. Retention defaults

Suggested defaults:

| Data | Stage 1 default | User controls |
|---|---|---|
| Lens definitions | Until deleted | Delete/export |
| Source cache | Evictable, short TTL | Clear cache |
| Evidence snapshots | 30–90 days local | Shorter/longer/off |
| Audit log | 90 days local | Clear/export |
| Full output snapshots | Off | Enable per lens/cell |
| Synced evidence | Off until explicit | Enable if privacy mode clear |

## 18. Empty and stale explanations

“Why?” should also work when nothing appears.

Example:

> This cell is empty because no calendar events matched `start_time after today()` and `attendee_count greater than 2` during the last refresh at 9:15 AM.

Stale example:

> This result was last checked 4 hours ago. Gmail connection is expired, so Wovith cannot refresh it.

## 19. Implementation risks

### 19.1 Re-querying as explanation

Do not rely only on re-querying source data to explain old results. Source state may have changed.

### 19.2 Storing too much content

Full snapshots can violate user expectations and increase compliance burden. Default to evidence.

### 19.3 Explanations that hide AI involvement

If AI summarized, ranked, clustered, or enriched, the user should know.

### 19.4 Hashes without usability

Hashes alone are good for integrity but poor for user understanding. Pair them with safe previews and plain-language explanations.

## 20. Stage acceptance criteria

### Stage 0

- Every fixture item in a rendered cell has an explanation.
- Rule trace is correct.
- Evidence object is inspectable in debug mode.

### Stage 0.5

- Real connector item has source ID, matched predicates, observedAt, and sourceTimestamp if available.
- Sensitive fields are redacted by default.
- Disconnecting source can clear evidence.

### Stage 1

- Users can understand why each item is shown.
- AI involvement is visible.
- Stale/failed cells have explanations.

## 21. Research cross-references

- W3C PROV model and ontology: R-PROV-01, R-PROV-02.
- Google data/privacy constraints: R-GOOGLE-02, R-GOOGLE-05.
- Local-first/history limits: R-LOCAL-01, R-LOCAL-02.
- Prompt injection/external content trust: R-LLMSEC-01, R-LLMSEC-02.
