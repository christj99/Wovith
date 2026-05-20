import { asIsoDateTime } from "@/domain/ids";
import type {
  FieldType,
  RendererKind,
  RendererPayload,
  RenderedItem,
  SourceItem,
  SourceSchema,
  TaintedValue,
} from "@/domain/types";

export const listTitleCandidates = ["subject", "title", "name"];
export const listSubtitleCandidates = [
  "sender",
  "owner",
  "project",
  "priority",
  "mime_type",
];
export const listBodyCandidates = ["preview", "description"];
export const listTimeCandidates = [
  "received_at",
  "start",
  "modified_at",
  "due_at",
  "updated_at",
];

export function buildRendererPayload(
  renderer: RendererKind,
  sourceSchema: SourceSchema,
  items: SourceItem[],
  evidenceIdsByItem: Map<string, RenderedItem["evidenceIds"]>,
  options: { displayTimeZone?: string } = {},
): RendererPayload {
  if (renderer === "count") {
    return {
      kind: renderer,
      scalar: items.length,
      raw: items.map((item) => item.id),
    };
  }

  const renderedItems = items.map((item) =>
    toRenderedItem(item, sourceSchema, evidenceIdsByItem.get(item.id) ?? []),
  );

  if (renderer === "table") {
    const columns = defaultColumns(sourceSchema);
    return {
      kind: renderer,
      table: {
        columns,
        columnLabels: labelsForColumns(sourceSchema, columns),
        columnTypes: typesForColumns(sourceSchema, columns),
        displayTimeZone: options.displayTimeZone,
        rows: renderedItems,
      },
      items: renderedItems,
    };
  }

  if (renderer === "raw") {
    return {
      kind: renderer,
      items: renderedItems,
      raw: items,
    };
  }

  return {
    kind: renderer,
    items: renderedItems,
  };
}

export function toRenderedItem(
  item: SourceItem,
  sourceSchema: SourceSchema,
  evidenceIds: RenderedItem["evidenceIds"],
): RenderedItem {
  return {
    itemId: item.id,
    title: firstString(item.fields, listTitleCandidates) ?? String(item.id),
    subtitle: firstString(item.fields, listSubtitleCandidates),
    body: firstString(item.fields, listBodyCandidates),
    time: toIsoDateTime(firstString(item.fields, listTimeCandidates)),
    fields: pickKnownFields(item.fields, sourceSchema),
    evidenceIds,
  };
}

function toIsoDateTime(value: string | undefined): RenderedItem["time"] {
  return value ? asIsoDateTime(value) : undefined;
}

export function defaultColumns(sourceSchema: SourceSchema): string[] {
  const hintedColumns = (sourceSchema.defaultTableColumns ?? []).filter(
    (fieldName) => Boolean(sourceSchema.fields[fieldName]),
  );
  if (hintedColumns.length > 0) {
    return hintedColumns;
  }

  const ordered = Object.values(sourceSchema.fields)
    .filter(
      (field) =>
        field.rendererHints?.includes("table") ||
        field.name === sourceSchema.itemIdField,
    )
    .map((field) => field.name);
  if (ordered.length >= 3) {
    return ordered.slice(0, 6);
  }
  return Object.keys(sourceSchema.fields).slice(0, 6);
}

function labelsForColumns(
  sourceSchema: SourceSchema,
  columns: string[],
): Record<string, string> {
  return Object.fromEntries(
    columns.map((column) => [
      column,
      sourceSchema.fields[column]?.label ?? column,
    ]),
  );
}

function typesForColumns(
  sourceSchema: SourceSchema,
  columns: string[],
): Record<string, FieldType> {
  return Object.fromEntries(
    columns.map((column) => [
      column,
      sourceSchema.fields[column]?.type ?? "unknown",
    ]),
  );
}

function firstString(
  fields: Record<string, TaintedValue>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = fields[key]?.value;
    if (typeof value === "string") {
      return value;
    }
  }
  return undefined;
}

function pickKnownFields(
  fields: Record<string, TaintedValue>,
  sourceSchema: SourceSchema,
): Record<string, TaintedValue> {
  return Object.fromEntries(
    Object.keys(sourceSchema.fields)
      .map((field) => [field, fields[field]])
      .filter(([, value]) => value),
  );
}
