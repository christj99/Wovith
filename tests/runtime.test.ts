import { describe, expect, it } from 'vitest';

import { evaluateCell } from '@/runtime/evaluator';
import { createDailyWorkLens } from '@/runtime/starter-lens';
import { createSyntheticAdapters } from '@/sources/synthetic/synthetic-adapter';
import { sourceSchemaRegistry } from '@/sources/registry';
import { stage0ValidationContext, testNow } from '@/testing/context';

describe('synthetic runtime evaluation', () => {
  it('filters, sorts, takes, renders, and records evidence for mail', async () => {
    const lens = createDailyWorkLens();
    const cell = lens.cells.find((entry) => entry.title === 'Unread Important Messages');
    expect(cell).toBeDefined();
    if (!cell) {
      return;
    }
    const adapters = createSyntheticAdapters();
    const result = await evaluateCell({
      cell,
      lensId: lens.id,
      adapter: adapters[cell.ast.from.sourceId],
      sourceSchema: sourceSchemaRegistry[cell.ast.from.sourceId],
      validationContext: stage0ValidationContext,
      now: testNow,
    });
    expect(result.errors).toEqual([]);
    expect(result.freshness).toBe('fresh');
    expect(result.payload.items?.map((item) => item.itemId)).toEqual(['mail-005', 'mail-001', 'mail-002']);
    expect(result.evidence).toHaveLength(3);
    expect(result.evidence[0]?.matchedPredicates).toHaveLength(2);
  });

  it('generates count renderer payloads for stale tasks due soon', async () => {
    const lens = createDailyWorkLens();
    const cell = lens.cells.find((entry) => entry.title === 'Stale Tasks Due Soon');
    expect(cell).toBeDefined();
    if (!cell) {
      return;
    }
    const adapters = createSyntheticAdapters();
    const result = await evaluateCell({
      cell,
      lensId: lens.id,
      adapter: adapters[cell.ast.from.sourceId],
      sourceSchema: sourceSchemaRegistry[cell.ast.from.sourceId],
      validationContext: stage0ValidationContext,
      now: testNow,
    });
    expect(result.renderer).toBe('count');
    expect(result.payload.scalar).toBe(2);
    expect(result.snapshot.outputCount).toBe(2);
  });

  it('fails visibly for semantic validation errors', async () => {
    const lens = createDailyWorkLens();
    const cell = {
      ...lens.cells[0],
      ast: {
        ...lens.cells[0].ast,
        where: [{ id: 'pred-1', field: 'missing', op: 'is' as const, value: { kind: 'boolean' as const, value: true } }],
      },
    };
    const adapters = createSyntheticAdapters();
    const result = await evaluateCell({
      cell,
      lensId: lens.id,
      adapter: adapters[cell.ast.from.sourceId],
      sourceSchema: sourceSchemaRegistry[cell.ast.from.sourceId],
      validationContext: stage0ValidationContext,
      now: testNow,
    });
    expect(result.freshness).toBe('failed');
    expect(result.errors[0]?.code).toBe('unknown-field');
  });
});
