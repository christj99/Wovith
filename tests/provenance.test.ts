import { describe, expect, it } from "vitest";

import { explainWhyItem } from "@/provenance/why";
import { evaluateCell } from "@/runtime/evaluator";
import { createDailyWorkLens } from "@/runtime/starter-lens";
import { createSyntheticAdapters } from "@/sources/synthetic/synthetic-adapter";
import { sourceSchemaRegistry } from "@/sources/registry";
import { stage0ValidationContext, testClock } from "@/testing/context";

describe("provenance and Why explanations", () => {
  it("turns evidence into a plain-language Why explanation", async () => {
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
    const evidence = result.evidence[0];
    expect(evidence).toBeDefined();
    if (!evidence) {
      return;
    }
    const why = explainWhyItem({
      ast: cell.ast,
      sourceSchema: sourceSchemaRegistry[cell.ast.from.sourceId],
      evidence,
      snapshot: result.snapshot,
    });
    expect(why.plainLanguage).toContain("Included because");
    expect(why.plainLanguage).toContain("unread is true");
    expect(why.ruleTrace.map((step) => step.kind)).toEqual([
      "source",
      "filter",
      "filter",
      "sort",
      "take",
      "render",
    ]);
    expect(why.evidence[0]?.itemId).toBe(evidence.itemId);
  });
});
