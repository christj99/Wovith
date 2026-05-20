import { describe, expect, it } from "vitest";

import type { DslValidationWarning } from "@/domain/types";
import { summarizeValidationWarnings } from "@/dsl/warning-summary";

describe("validation warning summaries", () => {
  it("summarizes repeated renderer external and sensitive display warnings", () => {
    const warnings: DslValidationWarning[] = [
      {
        code: "renderer-external-content-display",
        message: "list renderer may display external-content field Subject.",
        path: "show.list.subject",
      },
      {
        code: "renderer-external-content-display",
        message: "list renderer may display external-content field Preview.",
        path: "show.list.preview",
      },
      {
        code: "sensitive-field-display",
        message: "list renderer may display sensitive field Preview.",
        path: "show.list.preview",
      },
    ];

    const summary = summarizeValidationWarnings(warnings);

    expect(summary?.summary).toBe(
      "This cell may display external content. Some displayed fields may be sensitive.",
    );
    expect(summary?.details).toEqual(
      warnings.map((warning) => warning.message),
    );
  });

  it("preserves raw renderer details behind a concise summary", () => {
    const warnings: DslValidationWarning[] = [
      {
        code: "raw-renderer-sensitive-output",
        message: "Raw renderer may expose sensitive field Preview.",
        path: "show.raw.preview",
      },
    ];

    const summary = summarizeValidationWarnings(warnings);

    expect(summary?.summary).toBe("Raw output may expose sensitive fields.");
    expect(summary?.details).toEqual([
      "Raw renderer may expose sensitive field Preview.",
    ]);
  });

  it("combines unbounded query warnings with display summaries", () => {
    const warnings: DslValidationWarning[] = [
      {
        code: "renderer-external-content-display",
        message: "list renderer may display external-content field Subject.",
      },
      {
        code: "unbounded-query",
        message:
          "This cell has no take clause, so it may render every matching fixture item.",
      },
    ];

    const summary = summarizeValidationWarnings(warnings);

    expect(summary?.summary).toBe(
      "This cell may display external content. This cell has no take clause and may render many items.",
    );
    expect(summary?.details).toHaveLength(2);
  });
});
