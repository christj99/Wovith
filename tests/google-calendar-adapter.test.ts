import { describe, expect, it, vi } from "vitest";

import type {
  ConnectorAccount,
  Result,
  SourceQueryResult,
} from "@/domain/types";
import { asConnectorAccountId } from "@/domain/ids";
import {
  GOOGLE_CALENDAR_CONNECTOR_ID,
  GOOGLE_CALENDAR_READONLY_SCOPE,
  type GoogleAccessToken,
  type GoogleCalendarTokenProvider,
} from "@/connectors/google-calendar/google-calendar-auth";
import {
  GoogleCalendarSourceAdapter,
  mapGoogleCalendarEvent,
} from "@/sources/google-calendar/google-calendar-adapter";
import { parseCanonicalDsl } from "@/dsl/parse";
import { testClock } from "@/testing/context";

const calendarDsl = `from google.calendar.events
where start after now()
where start before in_days(90)
sort by start asc
take 10
show as table`;

describe("Google Calendar source adapter", () => {
  it("constructs a read-only events.list request with auth and pushdown params", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        summary: "Primary calendar",
        items: [],
      }),
    );
    const adapter = new GoogleCalendarSourceAdapter({
      tokenProvider: connectedTokenProvider("calendar-token"),
      fetchImpl,
    });
    const ast = parseDsl(calendarDsl);

    const result = await adapter.query(ast, { clock: testClock });

    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [urlText, init] = fetchImpl.mock.calls[0];
    const url = new URL(String(urlText));
    expect(url.pathname).toBe("/calendar/v3/calendars/primary/events");
    expect(url.searchParams.get("singleEvents")).toBe("true");
    expect(url.searchParams.get("showDeleted")).toBe("false");
    expect(url.searchParams.get("orderBy")).toBe("startTime");
    expect(url.searchParams.get("timeZone")).toBe("America/New_York");
    expect(url.searchParams.get("timeMin")).toBe("2026-05-20T13:00:00.000Z");
    expect(url.searchParams.get("timeMax")).toBe("2026-08-18T13:00:00.000Z");
    expect(init?.method).toBe("GET");
    expect(init?.body).toBeUndefined();
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer calendar-token",
    });
  });

  it("binds the native browser fetch implementation", async () => {
    const originalFetch = globalThis.fetch;
    let calledWithBoundGlobal = false;
    globalThis.fetch = function (this: typeof globalThis) {
      calledWithBoundGlobal = this === globalThis;
      return Promise.resolve(
        jsonResponse({
          summary: "Primary calendar",
          items: [],
        }),
      );
    } as typeof fetch;
    try {
      const adapter = new GoogleCalendarSourceAdapter({
        tokenProvider: connectedTokenProvider("calendar-token"),
      });

      const result = await adapter.query(parseDsl(calendarDsl), {
        clock: testClock,
      });

      expect(result.ok).toBe(true);
      expect(calledWithBoundGlobal).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("maps timed events, missing summaries, and attendees", async () => {
    const adapter = new GoogleCalendarSourceAdapter({
      tokenProvider: connectedTokenProvider("calendar-token"),
      fetchImpl: async () =>
        jsonResponse({
          summary: "Primary calendar",
          items: [
            {
              id: "evt-1",
              start: { dateTime: "2026-05-20T18:00:00-04:00" },
              end: { dateTime: "2026-05-20T18:30:00-04:00" },
              attendees: [{ email: "a@example.test" }, { email: "b@test" }],
              organizer: { email: "organizer@example.test" },
              status: "confirmed",
              eventType: "default",
            },
          ],
        }),
    });

    const result = await adapter.query(parseDsl(calendarDsl), {
      clock: testClock,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const item = result.value.items[0];
      expect(item.id).toBe("evt-1");
      expect(item.fields.title.value).toBe("(untitled event)");
      expect(item.fields.start.value).toBe("2026-05-20T22:00:00.000Z");
      expect(item.fields.attendees.value).toBe(2);
      expect(item.fields.all_day.value).toBe(false);
      expect(item.fields.organizer_email.value).toBe("organizer@example.test");
    }
  });

  it("maps all-day event dates in the evaluation clock timezone", () => {
    const item = mapGoogleCalendarEvent(
      {
        id: "all-day-1",
        summary: "All day planning",
        start: { date: "2026-05-21" },
        end: { date: "2026-05-22" },
      },
      { calendarSummary: "Primary calendar", clock: testClock },
    );

    expect(item.fields.start.value).toBe("2026-05-21T04:00:00.000Z");
    expect(item.fields.end.value).toBe("2026-05-22T04:00:00.000Z");
    expect(item.fields.all_day.value).toBe(true);
  });

  it("follows bounded pagination", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          summary: "Primary calendar",
          nextPageToken: "page-2",
          items: [
            {
              id: "evt-1",
              summary: "First",
              start: { dateTime: "2026-05-20T18:00:00.000Z" },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          summary: "Primary calendar",
          items: [
            {
              id: "evt-2",
              summary: "Second",
              start: { dateTime: "2026-05-20T19:00:00.000Z" },
            },
          ],
        }),
      );
    const adapter = new GoogleCalendarSourceAdapter({
      tokenProvider: connectedTokenProvider("calendar-token"),
      fetchImpl,
    });

    const result = await adapter.query(parseDsl(calendarDsl), {
      clock: testClock,
    });

    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const secondUrl = new URL(String(fetchImpl.mock.calls[1][0]));
    expect(secondUrl.searchParams.get("pageToken")).toBe("page-2");
    expect(
      (result as Result<SourceQueryResult> & { ok: true }).value.items,
    ).toHaveLength(2);
  });

  it("surfaces 401 and 403 as connector errors", async () => {
    const unauthorized = new GoogleCalendarSourceAdapter({
      tokenProvider: connectedTokenProvider("calendar-token"),
      fetchImpl: async () => jsonResponse({}, 401),
    });
    const forbidden = new GoogleCalendarSourceAdapter({
      tokenProvider: connectedTokenProvider("calendar-token"),
      fetchImpl: async () => jsonResponse({}, 403),
    });

    const unauthorizedResult = await unauthorized.query(parseDsl(calendarDsl), {
      clock: testClock,
    });
    const forbiddenResult = await forbidden.query(parseDsl(calendarDsl), {
      clock: testClock,
    });

    expect(unauthorizedResult.ok).toBe(false);
    expect(unauthorizedResult.ok ? null : unauthorizedResult.error.code).toBe(
      "google-calendar-token-expired",
    );
    expect(forbiddenResult.ok).toBe(false);
    expect(forbiddenResult.ok ? null : forbiddenResult.error.code).toBe(
      "google-calendar-permission-blocked",
    );
  });

  it("surfaces disabled Google Calendar API errors clearly", async () => {
    const adapter = new GoogleCalendarSourceAdapter({
      tokenProvider: connectedTokenProvider("calendar-token"),
      fetchImpl: async () =>
        jsonResponse(
          {
            error: {
              code: 403,
              message:
                "Google Calendar API has not been used in project before or it is disabled.",
              errors: [{ reason: "accessNotConfigured" }],
            },
          },
          403,
        ),
    });

    const result = await adapter.query(parseDsl(calendarDsl), {
      clock: testClock,
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.error.code).toBe(
      "google-calendar-api-disabled",
    );
    expect(result.ok ? "" : result.error.message).toContain(
      "Google Calendar API is not enabled",
    );
  });

  it("surfaces network failures", async () => {
    const adapter = new GoogleCalendarSourceAdapter({
      tokenProvider: connectedTokenProvider("calendar-token"),
      fetchImpl: async () => {
        throw new Error("offline");
      },
    });

    const result = await adapter.query(parseDsl(calendarDsl), {
      clock: testClock,
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.error.code).toBe(
      "google-calendar-network-error",
    );
  });
});

function parseDsl(dsl: string) {
  const parsed = parseCanonicalDsl(dsl);
  if (!parsed.ok) {
    throw new Error(parsed.error.message);
  }
  return parsed.value;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function connectedTokenProvider(
  accessToken: string,
): GoogleCalendarTokenProvider {
  const token: GoogleAccessToken = {
    accessToken,
    scope: GOOGLE_CALENDAR_READONLY_SCOPE,
    expiresAt: "2026-05-20T14:00:00.000Z",
  };
  return {
    connect: async () => ({ ok: true, value: token }),
    disconnect: vi.fn(),
    getAccessToken: () => token,
    status: (): ConnectorAccount => ({
      id: asConnectorAccountId("google_calendar_primary"),
      connectorId: GOOGLE_CALENDAR_CONNECTOR_ID,
      provider: "google",
      displayName: "Google Calendar",
      status: "connected",
      grantedScopes: [GOOGLE_CALENDAR_READONLY_SCOPE],
    }),
  };
}
