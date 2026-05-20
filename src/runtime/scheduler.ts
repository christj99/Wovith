import type {
  CellDefinition,
  CellEvaluationResult,
  CellRunReason,
  DslValidationContext,
  EvaluationClock,
  LensDefinition,
  SourceAdapter,
  SourceSchema,
} from "@/domain/types";

import { createBlockedEvaluationResult } from "./evaluation-results";
import { evaluateCell, type EvaluateCellInput } from "./evaluator";

export interface RuntimeSchedulerOptions {
  adapters: Record<string, SourceAdapter | undefined>;
  sourceSchemas: Record<string, SourceSchema | undefined>;
  validationContext: DslValidationContext;
  clock: EvaluationClock;
  defaultTtlMs?: number;
  evaluate?: (input: EvaluateCellInput) => Promise<CellEvaluationResult>;
}

export class RuntimeScheduler {
  private readonly inFlight = new Map<string, Promise<CellEvaluationResult>>();
  private readonly evaluate: (
    input: EvaluateCellInput,
  ) => Promise<CellEvaluationResult>;
  private readonly defaultTtlMs: number;

  constructor(private readonly options: RuntimeSchedulerOptions) {
    this.evaluate = options.evaluate ?? evaluateCell;
    this.defaultTtlMs = options.defaultTtlMs ?? 15 * 60 * 1000;
  }

  refreshCell(
    cell: CellDefinition,
    lens: LensDefinition,
    reason: CellRunReason = "manual",
  ): Promise<CellEvaluationResult> {
    const existing = this.inFlight.get(cell.id);
    if (existing) {
      return existing;
    }

    const sourceSchema = this.options.sourceSchemas[cell.ast.from.sourceId];
    const adapter = this.options.adapters[cell.ast.from.sourceId];
    const run =
      !sourceSchema || !adapter
        ? Promise.resolve(
            this.blockedResult(cell, lens, sourceSchema ? "adapter" : "schema"),
          )
        : this.evaluate({
            cell,
            lensId: lens.id,
            adapter,
            sourceSchema,
            validationContext: this.options.validationContext,
            clock: this.options.clock,
          });

    const tracked = run.then((result) => markRunReason(result, reason));
    this.inFlight.set(cell.id, tracked);
    tracked.finally(() => this.inFlight.delete(cell.id));
    return tracked;
  }

  refreshAll(
    lens: LensDefinition,
    reason: CellRunReason = "refresh-all",
  ): Promise<CellEvaluationResult[]> {
    return Promise.all(
      lens.cells
        .filter((cell) => cell.enabled)
        .map((cell) => this.refreshCell(cell, lens, reason)),
    );
  }

  refreshOnOpen(lens: LensDefinition): Promise<CellEvaluationResult[]> {
    return Promise.all(
      lens.cells
        .filter(
          (cell) =>
            cell.enabled &&
            (cell.refreshPolicy.mode === "on-open" ||
              cell.refreshPolicy.mode === "interval"),
        )
        .map((cell) => this.refreshCell(cell, lens, "on-open")),
    );
  }

  markStaleResults(
    lens: LensDefinition,
    results: Record<string, CellEvaluationResult>,
    clock: EvaluationClock = this.options.clock,
  ): Record<string, CellEvaluationResult> {
    return Object.fromEntries(
      Object.entries(results).map(([cellId, result]) => {
        const cell = lens.cells.find((entry) => entry.id === cellId);
        if (
          !cell ||
          result.freshness === "failed" ||
          result.freshness === "blocked"
        ) {
          return [cellId, result];
        }
        const ttlMs = ttlForCell(cell, this.defaultTtlMs);
        const evaluatedAt = Date.parse(result.evaluatedAt);
        const stale = Number.isNaN(evaluatedAt)
          ? true
          : clock.now.getTime() - evaluatedAt > ttlMs;
        return [
          cellId,
          stale ? { ...result, freshness: "stale" as const } : result,
        ];
      }),
    );
  }

  private blockedResult(
    cell: CellDefinition,
    lens: LensDefinition,
    missing: "schema" | "adapter",
  ): CellEvaluationResult {
    return createBlockedEvaluationResult({
      cell,
      lensId: lens.id,
      clock: this.options.clock,
      error: {
        code:
          missing === "schema"
            ? "source-schema-missing"
            : "source-adapter-unavailable",
        message:
          missing === "schema"
            ? `Source schema unavailable for ${cell.ast.from.sourceId}.`
            : `Source adapter unavailable for ${cell.ast.from.sourceId}.`,
      },
    });
  }
}

function ttlForCell(cell: CellDefinition, defaultTtlMs: number): number {
  if (
    cell.refreshPolicy.mode === "interval" &&
    cell.refreshPolicy.intervalMinutes
  ) {
    return cell.refreshPolicy.intervalMinutes * 60 * 1000;
  }
  return defaultTtlMs;
}

function markRunReason(
  result: CellEvaluationResult,
  reason: CellRunReason,
): CellEvaluationResult {
  void reason;
  return result;
}
