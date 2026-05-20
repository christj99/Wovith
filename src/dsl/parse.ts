import { asSourceId } from '@/domain/ids';
import type { CellAst, FunctionCallValue, LiteralValue, RendererKind, Result, WovithError } from '@/domain/types';

import { dslOperatorToCanonical } from './operators';

const rendererKinds: RendererKind[] = ['list', 'count', 'table', 'raw'];
const wherePattern =
  /^where\s+([A-Za-z_][A-Za-z0-9_]*)\s+(is not|on or before|on or after|greater than|less than|not exists|contains|before|after|exists|is)(?:\s+(.+))?$/;

export function parseCanonicalDsl(input: string): Result<CellAst> {
  const rawLines = input.replace(/\r\n/g, '\n').split('\n');
  const lines = rawLines
    .map((text, index) => ({ text: text.trim(), line: index + 1 }))
    .filter((line) => line.text.length > 0);

  if (lines.length === 0) {
    return parseFailure('syntax-empty', 'DSL is empty.', 1, 1);
  }

  const sourceMatch = /^from\s+([A-Za-z0-9_.-]+)$/.exec(lines[0].text);
  if (!sourceMatch) {
    return parseFailure('syntax-source', 'The first clause must be `from <source>`.', lines[0].line, 1);
  }

  const ast: CellAst = {
    version: 'wovith.dsl.ast.v1',
    from: { sourceId: asSourceId(sourceMatch[1]) },
    where: [],
    show: { renderer: 'list' },
  };

  let sawShow = false;
  for (let index = 1; index < lines.length; index += 1) {
    const current = lines[index];
    if (current.text.startsWith('where ')) {
      if (sawShow) {
        return parseFailure('syntax-order', 'No clauses are allowed after `show as`.', current.line, 1);
      }
      const parsed = parseWhereLine(current.text, current.line, ast.where.length + 1);
      if (!parsed.ok) {
        return parsed;
      }
      ast.where.push(parsed.value);
      continue;
    }

    if (current.text.startsWith('sort by ')) {
      if (sawShow) {
        return parseFailure('syntax-order', 'No clauses are allowed after `show as`.', current.line, 1);
      }
      const match = /^sort by\s+([A-Za-z_][A-Za-z0-9_]*)\s+(asc|desc)$/.exec(current.text);
      if (!match) {
        return parseFailure('syntax-sort', 'Sort clauses must use `sort by <field> asc|desc`.', current.line, 1);
      }
      ast.sort = [...(ast.sort ?? []), { field: match[1], direction: match[2] as 'asc' | 'desc' }];
      continue;
    }

    if (current.text.startsWith('take ')) {
      if (sawShow) {
        return parseFailure('syntax-order', 'No clauses are allowed after `show as`.', current.line, 1);
      }
      const match = /^take\s+([0-9]+)$/.exec(current.text);
      if (!match) {
        return parseFailure('syntax-take', 'Take clauses must use `take <positive integer>`.', current.line, 1);
      }
      ast.take = { count: Number(match[1]) };
      continue;
    }

    if (current.text.startsWith('show as ')) {
      const match = /^show as\s+([A-Za-z_][A-Za-z0-9_]*)$/.exec(current.text);
      if (!match || !rendererKinds.includes(match[1] as RendererKind)) {
        return parseFailure('syntax-renderer', 'Show clauses must use `show as list|count|table|raw`.', current.line, 1);
      }
      ast.show = { renderer: match[1] as RendererKind };
      sawShow = true;
      continue;
    }

    return parseFailure('syntax-unknown', `Unsupported clause: ${current.text}`, current.line, 1);
  }

  if (!sawShow) {
    return parseFailure('syntax-renderer', 'DSL must end with a `show as <renderer>` clause.', lines.at(-1)?.line ?? 1, 1);
  }

  return { ok: true, value: ast };
}

function parseWhereLine(text: string, line: number, index: number): Result<CellAst['where'][number]> {
  const match = wherePattern.exec(text);
  if (!match) {
    return parseFailure('syntax-where', 'Where clauses must use canonical predicate syntax.', line, 1);
  }
  const [, field, operatorText, rawValue] = match;
  const op = dslOperatorToCanonical[operatorText];
  if ((op === 'exists' || op === 'not_exists') && rawValue !== undefined) {
    return parseFailure('syntax-where', '`exists` predicates do not take a value.', line, text.indexOf(rawValue) + 1);
  }
  if (op !== 'exists' && op !== 'not_exists' && rawValue === undefined) {
    return parseFailure('syntax-where', 'This predicate requires a value.', line, text.length);
  }
  let value: CellAst['where'][number]['value'];
  if (rawValue !== undefined) {
    const parsedValue = parseValue(rawValue, line);
    if (!parsedValue.ok) {
      return parsedValue;
    }
    value = parsedValue.value;
  }
  return {
    ok: true,
    value: {
      id: `pred-${index}`,
      field,
      op,
      value,
    },
  };
}

function parseValue(raw: string, line: number): Result<LiteralValue | FunctionCallValue> {
  const trimmed = raw.trim();
  if (/^"(?:[^"\\]|\\.)*"$/.test(trimmed)) {
    try {
      return { ok: true, value: { kind: 'string', value: JSON.parse(trimmed) as string } };
    } catch {
      return parseFailure('syntax-string', 'String literal is not valid JSON string syntax.', line, 1);
    }
  }
  if (trimmed === 'true' || trimmed === 'false') {
    return { ok: true, value: { kind: 'boolean', value: trimmed === 'true' } };
  }
  if (trimmed === 'null') {
    return { ok: true, value: { kind: 'null', value: null } };
  }
  if (/^-?[0-9]+(?:\.[0-9]+)?$/.test(trimmed)) {
    return { ok: true, value: { kind: 'number', value: Number(trimmed) } };
  }
  const noArgFunction = /^(today|now)\(\)$/.exec(trimmed);
  if (noArgFunction) {
    return { ok: true, value: { kind: 'function', name: noArgFunction[1] as FunctionCallValue['name'], args: [] } };
  }
  const numberArgFunction = /^(days_ago|in_days)\((-?[0-9]+)\)$/.exec(trimmed);
  if (numberArgFunction) {
    return {
      ok: true,
      value: {
        kind: 'function',
        name: numberArgFunction[1] as FunctionCallValue['name'],
        args: [{ kind: 'number', value: Number(numberArgFunction[2]) }],
      },
    };
  }
  return parseFailure('syntax-value', `Unsupported value literal: ${trimmed}`, line, 1);
}

function parseFailure(code: string, message: string, line: number, column: number): Result<never> {
  const error: WovithError = { code, message, line, column };
  return { ok: false, error };
}
