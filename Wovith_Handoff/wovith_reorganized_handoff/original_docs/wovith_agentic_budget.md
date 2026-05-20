# Wovith Agentic Budget Enforcement
### Dual buckets, pre-flight estimation, graceful degradation, circuit breakers

---

## 0. About this document

This document specifies how Wovith enforces the per-user agent budget — the mechanism that prevents runaway costs from autonomous cell evaluations, bounds free-tier abuse, and gives Pro/Trust tier users predictable upper bounds on their monthly spend. The budget model is referenced throughout other docs (cell runtime, GTM, security, data architecture); this doc specifies how it actually works.

The design draws on 2026 LLM rate-limiting practice: dual-bucket (RPM + TPM), pre-flight estimation, token-bucket algorithm, three-layer enforcement with circuit breakers and fallback chains. The constraints specific to Wovith: budget is *per user*, not per tenant or per IP; enforcement is client-side because Wovith calls LLM APIs directly from each device with the user's bound key (or through a Wovith-provided proxy); graceful degradation is preferable to hard refusal because Wovith's value depends on cells working.

---

## 1. The big picture

```
┌──────────────────────────────────────────────────────┐
│ Cell evaluation needs to make an agent call          │
└────────────────────┬─────────────────────────────────┘
                     ▼
       ┌──────────────────────────────────┐
       │ Pre-flight estimation            │
       │ - Count input tokens (tokenizer) │
       │ - Estimate output tokens         │
       │ - Compute budget units           │
       └──────────────┬───────────────────┘
                      ▼
       ┌──────────────────────────────────┐
       │ Budget gate                      │
       │ - Check RPM bucket               │
       │ - Check TPM bucket               │
       │ - Check daily unit cap           │
       │ - Apply soft-cap degradation     │
       └──────────────┬───────────────────┘
                      ▼
              ┌───────┴───────┐
              ▼               ▼
       ┌──────────┐   ┌──────────────────┐
       │ Allow    │   │ Degrade or refuse│
       └─────┬────┘   └────────┬─────────┘
             ▼                 ▼
       ┌──────────┐   ┌──────────────────┐
       │ LLM call │   │ Fallback chain:  │
       └─────┬────┘   │ - Cheaper model  │
             │        │ - Cache hit only │
             │        │ - Skip enrichment│
             │        │ - Hard refuse    │
             ▼        └────────┬─────────┘
       ┌──────────┐            │
       │ Reconcile│            │
       │ actual   │            │
       │ usage    │            │
       └─────┬────┘            │
             ▼                 ▼
       ┌─────────────────────────────────┐
       │ Update AgentBudgetDoc           │
       │ Update circuit breakers         │
       └─────────────────────────────────┘
```

Every agent call goes through this path. The overhead is small (sub-millisecond pre-flight estimation, single-digit milliseconds for budget gate). The user perceives no slowdown in normal operation; only when budget is constrained does behavior visibly change.

---

## 2. The budget object

From the data architecture doc (section 2.7), the budget is an Automerge document:

```typescript
type AgentBudgetDoc = {
  userId: string
  tier: 'free' | 'pro' | 'trust'
  
  daysHistory: {
    [yyyymmdd: string]: {
      callCount: number          // Automerge Counter
      unitTotal: number
      providerBreakdown: { [provider: string]: number }
      modelTierBreakdown: { [tier: string]: number }
    }
  }
  
  currentDay: string
  currentDayCalls: number        // Counter
  currentDayUnits: number        // Counter
  
  lastResetAt: number
  schemaVersion: number
}
```

The Automerge `Counter` type matters for concurrent updates: two devices that both increment `currentDayCalls` should sum, not last-write-wins. Counters do that correctly.

The in-memory budget state (in the runtime) augments this with rolling-window data:

```typescript
type RuntimeBudgetState = {
  // From the persistent doc
  doc: AgentBudgetDoc
  
  // In-memory windows
  rpmBucket: TokenBucket        // requests per minute
  tpmBucket: TokenBucket        // tokens per minute
  unitBucket: TokenBucket       // budget units per day
  
  // Circuit breaker state
  consecutiveFailures: number
  recentCostVelocity: number    // units per minute, rolling
  breakerState: 'closed' | 'open' | 'half-open'
  breakerOpenedAt: number | null
  
  // For pre-flight reconciliation
  inFlightCalls: Set<string>    // pending call IDs
  inFlightEstimatedUnits: number
}
```

---

## 3. Pre-flight estimation

Before any LLM call, the runtime estimates its cost:

```typescript
function estimateCost(call: PlannedAgentCall): CostEstimate {
  // Tokenize input
  const inputTokens = countTokens(call.prompt, call.model)
  
  // Estimate output (max_tokens or model-typical)
  const estimatedOutputTokens = call.maxTokens ?? 
    typicalOutputTokens(call.taskType, call.model)
  
  // Map to budget units
  // Haiku: 1 unit per call. Sonnet: 5 units. Opus: 15 units.
  // Adjusted by input/output token count (long calls cost more):
  // unitCost = baseUnits * (1 + (totalTokens / 10000))
  const baseUnits = modelBaseUnits(call.model)
  const totalTokens = inputTokens + estimatedOutputTokens
  const units = baseUnits * (1 + Math.min(totalTokens / 10000, 2))
  
  return {
    inputTokens,
    estimatedOutputTokens,
    totalTokens,
    units: Math.ceil(units),
    model: call.model,
  }
}
```

Token counting uses Anthropic's `count_tokens` API or a local approximation (the official tokenizer ported to JS). Local counting is preferred because it's free and instant.

The estimate is conservative — it assumes max output. If the actual output is shorter, the bucket is reconciled downward after the call completes.

---

## 4. The dual-bucket model

Two buckets enforce concurrent constraints:

### 4.1 The RPM bucket (requests per minute)

Defends against burst patterns. Tier limits:

- **Free**: 10 RPM
- **Pro**: 60 RPM
- **Trust**: 120 RPM

Token-bucket algorithm: the bucket starts with a burst capacity (2x RPM) and refills continuously at the RPM rate.

### 4.2 The TPM bucket (tokens per minute)

Defends against single-call cost monopolization. Tier limits:

- **Free**: 50,000 TPM
- **Pro**: 500,000 TPM
- **Trust**: 1,000,000 TPM

Token-bucket algorithm: similar to RPM but for tokens. Burst capacity 1.5x sustained rate.

### 4.3 The daily unit cap

The aggregate budget that maps to dollar cost:

- **Free soft cap**: 50 units/day; soft cap triggers degradation
- **Free hard cap**: 100 units/day; calls refuse
- **Pro soft cap**: 500 units/day
- **Pro hard cap**: 1,000 units/day
- **Trust**: 5,000 units/day hard cap only — no soft-cap degradation. Trust is the "I want this to work without surprises" tier; users paying $48/mo should never see a cell silently downgrade. The hard cap exists as a runaway-safety bound, not a quality-of-service knob.

Units, not raw API requests, because units encode the cost differential between Haiku/Sonnet/Opus.

### 4.4 The tenure bonus

Free users who remain active past Day 14 see their soft cap relax from 50 → 75 units/day, and their hard cap from 100 → 150 units/day. The rationale: a user still active after two weeks is not just experimenting — they're getting real value, and the marginal cost of giving them a bit more headroom is small. This is the "the cap raises with usage maturity" commitment from the GTM doc. The relaxation is automatic, not user-triggered; the user sees a small one-time message on Day 14: *"You've been using Wovith for two weeks. Your daily agent budget just bumped up."*

The tenure bonus applies to Free only. Pro and Trust already have generous limits.

### 4.5 The budget gate

A call goes through the gate:

```typescript
function checkBudget(estimate: CostEstimate, runtime: RuntimeBudgetState): BudgetDecision {
  // Hard fails first
  if (runtime.breakerState === 'open') {
    return { allow: false, reason: 'circuit_breaker_open' }
  }
  if (!runtime.rpmBucket.canTake(1)) {
    return { allow: false, reason: 'rpm_exceeded', retryAfterMs: runtime.rpmBucket.retryAfterMs() }
  }
  if (!runtime.tpmBucket.canTake(estimate.totalTokens)) {
    return { allow: false, reason: 'tpm_exceeded', retryAfterMs: runtime.tpmBucket.retryAfterMs() }
  }
  
  const projected = runtime.doc.currentDayUnits + 
                    runtime.inFlightEstimatedUnits + 
                    estimate.units
  
  const hardCap = hardCapFor(runtime.doc.tier)
  if (projected > hardCap) {
    return { allow: false, reason: 'daily_hard_cap', resetAt: nextMidnight() }
  }
  
  const softCap = softCapFor(runtime.doc.tier)
  if (projected > softCap) {
    // Soft cap: degrade
    return { 
      allow: true, 
      degrade: chooseDegradation(estimate, projected, softCap, hardCap)
    }
  }
  
  return { allow: true }
}
```

---

## 5. Soft-cap degradation

When projected usage exceeds soft cap but not hard cap, calls go through but are *degraded*:

### 5.1 Degradation strategies

In order of preference:

1. **Use a cached response if available.** Agent calls are cached (data architecture doc, section 4.1). If the exact input has been called before in the last 24 hours, return the cached response. Cost: 0 units.

2. **Downgrade the model.** If the cell asked for Sonnet but soft cap is exceeded, run it on Haiku instead. Note in the cell's provenance that this was a degraded call. Cost reduction: ~80% (5 units → 1 unit).

3. **Defer non-observed cells.** Cells whose evaluation was triggered by background refresh (not direct user observation) are queued for later when budget recovers. The cell remains in `stale` state visibly.

4. **Skip enrichment.** A cell with `enrich each with agent(...)` clauses can return its base result without enrichment. The cell renders a "limited mode" indicator to the user.

The choice between these is based on:
- Is the user actively observing this cell? (observed → don't defer)
- Was a specific model requested? (explicit Sonnet preference → don't downgrade silently)
- Is the call cacheable? (recent identical → use cache)

### 5.2 User-visible degradation

When degradation is active, the user sees a small ambient indicator in the canvas:

```
You've used 42 of 50 daily agent calls. Some cells may run in limited mode.
```

Cells that ran in degraded mode have a small "limited" indicator. Tapping it explains: "This used a faster model to stay within today's budget."

This is consistent with the voice doc's principle: surface what's happening rather than hide it.

---

## 6. Hard-cap behavior

When projected usage would exceed hard cap, the call is refused. The cell transitions to `failed` with `kind: 'agent_budget_exceeded'`. The user-facing message:

```
You've used today's agent calls. They reset at midnight Eastern.

[Upgrade to Pro for higher limits] [Learn more]
```

Voice-doc compliant: factual, not punitive, with a clear path forward.

### 6.1 What doesn't fail

- Cells that don't need agent calls work normally
- Cached agent responses still serve (the budget is for *new* calls, not for using cached results)
- The user can author new lenses; cells in those lenses just can't enrich until budget resets

### 6.2 Time-zone handling

Daily reset is at the user's local midnight by default. The reset is triggered by checking `currentDay !== todayInUserTz()` on every budget check. When detected, the previous day's stats are archived to `daysHistory` and counters reset.

For users who travel across time zones, the reset behavior follows their current device's time zone. This can produce a brief overlap (a day "lasts" 25 hours when traveling west, or 23 when traveling east), which is acceptable.

---

## 7. Reconciliation after the call

Pre-flight estimates are upper bounds. The actual call response includes precise token counts:

```typescript
async function executeCallWithBudget(call: PlannedAgentCall, estimate: CostEstimate) {
  // Reserve the estimated budget
  runtime.inFlightCalls.add(call.id)
  runtime.inFlightEstimatedUnits += estimate.units
  runtime.rpmBucket.take(1)
  runtime.tpmBucket.take(estimate.totalTokens)
  
  try {
    const response = await makeApiCall(call)
    
    // Reconcile: actual vs estimate
    const actualUnits = computeActualUnits(response, call.model)
    const delta = actualUnits - estimate.units
    
    runtime.doc.currentDayUnits.increment(actualUnits)  // Counter atomic increment
    runtime.doc.currentDayCalls.increment(1)
    
    // Return tokens to the TPM bucket if we overestimated
    if (response.outputTokens < estimate.estimatedOutputTokens) {
      const tokenDelta = estimate.estimatedOutputTokens - response.outputTokens
      runtime.tpmBucket.return(tokenDelta)
    }
    
    // Update cost velocity for the circuit breaker
    runtime.recentCostVelocity = updateCostVelocity(runtime.recentCostVelocity, actualUnits)
    
    return response
  } catch (err) {
    // Failed calls also count against the budget (the API was hit)
    // but with a smaller penalty
    runtime.doc.currentDayUnits.increment(Math.ceil(estimate.units * 0.1))
    runtime.consecutiveFailures += 1
    checkCircuitBreaker(runtime)
    throw err
  } finally {
    runtime.inFlightCalls.delete(call.id)
    runtime.inFlightEstimatedUnits -= estimate.units
  }
}
```

The reconciliation step ensures that even if the estimate was off, the persistent counter reflects truth. A user who hits their cap because of bad estimates is a worse experience than slightly inflated bucket reservations during in-flight time.

---

## 8. The circuit breaker

Beyond per-call budget enforcement, a circuit breaker watches for *patterns* of runaway behavior:

### 8.1 What trips the breaker

- **Consecutive failures**: 5+ consecutive failed agent calls in a row
- **Cost velocity spike**: cost per minute exceeds 3x the rolling 1-hour average
- **Identical-prompt loop**: the same prompt fingerprint hits the API 10+ times in a minute
- **Context length runaway**: a cell's enrichment context grows monotonically across calls (suggests a feedback loop)

### 8.2 Breaker states

```
                ┌─── closed ────┐
                │  (normal)     │
                │               │
                │  failures     │
                │  accumulate   │
                ▼               
            ┌────────┐          
            │  open  │          
            │ (refuse│  60s     
            │  all)  │ ─────────► half-open
            └────────┘                │
                ▲                     │ test call
                │                     │
                │ failure             ▼
                └────────────── ┌──────────┐
                                │ success  │
                                │ → closed │
                                └──────────┘
```

When the breaker opens:
- All new agent calls fail immediately with `kind: 'agent_call_failed'` and reason "circuit breaker"
- The user sees an ambient indicator: *"Pausing agent calls briefly to check things. Will resume shortly."*
- After 60 seconds, the breaker enters half-open: the next call is allowed through as a test
- If the test call succeeds, the breaker closes (normal operation)
- If the test fails, the breaker re-opens for another 60 seconds

### 8.3 Why per-user breakers matter

In a single-tenant SaaS context, breakers are per-server. In Wovith's per-user-budget model, breakers are per-user — one user's runaway doesn't affect another. Each device runs its own breaker state.

The breaker is the last line of defense. Pre-flight estimation and budget caps prevent most runaways before they happen; the breaker catches the cases that slip through (e.g., a cell expression that recursively triggers itself through some indirect cell dependency).

---

## 9. Fallback chain

When a primary agent call fails (for any reason — budget, breaker, API outage), the runtime can fall back:

```
Primary:  Claude Sonnet 4.6 with full context
   │
   │ failure or budget constraint
   ▼
Fallback 1:  Claude Haiku 4.5 with full context
   │
   │ failure
   ▼
Fallback 2:  Semantic cache lookup (closest cached response)
   │
   │ no useful cache hit
   ▼
Fallback 3:  Cell returns base result without enrichment
   │
   │ cell can't function without enrichment
   ▼
Failure:  Cell shows error state
```

The cell's DSL can specify whether enrichment is required (`enrich each with agent(...) required`) or optional (`enrich each with agent(...) optional`). Required enrichment fails the cell if no fallback succeeds; optional enrichment lets the cell render with degraded but useful results.

Default: required is opt-in. Most enrichment cells are optional by default. This means budget pressure rarely produces visible failures; it just produces visibly-degraded results.

---

## 10. The DSL surface

The DSL doc specifies how cells declare their agent calls. The budget system reads:

- The model preference (default: user's `preferences.voiceModelPreference`)
- The required/optional flag
- The max-cost annotation if specified

```
enrich each with agent("draft a one-line summary") using haiku
enrich each with agent("synthesize themes") using sonnet required
enrich each with agent("deep analysis") using opus max 50 units
```

The `max 50 units` annotation lets a cell cap its own per-call cost. Beyond that, the runtime treats it as exceeded budget.

---

## 11. Visibility for the user

The user can always see their current budget state:

### 11.1 Ambient indicator (in the canvas)

A subtle indicator near the bottom of the canvas:

```
○ 12 of 50 today
```

Color shifts from neutral → warning → constrained as the bucket fills. Hover/tap reveals the full state.

### 11.2 Detailed view (in settings)

```
Today's agent usage:
  12 calls × Haiku    = 12 units
   3 calls × Sonnet   = 15 units
   1 call  × Opus     = 15 units
  ─────────────────────────────
  42 of 50 units used (84%)

History:
  This week:   285 of 350 units (avg 41/day)
  This month:  1,240 of 1,500 units

Models:
  Default model: Sonnet (most balanced)
  [Change preference]

If you hit your limit:
  Calls reset at midnight (Eastern, your time zone)
  [Upgrade to Pro for higher limits]
```

This is transparent. The user knows exactly what they've used and what's left.

---

## 12. Tier-specific behavior

### 12.1 Free tier

- Single-device (no sync, so the budget doc is local-only)
- Aggressive degradation: defaults to Haiku, no automatic Sonnet/Opus
- Tight TPM bucket discourages large-context cells
- Clear upgrade prompts at soft cap

### 12.2 Pro tier

- Multi-device sync (budget doc syncs)
- Default Sonnet, with Haiku/Opus as user-chosen
- Generous limits; most users never hit soft cap
- Soft cap is informative, not pushy

### 12.3 Trust tier

- E2E option (budget doc can be encrypted if user opts in)
- Highest limits (5,000 units/day hard cap)
- **No soft-cap degradation**: cells never silently downgrade. The full requested model runs every time, until the hard cap is hit.
- Custom model preferences allowed (including bringing-your-own-API-key in a future v3+)
- Auditable: all calls are in the audit log; provenance graph traces them

---

## 13. The "bring your own key" deferred path

A v3+ consideration: enterprise or power users who want to bring their own LLM API keys, removing Wovith's budget gate entirely (their own provider's limits apply). Architecture supports this — the agent client is provider-agnostic — but UX, billing reconciliation, and support implications need a separate design pass.

Not in v1 or v2.

---

## 14. Performance

| Operation | Target |
|---|---|
| Pre-flight estimation (tokenizer local) | < 5ms |
| Budget gate check | < 1ms |
| Bucket take | < 0.1ms |
| Reconcile after call | < 2ms |
| Circuit breaker check | < 0.1ms |
| Soft-cap degradation decision | < 1ms |

The budget system overhead is negligible compared to the LLM call latency it's gating (200ms-30s).

---

## 15. Specific edge cases

### 15.1 The user's device clock is wrong

If the device clock is significantly off, "midnight reset" could happen at the wrong time. The runtime sanity-checks against the sync server's time (if available); local time discrepancies of more than 12 hours trigger a warning and the budget uses the server time.

### 15.2 Two devices both call simultaneously

The Automerge Counter type handles concurrent increments correctly: both devices' increments sum. Brief over-allocation is possible during the sync delay (Device A allows a call when Device B has just consumed budget that hasn't synced yet), but the next sync corrects.

This means budget caps are *approximately* enforced across devices, not strictly. The discrepancy is bounded by sync latency (typically seconds). For a per-user cap of 50/day, ±2 over-counting per day is acceptable.

### 15.3 The API provider's rate limit

If Anthropic's API returns 429 even when Wovith's internal budget allows the call, the runtime treats this as a transient error: backoff, retry. If it persists, the circuit breaker trips.

### 15.4 Free → Pro upgrade mid-day

When the user upgrades during a day, their soft and hard caps increase immediately. Already-consumed units are kept (you don't get to "reset" by upgrading). The new caps apply to remaining usage.

### 15.5 Downgrades

If Pro → Free (subscription lapses), the user's daily usage doesn't reset; the new (lower) caps simply mean they may already be at or past the cap for that day.

---

## 16. Telemetry (opt-in)

The runtime emits anonymized budget telemetry:

- Daily distribution of usage across tiers
- How often soft cap is hit vs hard cap
- Most common degradation paths
- Circuit breaker trip frequency

This informs tier sizing and pricing. No per-user identification.

---

## 17. Cross-doc consistency

- **Cell runtime**: budget is enforced in the agent call path inside cell evaluation.
- **Data architecture**: `AgentBudgetDoc` schema matches.
- **MCP client**: separate concern; MCP calls don't go through the agent budget (MCP is data-fetching, not LLM-driven).
- **NL-to-DSL bridge**: bridge calls consume agent budget like any other call.
- **Provenance**: budget units consumed are recorded per call in provenance.
- **Security**: budget is a defense-in-depth measure against agent runaway, complements the action-tier model.
- **GTM**: tier pricing structure matches.
- **Voice and copy**: budget-related messages voice-doc compliant.

No conflicts.

---

## References

- *Token-Based Rate Limiting* (Zuplo, 2026)
- *Rate Limiting AI Agents: Preventing LLM API Exhaustion with a 3-Layer Gateway* (TrueFoundry, 2026)
- *LLM Backends Need Rate Limiting 2.0: Token Buckets for Tokens, Not Requests* (Feb 2026)
- *How to Implement LLM Rate Limiting* (OneUptime, Jan 2026)
- *LLM API Rate Limiting Best Practices* (ClawPulse)
- *Rate limiting for LLM applications* (Portkey, Apr 2026)
- *Rate Limiting and Quotas for LLM APIs* (Hivenet)
- Anthropic API rate limit documentation
- Token bucket / leaky bucket algorithm references
- Hystrix circuit breaker pattern
