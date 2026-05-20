import type { DslValidationWarning } from "@/domain/types";

export interface WarningSummary {
  summary: string;
  details: string[];
}

export function summarizeValidationWarnings(
  warnings: DslValidationWarning[],
): WarningSummary | null {
  if (warnings.length === 0) {
    return null;
  }

  const codes = new Set(warnings.map((warning) => warning.code));
  const summaryParts: string[] = [];
  const hasRendererExternal = codes.has("renderer-external-content-display");
  const hasSensitiveDisplay = codes.has("sensitive-field-display");
  const hasRawSensitive = codes.has("raw-renderer-sensitive-output");

  if (hasRawSensitive) {
    summaryParts.push("Raw output may expose sensitive fields.");
  } else if (hasRendererExternal && hasSensitiveDisplay) {
    summaryParts.push(
      "This cell may display external content. Some displayed fields may be sensitive.",
    );
  } else if (hasRendererExternal) {
    summaryParts.push("This cell may display external content.");
  } else if (hasSensitiveDisplay) {
    summaryParts.push("This cell may display sensitive fields.");
  }

  if (codes.has("external-content-read") && !hasRendererExternal) {
    summaryParts.push("This cell reads external content as data.");
  }

  if (codes.has("unbounded-query")) {
    summaryParts.push(
      "This cell has no take clause and may render many items.",
    );
  }

  if (summaryParts.length === 0) {
    summaryParts.push("This cell has non-blocking validation warnings.");
  }

  return {
    summary: summaryParts.join(" "),
    details: warnings.map((warning) => warning.message),
  };
}
