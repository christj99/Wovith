import { describe, expect, it } from "vitest";

import { explainEmptyCell, explainWhyItem } from "@/provenance/why";
import { parseCanonicalDsl } from "@/dsl/parse";
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
      "filter",
      "sort",
      "take",
      "render",
    ]);
    expect(why.evidence[0]?.itemId).toBe(evidence.itemId);
  });

  it("uses friendly empty copy for Google Calendar 90-day windows", () => {
    const parsed = parseCanonicalDsl(`from google.calendar.events
where start after now()
where start before in_days(90)
sort by start asc
take 10
show as table`);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    expect(
      explainEmptyCell({
        ast: parsed.value,
        sourceSchema: sourceSchemaRegistry["google.calendar.events"],
        evaluatedAt: "2026-05-20T13:00:00.000Z",
      }),
    ).toBe("No upcoming events found in the next 90 days.");
  });
});
