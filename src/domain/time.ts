import { asIsoDateTime } from './ids';
import type { FunctionCallValue, IsoDateTime, LiteralValue } from './types';

export function resolveAstValue(value: LiteralValue | FunctionCallValue | undefined, now: Date): unknown {
  if (!value) {
    return undefined;
  }
  if (value.kind !== 'function') {
    return value.value;
  }
  if (value.name === 'now') {
    return asIsoDateTime(now.toISOString());
  }
  if (value.name === 'today') {
    const date = new Date(now);
    date.setHours(0, 0, 0, 0);
    return asIsoDateTime(date.toISOString());
  }
  const firstArg = value.args[0];
  const amount = firstArg?.kind === 'number' ? firstArg.value : 0;
  const date = new Date(now);
  if (value.name === 'days_ago') {
    date.setDate(date.getDate() - amount);
    return asIsoDateTime(date.toISOString());
  }
  if (value.name === 'in_days') {
    date.setDate(date.getDate() + amount);
    return asIsoDateTime(date.toISOString());
  }
  return undefined;
}

export function previewAstValue(value: LiteralValue | FunctionCallValue | undefined): string {
  if (!value) {
    return '';
  }
  if (value.kind === 'function') {
    const args = value.args.map((arg) => previewAstValue(arg)).join(', ');
    return `${value.name}(${args})`;
  }
  if (value.kind === 'string' || value.kind === 'enum' || value.kind === 'date' || value.kind === 'datetime') {
    return String(value.value);
  }
  if (value.kind === 'array') {
    return `[${value.value.map((entry) => previewAstValue(entry)).join(', ')}]`;
  }
  return String(value.value);
}

export function toDateComparable(value: unknown): number {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === 'string') {
    const time = Date.parse(value);
    return Number.isNaN(time) ? 0 : time;
  }
  return 0;
}

export function isIsoDateTime(value: unknown): value is IsoDateTime {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}
