# Wovith v1 Scope

### What ships in v1, what doesn't, and how to know when v1 is done

---

## 0. Purpose of this doc

The 20 product docs and the schemas file specify *what Wovith is*. This doc specifies *what's in v1* and *what "done" looks like*. Without this, the coding agent will keep building features that can wait, and the team won't have a clear ship date.

The cut line below is firm. New features that aren't on the in-scope list go on the v2 backlog; the coding agent should refuse to implement them as part of v1.

---

## 1. Platforms

### In scope for v1
- **Android** via Capacitor 8, distributed via Google Play (closed beta first, then public). Targets Android 10+ (API level 29+).
- **Web** at wovith.app via Vite-built bundle, same codebase as Android. Targets Chrome 120+, Safari 17+, Firefox 120+. PWA-capable but no install requirement.

### Out of scope (deferred)
- **iOS** — v1.5. Same Capacitor codebase; primarily testing and App Store submission work.
- **Native desktop** (Electron/Tauri) — v2+. The web build at wovith.app is the v1 large-screen experience.
- **Browser extension** — v3+ if at all.

---

## 2. Connectors

### In scope for v1
- **Google Drive** via `drivemcp.googleapis.com/mcp/v1`. Read-only and `drive.file` (created-by-Wovith) write scopes.
- **Gmail** via `gmailmcp.googleapis.com/mcp/v1`. Read-only, modify (labels/archive/draft), send. `mail.google.com` (full delete) explicitly NOT offered at v1.
- **Google Calendar** via `calendarmcp.googleapis.com/mcp/v1`. Read-only and read-create events scopes.

### Out of scope (deferred)
- Slack, Notion, GitHub, Linear, file-system connectors — v2+.
- Self-hosted MCP servers — v2+ as Trust-tier feature.
- User-added arbitrary MCP servers — v3+ (requires supply-chain review framework).

---

## 3. Cell runtime

### In scope for v1
- All 7 logical cell states (idle, fetching, fresh, stale, recomputing, failed, waiting).
- Adapton-style push-pull dependency tracking.
- Cell-to-cell dependencies (a cell may reference `@othercell`).
- Per-cell TTL with default TTLs per connector.
- Three-tier caching: signal-level memoization, MCP response cache (60s default), agent response cache (24h with prompt-fingerprint invalidation).
- Agent budget tracking with RPM/TPM/units enforcement, soft-cap degradation chain (cache → downgrade → defer → skip → refuse).
- Per-user circuit breaker (5 consecutive provider failures → open).
- Cell evaluation timeout (default 30s; long-running cells use MCP Tasks API).

### Out of scope (deferred)
- Web Worker runtime — v2.
- Cross-device evaluation distribution — v3+.
- Cell evaluation in agent-suspend state with user input prompts — v2.

---

## 4. DSL and authoring

### In scope for v1
- Full DSL grammar per `wovith_dsl_grammar.md` (all 83 corpus cases passing).
- Both pipe form and keyword-prefix form.
- NL-to-DSL bridge with Claude Sonnet 4.6+ as default model, Haiku 4.5 as fast path, target ≥95% first-attempt validation success.
- DSL inspector: every cell can be viewed and edited as DSL.
- Bidirectional NL↔DSL: editing the NL updates the DSL; editing the DSL updates the NL preview.
- Static validation: parse errors caught before evaluation, with line/column.

### Out of scope (deferred)
- Voice-first authoring on mobile beyond basic transcription — v2 polish.
- DSL macros / user-defined functions — v3+.
- On-device NL-to-DSL (small model) — v3+ when mobile model quality reaches Haiku-class.

---

## 5. Renderers

### In scope for v1
All 13 renderers per `wovith_renderer_spec.md`:
- `list`, `feed`, `card`, `cards`, `timeline`, `grid`, `chart`, `table`, `kanban`, `map`, `text`, `count`, `raw`

With all options per the renderer spec. Default-dispatch (no `show as` clause) picks a renderer from data shape.

### Out of scope (deferred)
- User-authored custom renderers — v2 (extension framework exists; UI for creating them is v2).
- Computer-use renderers (rendering live web pages) — v3+.
- AR/VR renderers — never (out of scope of the product premise).

---

## 6. Provenance and audit

### In scope for v1
- Per-cell provenance graph (W3C PROV-DM specialization).
- Lazy per-item provenance drill-down (right-click → why).
- 90-day audit log retention (SQLite, on-device).
- Audit log filterable by lens, cell, connector, action type.
- Per-connector activity view.

### Out of scope (deferred)
- Cross-device provenance reconciliation — v3+.
- Provenance export with ed25519 signatures (Trust tier feature) — v2.
- Public provenance verification — v3+.

---

## 7. Sync and multi-device

### In scope for v1
- Single-device for Free tier (Automerge docs local-only).
- Multi-device sync for Pro tier via Supabase-hosted relay (`wss://sync.wovith.app/v1/sync`).
- 30-day buffer retention on relay.
- `.wovith-backup` export for manual cross-device migration on Free tier.

### Out of scope (deferred)
- E2E encryption — v2 (Trust tier; PBKDF2 + per-doc keys ready in design, not shipped).
- Co-lenses (real-time collaboration) — v2.
- Selective sync (sync some lenses, not others) — v2.

---

## 8. Onboarding and mining

### In scope for v1
- 5-minute, 7-step onboarding flow per `wovith_onboarding_mining.md`.
- 3-layer mining algorithm (signal extraction → pattern matching → lens composition).
- 30–50 patterns at v1.
- 3–5 proposed lenses per user on first run.
- "Browse starter lenses" entry point with 30+ curated lenses.

### Out of scope (deferred)
- Mining re-runs as user data evolves — v2 (re-mining is a Pro feature).
- The "blind spot" lens (proposed Week 2, not Day 1) — v1 but the proposal happens after 7 days of active use, not in onboarding.
- User-publishable starter content — v3+ (when the garden ships).

---

## 9. Action governance

### In scope for v1
- Full Tier 0–3 action model per `wovith_security.md`.
- Intent Preview pattern for Tier 2 actions.
- Hold-to-confirm (1.5s) for Tier 3 actions.
- Delayed-execution (60s with cancel) for high-stakes Tier 3 actions.
- Recurring approval (time-bounded, scoped per cell+action) for Tier 2.
- Calibrated certainty signaling.

### Out of scope (deferred)
- Custom user-defined action policies — v3+.
- Multi-party approvals (one user proposes, another approves) — v3+.

---

## 10. Pricing and accounts

### In scope for v1
- Free tier (single-device, capped, fully functional).
- Pro tier ($24/month, $216/year — 25% discount).
- Stripe integration for Pro subscriptions.
- Single canvas on Free; unlimited on Pro.
- 5 lenses / 30 cells on Free; unlimited on Pro.
- Day-14 tenure bonus on Free (auto-applied).

### Out of scope (deferred)
- Trust tier ($48/month) — post-v2.
- Annual billing for Trust — with Trust.
- Team/enterprise pricing — v3+.
- Bring-your-own-key — v3+.

---

## 11. UX surfaces

### In scope for v1
- Canvas view (web).
- Stacked-cell view (Android).
- Lens dock with swap affordance.
- Cell inspector (NL + DSL view).
- Lens overview / starter pack browser.
- Connections panel.
- Settings (theme, notifications, calibration reset, account, export, danger zone).
- Audit log view.
- Provenance lineage popover.
- Intent Preview surface for Tier 2 actions.
- Hold-to-confirm UI for Tier 3.

### Out of scope (deferred)
- Time travel scrubber UI — v2 (data model supports it).
- Diff view between lens versions — v2.
- Lens overlay (showing two lenses simultaneously) — v2.
- Voice authoring beyond basic transcription — v2.

---

## 12. Acceptance criteria for "v1 ships"

The cut from "v1 complete in code" to "v1 ships to public" requires all of these to be green:

### 12.1 Functional acceptance

- [ ] All 83 DSL parser corpus cases pass (`wovith_dsl_grammar.md`).
- [ ] All 13 renderers implemented, each with at least the options listed in the renderer spec.
- [ ] All 3 connectors connect end-to-end (OAuth flow → first MCP call → cell render) on both Android and web.
- [ ] A new user can complete onboarding from install to first useful lens in ≤5 minutes (measured via instrumentation on the preview cohort).
- [ ] Pro upgrade flow works end-to-end via Stripe.
- [ ] Multi-device sync works end-to-end: edit on web, see on Android within 5 seconds (over normal network).
- [ ] Provenance lineage view shows the source, the agent enrichment (if any), and the freshness window for any cell.
- [ ] Audit log view shows the last 30 days of agent actions, filterable by lens/cell/connector.
- [ ] Intent Preview correctly batches multiple proposed actions and routes them through Tier 2 confirmation.
- [ ] Hold-to-confirm Tier 3 actions cannot be dismissed by accidental tap-through.
- [ ] Voice authoring on Android transcribes intent and produces a valid DSL cell that renders.

### 12.2 Performance acceptance

- [ ] Cold-start time on a mid-range Android device (e.g., Pixel 6a): ≤30s to interactive primary canvas.
- [ ] Cell evaluation latency p95: ≤2s for cache-hit cells, ≤8s for cells with single MCP call, ≤15s for cells with single agent call.
- [ ] Memory: idle app under 200MB RSS on Android; under 300MB during full evaluation of a 7-cell lens.
- [ ] App size (Android): under 60MB compressed APK.
- [ ] Web build initial load: under 2MB gzipped JS, under 3s to first render on a 4G connection.

### 12.3 Reliability acceptance

- [ ] Crash-free sessions: ≥99.5% on Android (Crashlytics).
- [ ] Sync resync after device offline for 7 days: completes without manual intervention.
- [ ] Token refresh success rate: ≥99% (per MCP connection).
- [ ] Circuit breaker correctly trips after 5 consecutive provider failures and recovers within the cooldown window.
- [ ] Agent budget enforcement is per-user not per-device; multi-device users hit caps within ±2 of the configured limit.

### 12.4 Security acceptance

- [ ] OAuth 2.1 + PKCE+S256 + Resource Indicators on all MCP connections.
- [ ] Tokens stored in platform secure storage (Android Keystore via `@capacitor-community/secure-storage-plugin`, WebCrypto-encrypted IndexedDB on web).
- [ ] No tokens in Automerge documents (verified by audit script).
- [ ] No PII in Sentry/Crashlytics logs (verified by redaction tests).
- [ ] All Tier 2 and Tier 3 actions confirmed in the audit log as user-confirmed (boolean column, always populated).
- [ ] Pre-OAuth disclosure copy shown before every consent flow.
- [ ] Step-up authorization required for scope upgrades.

### 12.5 Onboarding acceptance (preview cohort metrics)

Measured on a preview cohort of 50–100 invited users over 30 days:

- [ ] **Activation rate** ≥85% (users who accept at least one proposed lens during onboarding).
- [ ] **Day-7 retention** ≥60% (users who return at least once between days 4–7).
- [ ] **Lens-author rate** ≥30% by Day 14 (users who author at least one cell themselves).
- [ ] **Day-30 retention** ≥35%.
- [ ] **Time to first useful lens** ≤5 minutes (median, from install to first accepted lens).

### 12.6 Voice and copy acceptance

- [ ] No copy uses Tier 3 vocabulary in error messages, destructive confirmations, or first-time-user moments.
- [ ] First-person "I" voice used consistently per `wovith_voice_and_copy.md`.
- [ ] No marketing-speak adjectives in product UI.
- [ ] All loading states have meaningful copy (no generic "Loading...").
- [ ] All error messages name the affected lens/cell and offer at least one next step.

### 12.7 Build-quality acceptance

- [ ] Test coverage: domain layer ≥90%, runtime layer ≥85%, effects layer ≥70%.
- [ ] No ESLint boundary violations (enforced via `eslint-plugin-boundaries`).
- [ ] No TypeScript `any` outside explicitly typed escape hatches (`unknown` is fine).
- [ ] All Tier 1 docs have cross-references checked (no stale section numbers).
- [ ] Storybook (or equivalent) coverage for all 13 renderers.

---

## 13. The v1 ship sequence

Once acceptance criteria are met:

1. **Internal dogfood** (2 weeks): Wovith team uses Wovith full-time. Any blockers reset the clock.
2. **Closed beta** (50–100 invited users from Audience 1: Ink & Switch / Tana / Obsidian power users). Run for 30 days. Measure activation, retention, lens-author rate.
3. **Open beta** (waitlist users, ~1000) for 30 days.
4. **v1.0 launch** — public, app store listings, HN/Twitter announcement per the GTM doc.

The activation, retention, and authoring metrics from the closed beta gate the open beta; the open beta metrics gate v1.0.

---

## 14. What "out of scope for v1" means

A feature on the out-of-scope list is one of:
- **Deferred to a specific version** (v1.5 iOS, v2 co-lenses, v3+ garden).
- **Architecturally supported but not surfaced** (time travel data model exists; the UI is v2).
- **Genuinely not planned** (browser extension, AR/VR).

If the coding agent is asked to implement something out of scope, it should reply: *"This is on the [v2 / v3+ / v1.5] backlog per `wovith_v1_scope.md`. Suggest deferring to that release."* This isn't a stop sign — the user can override — but it surfaces the architectural decision.

---

## 15. Open questions to resolve before locking v1

These are scope items still under discussion. They should be resolved before the coding agent starts the corresponding subsystem:

1. **Stripe vs Paddle for billing**: Paddle handles VAT/sales tax. Default to Stripe unless Pro launches in jurisdictions where Paddle's MoR model is meaningfully simpler.
2. **Sync relay self-hosting option for v1**: probably no — Trust tier is post-v2 and self-hosting is a Trust feature. Defer.
3. **Apple sign-in support**: required for App Store if/when iOS ships. Defer to v1.5.
4. **Whether `.wovith-lens` export uses an open format spec**: yes, document the JSON schema as part of the v1 docs so other tools could read it.
5. **Whether the starter pack ships with the binary or downloads on first launch**: download on first launch so it can be refreshed quarterly without an app update.
