# Stage 1 Product Decision

## Status

Stage 1 is the **Private Alpha Daily Work Lens** implementation stage.

It builds on Stage 0.75:

- synthetic local lens runtime
- AST-first canonical DSL
- validation
- scheduler/evaluation
- renderers
- provenance and Why panel
- redacted local persistence
- warning summaries
- one real read-only connector: `google.calendar.events`
- real-world personal Google Calendar validation
- accessibility, quality, and privacy regression pass

## Decision

Stage 1 makes Wovith usable as a private-alpha daily work product centered on:

- daily clarity
- upcoming commitments
- meeting prep
- persistent inspectable lenses

The core promise is:

> Open Wovith in the morning and understand your day, upcoming commitments, and meeting context through persistent, inspectable lenses.

## Target Users

Stage 1 is for:

1. The project owner using Wovith personally.
2. One to three technical knowledge workers comfortable with a local private alpha.

This is not a public beta and not a mainstream consumer product stage.

## Source Scope

Calendar remains the only real connector in Stage 1.

Implemented real source:

- `google.calendar.events`

Drive is decision-gate only. Stage 1 does not implement Drive access, Google Picker, Drive OAuth, Drive API calls, or Drive schemas.

## Included

Stage 1 includes:

- multi-lens local UI
- deterministic lens templates
- Daily Work Lens
- Meeting Prep Lens
- Calendar Health Lens
- cell rename
- cell duplicate
- cell enable/disable
- cell delete with confirmation
- Calendar-derived fields:
  - `duration_minutes`
  - `has_location`
  - `has_description`
  - `title_missing`
  - `is_outside_work_hours`
- explicit local-only alpha feedback
- first-run template creation
- one-week alpha validation docs
- Drive decision gate document

## Excluded

Stage 1 does not add:

- Gmail
- Google Drive connector
- Google Tasks
- Calendar writes
- event create/update/delete
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

## Stage 1 Templates

Stage 1 ships three deterministic templates:

- Daily Work Lens
- Meeting Prep Lens
- Calendar Health Lens

Template cells use canonical DSL and validate against the existing source schema registry. Templates are not model-generated and are not a marketplace.

## Acceptance Criteria

Stage 1 is accepted when:

1. A user can create the three local lens templates.
2. A user can switch between saved lenses.
3. Lens definitions persist after reload.
4. Every template cell validates through source schemas.
5. Calendar remains read-only.
6. Every rendered item still has Why/provenance.
7. Evidence-tier persistence remains redacted.
8. The user can rename, duplicate, disable, enable, and delete cells locally.
9. Local-only feedback can be recorded and cleared.
10. A one-week validation plan exists.
11. Drive remains a documented decision gate only.
12. Lint, format, unit tests, build, and E2E pass.

## One-Week Validation Plan

During alpha validation, record:

- whether Wovith was opened
- which lens was used
- useful signal found
- noisy or irrelevant item
- whether Why was inspected
- whether a lens or cell was edited
- what Wovith should have shown
- whether the result was trusted
- privacy or permission concerns

Use `STAGE_1_ALPHA_LOG_TEMPLATE.md`.

Do not commit private calendar event titles, descriptions, locations, attendees, links, or screenshots.

## Drive Decision

Drive is not implemented in Stage 1.

If document context becomes necessary later, prefer user-selected files through Google Picker and `drive.file` over broad Drive metadata. Broad `drive.metadata.readonly` remains a higher-risk restricted-scope path that needs explicit product and privacy review.
