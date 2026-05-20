# Stage 0.5 Google Calendar

## Purpose

Stage 0.5 proves that the hardened Wovith runtime can evaluate one real read-only source while keeping the Stage 0 synthetic demo intact.

Implemented source:

```text
google.calendar.events
```

Primary DSL:

```text
from google.calendar.events
where start after now()
sort by start asc
take 10
show as table
```

## Scope

Stage 0.5 includes:

- Google Calendar events read-only connector.
- Google Identity Services browser token flow.
- In-memory access token only.
- Primary calendar upcoming events.
- Existing canonical DSL validation, scheduler, renderers, provenance, Why panel, warning summaries, and redacted persistence.
- Mock connector path for CI and E2E tests.

Stage 0.5 intentionally excludes:

- Gmail, Drive, Tasks, Contacts, or Google Workspace MCP.
- Calendar event create, update, patch, delete, invites, or reminder writes.
- Calendar list browsing or multi-calendar selection.
- Incremental sync tokens, watch channels, push notifications, freebusy, or batch requests.
- NL/model integration, mobile, sync, Automerge, marketplace, widgets, payments, or autonomous background actions.

## Environment

Create `.env.local`:

```bash
VITE_GOOGLE_CLIENT_ID=your-oauth-web-client-id.apps.googleusercontent.com
```

Do not use or commit a client secret. Stage 0.5 is a browser-only local prototype.

## Google Cloud Setup

1. Create or select a Google Cloud project.
2. Enable the Google Calendar API.
3. Configure the OAuth consent screen.
4. Create an OAuth web client.
5. Add a local dev origin such as `http://localhost:5173`.
6. Put the OAuth web client ID in `.env.local`.
7. Do not create, use, or commit a client secret.

Requested scope:

```text
https://www.googleapis.com/auth/calendar.events.readonly
```

No Gmail, Drive, broad Calendar, profile, email, or write scopes are requested.

## Data Handling

- Access tokens are held in memory only.
- No refresh token is requested or stored.
- No token is stored in `localStorage`.
- Disconnect clears the in-memory token and connector account state.
- Calendar reads use `events.list` for the primary calendar only.
- Calendar writes are not implemented.
- Evidence-tier persistence redacts event titles, descriptions, and locations.
- Full-output persistence can store full output only if explicitly configured by snapshot policy, as in Stage 0 hardening.

## Demo Script

1. Run `corepack pnpm dev`.
2. Open `http://localhost:5173`.
3. Confirm the synthetic Daily Work Lens still works.
4. In the sidebar, inspect the Google Calendar connector panel.
5. If setup is missing, confirm the UI shows `VITE_GOOGLE_CLIENT_ID` is required.
6. Click **Connect Google Calendar**.
7. Complete Google consent for the read-only events scope.
8. Confirm **Google Upcoming Events** appears.
9. Refresh the cell if needed.
10. Confirm upcoming events render as a table.
11. Open **Why** on an event row.
12. Confirm the rule trace and evidence reference `google.calendar.events`.
13. Click **Disconnect** and confirm the cell becomes blocked.
14. Click **Clear Cached Results** and confirm cached outputs clear without disconnecting credentials.

## Troubleshooting

- **Missing client ID:** set `VITE_GOOGLE_CLIENT_ID` in `.env.local`, then restart Vite.
- **Unverified OAuth app:** use a test user account or complete the consent-screen setup needed for your Google project.
- **Popup blocked:** allow popups for the local dev origin and retry connect.
- **Expired token:** reconnect from the Google Calendar panel.
- **401 or 403:** reconnect and confirm the exact read-only events scope was granted.
- **No upcoming events:** the default cell reads `start after now()` from the primary calendar only.

## Known Limitations

- Primary calendar only.
- No calendar list or calendar picker.
- No writes of any kind.
- No server-side token refresh.
- No refresh token.
- No incremental sync.
- No push notifications.
- No production OAuth verification work in Stage 0.5.
- All-day dates are normalized to the evaluation clock timezone with the small Stage 0 timezone helper.
- E2E tests use an explicit mock connector path and do not call Google.
