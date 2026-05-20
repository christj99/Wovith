# Stage 0.5 Real-World Validation

## Milestone

Stage 0.5 was validated after the Google Calendar read-only connector was implemented and before Stage 0.75 quality work.

## Validated

- Google OAuth web client was configured for the local app origin.
- A personal primary Google Calendar was connected with the read-only events scope.
- **Google Upcoming Events** rendered real calendar data from `google.calendar.events`.
- The 90-day DSL window worked:

```text
from google.calendar.events
where start after now()
where start before in_days(90)
sort by start asc
take 10
show as table
```

- Table formatting was readable and did not show raw ISO datetimes by default.
- Warning summary appeared for external/sensitive event fields.
- Why panel opened for real calendar rows.
- Disconnect/reconnect behavior was exercised during local validation.
- No Gmail, Drive, Tasks, MCP, calendar writes, sync, NL/model integration, mobile, or additional connector scope was added.

## Not Validated

- Production OAuth verification.
- Multi-calendar selection or calendar list browsing.
- Calendar write actions.
- Incremental sync, push notifications, or watch channels.
- Mobile layouts beyond the existing responsive smoke coverage.

## Privacy Note

Do not commit private event titles, locations, descriptions, attendees, calendar IDs, links, or screenshots containing private calendar information. Real-world validation notes should describe behavior only.

## Follow-Up Observations

- All-day event end-date display needed a Stage 0.75 display-only correction because Google Calendar `end.date` is exclusive.
- Keyboard/focus behavior and Why panel accessibility needed a Stage 0.75 pass.
- Broader calendar edge cases still need mock-based tests before expanding beyond Stage 0.5.
