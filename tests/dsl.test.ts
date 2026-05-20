import { describe, expect, it } from 'vitest';

import { parseCanonicalDsl } from '@/dsl/parse';
import { serializeCellAst } from '@/dsl/serialize';
import { validateCellAst } from '@/dsl/validate';
import { stage0ValidationContext } from '@/testing/context';

import { invalidGoldenDslExamples, validGoldenDslExamples } from './golden/dsl/goldenDslExamples';

describe('canonical DSL parser and serializer', () => {
  it('keeps at least 50 valid golden examples before NL work', () => {
    expect(validGoldenDslExamples.length).toBeGreaterThanOrEqual(50);
  });

  it.each(validGoldenDslExamples)('round-trips valid DSL %#', (dsl) => {
    const parsed = parseCanonicalDsl(dsl);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    const canonical = serializeCellAst(parsed.value);
    expect(canonical).toBe(dsl);
    const reparsed = parseCanonicalDsl(canonical);
    expect(reparsed.ok).toBe(true);
    if (reparsed.ok) {
      expect(reparsed.value).toEqual(parsed.value);
      expect(validateCellAst(reparsed.value, stage0ValidationContext).valid).toBe(true);
    }
  });

  it.each(invalidGoldenDslExamples)('rejects non-canonical or invalid syntax %#', (dsl) => {
    const parsed = parseCanonicalDsl(dsl);
    expect(parsed.ok).toBe(false);
  });

  it('returns location-aware parse errors', () => {
    const parsed = parseCanonicalDsl(`from synthetic.mail.threads
where unread == true
show as list`);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error.line).toBe(2);
      expect(parsed.error.column).toBeGreaterThan(0);
    }
  });
});
