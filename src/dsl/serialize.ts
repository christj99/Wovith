import type { CellAst, FunctionCallValue, LiteralValue } from '@/domain/types';

import { canonicalOperatorToDsl } from './operators';

export function serializeCellAst(ast: CellAst): string {
  const lines: string[] = [`from ${ast.from.sourceId}`];

  for (const predicate of ast.where) {
    const operator = canonicalOperatorToDsl[predicate.op];
    if (predicate.op === 'exists' || predicate.op === 'not_exists') {
      lines.push(`where ${predicate.field} ${operator}`);
    } else {
      lines.push(`where ${predicate.field} ${operator} ${serializeAstValue(predicate.value)}`);
    }
  }

  for (const sort of ast.sort ?? []) {
    lines.push(`sort by ${sort.field} ${sort.direction}`);
  }

  if (ast.take) {
    lines.push(`take ${ast.take.count}`);
  }

  lines.push(`show as ${ast.show.renderer}`);
  return lines.join('\n');
}

export function serializeAstValue(value: LiteralValue | FunctionCallValue | undefined): string {
  if (!value) {
    return '';
  }
  if (value.kind === 'function') {
    const args = value.args.map((arg) => serializeAstValue(arg)).join(', ');
    return `${value.name}(${args})`;
  }
  if (value.kind === 'string' || value.kind === 'enum' || value.kind === 'date' || value.kind === 'datetime') {
    return JSON.stringify(value.value);
  }
  if (value.kind === 'array') {
    return `[${value.value.map((entry) => serializeAstValue(entry)).join(', ')}]`;
  }
  if (value.kind === 'null') {
    return 'null';
  }
  return String(value.value);
}
