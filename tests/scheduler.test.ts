import { describe, expect, it } from "vitest";

import { asIsoDateTime } from "@/domain/ids";
import type { CellEvaluationResult } from "@/domain/types";
import { evaluateCell, type EvaluateCellInput } from "@/runtime/evaluator";
import { RuntimeScheduler } from "@/runtime/scheduler";
import { createDailyWorkLens } from "@/runtime/starter-lens";
import { createSyntheticAdapters } from "@/sources/synthetic/synthetic-adapter";
import { sourceSchemaRegistry } from "@/sources/registry";
import { stage0ValidationContext, testClock } from "@/testing/context";

describe("runtime scheduler", () => {
  it("dedupes duplicate manual refreshes for the same cell", async () => {
    const lens = createDailyWorkLens();
    const cell = lens.cells[0];
    const adapters = createSyntheticAdapters();
    let calls = 0;
    const scheduler = new RuntimeScheduler({
      adapters,
      sourceSchemas: sourceSchemaRegistry,
      validationContext: stage0ValidationContext,
      clock: testClock,
      evaluate: async (input: EvaluateCellInput) => {
        calls += 1;
        return evaluateCell(input);
      },
    });

    const first = scheduler.refreshCell(cell, lens);
    const second = scheduler.refreshCell(cell, lens);
    expect(first).toBe(second);
    await Promise.all([first, second]);
    expect(calls).toBe(1);
  });

  it("refresh-all evaluates enabled cells", async () => {
    const lens = createDailyWorkLens();
    const scheduler = new RuntimeScheduler({
      adapters: createSyntheticAdapters(),
      sourceSchemas: sourceSchemaRegistry,
      validationContext: stage0ValidationContext,
      clock: testClock,
    });
    const results = await scheduler.refreshAll(lens);
    expect(results).toHaveLength(4);
    expect(results.every((result) => result.freshness === "fresh")).toBe(true);
  });

  it("marks results stale with a deterministic clock", async () => {
    const lens = createDailyWorkLens();
    const scheduler = new RuntimeScheduler({
      adapters: createSyntheticAdapters(),
      sourceSchemas: sourceSchemaRegistry,
      validationContext: stage0ValidationContext,
      clock: testClock,
      defaultTtlMs: 15 * 60 * 1000,
    });
    const result = await scheduler.refreshCell(lens.cells[0], lens);
    const oldResult: CellEvaluationResult = {
      ...result,
      evaluatedAt: asIsoDateTime("2026-05-20T12:30:00.000Z"),
    };
    const marked = scheduler.markStaleResults(lens, {
      [oldResult.cellId]: oldResult,
    });
    expect(marked[oldResult.cellId]?.freshness).toBe("stale");
  });

  it("surfaces blocked state for missing adapters", async () => {
    const lens = createDailyWorkLens();
    const scheduler = new RuntimeScheduler({
      adapters: {},
      sourceSchemas: sourceSchemaRegistry,
      validationContext: stage0ValidationContext,
      clock: testClock,
    });
    const result = await scheduler.refreshCell(lens.cells[0], lens);
    expect(result.freshness).toBe("blocked");
    expect(result.errors[0]?.code).toBe("source-adapter-unavailable");
  });

  it("surfaces blocked state for missing source schemas", async () => {
    const lens = createDailyWorkLens();
    const scheduler = new RuntimeScheduler({
      adapters: createSyntheticAdapters(),
      sourceSchemas: {},
      validationContext: stage0ValidationContext,
      clock: testClock,
    });
    const result = await scheduler.refreshCell(lens.cells[0], lens);
    expect(result.freshness).toBe("blocked");
    expect(result.errors[0]?.code).toBe("source-schema-missing");
  });
});
