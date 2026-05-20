import type { CellDefinition, LensDefinition } from "@/domain/types";
import { makeCellFromDsl } from "@/runtime/starter-lens";

export const GOOGLE_CALENDAR_CELL_ID = "cell_google_upcoming_events";

export function createGoogleCalendarCell(
  lensId: LensDefinition["id"],
  now = "2026-05-20T09:00:00.000Z",
): CellDefinition {
  return makeCellFromDsl({
    id: GOOGLE_CALENDAR_CELL_ID,
    lensId,
    title: "Google Upcoming Events",
    description: "Upcoming events from your primary Google Calendar.",
    now,
    dsl: `from google.calendar.events
where start after now()
where start before in_days(90)
sort by start asc
take 10
show as table`,
  });
}

export function lensHasGoogleCalendarCell(lens: LensDefinition): boolean {
  return lens.cells.some((cell) => cell.id === GOOGLE_CALENDAR_CELL_ID);
}

export function ensureGoogleCalendarCell(
  lens: LensDefinition,
  updatedAt: string,
): LensDefinition {
  if (lensHasGoogleCalendarCell(lens)) {
    return lens;
  }
  const cell = createGoogleCalendarCell(lens.id, updatedAt);
  return {
    ...lens,
    updatedAt: cell.updatedAt,
    cells: [...lens.cells, cell],
  };
}
