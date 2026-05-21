import { describe, expect, it } from "vitest";

import { asAlphaFeedbackId, asIsoDateTime, asSourceItemId } from "@/domain/ids";
import { evaluateCell } from "@/runtime/evaluator";
import { createDailyWorkLens } from "@/runtime/starter-lens";
import { createSyntheticAdapters } from "@/sources/synthetic/synthetic-adapter";
import { sourceSchemaRegistry } from "@/sources/registry";
import { LocalStage0Store, MemoryStorage } from "@/storage/local-store";
import { stage0ValidationContext, testClock } from "@/testing/context";

describe("local persistence", () => {
  it("saves and reloads lens definitions", () => {
    const storage = new MemoryStorage();
    const store = new LocalStage0Store(storage);
    const lens = createDailyWorkLens();
    store.saveLens(lens);

    const reloaded = new LocalStage0Store(storage).getLens(lens.id);
    expect(reloaded?.name).toBe("Daily Work Lens");
    expect(reloaded?.cells).toHaveLength(4);
  });

  it("persists recent evaluation snapshots and evidence", async () => {
    const storage = new MemoryStorage();
    const store = new LocalStage0Store(storage);
    const lens = createDailyWorkLens();
    const cell = lens.cells[0];
    const adapters = createSyntheticAdapters();
    const result = await evaluateCell({
      cell,
      lensId: lens.id,
      adapter: adapters[cell.ast.from.sourceId],
      sourceSchema: sourceSchemaRegistry[cell.ast.from.sourceId],
      validationContext: stage0ValidationContext,
      clock: testClock,
    });

    store.saveEvaluation(result, lens.snapshotPolicy);
    const reloaded = new LocalStage0Store(storage).listEvaluations(cell.id);
    expect(reloaded).toHaveLength(1);
    expect(reloaded[0]?.evidence.length).toBeGreaterThan(0);
    expect(reloaded[0]?.fullOutput).toBeUndefined();
  });

  it("redacts evidence-tier persisted evaluations", async () => {
    const storage = new MemoryStorage();
    const store = new LocalStage0Store(storage);
    const lens = createDailyWorkLens();
    const cell = lens.cells[0];
    const adapters = createSyntheticAdapters();
    const result = await evaluateCell({
      cell,
      lensId: lens.id,
      adapter: adapters[cell.ast.from.sourceId],
      sourceSchema: sourceSchemaRegistry[cell.ast.from.sourceId],
      validationContext: stage0ValidationContext,
      clock: testClock,
    });

    store.saveEvaluation(result, lens.snapshotPolicy);
    const raw = storage.getItem("wovith.stage0.store.v1") ?? "";
    expect(raw).not.toContain(
      "Draft timeline and mitigations are attached in the doc.",
    );
    expect(raw).not.toContain("Updated notes for the launch review.");
    expect(raw).not.toContain("Your monthly receipt is ready.");
    expect(raw).not.toContain('"payload"');
    expect(raw).not.toContain('"raw"');
  });

  it("full-output tier explicitly persists the full renderer output", async () => {
    const storage = new MemoryStorage();
    const store = new LocalStage0Store(storage);
    const lens = {
      ...createDailyWorkLens(),
      snapshotPolicy: {
        tier: "full-output" as const,
        retentionDays: 30,
        syncSnapshots: false as const,
      },
    };
    const cell = lens.cells[0];
    const adapters = createSyntheticAdapters();
    const result = await evaluateCell({
      cell,
      lensId: lens.id,
      adapter: adapters[cell.ast.from.sourceId],
      sourceSchema: sourceSchemaRegistry[cell.ast.from.sourceId],
      validationContext: stage0ValidationContext,
      clock: testClock,
    });

    store.saveEvaluation(result, lens.snapshotPolicy);
    const raw = storage.getItem("wovith.stage0.store.v1") ?? "";
    expect(raw).toContain(
      "Draft timeline and mitigations are attached in the doc.",
    );
    expect(
      new LocalStage0Store(storage).listEvaluations(cell.id)[0]?.fullOutput,
    ).toBeDefined();
  });

  it("none tier persists only evaluation metadata", async () => {
    const storage = new MemoryStorage();
    const store = new LocalStage0Store(storage);
    const lens = {
      ...createDailyWorkLens(),
      snapshotPolicy: {
        tier: "none" as const,
        retentionDays: 30,
        syncSnapshots: false as const,
      },
    };
    const cell = lens.cells[0];
    const adapters = createSyntheticAdapters();
    const result = await evaluateCell({
      cell,
      lensId: lens.id,
      adapter: adapters[cell.ast.from.sourceId],
      sourceSchema: sourceSchemaRegistry[cell.ast.from.sourceId],
      validationContext: stage0ValidationContext,
      clock: testClock,
    });

    store.saveEvaluation(result, lens.snapshotPolicy);
    const persisted = new LocalStage0Store(storage).listEvaluations(cell.id)[0];
    expect(persisted?.evidence).toEqual([]);
    expect(persisted?.payloadPreview).toBeNull();
    expect(persisted?.snapshot.storageTier).toBe("none");
  });

  it("summary tier persists evidence and safe summary without raw output", async () => {
    const storage = new MemoryStorage();
    const store = new LocalStage0Store(storage);
    const lens = {
      ...createDailyWorkLens(),
      snapshotPolicy: {
        tier: "summary" as const,
        retentionDays: 30,
        syncSnapshots: false as const,
      },
    };
    const cell = lens.cells[0];
    const adapters = createSyntheticAdapters();
    const result = await evaluateCell({
      cell,
      lensId: lens.id,
      adapter: adapters[cell.ast.from.sourceId],
      sourceSchema: sourceSchemaRegistry[cell.ast.from.sourceId],
      validationContext: stage0ValidationContext,
      clock: testClock,
    });

    store.saveEvaluation(result, lens.snapshotPolicy);
    const persisted = new LocalStage0Store(storage).listEvaluations(cell.id)[0];
    expect(persisted?.evidence.length).toBeGreaterThan(0);
    expect(persisted?.payloadPreview?.outputSummary).toBe(
      "2 Synthetic Mail Threads item(s)",
    );
    expect(persisted?.fullOutput).toBeUndefined();
  });

  it("clears evaluations by cell, lens, and all state", async () => {
    const storage = new MemoryStorage();
    const store = new LocalStage0Store(storage);
    const lens = createDailyWorkLens();
    const cell = lens.cells[0];
    const adapters = createSyntheticAdapters();
    const result = await evaluateCell({
      cell,
      lensId: lens.id,
      adapter: adapters[cell.ast.from.sourceId],
      sourceSchema: sourceSchemaRegistry[cell.ast.from.sourceId],
      validationContext: stage0ValidationContext,
      clock: testClock,
    });

    store.saveLens(lens);
    store.saveEvaluation(result, lens.snapshotPolicy);
    store.clearEvaluationsForCell(cell.id);
    expect(store.listEvaluations()).toHaveLength(0);

    store.saveEvaluation(result, lens.snapshotPolicy);
    store.clearEvaluationsForLens(lens.id);
    expect(store.listEvaluations()).toHaveLength(0);
    expect(store.getLens(lens.id)).not.toBeNull();

    store.saveEvaluation(result, lens.snapshotPolicy);
    store.clearEvaluations();
    expect(store.listEvaluations()).toHaveLength(0);

    store.clearAll();
    expect(store.listLenses()).toHaveLength(0);
  });

  it("stores local-only alpha feedback without raw source text", () => {
    const storage = new MemoryStorage();
    const store = new LocalStage0Store(storage);
    const lens = createDailyWorkLens();
    const cell = lens.cells[0];
    store.saveLens(lens);

    store.saveFeedback({
      id: asAlphaFeedbackId("feedback_001"),
      lensId: lens.id,
      cellId: cell.id,
      itemId: asSourceItemId("mail-005"),
      kind: "useful",
      createdAt: asIsoDateTime("2026-05-20T15:00:00.000Z"),
    });

    expect(store.listFeedback({ lensId: lens.id })).toHaveLength(1);
    const raw = storage.getItem("wovith.stage0.store.v1") ?? "";
    expect(raw).toContain('"kind":"useful"');
    expect(raw).not.toContain(
      "Draft timeline and mitigations are attached in the doc.",
    );

    store.clearFeedbackForLens(lens.id);
    expect(store.listFeedback()).toHaveLength(0);
  });
});
