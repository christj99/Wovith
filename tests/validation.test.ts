import { describe, expect, it } from "vitest";

import { parseCanonicalDsl } from "@/dsl/parse";
import { validateCellAst } from "@/dsl/validate";
import { sourceSchemaRegistry } from "@/sources/registry";
import { syntheticSourceSchemas } from "@/sources/synthetic/schema";
import { stage0ValidationContext } from "@/testing/context";

describe("AST validation and source schema compatibility", () => {
  it("rejects unknown sources", () => {
    const parsed = parseCanonicalDsl(`from synthetic.mail.messages
show as list`);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      const report = validateCellAst(parsed.value, stage0ValidationContext);
      expect(report.valid).toBe(false);
      expect(report.errors[0]?.code).toBe("unknown-source");
    }
  });

  it("rejects unknown fields", () => {
    const parsed = parseCanonicalDsl(`from synthetic.mail.threads
where made_up is true
show as list`);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      const report = validateCellAst(parsed.value, stage0ValidationContext);
      expect(
        report.errors.some((error) => error.code === "unknown-field"),
      ).toBe(true);
    }
  });

  it("rejects operators that do not fit the field", () => {
    const parsed = parseCanonicalDsl(`from synthetic.mail.threads
where unread contains "yes"
show as list`);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      const report = validateCellAst(parsed.value, stage0ValidationContext);
      expect(
        report.errors.some((error) => error.code === "operator-not-allowed"),
      ).toBe(true);
    }
  });

  it("rejects unsupported renderers at parse time", () => {
    const parsed = parseCanonicalDsl(`from synthetic.mail.threads
show as chart`);
    expect(parsed.ok).toBe(false);
  });

  it("defines usable schemas for every synthetic Stage 0 source", () => {
    for (const schema of Object.values(syntheticSourceSchemas)) {
      expect(schema.sourceId).toBeTruthy();
      expect(schema.itemIdField in schema.fields).toBe(true);
      expect(schema.capabilities).toEqual(["local-only"]);
      expect(
        Object.values(schema.fields).every(
          (field) => field.allowedOperators.length > 0,
        ),
      ).toBe(true);
    }
  });

  it("defines and validates the Google Calendar Stage 0.5 source", () => {
    const schema = sourceSchemaRegistry["google.calendar.events"];
    expect(schema.sourceId).toBe("google.calendar.events");
    expect(schema.capabilities).toEqual(["supports-pagination"]);
    expect(schema.defaultTableColumns).toEqual([
      "title",
      "start",
      "end",
      "attendees",
      "location",
      "status",
    ]);
    expect(schema.fields.title.containsExternalContent).toBe(true);
    expect(schema.fields.all_day.type).toBe("boolean");
    expect(schema.fields.description.sensitive).toBe(true);
    const parsed = parseCanonicalDsl(`from google.calendar.events
where start after now()
where start before in_days(90)
sort by start asc
take 10
show as table`);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      const report = validateCellAst(parsed.value, stage0ValidationContext);
      expect(report.valid).toBe(true);
      expect(
        report.warnings.some(
          (warning) => warning.code === "renderer-external-content-display",
        ),
      ).toBe(true);
      expect(
        report.warnings.some(
          (warning) => warning.code === "sensitive-field-display",
        ),
      ).toBe(true);
    }
  });

  it("warns when renderer displays external content even if filters use metadata", () => {
    const parsed = parseCanonicalDsl(`from synthetic.mail.threads
where unread is true
show as list`);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      const report = validateCellAst(parsed.value, stage0ValidationContext);
      expect(
        report.warnings.some(
          (warning) => warning.code === "renderer-external-content-display",
        ),
      ).toBe(true);
    }
  });

  it("warns strongly for raw renderer sensitive output", () => {
    const parsed = parseCanonicalDsl(`from synthetic.mail.threads
where unread is true
show as raw`);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      const report = validateCellAst(parsed.value, stage0ValidationContext);
      expect(
        report.warnings.some(
          (warning) => warning.code === "raw-renderer-sensitive-output",
        ),
      ).toBe(true);
    }
  });

  it("does not over-warn count renderer display fields", () => {
    const parsed = parseCanonicalDsl(`from synthetic.mail.threads
where unread is true
show as count`);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      const report = validateCellAst(parsed.value, stage0ValidationContext);
      expect(
        report.warnings.some(
          (warning) => warning.code === "renderer-external-content-display",
        ),
      ).toBe(false);
      expect(
        report.warnings.some(
          (warning) => warning.code === "raw-renderer-sensitive-output",
        ),
      ).toBe(false);
    }
  });
});
