import { asEvaluationId, asSnapshotId, nowIso, stableHash } from "@/domain/ids";
import type {
  CellDefinition,
  CellEvaluationResult,
  EvaluationClock,
  FreshnessState,
  LensId,
  RendererPayload,
  WovithError,
} from "@/domain/types";

export function createBlockedEvaluationResult(input: {
  cell: CellDefinition;
  lensId: LensId;
  clock: EvaluationClock;
  error: WovithError;
}): CellEvaluationResult {
  return createSyntheticEvaluationResult({
    ...input,
    freshness: "blocked",
    outputSummary: "Evaluation blocked",
  });
}

export function createFailedEvaluationResult(input: {
  cell: CellDefinition;
  lensId: LensId;
  clock: EvaluationClock;
  error: WovithError;
}): CellEvaluationResult {
  return createSyntheticEvaluationResult({
    ...input,
    freshness: "failed",
    outputSummary: "Evaluation failed",
  });
}

function createSyntheticEvaluationResult(input: {
  cell: CellDefinition;
  lensId: LensId;
  clock: EvaluationClock;
  error: WovithError;
  freshness: Extract<FreshnessState, "blocked" | "failed">;
  outputSummary: string;
}): CellEvaluationResult {
  const evaluatedAt = nowIso(input.clock.now);
  const evaluationId = asEvaluationId(
    `eval_${stableHash(`${input.cell.id}:${input.freshness}:${evaluatedAt}`)}`,
  );
  const snapshotId = asSnapshotId(`snapshot_${evaluationId}`);
  const payload: RendererPayload = {
    kind: input.cell.ast.show.renderer,
    items: [],
    scalar: null,
  };
  return {
    evaluationId,
    cellId: input.cell.id,
    lensId: input.lensId,
    evaluatedAt,
    freshness: input.freshness,
    renderer: input.cell.ast.show.renderer,
    payload,
    snapshot: {
      id: snapshotId,
      evaluationId,
      cellId: input.cell.id,
      lensId: input.lensId,
      evaluatedAt,
      expressionHash: stableHash(input.cell.ast),
      sourceCursors: {},
      inputEvidenceIds: [],
      outputHash: stableHash(payload),
      outputKind: input.cell.ast.show.renderer,
      outputCount: 0,
      outputSummary: input.outputSummary,
      storageTier: input.cell.lensId ? "evidence" : "none",
      cacheHit: false,
      durationMs: 0,
    },
    evidence: [],
    errors: [input.error],
    warnings: [],
    durationMs: 0,
  };
}
