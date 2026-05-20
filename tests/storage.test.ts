import { describe, expect, it } from 'vitest';

import { evaluateCell } from '@/runtime/evaluator';
import { createDailyWorkLens } from '@/runtime/starter-lens';
import { createSyntheticAdapters } from '@/sources/synthetic/synthetic-adapter';
import { sourceSchemaRegistry } from '@/sources/registry';
import { LocalStage0Store, MemoryStorage } from '@/storage/local-store';
import { stage0ValidationContext, testNow } from '@/testing/context';

describe('local persistence', () => {
  it('saves and reloads lens definitions', () => {
    const storage = new MemoryStorage();
    const store = new LocalStage0Store(storage);
    const lens = createDailyWorkLens();
    store.saveLens(lens);

    const reloaded = new LocalStage0Store(storage).getLens(lens.id);
    expect(reloaded?.name).toBe('Daily Work Lens');
    expect(reloaded?.cells).toHaveLength(4);
  });

  it('persists recent evaluation snapshots and evidence', async () => {
    const storage = new MemoryStorage();
    const store = new LocalStage0Store(storage);
    const lens = createDailyWorkLens();
    const cell = lens.cells[0];
    const adapters = createSyntheticAdapters();
    const result = await evaluateCell({
      cell,
      lensId: lens.id,
      adapter: adapters[cell.ast.from.sourceId],
      sourceSchema: sourceSchemaRegistry[cell.ast.from.sourceId],
      validationContext: stage0ValidationContext,
      now: testNow,
    });

    store.saveEvaluation(result);
    const reloaded = new LocalStage0Store(storage).listEvaluations(cell.id);
    expect(reloaded).toHaveLength(1);
    expect(reloaded[0]?.evidence.length).toBeGreaterThan(0);
  });
});
