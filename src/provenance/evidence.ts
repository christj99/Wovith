import { asEvidenceId, asSnapshotId, stableHash } from '@/domain/ids';
import { previewAstValue } from '@/domain/time';
import type {
  CellAst,
  CellDefinition,
  EvaluationId,
  FieldEvidence,
  PredicateEvidence,
  ProvenanceEvidence,
  SnapshotId,
  SourceItem,
  SourceSchema,
} from '@/domain/types';

export function makeSnapshotId(evaluationId: EvaluationId): SnapshotId {
  return asSnapshotId(`snapshot_${evaluationId}`);
}

export function buildEvidenceForItem(input: {
  ast: CellAst;
  cell: CellDefinition;
  evaluationId: EvaluationId;
  snapshotId: SnapshotId;
  item: SourceItem;
  sourceSchema: SourceSchema;
  nowIso: string;
}): ProvenanceEvidence {
  const { ast, cell, evaluationId, item, nowIso, snapshotId, sourceSchema } = input;
  const evidenceId = asEvidenceId(`evidence_${evaluationId}_${item.id}`);
  const sort = ast.sort?.[0];
  return {
    id: evidenceId,
    snapshotId,
    evaluationId,
    cellId: cell.id,
    sourceId: item.sourceId,
    itemId: item.id,
    sourceTimestamp: sourceTimestamp(item),
    observedAt: nowIso as ProvenanceEvidence['observedAt'],
    matchedPredicates: ast.where.map<PredicateEvidence>((predicate) => ({
      predicateId: predicate.id,
      field: predicate.field,
      op: predicate.op,
      expected: predicate.value,
      actualPreview: previewValue(item.fields[predicate.field]?.value),
      matched: true,
    })),
    sortEvidence: sort
      ? {
          field: sort.field,
          direction: sort.direction,
          actualPreview: previewValue(item.fields[sort.field]?.value),
        }
      : undefined,
    selectedFields: Object.values(sourceSchema.fields).map<FieldEvidence>((field) => {
      const tainted = item.fields[field.name];
      return {
        field: field.name,
        trust: tainted?.trust ?? 'connector-metadata',
        contentHash: tainted?.contentHash ?? stableHash(tainted?.value),
        redactedPreview: field.sensitive ? '[redacted]' : previewValue(tainted?.value),
        stored: !field.sensitive,
      };
    }),
    contentHash: item.contentHash,
    redactedPreview: previewItem(item, sourceSchema),
    trust: 'connector-metadata',
  };
}

export function predicateEvidenceLabel(predicate: PredicateEvidence): string {
  const value = predicate.expected ? ` ${previewAstValue(predicate.expected)}` : '';
  return `${predicate.field} ${predicate.op.replaceAll('_', ' ')}${value}`;
}

function sourceTimestamp(item: SourceItem): ProvenanceEvidence['sourceTimestamp'] {
  const candidates = ['updated_at', 'modified_at', 'received_at', 'start', 'due_at'];
  for (const candidate of candidates) {
    const value = item.fields[candidate]?.value;
    if (typeof value === 'string') {
      return value as ProvenanceEvidence['sourceTimestamp'];
    }
  }
  return item.updatedAt ?? null;
}

function previewItem(item: SourceItem, sourceSchema: SourceSchema): string {
  const titleField = ['subject', 'title', 'name'].find((field) => field in sourceSchema.fields);
  const value = titleField ? item.fields[titleField]?.value : item.id;
  return previewValue(value) ?? String(item.id);
}

function previewValue(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (value === null) {
    return 'null';
  }
  return String(value).slice(0, 120);
}
