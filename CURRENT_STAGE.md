# Current Stage

## Stage 1: Private Alpha Daily Work Lens

Wovith is currently at **Stage 1**. This stage turns the completed Stage 0.75 foundation into a private-alpha Daily Work Lens product while keeping connector scope narrow.

The current runtime remains:

```text
source -> cell AST -> canonical DSL -> validation -> scheduler/evaluation -> renderer -> provenance/Why panel -> redacted local persistence
```

Wovith is still a lens runtime, not a chatbot, not a broad connector platform, and not an automation system.

## Current Outcome

The app runs as a Vite + React + TypeScript web app with:

- local multi-lens support
- first-run lens template creation
- three Stage 1 templates:
  - Daily Work Lens
  - Meeting Prep Lens
  - Calendar Health Lens
- cell rename, duplicate, enable/disable, and delete controls
- local-only alpha feedback buttons per cell
- canonical DSL editor
- renderer output for `list`, `count`, `table`, and `raw`
- item-level Why buttons and dialog-like Why panel
- redacted evidence-tier local persistence
- Google Calendar connector panel

Calendar remains the only real connector:

- `google.calendar.events`

The synthetic Stage 0 demo lens is still available as an explicit local demo lens, and the synthetic source tests remain part of the regression suite.

## Stage 1 Calendar Fields

Stage 1 extends `google.calendar.events` with locally computed Calendar-derived fields:

- `duration_minutes`
- `has_location`
- `has_description`
- `title_missing`
- `is_outside_work_hours`

These fields are derived from read-only event data. They do not require new Google scopes and do not write to Google Calendar.

## Stage 1 Validation Support

Stage 1 adds:

- `STAGE_1_PRODUCT_DECISION.md`
- `STAGE_1_DRIVE_DECISION.md`
- `STAGE_1_VALIDATION_PLAN.md`
- `STAGE_1_ALPHA_LOG_TEMPLATE.md`

Real-world Stage 0.5 validation remains documented in `STAGE_0_5_REAL_WORLD_VALIDATION.md` without private calendar details.

## Drive Decision Gate

Drive is decision-gate only in Stage 1. No Drive connector, Google Picker, Drive OAuth, Drive API calls, or Drive source schemas were added.

If document context is needed later, the preferred path is user-selected files with Google Picker and `drive.file`, not broad Drive metadata by default.

## What Stage 1 Did Not Add

Stage 1 did **not** add:

- Gmail
- Google Drive connector
- Google Tasks
- Calendar writes
- calendar create/update/delete
- calendar list or multi-calendar selection
- Google Workspace MCP
- arbitrary MCP
- NL/model integration
- mobile
- sync
- Automerge
- marketplace
- widgets
- custom renderers
- payments
- autonomous background actions
- hidden writes

## Verification

The implementation should be verified with:

```text
corepack pnpm lint
corepack pnpm format
corepack pnpm test
corepack pnpm build
corepack pnpm test:e2e
```

## Known Limitations

- Google Calendar tokens are held in memory only; reload may require reconnecting.
- Google Calendar is primary-calendar only.
- There are no calendar writes, calendar list browsing, sync tokens, or push notifications.
- There is no natural-language-to-AST compiler.
- There is no Drive implementation.
- Persistence uses browser `localStorage`, not sync.
- Alpha feedback is local only and intentionally simple.
- Stage 1 is private alpha, not production readiness.
