import type { CellEvaluationResult, ProvenanceEvidence } from '@/domain/types';

import { evidenceForItem } from './format';

export function RawRenderer({
  onWhy,
  result,
}: {
  result: CellEvaluationResult;
  onWhy: (evidence: ProvenanceEvidence) => void;
}) {
  const items = result.payload.items ?? [];
  return (
    <div className="raw-renderer">
      <pre>{JSON.stringify(result.payload.raw, null, 2)}</pre>
      <div className="raw-actions">
        {items.map((item) => {
          const evidence = evidenceForItem(result, item);
          return evidence ? (
            <button key={item.itemId} type="button" onClick={() => onWhy(evidence)}>
              Why {item.itemId}
            </button>
          ) : null;
        })}
      </div>
    </div>
  );
}
