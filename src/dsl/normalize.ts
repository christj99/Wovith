import type { CellAst, LiteralValue } from "@/domain/types";

export function normalizeCellAstForComparison(ast: CellAst): CellAst {
  return {
    ...ast,
    where: ast.where.map((predicate) => ({
      ...predicate,
      value:
        predicate.value?.kind === "function"
          ? predicate.value
          : normalizeLiteral(predicate.value),
    })),
    sort: ast.sort ? [...ast.sort] : undefined,
    take: ast.take ? { ...ast.take } : undefined,
    show: { ...ast.show },
  };
}

function normalizeLiteral(
  value: LiteralValue | undefined,
): LiteralValue | undefined {
  if (!value) {
    return value;
  }
  if (
    value.kind === "datetime" ||
    value.kind === "date" ||
    value.kind === "enum"
  ) {
    return { kind: "string", value: value.value };
  }
  if (value.kind === "array") {
    return {
      kind: "array",
      value: value.value.map((entry) => normalizeLiteral(entry) ?? entry),
    };
  }
  return value;
}
