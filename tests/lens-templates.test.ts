import { describe, expect, it } from "vitest";

import { parseCanonicalDsl } from "@/dsl/parse";
import { validateCellAst } from "@/dsl/validate";
import { createLensFromTemplate } from "@/lenses/template-instantiation";
import { listLensTemplates } from "@/lenses/templates";
import { stage0ValidationContext, testNow } from "@/testing/context";

describe("Stage 1 lens templates", () => {
  it("lists the three private-alpha templates", () => {
    expect(listLensTemplates().map((template) => template.name)).toEqual([
      "Daily Work Lens",
      "Meeting Prep Lens",
      "Calendar Health Lens",
    ]);
  });

  it("instantiates deterministic local lenses from templates", () => {
    const lens = createLensFromTemplate("daily-work", testNow);

    expect(lens.name).toBe("Daily Work Lens");
    expect(lens.snapshotPolicy.tier).toBe("evidence");
    expect(lens.cells.map((cell) => cell.title)).toContain("Long Meetings");
    expect(lens.cells.every((cell) => cell.enabled)).toBe(true);
  });

  it("keeps every template cell parseable and valid against source schemas", () => {
    for (const template of listLensTemplates()) {
      for (const cell of template.cells) {
        const parsed = parseCanonicalDsl(cell.dsl);
        expect(parsed.ok, `${template.name}/${cell.title}`).toBe(true);
        if (!parsed.ok) {
          continue;
        }
        const report = validateCellAst(parsed.value, stage0ValidationContext);
        expect(report.errors, `${template.name}/${cell.title}`).toEqual([]);
      }
    }
  });
});
