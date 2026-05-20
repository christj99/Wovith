import { asEvaluationId, asSnapshotId, nowIso, stableHash } from '@/domain/ids';
import { resolveAstValue, toDateComparable } from '@/domain/time';
import { validateCellAst } from '@/dsl/validate';
import { buildEvidenceForItem, makeSnapshotId } from '@/provenance/evidence';
import { buildRendererPayload } from '@/runtime/render-payload';
import type {
  CellDefinition,
  CellEvaluationResult,
  DslValidationContext,
  EvaluationId,
  PredicateClause,
  ProvenanceEvidenceId,
  SourceAdapter,
  SourceItem,
  SourceSchema,
  TaintedValue,
  WovithError,
} from '@/domain/types';

export interface EvaluateCellInput {
  cell: CellDefinition;
  lensId: CellDefinition['lensId'];
  adapter: SourceAdapter;
  sourceSchema: SourceSchema;
  validationContext: DslValidationContext;
  now?: Date;
}

export async function evaluateCell(input: EvaluateCellInput): Promise<CellEvaluationResult> {
  const startedAt = performance.now();
  const now = input.now ?? new Date();
  const evaluatedAt = nowIso(now);
  const evaluationId = asEvaluationId(`eval_${stableHash(`${input.cell.id}:${evaluatedAt}`)}`);
  const snapshotId = makeSnapshotId(evaluationId);
  const validation = validateCellAst(input.cell.ast, input.validationContext);

  if (!validation.valid) {
    const durationMs = Math.round(performance.now() - startedAt);
    return failedResult({
      input,
      evaluatedAt,
      evaluationId,
      errors: validation.errors.map<WovithError>((error) => ({
        code: error.code,
        message: error.message,
        details: error.path,
      })),
      durationMs,
    });
  }

  const queryResult = await input.adapter.query(input.cell.ast);
  if (!queryResult.ok) {
    const durationMs = Math.round(performance.now() - startedAt);
    return failedResult({
      input,
      evaluatedAt,
      evaluationId,
      errors: [queryResult.error],
      durationMs,
    });
  }

  const filtered = queryResult.value.items.filter((item) =>
    input.cell.ast.where.every((predicate) => evaluatePredicate(item.fields[predicate.field], predicate, now)),
  );
  const sorted = sortItems(filtered, input.cell.ast.sort ?? []);
  const limited = input.cell.ast.take ? sorted.slice(0, input.cell.ast.take.count) : sorted;
  const evidence = limited.map((item) =>
    buildEvidenceForItem({
      ast: input.cell.ast,
      cell: input.cell,
      evaluationId,
      snapshotId,
      item,
      sourceSchema: input.sourceSchema,
      nowIso: evaluatedAt,
    }),
  );
  const evidenceIdsByItem = new Map<string, ProvenanceEvidenceId[]>(
    evidence.map((entry) => [entry.itemId, [entry.id]]),
  );
  const payload = buildRendererPayload(input.cell.ast.show.renderer, input.sourceSchema, limited, evidenceIdsByItem);
  const durationMs = Math.round(performance.now() - startedAt);
  const snapshot = {
    id: snapshotId,
    evaluationId,
    cellId: input.cell.id,
    lensId: input.lensId,
    evaluatedAt,
    expressionHash: stableHash(input.cell.ast),
    sourceCursors: {
      [input.sourceSchema.sourceId]: queryResult.value.sourceCursor ?? null,
    },
    inputEvidenceIds: evidence.map((entry) => entry.id),
    outputHash: stableHash(payload),
    outputKind: input.cell.ast.show.renderer,
    outputCount: limited.length,
    outputSummary: `${limited.length} ${input.sourceSchema.displayName} item(s)`,
    storageTier: 'evidence' as const,
    cacheHit: false,
    durationMs,
  };

  return {
    evaluationId,
    cellId: input.cell.id,
    lensId: input.lensId,
    evaluatedAt,
    freshness: 'fresh',
    renderer: input.cell.ast.show.renderer,
    payload,
    snapshot,
    evidence,
    errors: [],
    warnings: validation.warnings,
    durationMs,
  };
}

function failedResult(input: {
  input: EvaluateCellInput;
  evaluatedAt: CellEvaluationResult['evaluatedAt'];
  evaluationId: EvaluationId;
  errors: WovithError[];
  durationMs: number;
}): CellEvaluationResult {
  const snapshotId = asSnapshotId(`snapshot_${input.evaluationId}`);
  const payload = { kind: input.input.cell.ast.show.renderer, items: [], scalar: null };
  return {
    evaluationId: input.evaluationId,
    cellId: input.input.cell.id,
    lensId: input.input.lensId,
    evaluatedAt: input.evaluatedAt,
    freshness: 'failed',
    renderer: input.input.cell.ast.show.renderer,
    payload,
    snapshot: {
      id: snapshotId,
      evaluationId: input.evaluationId,
      cellId: input.input.cell.id,
      lensId: input.input.lensId,
      evaluatedAt: input.evaluatedAt,
      expressionHash: stableHash(input.input.cell.ast),
      sourceCursors: {},
      inputEvidenceIds: [],
      outputHash: stableHash(payload),
      outputKind: input.input.cell.ast.show.renderer,
      outputCount: 0,
      outputSummary: 'Evaluation failed',
      storageTier: 'evidence',
      cacheHit: false,
      durationMs: input.durationMs,
    },
    evidence: [],
    errors: input.errors,
    warnings: [],
    durationMs: input.durationMs,
  };
}

function evaluatePredicate(tainted: TaintedValue | undefined, predicate: PredicateClause, now: Date): boolean {
  const actual = tainted?.value;
  if (predicate.op === 'exists') {
    return actual !== undefined && actual !== null;
  }
  if (predicate.op === 'not_exists') {
    return actual === undefined || actual === null;
  }
  const expected = resolveAstValue(predicate.value, now);
  if (predicate.op === 'is') {
    return actual === expected;
  }
  if (predicate.op === 'is_not') {
    return actual !== expected;
  }
  if (predicate.op === 'contains') {
    if (Array.isArray(actual)) {
      return actual.includes(expected);
    }
    return String(actual ?? '').toLowerCase().includes(String(expected ?? '').toLowerCase());
  }
  if (predicate.op === 'before') {
    return toDateComparable(actual) < toDateComparable(expected);
  }
  if (predicate.op === 'after') {
    return toDateComparable(actual) > toDateComparable(expected);
  }
  if (predicate.op === 'on_or_before') {
    return toDateComparable(actual) <= toDateComparable(expected);
  }
  if (predicate.op === 'on_or_after') {
    return toDateComparable(actual) >= toDateComparable(expected);
  }
  if (predicate.op === 'greater_than') {
    return Number(actual) > Number(expected);
  }
  if (predicate.op === 'less_than') {
    return Number(actual) < Number(expected);
  }
  return false;
}

function sortItems(items: SourceItem[], sort: Array<{ field: string; direction: 'asc' | 'desc' }>): SourceItem[] {
  if (sort.length === 0) {
    return [...items];
  }
  return [...items].sort((left, right) => {
    for (const sortField of sort) {
      const leftValue = left.fields[sortField.field]?.value;
      const rightValue = right.fields[sortField.field]?.value;
      const result = compareValues(leftValue, rightValue);
      if (result !== 0) {
        return sortField.direction === 'asc' ? result : -result;
      }
    }
    return String(left.id).localeCompare(String(right.id));
  });
}

function compareValues(left: unknown, right: unknown): number {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }
  const leftTime = typeof left === 'string' ? Date.parse(left) : Number.NaN;
  const rightTime = typeof right === 'string' ? Date.parse(right) : Number.NaN;
  if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime)) {
    return leftTime - rightTime;
  }
  return String(left ?? '').localeCompare(String(right ?? ''));
}
