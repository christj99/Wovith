import type { CellEvaluationResult, ProvenanceEvidence } from '@/domain/types';

import { evidenceForItem, formatValue } from './format';

export function TableRenderer({
  onWhy,
  result,
}: {
  result: CellEvaluationResult;
  onWhy: (evidence: ProvenanceEvidence) => void;
}) {
  const table = result.payload.table;
  if (!table) {
    return null;
  }
  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            {table.columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
            <th>Why</th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => {
            const evidence = evidenceForItem(result, row);
            return (
              <tr key={row.itemId}>
                {table.columns.map((column) => (
                  <td key={column}>{formatValue(row.fields[column])}</td>
                ))}
                <td>
                  {evidence ? (
                    <button type="button" onClick={() => onWhy(evidence)}>
                      Why
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
