import type {
  CellId,
  ContentHash,
  EvaluationId,
  IsoDateTime,
  LensId,
  ProvenanceEvidenceId,
  SnapshotId,
  SourceId,
  SourceItemId,
} from './types';

export function asLensId(value: string): LensId {
  return value as LensId;
}

export function asCellId(value: string): CellId {
  return value as CellId;
}

export function asSourceId(value: string): SourceId {
  return value as SourceId;
}

export function asSourceItemId(value: string): SourceItemId {
  return value as SourceItemId;
}

export function asEvaluationId(value: string): EvaluationId {
  return value as EvaluationId;
}

export function asSnapshotId(value: string): SnapshotId {
  return value as SnapshotId;
}

export function asEvidenceId(value: string): ProvenanceEvidenceId {
  return value as ProvenanceEvidenceId;
}

export function asIsoDateTime(value: string): IsoDateTime {
  return value as IsoDateTime;
}

export function createStableId(prefix: string, seed: string): string {
  return `${prefix}_${stableHash(seed).slice(0, 12)}`;
}

export function nowIso(now: Date = new Date()): IsoDateTime {
  return asIsoDateTime(now.toISOString());
}

export function stableHash(input: unknown): ContentHash {
  const json = stableStringify(input);
  let hash = 5381;
  for (let index = 0; index < json.length; index += 1) {
    hash = (hash * 33) ^ json.charCodeAt(index);
  }
  return (`h${(hash >>> 0).toString(16).padStart(8, '0')}`) as ContentHash;
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}
