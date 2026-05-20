import { describe, expect, it } from "vitest";

import { evaluateCell } from "@/runtime/evaluator";
import { createDailyWorkLens, makeCellFromDsl } from "@/runtime/starter-lens";
import { createSyntheticAdapters } from "@/sources/synthetic/synthetic-adapter";
import { sourceSchemaRegistry } from "@/sources/registry";
import { stage0ValidationContext, testClock } from "@/testing/context";

describe("synthetic runtime evaluation", () => {
  it("filters, sorts, takes, renders, and records evidence for mail", async () => {
    const lens = createDailyWorkLens();
    const cell = lens.cells.find(
      (entry) => entry.title === "Unread Important Messages",
    );
    expect(cell).toBeDefined();
    if (!cell) {
      return;
    }
    const adapters = createSyntheticAdapters();
    const result = await evaluateCell({
      cell,
      lensId: lens.id,
      adapter: adapters[cell.ast.from.sourceId],
      sourceSchema: sourceSchemaRegistry[cell.ast.from.sourceId],
      validationContext: stage0ValidationContext,
      clock: testClock,
    });
    expect(result.errors).toEqual([]);
    expect(result.freshness).toBe("fresh");
    expect(result.payload.items?.map((item) => item.itemId)).toEqual([
      "mail-005",
      "mail-001",
    ]);
    expect(result.evidence).toHaveLength(2);
    expect(result.evidence[0]?.matchedPredicates).toHaveLength(3);
  });

  it("generates count renderer payloads for stale tasks due soon", async () => {
    const lens = createDailyWorkLens();
    const cell = lens.cells.find(
      (entry) => entry.title === "Stale Tasks Due Soon",
    );
    expect(cell).toBeDefined();
    if (!cell) {
      return;
    }
    const adapters = createSyntheticAdapters();
    const result = await evaluateCell({
      cell,
      lensId: lens.id,
      adapter: adapters[cell.ast.from.sourceId],
      sourceSchema: sourceSchemaRegistry[cell.ast.from.sourceId],
      validationContext: stage0ValidationContext,
      clock: testClock,
    });
    expect(result.renderer).toBe("count");
    expect(result.payload.scalar).toBe(2);
    expect(result.snapshot.outputCount).toBe(2);
  });

  it("fails visibly for semantic validation errors", async () => {
    const lens = createDailyWorkLens();
    const cell = {
      ...lens.cells[0],
      ast: {
        ...lens.cells[0].ast,
        where: [
          {
            id: "pred-1",
            field: "missing",
            op: "is" as const,
            value: { kind: "boolean" as const, value: true },
          },
        ],
      },
    };
    const adapters = createSyntheticAdapters();
    const result = await evaluateCell({
      cell,
      lensId: lens.id,
      adapter: adapters[cell.ast.from.sourceId],
      sourceSchema: sourceSchemaRegistry[cell.ast.from.sourceId],
      validationContext: stage0ValidationContext,
      clock: testClock,
    });
    expect(result.freshness).toBe("failed");
    expect(result.errors[0]?.code).toBe("unknown-field");
  });

  it("does not match null or invalid dates in temporal predicates", async () => {
    const lens = createDailyWorkLens();
    const cell = makeCellFromDsl({
      id: "cell_due_dates",
      lensId: lens.id,
      title: "Due dates",
      dsl: `from synthetic.tasks
where due_at on or before in_days(3)
sort by due_at asc
take 20
show as list`,
    });
    const adapters = createSyntheticAdapters();
    const result = await evaluateCell({
      cell,
      lensId: lens.id,
      adapter: adapters[cell.ast.from.sourceId],
      sourceSchema: sourceSchemaRegistry[cell.ast.from.sourceId],
      validationContext: stage0ValidationContext,
      clock: testClock,
    });
    expect(result.payload.items?.map((item) => item.itemId)).toEqual([
      "task-004",
      "task-001",
      "task-002",
    ]);
    expect(result.payload.items?.map((item) => item.itemId)).not.toContain(
      "task-005",
    );
    expect(result.payload.items?.map((item) => item.itemId)).not.toContain(
      "task-006",
    );
  });

  it("does not match null dates in before predicates", async () => {
    const lens = createDailyWorkLens();
    const cell = makeCellFromDsl({
      id: "cell_before_due_dates",
      lensId: lens.id,
      title: "Before due dates",
      dsl: `from synthetic.tasks
where due_at before in_days(3)
sort by due_at asc
take 20
show as list`,
    });
    const adapters = createSyntheticAdapters();
    const result = await evaluateCell({
      cell,
      lensId: lens.id,
      adapter: adapters[cell.ast.from.sourceId],
      sourceSchema: sourceSchemaRegistry[cell.ast.from.sourceId],
      validationContext: stage0ValidationContext,
      clock: testClock,
    });
    expect(result.payload.items?.map((item) => item.itemId)).not.toContain(
      "task-005",
    );
    expect(result.payload.items?.map((item) => item.itemId)).not.toContain(
      "task-006",
    );
  });

  it("keeps valid due_at matches for starter task count", async () => {
    const lens = createDailyWorkLens();
    const cell = lens.cells.find(
      (entry) => entry.title === "Stale Tasks Due Soon",
    );
    expect(cell).toBeDefined();
    if (!cell) {
      return;
    }
    const adapters = createSyntheticAdapters();
    const result = await evaluateCell({
      cell,
      lensId: lens.id,
      adapter: adapters[cell.ast.from.sourceId],
      sourceSchema: sourceSchemaRegistry[cell.ast.from.sourceId],
      validationContext: stage0ValidationContext,
      clock: testClock,
    });
    expect(result.payload.scalar).toBe(2);
  });
});
