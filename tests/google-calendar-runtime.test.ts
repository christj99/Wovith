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
import type { ConnectorAccount } from "@/domain/types";
import { asConnectorAccountId } from "@/domain/ids";
import { evaluateCell } from "@/runtime/evaluator";
import { RuntimeScheduler } from "@/runtime/scheduler";
import { createDailyWorkLens } from "@/runtime/starter-lens";
import { GoogleCalendarSourceAdapter } from "@/sources/google-calendar/google-calendar-adapter";
import { sourceSchemaRegistry } from "@/sources/registry";
import { createSyntheticAdapters } from "@/sources/synthetic/synthetic-adapter";
import { LocalStage0Store, MemoryStorage } from "@/storage/local-store";
import { stage0ValidationContext, testClock } from "@/testing/context";

describe("Google Calendar runtime integration", () => {
  it("evaluates the Google Calendar cell through the existing runtime", async () => {
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
                id: "private-event-1",
                summary: "Private Stage 0.5 Review",
                start: { dateTime: "2026-05-20T18:00:00.000Z" },
                end: { dateTime: "2026-05-20T18:30:00.000Z" },
                attendees: [{ email: "mira@example.test" }],
                location: "Private Room 123",
                description: "Sensitive launch notes go here.",
                organizer: { email: "organizer@example.test" },
                status: "confirmed",
                eventType: "default",
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

    expect(result.freshness).toBe("fresh");
    expect(result.snapshot.outputSummary).toBe(
      "1 Google Calendar Events item(s)",
    );
    expect(result.payload.table?.rows[0]?.fields.title.value).toBe(
      "Private Stage 0.5 Review",
    );
    expect(result.evidence[0]?.sourceId).toBe("google.calendar.events");
    expect(
      result.warnings.some(
        (warning) => warning.code === "renderer-external-content-display",
      ),
    ).toBe(true);
  });

  it("blocks the Google Calendar cell when no adapter is connected", async () => {
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
    const scheduler = new RuntimeScheduler({
      adapters: createSyntheticAdapters(),
      sourceSchemas: sourceSchemaRegistry,
      validationContext: stage0ValidationContext,
      clock: testClock,
      adapterUnavailableErrors: {
        "google.calendar.events": {
          code: "google-calendar-not-connected",
          message:
            "Connect Google Calendar read-only access to evaluate this cell.",
        },
      },
    });

    const result = await scheduler.refreshCell(cell, lens);

    expect(result.freshness).toBe("blocked");
    expect(result.errors[0]?.code).toBe("google-calendar-not-connected");
  });

  it("redacts Google event text in evidence-tier persistence", async () => {
    const storage = new MemoryStorage();
    const store = new LocalStage0Store(storage);
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
                id: "private-event-2",
                summary: "Unique Private Calendar Summary 771",
                start: { dateTime: "2026-05-20T18:00:00.000Z" },
                end: { dateTime: "2026-05-20T18:30:00.000Z" },
                location: "Unique Sensitive Location 882",
                description: "Unique Sensitive Description 993",
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

    store.saveEvaluation(result, lens.snapshotPolicy);
    const raw = storage.getItem("wovith.stage0.store.v1") ?? "";

    expect(raw).not.toContain("Unique Private Calendar Summary 771");
    expect(raw).not.toContain("Unique Sensitive Location 882");
    expect(raw).not.toContain("Unique Sensitive Description 993");
    expect(raw).not.toContain('"payload"');
    expect(raw).not.toContain('"raw"');
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
