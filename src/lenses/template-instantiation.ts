import { asIsoDateTime, asLensId, stableHash } from "@/domain/ids";
import type { CellDefinition, LensDefinition } from "@/domain/types";
import { makeCellFromDsl } from "@/runtime/starter-lens";

import { getLensTemplate } from "./templates";

export function createLensFromTemplate(
  templateId: string,
  now: Date = new Date(),
): LensDefinition {
  const template = getLensTemplate(templateId);
  if (!template) {
    throw new Error(`Unknown lens template: ${templateId}`);
  }
  const createdAt = asIsoDateTime(now.toISOString());
  const lensId = asLensId(
    `lens_${template.id.replace(/[^a-z0-9]+/gi, "_")}_${stableHash(
      `${template.id}:${createdAt}`,
    ).slice(1, 9)}`,
  );
  return {
    id: lensId,
    version: "wovith.lens.v1",
    name: template.name,
    description: template.description,
    createdAt,
    updatedAt: createdAt,
    cells: template.cells.map((cellTemplate) =>
      createCellFromTemplate(templateId, cellTemplate.id, lensId, now),
    ),
    calibration: [],
    snapshotPolicy: {
      tier: "evidence",
      retentionDays: 30,
      syncSnapshots: false,
    },
  };
}

export function createCellFromTemplate(
  templateId: string,
  cellTemplateId: string,
  lensId: LensDefinition["id"],
  now: Date = new Date(),
): CellDefinition {
  const template = getLensTemplate(templateId);
  const cellTemplate = template?.cells.find(
    (cell) => cell.id === cellTemplateId,
  );
  if (!template || !cellTemplate) {
    throw new Error(`Unknown cell template: ${templateId}/${cellTemplateId}`);
  }
  const lensSuffix = stableHash(lensId).slice(1, 7);
  const cell = makeCellFromDsl({
    id: `cell_${template.id}_${cellTemplate.id}_${lensSuffix}`,
    lensId,
    title: cellTemplate.title,
    description: cellTemplate.description,
    dsl: cellTemplate.dsl,
    now: now.toISOString(),
  });
  return { ...cell, enabled: cellTemplate.enabled };
}
