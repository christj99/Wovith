# Wovith Natural Language to DSL Bridge
### How a user's plain-language intent becomes a DSL expression

---

## 0. About this document

This document specifies the natural-language-to-DSL translator: the system that takes a user's plain-language description ("show me messages from people I haven't replied to in three days") and produces a DSL expression Wovith's runtime can evaluate. The bridge is invoked in three places:

1. **Cell authoring** — the user describes a cell, the bridge generates DSL, the inspector shows both
2. **Lens authoring** — the user describes a lens, the bridge generates multiple cells
3. **Lens modification** — the user describes a tweak ("show fewer items"), the bridge edits the existing DSL

The bridge has a high accuracy bar. A failed translation means the user sees something wrong, dismisses, and loses some trust. The target: **95%+ first-attempt accuracy** on common cell patterns. The strategy: a closed-at-the-bottom DSL (regular grammar, small vocabulary, predictable structure), a constrained generation approach (the LLM's output is forced into the DSL grammar), and a validate-then-retry loop with explicit feedback to the model on failure.

---

## 1. The big picture

```
┌────────────────────────────────────────────────────┐
│ User speaks or types: "show me unread VIP emails"  │
└──────────────────────────┬─────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────┐
│ 1. Context assembly                                │
│   - User's connected services                      │
│   - User's contacts / VIPs / topics                │
│   - Existing lenses for reference                  │
│   - Few-shot examples from a curated corpus        │
└──────────────────────────┬─────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────┐
│ 2. LLM call with grammar-constrained output        │
│   - Model: Claude Sonnet (default) or Haiku (fast) │
│   - Output: JSON envelope containing DSL string    │
│   - Constrained decoding ensures valid JSON        │
└──────────────────────────┬─────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────┐
│ 3. DSL parse + analyze                             │
│   - Parse the DSL string                           │
│   - Verify connectors are valid                    │
│   - Verify scope requirements                      │
│   - Verify cell-reference targets exist            │
└──────────────────────────┬─────────────────────────┘
                           ▼
                 ┌─────────┴─────────┐
                 ▼                   ▼
        ┌───────────────┐   ┌───────────────────┐
        │ Success       │   │ Failure           │
        │ Return DSL    │   │ Build error msg,  │
        │               │   │ retry up to 2x    │
        └───────────────┘   └───────────────────┘
```

A successful generation completes in 1-3 seconds typically. Failed generations retry with structured feedback, usually succeeding on the second attempt.

---

## 2. Why constrained generation

The 2026 state of structured LLM output is dominated by **constrained decoding** — at inference time, a logit processor masks invalid tokens, forcing output to follow a grammar. Major models support this:

- **Claude Sonnet 4.6+**: 99.8% schema match via tool use with `strict: true`
- **OpenAI GPT-4o Structured Outputs**: 99.9%+ schema match
- **Gemini response schema**: 99.7% schema match
- **Open-source via XGrammar / llguidance**: 95-98% schema match

Without constrained decoding, prompting alone gets 70-90% reliability — bad enough that one in five users hits a parse failure. With constrained decoding, the JSON envelope is *guaranteed* valid. The remaining failure modes are semantic (the DSL inside the envelope is valid JSON but doesn't make sense for the user's intent), which retry can handle.

The committed approach: **Claude tool use with `strict: true`** for the structured envelope, plus careful prompt engineering for the DSL content inside.

---

## 3. The output schema

The LLM produces a JSON envelope:

```typescript
type GenerationOutput = {
  // The generated DSL expression (the source string)
  dsl: string
  
  // The LLM's interpretation of the intent
  interpretation: string  // 1-2 sentences, shown to the user for confirmation
  
  // Confidence: should this be applied directly or confirmed?
  confidence: 'high' | 'medium' | 'low'
  
  // What renderer the LLM thinks fits
  rendererId: string
  
  // Required connectors (computed from sources in the DSL)
  requiredConnectors: string[]
  
  // If the LLM couldn't fulfill the request, this is set
  declined: false | {
    reason: 'ambiguous' | 'unsupported' | 'unsafe'
    explanation: string
    suggestions: string[]
  }
}
```

This JSON schema is registered with Claude as a tool definition. The model is forced to call this tool, which constrains its output to match. The `dsl` field itself is a free-form string within the envelope — constrained generation can't enforce the full DSL grammar at the token level (that would require a more sophisticated grammar than JSON), but it can guarantee the envelope structure, the renderer ID is a valid choice from a known list, etc.

---

## 4. The prompt structure

The prompt is composed at runtime from several sections, in this order:

### 4.1 System prompt

Stable, cached for prompt caching:

```
You are the DSL translator for Wovith, a personal lens runtime.
Your job is to convert a user's plain-language description into a
Wovith DSL expression.

The DSL grammar:
  lens "Name":
    cell "CellName": <expression>
    cell "Another": <expression>
  
  Expression structure:
    from <source>
    where <predicate>
    [and more predicates]
    [sort by <field> <direction>]
    [take <number>]
    [enrich each with <agent-call>]
    show as <renderer>

  Available sources (always prefix with the connector):
    gmail.threads, gmail.messages, gmail.labels
    drive.files, drive.folders
    calendar.events, calendar.freebusy
    [and any other connected services from the user's profile]

  Available renderers:
    feed, list, timeline, cards, grid, table, text, kpi,
    chart, map, calendar-grid, kanban, custom

  Field references in predicates use dot notation:
    where date is in last 7 days
    where from is in vip-contacts
    where i replied is true
    where age is more than 5 days

  Time literals: today, yesterday, this week, last 7 days, last month, 
    this quarter, etc.
  
  [more rules per the DSL spec]

Rules:
1. Always output ONLY a single cell or lens definition.
2. Use the closest-fit renderer; don't invent renderer names.
3. Prefer sources the user has connected.
4. If the request is ambiguous, set declined.reason = "ambiguous" 
   and explain what's missing.
5. Never include credentials, real email addresses of third parties, 
   or other PII in the DSL.
6. Confidence is "high" only when the request maps unambiguously to 
   one obvious DSL expression.
```

This system prompt is cached (Anthropic's prompt caching) so subsequent translations don't re-pay its token cost.

### 4.2 User context

Dynamic per user, but stable per session:

```
The user has connected:
- Google Drive (read-only)
- Gmail (read-and-write)
- Google Calendar (read-only)

The user's existing lenses:
- "Morning Brief" (uses Calendar, Gmail, Drive)
- "VIP Threads" (uses Gmail)

The user's contacts marked as VIP: [list]
The user's frequent topics: [list]
The user's primary time zone: America/New_York
The current time: 2026-05-19T14:30:00-04:00
```

This is built fresh per call but reuses cached parts where possible.

### 4.3 Few-shot examples

A curated corpus of 20-30 canonical request-to-DSL examples. These are *not* selected randomly — the highest-similarity examples to the current request are retrieved and included.

Example pair:

```
USER: "Show me people who haven't replied to me in a few days"

OUTPUT:
{
  "dsl": "cell \"Dropped Threads\":\n  from gmail.threads\n  where i started is true\n    and they replied is false\n    and age is more than 5 days\n  sort by age descending\n  show as list",
  "interpretation": "Email threads you started where the other person hasn't replied in 5+ days, oldest first.",
  "confidence": "high",
  "rendererId": "list",
  "requiredConnectors": ["gmail"],
  "declined": false
}
```

The corpus covers the full surface area: each connector at least 3 times, each renderer at least once, common predicates, sort patterns, agent enrichment, time-bound queries, count queries, etc.

Similarity selection uses simple embedding-based retrieval (the corpus is small enough that the entire embedding-search can run client-side or in a single Supabase function call).

### 4.4 The actual user request

```
USER REQUEST: <verbatim string from the user>
```

That's it — the prompt is now complete.

---

## 5. The validation pipeline

After the LLM returns, validation runs in order:

### 5.1 Schema validation

Constrained generation guarantees the JSON envelope. This step is essentially a no-op when constrained decoding is on, but is kept as a safety check for cases where constrained decoding is unavailable (Haiku-class models when used for fallback, or models without strict tool use support).

### 5.2 DSL parse

The `dsl` field goes through Wovith's DSL parser (the same one that runs in the cell runtime). Parse failures are caught and reported.

### 5.3 Semantic analysis

The parsed AST goes through static analysis:

- **Source resolution**: every `from X` clause must reference a connected service. If the LLM specified `from slack.messages` but the user has no Slack connection, this fails.
- **Renderer validation**: the `show as X` must be a known renderer.
- **Field references**: predicates reference fields the renderer knows about.
- **Cell references**: if the DSL refers to another cell, that cell must exist.
- **Scope check**: the DSL's required scope can be granted by the user's current connections (or surfaced as a needed upgrade).

### 5.4 Safety checks

Wovith's policy filter runs:

- The DSL must not contain literal email addresses, phone numbers, or other PII.
- The DSL must not include obviously injection-shaped strings.
- For write operations (`enrich each with agent("send a reply")`), the cell type is tagged and surfaced clearly in the UI before being persisted.

### 5.5 Confidence calibration

Even with high LLM-reported confidence, certain patterns force a "review before applying":

- Cells with `enrich each with agent(...)` (LLM-driven enrichment) always get review
- Cells that imply write operations always get review
- Cells with novel renderer/source combinations not seen in the corpus get review
- Cells where the user's request was short (< 10 words) and the DSL is complex get review

---

## 6. The retry loop

If validation fails, the bridge retries with structured feedback:

```
Your previous attempt produced this DSL:

<the previous dsl>

But validation failed:
- Source "slack.messages" requires the user to connect Slack, which 
  they haven't done.
- Predicate "where age is more than 5 weeks" uses an unrecognized
  time unit "weeks" — use "days" instead.

Please try again. The user's original request was: "<request>"
```

The model gets one full retry. On a second failure, the bridge gives up and surfaces an error to the user: *"I'm not sure how to translate that. Could you rephrase?"*

In practice, retry succeeds in ~85% of failed first attempts.

---

## 7. Model selection

Wovith's bridge supports multiple models, chosen based on context:

- **Default (Claude Sonnet 4.6+)**: high accuracy, ~1-2 second latency, 5 budget units per call
- **Fast (Claude Haiku 4.5)**: lower accuracy (~85% on the same corpus), ~300ms latency, 1 budget unit per call
- **Premium (Claude Opus 4.7)**: highest accuracy on edge cases, ~3-5 second latency, 15 budget units per call

The user's `preferences.voiceModelPreference` (from the data architecture doc) drives the default. The budget tracker can degrade Sonnet → Haiku when budget is tight.

Specific scenarios that prefer Opus:
- The user's first cell ever (high stakes; we want this to land right)
- Cells with complex multi-source joins
- After a Sonnet failure on retry

Specific scenarios that prefer Haiku:
- Voice-input authoring where speed matters (the user is mid-thought)
- The user is on free tier and near soft cap
- Background re-mining (no user is waiting)

---

## 8. Editing existing DSL

When the user describes a modification ("show fewer items," "add a filter for VIPs only"), the bridge runs in *edit mode*:

The prompt includes the existing DSL as context:

```
The user wants to modify this existing cell:

  cell "Decisions Today":
    from gmail.threads
    where state is unread
      and from is in vip-contacts
    show as feed

The user said: "show me 10 max"

Output the modified DSL.
```

The output is the same envelope shape, but the `dsl` field is the *new* full DSL, not a diff. Diffs are visually presented to the user by the inspector by comparing old and new ASTs.

This mode is more reliable than the from-scratch mode because the LLM has a known-good DSL to mutate. Edit-mode accuracy approaches 99%.

---

## 9. Multi-cell lens generation

When the user describes an entire lens ("I want a morning brief with email, calendar, and recent docs"), the bridge generates multiple cells in one call:

The output envelope is extended:

```typescript
type LensGenerationOutput = GenerationOutput & {
  isLens: true
  lensName: string
  lensDescription: string
  cells: CellGenerationOutput[]
  // The required connectors are the union of all cells'
  // The required scopes are the union of all cells'
}
```

Each cell in the array is validated independently. If one cell fails, the lens is still proposed but the failed cell is marked needing manual edit.

---

## 10. Voice authoring specifics

When the user authors via voice, the pipeline has additional preprocessing:

1. **Speech-to-text** via the Web Speech API or a Capacitor speech plugin. Result: a transcript.
2. **Transcript cleanup**: filler words ("um," "uh"), false starts removed via a small Haiku call. This is a Haiku call to keep latency low; it's separate from the DSL generation.
3. **DSL generation**: as above.

The user sees three states in succession:
- "Listening..." (during STT)
- "Thinking..." (during DSL generation)
- The result, in the same UI position as text-authored cells

Latency target: under 4 seconds end-to-end for a typical voice request.

---

## 11. Privacy considerations

The DSL generation pipeline sends LLM API calls to Anthropic (or other providers when configured). The data sent:

- The system prompt (stable, doesn't contain user data)
- The user's connector list (just connector IDs and scope tiers)
- The user's connected accounts as identifiers (account IDs, not full emails)
- The user's existing lens names and structures (not their contents)
- The user's VIP contacts and topics (these are user-curated labels, but contain real information)
- The user's current time and time zone
- Few-shot examples (canonical, no user data)
- The user's actual request

Not sent:
- The contents of the user's messages, files, or calendar
- Any specific MCP responses
- The user's identity beyond what's needed for the request

The bridge's API calls are governed by the agent budget (same as cell-level agent calls). Each call counts.

For privacy-strict users (Trust tier or opted-in users), an alternative path uses a local model:

- A small on-device model (when feasible — likely v3+ when mobile model quality reaches Haiku-class)
- Latency higher, accuracy lower
- No data leaves the device

v1 default: cloud LLM. Local model is a future optimization.

---

## 12. Corpus management

The few-shot corpus is the single biggest lever on accuracy. Maintaining it well:

### 12.1 Sourcing

The initial corpus is hand-authored — 30 examples covering the common patterns. Each example is a real plausible request paired with an expert-authored DSL.

Subsequent additions come from:
- User feedback ("this DSL was wrong, here's what I wanted instead")
- Anonymized successful translations (with user opt-in)
- Edge cases discovered in production

### 12.2 Curation

Every corpus entry is reviewed by a human before being included. The bar:
- The DSL is the canonical "best" translation, not just *a* translation
- The natural language is plausible (a real user might say this)
- The example covers a distinct pattern, not redundant with existing entries

### 12.3 Versioning

The corpus is versioned. When a corpus change improves accuracy on some patterns but regresses others, we can roll back. Each translation records the corpus version used.

### 12.4 Evaluation

A holdout test set of 200 examples (separate from the corpus) is evaluated:
- On every model update
- On every corpus change
- Weekly on production traffic samples

Metrics:
- First-attempt parse success
- First-attempt semantic correctness (human-rated)
- Retry success rate
- User-reported "this was wrong" rate

Target: >95% on first-attempt semantic correctness.

---

## 13. Failure modes and UX

When the bridge can't translate confidently, the user UX is:

**Decline with reason** (the LLM set `declined.reason`):

```
"I'm not sure I understand. Did you mean:
 • Show emails from VIP contacts unread
 • Show calendar events from VIP contacts
 • [Cancel and rephrase]"
```

**Parse failure after retry**:

```
"I couldn't translate that into a cell. Try rephrasing, or 
 author the DSL directly in the inspector."
```

**Low confidence on a returned DSL**:

```
"Here's what I think you meant. Want to use it or tweak?"
 [shows the cell preview]
 [Use it]  [Tweak]  [Try again]
```

All of these are voice-doc compliant.

---

## 14. Performance characteristics

| Operation | Target |
|---|---|
| Total wall-clock for typical translation | < 2s |
| LLM call latency (Sonnet) | 1-2s |
| LLM call latency (Haiku) | 200-400ms |
| Validation time | < 50ms |
| Retry path | < 4s end-to-end |
| Voice-input total | < 4s |
| Prompt caching savings | ~80% on cached system prompt |

---

## 15. Cross-doc consistency

- **DSL doc**: this bridge generates the DSL specified there. Grammar must match.
- **Onboarding/mining**: mining proposes lenses; the bridge isn't used during inverse-mining (mining is rule-based, not LLM-driven). The bridge is used for the user's manual authoring after onboarding.
- **Cell runtime**: validation calls the parser the runtime uses.
- **Security**: PII filter, write-action surfacing.
- **Engineering arch**: lives in `effects/agent/` (it's an LLM call); the bridge code in `features/cell-inspector/nl-bridge/`.
- **Voice and copy**: all UX messages voice-doc compliant.
- **Budget**: every translation consumes budget units.

No conflicts.

---

## References

- *Constrained Decoding: Grammar-Guided Generation for Structured LLM Output* (Michael Brenndoerfer, 2026)
- *Structured Output and JSON Mode Guide 2026* (TokenMix)
- *How Structured Outputs and Constrained Decoding Work* (Let's Data Science)
- *Claude API Structured Outputs* documentation
- *Guiding Large Language Models to Generate Computer-Parsable Content* (arXiv:2404.05499)
- Grammar Prompting (Wang et al., 2024)
- XGrammar (vLLM/SGLang)
- llguidance (Microsoft)
- *LLM-Hardened DSLs for Probabilistic Code Generation* (Mai, 2025)
- NaturalEdit (Tang et al., 2025)
