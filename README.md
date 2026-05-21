# Wovith

Wovith is a local, inspectable lens runtime. Stage 1 is a private-alpha Daily Work Lens product built on the completed Stage 0.75 foundation.

Stage 1 includes:

- multi-lens local UI
- lens templates
- Daily Work Lens
- Meeting Prep Lens
- Calendar Health Lens
- cell lifecycle controls
- local-only alpha feedback
- one real read-only connector: Google Calendar events

Calendar remains the only real connector. Stage 1 does not add Gmail, Drive, Tasks, Calendar writes, MCP, NL/model integration, mobile, sync, Automerge, marketplace, payments, widgets, or autonomous actions.

## Commands

```bash
corepack pnpm install
corepack pnpm dev
corepack pnpm lint
corepack pnpm format
corepack pnpm test
corepack pnpm build
corepack pnpm test:e2e
```

## Google Calendar Setup

For real Google Calendar testing, copy `.env.example` to `.env.local` and set:

```bash
VITE_GOOGLE_CLIENT_ID=
```

The app requests only:

```text
https://www.googleapis.com/auth/calendar.events.readonly
```

Access tokens are held in memory for this local prototype. They are not stored in localStorage.

## Using Stage 1

On first run, create a lens from one of the Stage 1 templates:

- Daily Work Lens
- Meeting Prep Lens
- Calendar Health Lens

The sidebar lists saved local lenses. Lenses persist in localStorage. Use **Clear Cached Results** to clear persisted evaluation/evidence cache for the current lens without deleting lens definitions or Google credentials.

Each cell can be renamed, duplicated, disabled, enabled, deleted, edited through canonical DSL, refreshed, and marked locally as useful or noisy.

## Stage Docs

See:

- [CURRENT_STAGE.md](CURRENT_STAGE.md)
- [STAGE_0_DEMO.md](STAGE_0_DEMO.md)
- [STAGE_0_5_GOOGLE_CALENDAR.md](STAGE_0_5_GOOGLE_CALENDAR.md)
- [STAGE_0_5_REAL_WORLD_VALIDATION.md](STAGE_0_5_REAL_WORLD_VALIDATION.md)
- [STAGE_1_PRODUCT_DECISION.md](STAGE_1_PRODUCT_DECISION.md)
- [STAGE_1_DRIVE_DECISION.md](STAGE_1_DRIVE_DECISION.md)
- [STAGE_1_VALIDATION_PLAN.md](STAGE_1_VALIDATION_PLAN.md)
- [STAGE_1_ALPHA_LOG_TEMPLATE.md](STAGE_1_ALPHA_LOG_TEMPLATE.md)
- [docs/canonical_docs](docs/canonical_docs)
