import type {
  CellEvaluationResult,
  LensDefinition,
  PersistedEvaluationRecord,
  PersistedEvidenceRecord,
  PersistedEvaluationSnapshot,
  PersistedPayloadPreview,
  SnapshotPolicy,
} from "@/domain/types";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface PersistedState {
  lenses: LensDefinition[];
  evaluations: PersistedEvaluationRecord[];
}

const defaultState: PersistedState = {
  lenses: [],
  evaluations: [],
};

const defaultEvidencePolicy: SnapshotPolicy = {
  tier: "evidence",
  retentionDays: 30,
  syncSnapshots: false,
};

export class LocalStage0Store {
  private readonly key = "wovith.stage0.store.v1";

  constructor(private readonly storage: StorageLike) {}

  listLenses(): LensDefinition[] {
    return this.read().lenses;
  }

  getLens(id: LensDefinition["id"]): LensDefinition | null {
    return this.read().lenses.find((lens) => lens.id === id) ?? null;
  }

  saveLens(lens: LensDefinition): void {
    const state = this.read();
    this.write({
      ...state,
      lenses: [...state.lenses.filter((entry) => entry.id !== lens.id), lens],
    });
  }

  deleteLens(id: LensDefinition["id"]): void {
    const state = this.read();
    this.write({
      lenses: state.lenses.filter((lens) => lens.id !== id),
      evaluations: state.evaluations.filter((result) => result.lensId !== id),
    });
  }

  saveEvaluation(
    result: CellEvaluationResult,
    snapshotPolicy: SnapshotPolicy = defaultEvidencePolicy,
  ): void {
    const state = this.read();
    const persisted = toPersistedEvaluationRecord(result, snapshotPolicy);
    const withoutExisting = state.evaluations.filter(
      (entry) => entry.evaluationId !== result.evaluationId,
    );
    this.write({
      ...state,
      evaluations: [...withoutExisting, persisted].slice(-50),
    });
  }

  listEvaluations(
    cellId?: CellEvaluationResult["cellId"],
  ): PersistedEvaluationRecord[] {
    const evaluations = this.read().evaluations;
    return cellId
      ? evaluations.filter((entry) => entry.cellId === cellId)
      : evaluations;
  }

  clearEvaluations(): void {
    const state = this.read();
    this.write({ ...state, evaluations: [] });
  }

  clearEvaluationsForLens(lensId: LensDefinition["id"]): void {
    const state = this.read();
    this.write({
      ...state,
      evaluations: state.evaluations.filter((entry) => entry.lensId !== lensId),
    });
  }

  clearEvaluationsForCell(cellId: CellEvaluationResult["cellId"]): void {
    const state = this.read();
    this.write({
      ...state,
      evaluations: state.evaluations.filter((entry) => entry.cellId !== cellId),
    });
  }

  clearAll(): void {
    this.storage.removeItem(this.key);
  }

  clear(): void {
    this.clearAll();
  }

  private read(): PersistedState {
    const raw = this.storage.getItem(this.key);
    if (!raw) {
      return defaultState;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<PersistedState> & {
        evaluations?: unknown[];
      };
      const lenses = Array.isArray(parsed.lenses) ? parsed.lenses : [];
      const evaluations = Array.isArray(parsed.evaluations)
        ? parsed.evaluations
            .map((entry) => migrateEvaluationRecord(entry))
            .filter((entry): entry is PersistedEvaluationRecord =>
              Boolean(entry),
            )
        : [];
      return { lenses, evaluations };
    } catch {
      return defaultState;
    }
  }

  private write(state: PersistedState): void {
    this.storage.setItem(this.key, JSON.stringify(state));
  }
}

export function toPersistedEvaluationRecord(
  result: CellEvaluationResult,
  snapshotPolicy: SnapshotPolicy,
): PersistedEvaluationRecord {
  const snapshot = toPersistedSnapshot(result, snapshotPolicy);
  if (snapshotPolicy.tier === "full-output") {
    return {
      kind: "persisted-evaluation-record",
      version: 1,
      evaluationId: result.evaluationId,
      cellId: result.cellId,
      lensId: result.lensId,
      evaluatedAt: result.evaluatedAt,
      freshness: result.freshness,
      renderer: result.renderer,
      durationMs: result.durationMs,
      warnings: result.warnings,
      errors: result.errors,
      snapshot,
      evidence: result.evidence.map(toPersistedEvidence),
      payloadPreview: toPayloadPreview(result),
      fullOutput: {
        payload: result.payload,
        evidence: result.evidence,
      },
    };
  }

  return {
    kind: "persisted-evaluation-record",
    version: 1,
    evaluationId: result.evaluationId,
    cellId: result.cellId,
    lensId: result.lensId,
    evaluatedAt: result.evaluatedAt,
    freshness: result.freshness,
    renderer: result.renderer,
    durationMs: result.durationMs,
    warnings: result.warnings,
    errors: result.errors,
    snapshot,
    evidence:
      snapshotPolicy.tier === "none"
        ? []
        : result.evidence.map(toPersistedEvidence),
    payloadPreview:
      snapshotPolicy.tier === "none" ? null : toPayloadPreview(result),
  };
}

function toPersistedSnapshot(
  result: CellEvaluationResult,
  snapshotPolicy: SnapshotPolicy,
): PersistedEvaluationSnapshot {
  return {
    ...result.snapshot,
    storageTier: snapshotPolicy.tier,
    inputEvidenceIds:
      snapshotPolicy.tier === "none" ? [] : result.snapshot.inputEvidenceIds,
    outputSummary:
      snapshotPolicy.tier === "summary"
        ? result.snapshot.outputSummary
        : result.snapshot.outputSummary,
  };
}

function toPersistedEvidence(
  evidence: CellEvaluationResult["evidence"][number],
): PersistedEvidenceRecord {
  return {
    id: evidence.id,
    snapshotId: evidence.snapshotId,
    evaluationId: evidence.evaluationId,
    cellId: evidence.cellId,
    sourceId: evidence.sourceId,
    itemId: evidence.itemId,
    sourceTimestamp: evidence.sourceTimestamp,
    observedAt: evidence.observedAt,
    matchedPredicates: evidence.matchedPredicates.map((predicate) => ({
      predicateId: predicate.predicateId,
      field: predicate.field,
      op: predicate.op,
      expected: predicate.expected,
      matched: predicate.matched,
    })),
    sortEvidence: evidence.sortEvidence
      ? {
          field: evidence.sortEvidence.field,
          direction: evidence.sortEvidence.direction,
        }
      : undefined,
    selectedFields: evidence.selectedFields.map((field) => ({
      field: field.field,
      trust: field.trust,
      contentHash: field.contentHash,
      stored: field.stored,
      redactedPreview: safeFieldPreview(field),
    })),
    contentHash: evidence.contentHash,
    redactedPreview: "[redacted preview]",
    trust: evidence.trust,
  };
}

function toPayloadPreview(
  result: CellEvaluationResult,
): PersistedPayloadPreview {
  return {
    kind: result.renderer,
    outputCount: result.snapshot.outputCount,
    outputSummary: result.snapshot.outputSummary,
    scalar: result.renderer === "count" ? result.payload.scalar : undefined,
    itemPreviews: (result.payload.items ?? []).map((item) => ({
      itemId: item.itemId,
      time: item.time,
      evidenceIds: item.evidenceIds,
    })),
  };
}

function safeFieldPreview(
  field: CellEvaluationResult["evidence"][number]["selectedFields"][number],
): string | undefined {
  if (
    !field.stored ||
    field.trust === "external-content" ||
    field.trust === "agent-output" ||
    field.trust === "third-party-tool-output"
  ) {
    return field.redactedPreview ? "[redacted]" : undefined;
  }
  return field.redactedPreview;
}

function migrateEvaluationRecord(
  entry: unknown,
): PersistedEvaluationRecord | null {
  if (isPersistedEvaluationRecord(entry)) {
    return entry;
  }
  if (isLegacyEvaluationResult(entry)) {
    return toPersistedEvaluationRecord(entry, defaultEvidencePolicy);
  }
  return null;
}

function isPersistedEvaluationRecord(
  entry: unknown,
): entry is PersistedEvaluationRecord {
  return (
    typeof entry === "object" &&
    entry !== null &&
    (entry as Partial<PersistedEvaluationRecord>).kind ===
      "persisted-evaluation-record" &&
    (entry as Partial<PersistedEvaluationRecord>).version === 1
  );
}

function isLegacyEvaluationResult(
  entry: unknown,
): entry is CellEvaluationResult {
  const candidate = entry as Partial<CellEvaluationResult>;
  return (
    typeof entry === "object" &&
    entry !== null &&
    Boolean(candidate.evaluationId) &&
    Boolean(candidate.cellId) &&
    Boolean(candidate.lensId) &&
    Boolean(candidate.snapshot) &&
    Boolean(candidate.payload)
  );
}

export class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}
