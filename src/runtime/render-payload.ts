import { asIsoDateTime } from '@/domain/ids';
import type { RendererKind, RendererPayload, RenderedItem, SourceItem, SourceSchema, TaintedValue } from '@/domain/types';

const titleCandidates = ['subject', 'title', 'name'];
const subtitleCandidates = ['sender', 'owner', 'project', 'priority', 'mime_type'];
const timeCandidates = ['received_at', 'start', 'modified_at', 'due_at', 'updated_at'];

export function buildRendererPayload(
  renderer: RendererKind,
  sourceSchema: SourceSchema,
  items: SourceItem[],
  evidenceIdsByItem: Map<string, RenderedItem['evidenceIds']>,
): RendererPayload {
  if (renderer === 'count') {
    return {
      kind: renderer,
      scalar: items.length,
      raw: items.map((item) => item.id),
    };
  }

  const renderedItems = items.map((item) => toRenderedItem(item, sourceSchema, evidenceIdsByItem.get(item.id) ?? []));

  if (renderer === 'table') {
    const columns = defaultColumns(sourceSchema);
    return {
      kind: renderer,
      table: {
        columns,
        rows: renderedItems,
      },
      items: renderedItems,
    };
  }

  if (renderer === 'raw') {
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
  evidenceIds: RenderedItem['evidenceIds'],
): RenderedItem {
  return {
    itemId: item.id,
    title: firstString(item.fields, titleCandidates) ?? String(item.id),
    subtitle: firstString(item.fields, subtitleCandidates),
    body: firstString(item.fields, ['preview', 'description']),
    time: toIsoDateTime(firstString(item.fields, timeCandidates)),
    fields: pickKnownFields(item.fields, sourceSchema),
    evidenceIds,
  };
}

function toIsoDateTime(value: string | undefined): RenderedItem['time'] {
  return value ? asIsoDateTime(value) : undefined;
}

export function defaultColumns(sourceSchema: SourceSchema): string[] {
  const ordered = Object.values(sourceSchema.fields)
    .filter((field) => field.rendererHints?.includes('table') || field.name === sourceSchema.itemIdField)
    .map((field) => field.name);
  if (ordered.length >= 3) {
    return ordered.slice(0, 6);
  }
  return Object.keys(sourceSchema.fields).slice(0, 6);
}

function firstString(fields: Record<string, TaintedValue>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = fields[key]?.value;
    if (typeof value === 'string') {
      return value;
    }
  }
  return undefined;
}

function pickKnownFields(fields: Record<string, TaintedValue>, sourceSchema: SourceSchema): Record<string, TaintedValue> {
  return Object.fromEntries(Object.keys(sourceSchema.fields).map((field) => [field, fields[field]]).filter(([, value]) => value));
}
