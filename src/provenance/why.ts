import { serializeCellAst } from '@/dsl/serialize';
import { canonicalOperatorToDsl } from '@/dsl/operators';
import { previewAstValue } from '@/domain/time';
import type { CellAst, CellEvaluationSnapshot, ProvenanceEvidence, RuleTraceStep, SourceSchema, WhyExplanation } from '@/domain/types';

export function explainWhyItem(input: {
  ast: CellAst;
  sourceSchema: SourceSchema;
  evidence: ProvenanceEvidence;
  snapshot: CellEvaluationSnapshot;
}): WhyExplanation {
  const { ast, evidence, snapshot, sourceSchema } = input;
  const predicateText = evidence.matchedPredicates
    .map((predicate) => {
      const value = predicate.expected ? ` ${previewAstValue(predicate.expected)}` : '';
      return `${predicate.field} ${canonicalOperatorToDsl[predicate.op]}${value}`;
    })
    .join(', ');
  const sortText = evidence.sortEvidence
    ? ` It was sorted by ${evidence.sortEvidence.field} ${evidence.sortEvidence.direction}.`
    : '';
  const takeText = ast.take ? ` It was included within the first ${ast.take.count} result(s).` : '';
  const plainLanguage =
    predicateText.length > 0
      ? `Included because it came from ${sourceSchema.displayName} and matched ${predicateText}.${sortText}${takeText}`
      : `Included because it came from ${sourceSchema.displayName}.${sortText}${takeText}`;

  return {
    itemId: evidence.itemId,
    plainLanguage,
    ruleTrace: buildRuleTrace(ast, sourceSchema),
    evidence: [evidence],
    warnings: [],
    metadata: {
      evaluatedAt: snapshot.evaluatedAt,
      renderer: snapshot.outputKind,
      snapshotId: snapshot.id,
    },
  };
}

export function explainEmptyCell(input: { ast: CellAst; sourceSchema: SourceSchema; evaluatedAt: string }): string {
  const predicates = input.ast.where.map((predicate) => {
    const value = predicate.value ? ` ${previewAstValue(predicate.value)}` : '';
    return `${predicate.field} ${canonicalOperatorToDsl[predicate.op]}${value}`;
  });
  if (predicates.length === 0) {
    return `This cell is empty because ${input.sourceSchema.displayName} had no fixture records at ${input.evaluatedAt}.`;
  }
  return `This cell is empty because no ${input.sourceSchema.displayName} records matched ${predicates.join(' and ')} at ${input.evaluatedAt}.`;
}

export function buildRuleTrace(ast: CellAst, sourceSchema: SourceSchema): RuleTraceStep[] {
  const trace: RuleTraceStep[] = [
    {
      kind: 'source',
      label: `from ${ast.from.sourceId}`,
      detail: sourceSchema.displayName,
    },
  ];
  for (const predicate of ast.where) {
    const value = predicate.value ? ` ${previewAstValue(predicate.value)}` : '';
    trace.push({
      kind: 'filter',
      label: `where ${predicate.field} ${canonicalOperatorToDsl[predicate.op]}${value}`,
    });
  }
  for (const sort of ast.sort ?? []) {
    trace.push({
      kind: 'sort',
      label: `sort by ${sort.field} ${sort.direction}`,
    });
  }
  if (ast.take) {
    trace.push({
      kind: 'take',
      label: `take ${ast.take.count}`,
    });
  }
  trace.push({
    kind: 'render',
    label: `show as ${ast.show.renderer}`,
    detail: serializeCellAst(ast),
  });
  return trace;
}
