import { describe, expect, it } from "vitest";

import {
  deleteCell,
  duplicateCell,
  renameCell,
  setCellEnabled,
} from "@/runtime/cell-lifecycle";
import { createDailyWorkLens } from "@/runtime/starter-lens";

const updatedAt = "2026-05-20T15:00:00.000Z";

describe("cell lifecycle helpers", () => {
  it("renames cells and updates lens metadata", () => {
    const lens = createDailyWorkLens();
    const renamed = renameCell(
      lens,
      lens.cells[0].id,
      "Morning Mail",
      updatedAt,
    );

    expect(renamed.name).toBe(lens.name);
    expect(renamed.updatedAt).toBe(updatedAt);
    expect(renamed.cells[0].title).toBe("Morning Mail");
    expect(renamed.cells[0].updatedAt).toBe(updatedAt);
  });

  it("duplicates a cell with a new stable id and same DSL", () => {
    const lens = createDailyWorkLens();
    const duplicated = duplicateCell(lens, lens.cells[0].id, updatedAt);

    expect(duplicated.cells).toHaveLength(lens.cells.length + 1);
    expect(duplicated.cells[1].id).not.toBe(lens.cells[0].id);
    expect(duplicated.cells[1].canonicalDsl).toBe(lens.cells[0].canonicalDsl);
    expect(duplicated.cells[1].title).toBe("Unread Important Messages Copy");
  });

  it("enables, disables, and deletes cells", () => {
    const lens = createDailyWorkLens();
    const disabled = setCellEnabled(lens, lens.cells[0].id, false, updatedAt);
    expect(disabled.cells[0].enabled).toBe(false);

    const enabled = setCellEnabled(disabled, lens.cells[0].id, true, updatedAt);
    expect(enabled.cells[0].enabled).toBe(true);

    const deleted = deleteCell(enabled, lens.cells[0].id, updatedAt);
    expect(deleted.cells).toHaveLength(lens.cells.length - 1);
    expect(deleted.cells.some((cell) => cell.id === lens.cells[0].id)).toBe(
      false,
    );
  });
});
