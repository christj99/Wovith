import { describe, expect, it, vi } from "vitest";

import {
  GOOGLE_CALENDAR_CONNECTOR_ID,
  GOOGLE_CALENDAR_READONLY_SCOPE,
  MockGoogleCalendarTokenProvider,
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
    expect(cell.canonicalDsl).toContain("where start before in_days(90)");
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
    expect(result.payload.table?.columns).toEqual([
      "title",
      "start",
      "end",
      "attendees",
      "location",
      "status",
    ]);
    expect(result.payload.table?.columns).not.toContain("id");
    expect(result.payload.table?.columnLabels).toMatchObject({
      attendees: "Attendees",
      end: "End",
      location: "Location",
      start: "Start",
      status: "Status",
      title: "Title",
    });
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
                organizer: { email: "unique-organizer-884@example.test" },
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
    expect(raw).not.toContain("unique-organizer-884@example.test");
    expect(raw).not.toContain('"payload"');
    expect(raw).not.toContain('"raw"');
  });

  it("full-output tier explicitly persists Google Calendar output", async () => {
    const storage = new MemoryStorage();
    const store = new LocalStage0Store(storage);
    const lens = {
      ...ensureGoogleCalendarCell(
        createDailyWorkLens(),
        "2026-05-20T13:00:00.000Z",
      ),
      snapshotPolicy: {
        tier: "full-output" as const,
        retentionDays: 30,
        syncSnapshots: false as const,
      },
    };
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
                id: "full-output-event",
                summary: "Full Output Private Summary 314",
                start: { dateTime: "2026-05-20T18:00:00.000Z" },
                end: { dateTime: "2026-05-20T18:30:00.000Z" },
                location: "Full Output Private Location 315",
                description: "Full Output Private Description 316",
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

    expect(raw).toContain("Full Output Private Summary 314");
    expect(store.listEvaluations(cell.id)[0]?.fullOutput).toBeDefined();
  });

  it("disconnect keeps lens definitions but blocks Google cell evaluation", async () => {
    const storage = new MemoryStorage();
    const store = new LocalStage0Store(storage);
    const lens = ensureGoogleCalendarCell(
      createDailyWorkLens(),
      "2026-05-20T13:00:00.000Z",
    );
    const provider = new MockGoogleCalendarTokenProvider();
    await provider.connect();
    provider.disconnect();
    store.saveLens(lens);
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

    expect(provider.getAccessToken()).toBeNull();
    expect(store.getLens(lens.id)).not.toBeNull();
    expect(result.freshness).toBe("blocked");
    expect(result.errors[0]?.code).toBe("google-calendar-not-connected");
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
