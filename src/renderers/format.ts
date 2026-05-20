import type { CellEvaluationResult, ProvenanceEvidence, RenderedItem, TaintedValue } from '@/domain/types';

export function formatValue(value: TaintedValue | undefined): string {
  if (!value) {
    return '';
  }
  if (Array.isArray(value.value)) {
    return value.value.join(', ');
  }
  if (value.value === null || value.value === undefined) {
    return '';
  }
  return String(value.value);
}

export function formatTime(value: string | undefined): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function evidenceForItem(result: CellEvaluationResult, item: RenderedItem): ProvenanceEvidence | undefined {
  const evidenceId = item.evidenceIds[0];
  return result.evidence.find((evidence) => evidence.id === evidenceId);
}
