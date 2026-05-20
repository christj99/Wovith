import { asIsoDateTime, asSourceItemId, stableHash } from "@/domain/ids";
import {
  dateOnlyToStartOfDayInTimeZone,
  resolveAstValue,
  toDateComparable,
} from "@/domain/time";
import type {
  CellAst,
  EvaluationClock,
  Result,
  SourceAdapter,
  SourceItem,
  SourceQueryContext,
  SourceQueryResult,
  SourceSchema,
  TaintedValue,
  WovithError,
} from "@/domain/types";
import type { GoogleCalendarTokenProvider } from "@/connectors/google-calendar/google-calendar-auth";

import { googleCalendarEventsSchema } from "./schema";

interface GoogleCalendarEventDate {
  date?: string;
  dateTime?: string;
  timeZone?: string;
}

interface GoogleCalendarEvent {
  id?: string;
  summary?: string;
  start?: GoogleCalendarEventDate;
  end?: GoogleCalendarEventDate;
  attendees?: unknown[];
  location?: string;
  description?: string;
  organizer?: {
    email?: string;
  };
  status?: string;
  eventType?: string;
  htmlLink?: string;
  updated?: string;
}

interface GoogleCalendarEventsResponse {
  summary?: string;
  items?: GoogleCalendarEvent[];
  nextPageToken?: string;
  etag?: string;
}

export interface GoogleCalendarSourceAdapterOptions {
  tokenProvider: GoogleCalendarTokenProvider;
  fetchImpl?: typeof fetch;
  apiBaseUrl?: string;
  maxPages?: number;
}

export class GoogleCalendarSourceAdapter implements SourceAdapter {
  readonly sourceId = googleCalendarEventsSchema.sourceId;

  private readonly fetchImpl: typeof fetch;
  private readonly apiBaseUrl: string;
  private readonly maxPages: number;

  constructor(private readonly options: GoogleCalendarSourceAdapterOptions) {
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.apiBaseUrl =
      options.apiBaseUrl ?? "https://www.googleapis.com/calendar/v3";
    this.maxPages = options.maxPages ?? 3;
  }

  async schema(): Promise<SourceSchema> {
    return googleCalendarEventsSchema;
  }

  async query(
    ast: CellAst,
    context?: SourceQueryContext,
  ): Promise<Result<SourceQueryResult>> {
    if (!context?.clock) {
      return {
        ok: false,
        error: {
          code: "google-calendar-clock-missing",
          message: "Google Calendar queries require an evaluation clock.",
        },
      };
    }

    const token = this.options.tokenProvider.getAccessToken();
    if (!token) {
      return {
        ok: false,
        error: {
          code: "google-calendar-not-connected",
          message:
            "Connect Google Calendar read-only access to evaluate events.",
        },
      };
    }

    try {
      const events: GoogleCalendarEvent[] = [];
      let nextPageToken: string | undefined;
      let lastResponse: GoogleCalendarEventsResponse | undefined;
      const queryPlan = buildCalendarQueryPlan(ast, context.clock);

      for (let page = 0; page < this.maxPages; page += 1) {
        const url = this.eventsListUrl(queryPlan, nextPageToken);
        const response = await this.fetchImpl(url.toString(), {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token.accessToken}`,
          },
        });

        if (!response.ok) {
          const errorBody = await readGoogleErrorBody(response);
          return {
            ok: false,
            error: googleCalendarHttpError(response.status, errorBody),
          };
        }

        const body = (await response.json()) as GoogleCalendarEventsResponse;
        lastResponse = body;
        events.push(...(body.items ?? []));
        nextPageToken = body.nextPageToken;
        if (!nextPageToken || events.length >= queryPlan.targetItemCount) {
          break;
        }
      }

      return {
        ok: true,
        value: {
          items: events.map((event) =>
            mapGoogleCalendarEvent(event, {
              calendarSummary: lastResponse?.summary ?? null,
              clock: context.clock,
            }),
          ),
          sourceCursor: lastResponse?.etag ?? nextPageToken ?? null,
        },
      };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "google-calendar-network-error",
          message: `Google Calendar events could not be fetched. Browser error: ${errorMessage(error)}. Check that the Google Calendar API is enabled for this project and that the browser is online.`,
          details: errorDetails(error),
        },
      };
    }
  }

  private eventsListUrl(
    queryPlan: CalendarQueryPlan,
    pageToken: string | undefined,
  ): URL {
    const url = new URL(`${this.apiBaseUrl}/calendars/primary/events`);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("showDeleted", "false");
    url.searchParams.set("timeZone", queryPlan.timeZone);
    url.searchParams.set("maxResults", String(queryPlan.maxResults));
    if (queryPlan.orderByStartTime) {
      url.searchParams.set("orderBy", "startTime");
    }
    if (queryPlan.timeMin) {
      url.searchParams.set("timeMin", queryPlan.timeMin);
    }
    if (queryPlan.timeMax) {
      url.searchParams.set("timeMax", queryPlan.timeMax);
    }
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }
    return url;
  }
}

interface CalendarQueryPlan {
  timeZone: string;
  timeMin: string;
  timeMax?: string;
  maxResults: number;
  targetItemCount: number;
  orderByStartTime: boolean;
}

function buildCalendarQueryPlan(
  ast: CellAst,
  clock: EvaluationClock,
): CalendarQueryPlan {
  const take = ast.take?.count ?? 10;
  const lowerBound = ast.where
    .filter((predicate) => predicate.field === "start")
    .find(
      (predicate) => predicate.op === "after" || predicate.op === "on_or_after",
    );
  const upperBound = ast.where
    .filter((predicate) => predicate.field === "start")
    .find(
      (predicate) =>
        predicate.op === "before" || predicate.op === "on_or_before",
    );
  const resolvedLower = lowerBound
    ? resolveAstValue(lowerBound.value, clock)
    : undefined;
  const resolvedUpper = upperBound
    ? resolveAstValue(upperBound.value, clock)
    : undefined;
  const lowerTime = toDateComparable(resolvedLower);
  const upperTime = toDateComparable(resolvedUpper);

  return {
    timeZone: clock.timeZone,
    timeMin:
      lowerTime === null
        ? clock.now.toISOString()
        : new Date(lowerTime).toISOString(),
    timeMax: upperTime === null ? undefined : new Date(upperTime).toISOString(),
    maxResults: Math.min(Math.max(take * 3, 10), 100),
    targetItemCount: Math.min(Math.max(take * 2, 10), 100),
    orderByStartTime: Boolean(
      ast.sort?.some(
        (sort) => sort.field === "start" && sort.direction === "asc",
      ),
    ),
  };
}

export function mapGoogleCalendarEvent(
  event: GoogleCalendarEvent,
  input: { calendarSummary: string | null; clock: EvaluationClock },
): SourceItem {
  const id = asSourceItemId(event.id ?? stableHash(event));
  const start = googleDateToIso(event.start, input.clock);
  const end = googleDateToIso(event.end, input.clock);
  const raw = {
    ...event,
    calendarSummary: input.calendarSummary,
  };
  const sourceId = googleCalendarEventsSchema.sourceId;
  const sourceRef = { sourceId, itemId: id };
  const value = (
    field: string,
    fieldValue: unknown,
    trust: TaintedValue["trust"] = "connector-metadata",
  ): TaintedValue => ({
    value: fieldValue,
    trust,
    sourceRef: { ...sourceRef, field },
    contentHash: stableHash(fieldValue),
  });

  return {
    id,
    sourceId,
    updatedAt: event.updated ? asIsoDateTime(event.updated) : start,
    contentHash: stableHash(raw),
    fields: {
      id: value("id", id),
      title: value(
        "title",
        event.summary ?? "(untitled event)",
        "external-content",
      ),
      start: value("start", start),
      end: value("end", end),
      attendees: value("attendees", event.attendees?.length ?? 0),
      location: value("location", event.location ?? null, "external-content"),
      description: value(
        "description",
        event.description ?? null,
        "external-content",
      ),
      organizer_email: value("organizer_email", event.organizer?.email ?? null),
      calendar_id: value("calendar_id", "primary"),
      calendar_summary: value("calendar_summary", input.calendarSummary),
      status: value("status", event.status ?? "confirmed"),
      event_type: value("event_type", event.eventType ?? "default"),
      html_link: value("html_link", event.htmlLink ?? null),
    },
  };
}

function googleDateToIso(
  value: GoogleCalendarEventDate | undefined,
  clock: EvaluationClock,
): SourceItem["updatedAt"] {
  if (value?.dateTime) {
    const time = Date.parse(value.dateTime);
    return asIsoDateTime(
      Number.isNaN(time)
        ? clock.now.toISOString()
        : new Date(time).toISOString(),
    );
  }
  if (value?.date) {
    return asIsoDateTime(
      (
        dateOnlyToStartOfDayInTimeZone(
          value.date,
          value.timeZone ?? clock.timeZone,
        ) ?? clock.now
      ).toISOString(),
    );
  }
  return asIsoDateTime(clock.now.toISOString());
}

interface GoogleErrorBody {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    errors?: Array<{
      domain?: string;
      reason?: string;
      message?: string;
    }>;
  };
}

async function readGoogleErrorBody(
  response: Response,
): Promise<GoogleErrorBody | null> {
  try {
    return (await response.json()) as GoogleErrorBody;
  } catch {
    return null;
  }
}

function googleCalendarHttpError(
  status: number,
  body: GoogleErrorBody | null = null,
): WovithError {
  const reason = body?.error?.errors?.[0]?.reason;
  const googleMessage = body?.error?.message;
  if (status === 403 && reason === "accessNotConfigured") {
    return {
      code: "google-calendar-api-disabled",
      message:
        "Google Calendar API is not enabled for this Google Cloud project. Enable the Google Calendar API, wait a minute, then reconnect.",
      details: body,
    };
  }
  if (status === 401) {
    return {
      code: "google-calendar-token-expired",
      message: googleMessage
        ? `Google Calendar authorization expired: ${googleMessage}. Reconnect to refresh.`
        : "Google Calendar authorization expired. Reconnect to refresh.",
      details: body ?? { status },
    };
  }
  if (status === 403) {
    return {
      code: "google-calendar-permission-blocked",
      message: googleMessage
        ? `Google Calendar read-only permission was blocked: ${googleMessage}.`
        : "Google Calendar read-only permission was blocked or revoked. Reconnect to refresh.",
      details: body ?? { status },
    };
  }
  return {
    code: "google-calendar-http-error",
    message: googleMessage
      ? `Google Calendar returned HTTP ${status}: ${googleMessage}.`
      : `Google Calendar returned HTTP ${status}.`,
    details: body ?? { status },
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function errorDetails(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }
  return error;
}

export class MockGoogleCalendarSourceAdapter extends GoogleCalendarSourceAdapter {
  constructor(tokenProvider: GoogleCalendarTokenProvider) {
    super({
      tokenProvider,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            summary: "Primary calendar",
            etag: "mock-google-calendar-etag",
            items: [
              {
                id: "google-event-001",
                summary: "Design review",
                start: { dateTime: "2026-05-20T18:00:00.000Z" },
                end: { dateTime: "2026-05-20T18:30:00.000Z" },
                attendees: [{ email: "mira@example.test" }],
                location: "Video",
                description: "Review launch polish.",
                organizer: { email: "organizer@example.test" },
                status: "confirmed",
                eventType: "default",
                htmlLink: "https://calendar.google.test/event/google-event-001",
                updated: "2026-05-20T12:00:00.000Z",
              },
            ],
          }),
          { status: 200 },
        ),
    });
  }
}
