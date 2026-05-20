import type { FieldSchema, RendererKind, SourceSchema } from "@/domain/types";
import {
  defaultColumns,
  listBodyCandidates,
  listSubtitleCandidates,
  listTimeCandidates,
  listTitleCandidates,
} from "@/runtime/render-payload";

export interface RendererFieldAccess {
  field: FieldSchema;
  reason: "list-display" | "table-column" | "raw-output" | "count-id";
}

export function getRendererFieldAccess(
  renderer: RendererKind,
  sourceSchema: SourceSchema,
): RendererFieldAccess[] {
  if (renderer === "count") {
    const idField = sourceSchema.fields[sourceSchema.itemIdField];
    return idField ? [{ field: idField, reason: "count-id" }] : [];
  }

  if (renderer === "raw") {
    return Object.values(sourceSchema.fields).map((field) => ({
      field,
      reason: "raw-output",
    }));
  }

  if (renderer === "table") {
    return defaultColumns(sourceSchema)
      .map((fieldName) => sourceSchema.fields[fieldName])
      .filter((field): field is FieldSchema => Boolean(field))
      .map((field) => ({ field, reason: "table-column" }));
  }

  return [
    ...listTitleCandidates,
    ...listSubtitleCandidates,
    ...listBodyCandidates,
    ...listTimeCandidates,
  ]
    .map((fieldName) => sourceSchema.fields[fieldName])
    .filter((field): field is FieldSchema => Boolean(field))
    .map((field) => ({ field, reason: "list-display" }));
}
