import { asCellId, asIsoDateTime, stableHash } from "@/domain/ids";
import type { CellDefinition, LensDefinition } from "@/domain/types";

export function renameCell(
  lens: LensDefinition,
  cellId: CellDefinition["id"],
  title: string,
  updatedAt: string,
): LensDefinition {
  const timestamp = asIsoDateTime(updatedAt);
  return {
    ...lens,
    updatedAt: timestamp,
    cells: lens.cells.map((cell) =>
      cell.id === cellId
        ? { ...cell, title: title.trim(), updatedAt: timestamp }
        : cell,
    ),
  };
}

export function duplicateCell(
  lens: LensDefinition,
  cellId: CellDefinition["id"],
  updatedAt: string,
): LensDefinition {
  const source = lens.cells.find((cell) => cell.id === cellId);
  if (!source) {
    return lens;
  }
  const timestamp = asIsoDateTime(updatedAt);
  const duplicate: CellDefinition = {
    ...source,
    id: asCellId(
      `${source.id}_copy_${stableHash(`${source.id}:${updatedAt}`).slice(1, 7)}`,
    ),
    title: `${source.title} Copy`,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const index = lens.cells.findIndex((cell) => cell.id === cellId);
  return {
    ...lens,
    updatedAt: timestamp,
    cells: [
      ...lens.cells.slice(0, index + 1),
      duplicate,
      ...lens.cells.slice(index + 1),
    ],
  };
}

export function setCellEnabled(
  lens: LensDefinition,
  cellId: CellDefinition["id"],
  enabled: boolean,
  updatedAt: string,
): LensDefinition {
  const timestamp = asIsoDateTime(updatedAt);
  return {
    ...lens,
    updatedAt: timestamp,
    cells: lens.cells.map((cell) =>
      cell.id === cellId ? { ...cell, enabled, updatedAt: timestamp } : cell,
    ),
  };
}

export function deleteCell(
  lens: LensDefinition,
  cellId: CellDefinition["id"],
  updatedAt: string,
): LensDefinition {
  const timestamp = asIsoDateTime(updatedAt);
  return {
    ...lens,
    updatedAt: timestamp,
    cells: lens.cells.filter((cell) => cell.id !== cellId),
  };
}
