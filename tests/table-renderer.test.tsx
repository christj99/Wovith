import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  GOOGLE_CALENDAR_CONNECTOR_ID,
  GOOGLE_CALENDAR_READONLY_SCOPE,
  type GoogleAccessToken,
  type GoogleCalendarTokenProvider,
} from "@/connectors/google-calendar/google-calendar-auth";
import {
  GOOGLE_CALENDAR_CELL_ID,
  ensureGoogleCalendarCell,
} from "@/connectors/google-calendar/google-calendar-cell";
import { asConnectorAccountId } from "@/domain/ids";
import type { ConnectorAccount } from "@/domain/types";
import { TableRenderer } from "@/renderers/TableRenderer";
import { evaluateCell } from "@/runtime/evaluator";
import { createDailyWorkLens } from "@/runtime/starter-lens";
import { GoogleCalendarSourceAdapter } from "@/sources/google-calendar/google-calendar-adapter";
import { sourceSchemaRegistry } from "@/sources/registry";
import { stage0ValidationContext, testClock } from "@/testing/context";

describe("TableRenderer", () => {
  it("renders Google Calendar table columns with labels and readable dates", async () => {
    const lens = ensureGoogleCalendarCell(
      createDailyWorkLens(),
      "2026-05-20T13:00:00.000Z",
    );
    const cell = lens.cells.find(
      (entry) => entry.id === GOOGLE_CALENDAR_CELL_ID,
    );
    expect(cell).toBeDefined();
    if (!cell) {
      return;
    }
    const adapter = new GoogleCalendarSourceAdapter({
      tokenProvider: connectedTokenProvider(),
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            summary: "Primary calendar",
            items: [
              {
                id: "timed-event-1",
                summary: "Timed Design Review",
                start: { dateTime: "2026-05-20T18:00:00.000Z" },
                end: { dateTime: "2026-05-20T18:30:00.000Z" },
                attendees: [{ email: "mira@example.test" }],
                location: "Video",
                status: "confirmed",
              },
              {
                id: "all-day-event-1",
                summary: "All Day Planning",
                start: { date: "2026-05-22" },
                end: { date: "2026-05-23" },
                attendees: [],
                location: "HQ",
                status: "confirmed",
              },
            ],
          }),
        ),
    });
    const result = await evaluateCell({
      cell,
      lensId: lens.id,
      adapter,
      sourceSchema: sourceSchemaRegistry[cell.ast.from.sourceId],
      validationContext: stage0ValidationContext,
      clock: testClock,
    });

    render(<TableRenderer result={result} onWhy={vi.fn()} />);

    expect(screen.getByRole("columnheader", { name: "Title" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "Start" })).toBeVisible();
    expect(
      screen.getByRole("columnheader", { name: "Attendees" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("columnheader", { name: "Event ID" }),
    ).not.toBeInTheDocument();

    const timedRow = screen.getByRole("row", { name: /Timed Design Review/ });
    expect(within(timedRow).getByText("May 20, 2026, 2:00 PM")).toBeVisible();
    expect(within(timedRow).getByText("May 20, 2026, 2:30 PM")).toBeVisible();
    expect(
      within(timedRow).queryByText("timed-event-1"),
    ).not.toBeInTheDocument();

    const allDayRow = screen.getByRole("row", { name: /All Day Planning/ });
    expect(within(allDayRow).getByText("May 22, 2026")).toBeVisible();
    expect(within(allDayRow).getByText("May 23, 2026")).toBeVisible();
    expect(
      screen.queryByText("2026-05-20T18:00:00.000Z"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("2026-05-22T04:00:00.000Z"),
    ).not.toBeInTheDocument();
  });
});

function connectedTokenProvider(): GoogleCalendarTokenProvider {
  const token: GoogleAccessToken = {
    accessToken: "calendar-token",
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
