import type { CellEvaluationResult, ProvenanceEvidence } from "@/domain/types";

import { evidenceForItem, formatTime } from "./format";

export function ListRenderer({
  onWhy,
  result,
}: {
  result: CellEvaluationResult;
  onWhy: (evidence: ProvenanceEvidence, trigger?: HTMLElement | null) => void;
}) {
  const items = result.payload.items ?? [];
  return (
    <div className="list-renderer">
      {items.map((item) => {
        const evidence = evidenceForItem(result, item);
        return (
          <div className="result-row" key={item.itemId}>
            <div>
              <strong>{item.title}</strong>
              <p>{item.subtitle}</p>
              {item.body ? <span>{item.body}</span> : null}
            </div>
            <div className="row-actions">
              <time>{formatTime(item.time)}</time>
              {evidence ? (
                <button
                  type="button"
                  aria-label={`Why for ${item.title ?? item.itemId}`}
                  onClick={(event) => onWhy(evidence, event.currentTarget)}
                >
                  Why
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
