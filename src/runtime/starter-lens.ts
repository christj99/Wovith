import { asCellId, asIsoDateTime, asLensId } from "@/domain/ids";
import type { CellAst, CellDefinition, LensDefinition } from "@/domain/types";
import { parseCanonicalDsl } from "@/dsl/parse";
import { serializeCellAst } from "@/dsl/serialize";

export const DAILY_WORK_LENS_ID = asLensId("lens_daily_work");
const createdAt = asIsoDateTime("2026-05-20T09:00:00.000Z");

const starterCells: Array<{
  id: string;
  title: string;
  description: string;
  dsl: string;
}> = [
  {
    id: "cell_unread_messages",
    title: "Unread Important Messages",
    description: "Unread threads from the last week, newest first.",
    dsl: `from synthetic.mail.threads
where unread is true
where received_at after days_ago(7)
sort by received_at desc
take 20
show as list`,
  },
  {
    id: "cell_upcoming_meetings",
    title: "Upcoming Meetings",
    description: "The next meetings on the synthetic calendar.",
    dsl: `from synthetic.calendar.events
where start after now()
sort by start asc
take 5
show as table`,
  },
  {
    id: "cell_recent_docs",
    title: "Recently Changed Docs",
    description: "Recently touched files across the fixture drive.",
    dsl: `from synthetic.drive.files
where modified_at after days_ago(7)
sort by modified_at desc
take 10
show as list`,
  },
  {
    id: "cell_stale_tasks",
    title: "Stale Tasks Due Soon",
    description: "Open tasks due by the next three days.",
    dsl: `from synthetic.tasks
where completed is false
where due_at on or before in_days(3)
sort by due_at asc
take 20
show as count`,
  },
];

export function createDailyWorkLens(): LensDefinition {
  return {
    id: DAILY_WORK_LENS_ID,
    version: "wovith.lens.v1",
    name: "Daily Work Lens",
    description:
      "Stage 0 lens showing messages, meetings, docs, and tasks from synthetic sources.",
    createdAt,
    updatedAt: createdAt,
    cells: starterCells.map(toCellDefinition),
    calibration: [],
    snapshotPolicy: {
      tier: "evidence",
      retentionDays: 30,
      syncSnapshots: false,
    },
  };
}

export function makeCellFromDsl(input: {
  id: string;
  lensId: LensDefinition["id"];
  title: string;
  description?: string;
  dsl: string;
  now?: string;
}): CellDefinition {
  const parsed = parseCanonicalDsl(input.dsl);
  if (!parsed.ok) {
    throw new Error(parsed.error.message);
  }
  const timestamp = asIsoDateTime(input.now ?? new Date().toISOString());
  return {
    id: asCellId(input.id),
    lensId: input.lensId,
    title: input.title,
    description: input.description,
    ast: parsed.value,
    canonicalDsl: serializeCellAst(parsed.value),
    enabled: true,
    refreshPolicy: { mode: "on-open" },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateCellAst(
  cell: CellDefinition,
  ast: CellAst,
  updatedAt: string,
): CellDefinition {
  return {
    ...cell,
    ast,
    canonicalDsl: serializeCellAst(ast),
    updatedAt: asIsoDateTime(updatedAt),
  };
}

function toCellDefinition(cell: (typeof starterCells)[number]): CellDefinition {
  return makeCellFromDsl({
    ...cell,
    lensId: DAILY_WORK_LENS_ID,
    now: createdAt,
  });
}
