import type { CellEvaluationResult, ProvenanceEvidence } from "@/domain/types";

import { evidenceForItem, formatValue } from "./format";

export function TableRenderer({
  onWhy,
  result,
}: {
  result: CellEvaluationResult;
  onWhy: (evidence: ProvenanceEvidence, trigger?: HTMLElement | null) => void;
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
              <th
                className={columnClassName(
                  column,
                  table.columnTypes?.[column],
                  "header",
                )}
                data-column={column}
                key={column}
                scope="col"
              >
                {table.columnLabels?.[column] ?? column}
              </th>
            ))}
            <th className="table-header table-header-why" scope="col">
              Why
            </th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => {
            const evidence = evidenceForItem(result, row);
            const itemLabel = row.title ?? String(row.itemId);
            return (
              <tr key={row.itemId}>
                {table.columns.map((column) => {
                  const fieldType = table.columnTypes?.[column];
                  const allDay = row.fields.all_day?.value === true;
                  return (
                    <td
                      className={columnClassName(column, fieldType, "cell")}
                      data-column={column}
                      key={column}
                    >
                      {formatValue(row.fields[column], {
                        allDay,
                        field: column,
                        fieldType,
                        timeZone: table.displayTimeZone,
                      })}
                    </td>
                  );
                })}
                <td className="table-cell table-cell-why">
                  {evidence ? (
                    <button
                      className="why-button"
                      type="button"
                      aria-label={`Why for ${itemLabel}`}
                      onClick={(event) => onWhy(evidence, event.currentTarget)}
                    >
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

function columnClassName(
  column: string,
  fieldType: string | undefined,
  kind: "header" | "cell",
): string {
  const classes = [
    kind === "header" ? "table-header" : "table-cell",
    `table-column-${column.replace(/[^a-z0-9_-]/gi, "-")}`,
  ];
  if (fieldType) {
    classes.push(`table-${kind}-${fieldType}`);
  }
  if (fieldType === "datetime" || fieldType === "date") {
    classes.push(`table-${kind}-dateish`);
  }
  if (column === "title" || column === "location") {
    classes.push(`table-${kind}-long-text`);
  }
  return classes.join(" ");
}
