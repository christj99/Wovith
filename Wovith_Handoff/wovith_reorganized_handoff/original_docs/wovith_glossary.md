# Wovith Glossary

Vocabulary definitions for the Wovith product and codebase. Alphabetical. One line per term unless ambiguity requires more.

This glossary exists to prevent terminology drift: when a doc, code comment, error message, or UI string uses one of these words, it means what's defined here. If you find yourself wanting to redefine a term, update this glossary first — don't let two definitions exist.

---

**Action tier** — A four-level model (Tier 0–3) defined in the security doc for how agent-initiated actions get user confirmation. Tier 0: read-only, no confirmation. Tier 1: notify after the fact. Tier 2: review (Intent Preview, batched approval). Tier 3: hold-to-confirm for destructive/irreversible actions. Distinct from pricing tiers, storage layers, and vocabulary tiers.

**Adapton** — The push-pull incremental computation algorithm used by Wovith's cell runtime. Push phase propagates dirtiness through the dependency graph; pull phase recomputes on demand when an observed cell needs a fresh value.

**Agent** — In Wovith, an LLM (Claude Sonnet 4.6 by default) invoked from inside a cell expression via `enrich each with agent(...)`. Not to be confused with "agent" as a connected service or "agent" as a chatbot — Wovith has no chat surface.

**Agent budget** — The per-user daily limit on LLM invocations from cells, measured in *units* (weighted by model class: Haiku=1, Sonnet=5, Opus=15). Has soft cap (triggers degradation), hard cap (refuses calls), RPM bucket, TPM bucket. Free 50 soft / 100 hard, Pro 500/1000, Trust 5000 hard only (no soft cap).

**Agent enrichment** — A DSL clause (`enrich each with agent("...")`) that runs an LLM call per record in the result stream, attaching the agent's output as a new field.

**Automerge document** — The unit of CRDT-backed persistence. Each lens, the user profile, captures, calibration state, and the budget doc are all separate Automerge documents. Identified by `automerge:<base58check>` URLs.

**Canvas** — The spatial workspace that holds lenses. A user has one or more canvases; each canvas has a dock of lenses. Visible only on the web build at v1 (larger-screen experience); the Android UI collapses the canvas into a stacked-cell scroll.

**Capacitor** — The cross-platform native wrapper used to ship Wovith as an Android app at v1. Version 8. The web build at wovith.app is the same React codebase running without the Capacitor shell.

**Captures** — Voice notes, text snippets, links, and other quick-input content stored in a dedicated Automerge document (the CapturesDoc). Bucketed by day.

**Cell** — The atomic unit of a lens. A cell has an expression (in the DSL), a renderer, and a freshness lifecycle. Cells are reactive: when their data sources change, they recompute. A lens has 1–N cells (typically 3–7).

**Cell expression** — The DSL string in a cell that specifies the source, transformations, agent enrichments (if any), and renderer. Parsed to a DSL AST (see `wovith_schemas.ts` section 4).

**Cell runtime** — The non-React, reactive engine that registers cells, tracks dependencies, schedules evaluations, and emits state changes. Specified in `wovith_cell_runtime.md`.

**Cell state** — The logical state of a cell tracked by the runtime: one of *idle*, *fetching*, *fresh*, *stale*, *recomputing*, *failed*, *waiting*. Distinct from visual freshness state (9 values; what the renderer shows). Mapping in cell_runtime doc.

**Circuit breaker** — A safety mechanism in the agent budget tracker that opens (refuses calls) after a threshold of consecutive provider errors. Half-open after a cooldown to probe recovery.

**CIMD** — Client ID Metadata Documents (RFC 8414+). Used by Wovith's MCP client for dynamic OAuth client registration with first-party MCP servers.

**Cold start** — The first launch on a new device: warming the local cache, fetching Automerge documents from the sync relay, performing initial mining. Target: under 30 seconds for primary profile + canvas + lens.

**Connection** — A user's authorized connection to one connector (e.g., "Chris's Personal Gmail" is one connection; "Chris's Work Gmail" is another, separate connection). Holds tokens, scope tier, health state.

**Connector** — A connectable external service. At v1, Wovith ships three connectors: Google Drive, Gmail, Google Calendar. All three use Google's first-party MCP servers (`drivemcp.googleapis.com`, etc.).

**Counter-and-flag model** — The simple calibration approach at v1: per-source counters increment on dismiss/pin signals; per-source flags track muted state. Replaces a learned recommender system; targeted at 80% of value, 1% of complexity.

**Co-lens** — A lens shared with one or more named collaborators with real-time edit sync. v2 feature; not in v1.

**CRDT** — Conflict-free Replicated Data Type. Wovith uses Automerge for CRDT-backed documents that merge cleanly across devices.

**DSL** — Wovith's domain-specific language for cell expressions. Two equivalent syntactic forms: pipe (`drive.files | where ... | show as list`) and keyword-prefix (`from drive.files where ... show as list`). Specified in `wovith_dsl.md` and `wovith_dsl_grammar.md`.

**DSL AST** — The parsed abstract syntax tree of a cell expression. Types in `wovith_schemas.ts` section 4.

**Effect** — In the hexagonal architecture, an outbound side-effect module (storage, MCP, agent client, audit). Effects implement port interfaces defined in the domain layer.

**E2E encryption** — End-to-end encryption of sync traffic and stored documents. PBKDF2 (600k iterations) → HKDF per-doc keys. Default for Trust tier; opt-in for Pro; not available on Free (which has no multi-device sync anyway).

**Enrichment** — See *agent enrichment*.

**Feature-Sliced Design** — The architectural pattern used to organize React UI into vertical feature slices (each with its own components, hooks, and feature-specific logic), separated by ESLint boundaries from horizontal layers (domain, effects, adapters, shared).

**Filter clause** — A DSL step: `where <predicate>`. Filters the record stream.

**Freshness** — The age/recency state of a cell's data. Tracked logically (fresh/stale/recomputing) and visualized as 9 distinct states (Fresh, Steady, Stale, Recomputing, Working, Stuck, Failed, Suspended, Stub) per the renderer spec.

**Freshness budget** — Per-cell TTL after which a cell transitions from fresh to stale. Default per connector: Gmail/Drive 60s, Calendar 300s, web feeds 900s. Overridable per cell.

**Garden** — See *lens garden*.

**Hexagonal architecture** — The dependency-inversion pattern: domain logic depends only on abstract ports; concrete adapters live in effects/. Enables testing the runtime without I/O. Layer boundaries enforced by `eslint-plugin-boundaries` from day one.

**Intent Preview** — The Tier 2 confirmation pattern: instead of asking "should I do X?", the agent presents the full plan and the user approves the batch. Modeled on Smashing Magazine's 2026 Agentic UX patterns.

**Inverse lens mining** — See *mining*.

**Layer (storage)** — One of three storage levels in the data architecture: *synced docs* (Automerge), *local cache* (SQLite/IndexedDB), *runtime state* (in-memory). Renamed from "Tier 1/2/3" to avoid collision with action tiers.

**Layer (architectural)** — One of the horizontal architectural slices: *domain*, *runtime*, *effects*, *adapters*, *features*, *app*, *shared*. Enforced by path aliases and ESLint boundaries.

**Lens** — A bundle of cells with a name, a theme, and an arrangement on the canvas (or a stack order on mobile). Lenses are the user-facing unit of organization. A user has 1–N lenses; v1 starter pack ships 30+.

**Lens garden** — The community lens marketplace where users can publish, fork, rate, and discover lenses. v3+ feature. v1 ships the starter pack instead.

**Lens-as-prompt-export** — A v1 feature that serializes a lens's cells and their last-known outputs into a portable JSON document for sharing or pasting into another AI tool as context.

**Local cache** — The middle storage layer: cached MCP responses, agent responses, expensive cell values. Persisted, device-local, not synced, evictable. SQLite on native; IndexedDB on web.

**MCP** — Model Context Protocol. The 2026 standard for AI-to-tool integration. Wovith implements MCP 2025-11-25 with OAuth 2.1, PKCE+S256, Resource Indicators (RFC 8707), Streamable HTTP+SSE, and the Tasks API. Specified in `wovith_mcp_client.md`.

**MCP client** — Wovith's implementation of the MCP client side: connects to servers, manages OAuth tokens, sends tool calls, handles streaming.

**MCP server** — An external service that exposes its capabilities via MCP. v1 uses Google's first-party MCP servers for Drive, Gmail, Calendar.

**MCP tool** — A callable function exposed by an MCP server (e.g., Drive's `search_files`, Gmail's `list-threads`). Wovith cells invoke MCP tools to fetch data.

**Mining (inverse lens mining)** — The onboarding algorithm that analyzes the user's connected accounts to detect patterns and propose 3-5 starter lenses fitted to their actual data. Runs in the first 60 seconds after connection. Specified in `wovith_onboarding_mining.md`.

**NL-to-DSL bridge** — The natural-language-to-DSL translation layer. User types or speaks intent; an LLM with strict tool use (Claude Sonnet 4.6+, 99.8% schema match) produces a DSL expression that's validated and applied. Specified in `wovith_nl_to_dsl_bridge.md`.

**Pattern** — In the mining algorithm: a template that detects a specific signal pattern in a user's data (e.g., "user has 3-5 dormant threads with active contacts" → proposes a *Dropped Threads* cell). v1 has 30-50 patterns; distinct from *lens* (a pattern is a template; a lens is an instance composed from patterns).

**Pipe form** — One of two equivalent DSL syntactic forms: `drive.files | where ... | show as list`. The other is keyword-prefix form.

**Predicate** — A boolean expression in a `where` clause. Composable with `and`, `or`, `not`. Built from comparisons, in-set tests, time-relative tests, exists tests.

**Pricing tier** — *Free* (single-device, 50 units/day soft), *Pro* ($24/mo, multi-device, 500/1000 units), *Trust* ($48/mo, future post-v2, 5000 units, E2E, no soft cap). Explicitly named; doesn't number-collide with action tiers.

**Push-pull algorithm** — See *Adapton*.

**Renderer** — One of the 13 built-in visual components that turns a cell's output stream into a visible surface: list, feed, card, cards, timeline, grid, chart, table, kanban, map, text, count, raw. Custom renderers can be registered (extension point).

**Render clause** — A DSL step: `show as <renderer> [with {options}]`. Specifies which renderer the cell uses.

**Resource Indicator** — Per RFC 8707, a parameter binding an OAuth access token to a specific resource URL. Wovith uses this to prevent token reuse across MCP servers.

**RPM bucket** — Requests-per-minute token bucket in the budget tracker. Free 10 RPM, Pro 60 RPM, Trust 120 RPM. Bursts allowed up to 2x sustained rate.

**Runtime state** — The third storage layer: in-memory only, regenerated on app launch. Holds cell evaluation state, observation set, dependency graph, in-flight promises.

**Scope tier** — The OAuth scope tier a connection has granted: *read-only*, *read-and-write*, or *full*. Upgrading scope requires explicit user re-confirmation. Distinct from pricing tier and action tier.

**Signal-polyfill** — The TC39 Stage 1 reactivity primitive. Wovith uses the polyfill (`signal-polyfill`) until native browser support lands. The basis of the cell runtime's reactive evaluation.

**Source clause** — The first part of a cell expression: what data to read from. Forms: connector source (`drive.files`), cell reference (`@cellname`), variable reference (`$varname`), union, join, literal collection.

**Starter lens pack** — A curated set of 30-50 lenses authored by the Wovith team that ship as part of v1. Distinct from the v3+ lens garden (user-published lenses). Refreshed quarterly.

**Step** — A clause in a cell expression that transforms the record stream: filter, sort, take, group, distinct, map.

**Storage layer** — See *layer (storage)*.

**Streamable HTTP** — The MCP 2025 transport: HTTP POST + Server-Sent Events on a single endpoint. Replaces stdio for remote servers.

**Strict tool use** — Anthropic's `strict: true` mode for tool use, which guarantees JSON schema compliance. Used by the NL-to-DSL bridge to ensure produced DSL is always valid.

**Synced docs** — The top storage layer: the Automerge documents that sync across devices. Renamed from "Tier 1" in earlier drafts. Holds lens definitions, cell definitions, canvas layout, calibration state, agent budget doc.

**Tasks API** — The MCP feature for long-running operations: instead of holding the HTTP connection open, the server returns a task handle that the client polls for state and result.

**Tenure bonus** — A Free-tier benefit: users still active after Day 14 get an automatic cap relaxation (soft 50 → 75, hard 100 → 150). Communicated by a one-time in-app message.

**Time travel** — The ability to scrub a lens backward to see what cells showed at past timestamps. Built on Automerge history. v2 feature; not in v1 (the data model supports it but the UI ships in v2).

**TPM bucket** — Tokens-per-minute token bucket in the budget tracker, complementing RPM. Free 50K, Pro 500K, Trust 1M TPM.

**Trust tier** — The future $48/month tier. Not in v1; post-v2 launch. E2E encryption, multi-device sync with named collaborators (future co-lenses), no soft-cap degradation, higher hard caps, custom MCP server hosting.

**Unit (budget unit)** — The atomic measure of agent budget consumption. One unit ≈ one Haiku-class call. Sonnet calls cost ~5 units, Opus ~15. Caps are in units, not raw call counts, to fairly reflect cost.

**ULID** — Universally Unique Lexicographically Sortable Identifier (26-char Crockford base32). The ID format for all Wovith records (cells, lenses, audit log entries, etc.).

**Vocabulary tier** — One of three voice/copy tiers from the voice doc: *Tier 1* (universal), *Tier 2* (Wovith-native), *Tier 3* (technical). Restricts which words appear on which UI surfaces. Distinct from action tiers, storage layers, scope tiers, pricing tiers.

**Web build** — The same React + Vite codebase running in a browser (no Capacitor wrapper). At v1, this is Wovith's "large-screen experience" before native desktop ships in v2+.

**Wovith** — The product name. Pronounced /ˈwoʊ.vɪθ/ (WOH-vith). A personal lens runtime where users wear configurable lenses over their own data.

---

## Cross-references

- Full term lists in: `wovith_concept.md` (vision-level), `wovith_design_and_workflow.md` (UX-level), and the schemas file `wovith_schemas.ts` (types).
- For action governance details, see `wovith_security.md` section 4.
- For storage layer details, see `wovith_data_architecture.md`.
- For DSL syntax, see `wovith_dsl.md` and `wovith_dsl_grammar.md`.
