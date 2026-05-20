import { describe, expect, it } from "vitest";

import { asIsoDateTime, asSourceItemId, stableHash } from "@/domain/ids";
import type {
  SourceAdapter,
  SourceItem,
  SourceQueryResult,
  SourceSchema,
} from "@/domain/types";
import { evaluateCell } from "@/runtime/evaluator";
import { createDailyWorkLens, makeCellFromDsl } from "@/runtime/starter-lens";
import { sourceSchemaRegistry } from "@/sources/registry";
import { LocalStage0Store, MemoryStorage } from "@/storage/local-store";
import { stage0ValidationContext, testClock } from "@/testing/context";

describe("runtime performance sanity", () => {
  it.each([1_000, 10_000])(
    "evaluates, limits, and redacts generated %i-record task results",
    async (recordCount) => {
      const lens = createDailyWorkLens();
      const cell = makeCellFromDsl({
        id: `cell_perf_${recordCount}`,
        lensId: lens.id,
        title: "Performance sanity",
        dsl: `from synthetic.tasks
where completed is false
sort by due_at asc
take 20
show as table`,
      });
      const adapter = generatedTaskAdapter(recordCount);

      const result = await evaluateCell({
        cell,
        lensId: lens.id,
        adapter,
        sourceSchema: sourceSchemaRegistry["synthetic.tasks"],
        validationContext: stage0ValidationContext,
        clock: testClock,
      });

      expect(result.freshness).toBe("fresh");
      expect(result.snapshot.outputCount).toBe(20);
      expect(result.payload.table?.rows).toHaveLength(20);
      expect(result.evidence).toHaveLength(20);

      const storage = new MemoryStorage();
      const store = new LocalStage0Store(storage);
      store.saveEvaluation(result, lens.snapshotPolicy);
      const raw = storage.getItem("wovith.stage0.store.v1") ?? "";
      expect(raw).not.toContain(`Generated task ${recordCount - 1}`);
      expect(raw).not.toContain('"raw"');
      expect(raw).not.toContain('"payload"');
    },
  );
});

function generatedTaskAdapter(recordCount: number): SourceAdapter {
  const sourceId = sourceSchemaRegistry["synthetic.tasks"].sourceId;
  return {
    sourceId,
    schema: async (): Promise<SourceSchema> =>
      sourceSchemaRegistry["synthetic.tasks"],
    query: async (): Promise<{ ok: true; value: SourceQueryResult }> => ({
      ok: true,
      value: {
        items: Array.from({ length: recordCount }, (_, index) =>
          generatedTaskItem(index),
        ),
      },
    }),
  };
}

function generatedTaskItem(index: number): SourceItem {
  const sourceId = sourceSchemaRegistry["synthetic.tasks"].sourceId;
  const id = asSourceItemId(`generated-task-${index}`);
  const date = asIsoDateTime(
    new Date(Date.UTC(2026, 4, 20, 13, index % 60, 0)).toISOString(),
  );
  const value = (field: string, fieldValue: unknown) => ({
    value: fieldValue,
    trust:
      field === "title"
        ? ("external-content" as const)
        : ("connector-metadata" as const),
    sourceRef: { sourceId, itemId: id, field },
    contentHash: stableHash(`hash-${field}-${index}`),
  });
  return {
    id,
    sourceId,
    updatedAt: date,
    contentHash: stableHash(`task-hash-${index}`),
    fields: {
      id: value("id", id),
      title: value("title", `Generated task ${index}`),
      due_at: value("due_at", date),
      completed: value("completed", false),
      project: value("project", "Performance"),
      priority: value("priority", index % 2 === 0 ? "high" : "low"),
      updated_at: value("updated_at", date),
    },
  };
}
