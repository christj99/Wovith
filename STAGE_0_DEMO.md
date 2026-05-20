# Stage 0 Demo

## Purpose

Stage 0 proves the local Wovith lens loop with synthetic data:

```text
synthetic source -> cell AST -> canonical DSL -> validation -> evaluation -> renderer -> provenance/Why panel -> local persistence
```

It is a local, inspectable runtime prototype. It is not a chatbot, connector product, automation agent, or sync system.

## Out Of Scope

Stage 0 intentionally excludes:

- real Google connectors
- OAuth
- Gmail access or Gmail writes
- arbitrary MCP servers
- natural-language/model integration
- mobile
- sync relay or E2E sync claims
- marketplace, widgets, payments, custom renderers, or autonomous background actions

## Commands

```bash
corepack pnpm install
corepack pnpm lint
corepack pnpm format
corepack pnpm test
corepack pnpm build
corepack pnpm test:e2e
corepack pnpm dev
```

`test:e2e` builds the app and serves `dist/` through a tiny local static server for Playwright.

## Demo Script

1. Open Wovith.
2. Select **Daily Work Lens**.
3. Confirm four cells render:
   - unread important messages
   - upcoming meetings
   - recently changed docs
   - stale tasks
4. Inspect the canonical DSL editor.
5. Edit a rule and save the cell.
6. Confirm the rendered result changes.
7. Enter invalid DSL and confirm a visible parse/validation error.
8. Click **Why** on a result item.
9. Confirm the Why panel shows reason, rule trace, evidence, and metadata.
10. Reload the browser and confirm the edited lens definition persists.
11. Click **Clear Cached Results** and confirm visible results are cleared until refresh.

## Expected Outcome

- Cells evaluate only synthetic sources.
- Canonical DSL remains strict.
- Invalid cells fail visibly.
- Every rendered item has provenance evidence.
- Snapshot persistence redacts evidence-tier cached data.
- Duplicate refreshes for a cell are deduped by the scheduler.
- Missing source schema/adapter produces a visible blocked state.
- Renderer/display warnings are summarized, non-fatal, and expandable for exact details.

## Known Limitations

- Storage is still browser `localStorage`, hardened with snapshot-aware persistence.
- Scheduler is intentionally small and on-demand; it is not a background job system.
- Evidence-tier persistence stores redacted previews and hashes, not reconstructable historical output.
- `today()` uses a small timezone helper suitable for Stage 0 tests; revisit before broad timezone-heavy features.
- E2E coverage is intentionally a minimal golden path.

## Hardening Acceptance Checklist

- [x] Snapshot-aware persistence and redaction.
- [x] Runtime scheduler with in-flight dedupe.
- [x] Visible blocked state for unavailable source schema/adapter.
- [x] Stricter canonical DSL parser.
- [x] Null/invalid date predicate safety.
- [x] Timezone-explicit evaluation clock.
- [x] Renderer/display field warnings.
- [x] Truthful synthetic source capabilities.
- [x] Cache/evidence clear command and UI.
- [x] Playwright E2E golden demo test.
- [x] GitHub Actions CI workflow.
- [x] Stage docs updated after hardening.
