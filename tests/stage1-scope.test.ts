import { describe, expect, it } from "vitest";

import alphaLogTemplate from "../STAGE_1_ALPHA_LOG_TEMPLATE.md?raw";
import driveDecision from "../STAGE_1_DRIVE_DECISION.md?raw";
import productDecision from "../STAGE_1_PRODUCT_DECISION.md?raw";
import validationPlan from "../STAGE_1_VALIDATION_PLAN.md?raw";

const sourceModules = import.meta.glob("../src/**/*.{ts,tsx}", {
  eager: true,
  query: "?raw",
  import: "default",
});

describe("Stage 1 scope boundaries", () => {
  it("includes the Stage 1 decision and validation documents", () => {
    for (const text of [
      productDecision,
      driveDecision,
      validationPlan,
      alphaLogTemplate,
    ]) {
      expect(text.length).toBeGreaterThan(100);
    }
  });

  it("does not introduce Google Drive or Gmail OAuth scopes", () => {
    const sourceText = Object.values(sourceModules).join("\n");

    expect(sourceText).not.toContain("www.googleapis.com/auth/drive");
    expect(sourceText).not.toContain("www.googleapis.com/auth/gmail");
    expect(sourceText).not.toContain("gmail.readonly");
  });
});
