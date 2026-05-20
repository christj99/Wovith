import type {
  CellAst,
  DslValidationContext,
  DslValidationError,
  DslValidationReport,
  DslValidationWarning,
  FieldSchema,
  FunctionCallValue,
  LiteralValue,
} from "@/domain/types";

import { getRendererFieldAccess } from "./renderer-access";

const timeFunctions = new Set(["now", "today", "days_ago", "in_days"]);

export function validateCellAst(
  ast: CellAst,
  context: DslValidationContext,
): DslValidationReport {
  const errors: DslValidationError[] = [];
  const warnings: DslValidationWarning[] = [];
  const source = context.sourceSchemas[ast.from.sourceId];
  let readsExternalContent = false;

  if (!source) {
    errors.push({
      code: "unknown-source",
      message: `Unknown source: ${ast.from.sourceId}`,
      path: "from.sourceId",
    });
  }

  if (!context.allowedRenderers.includes(ast.show.renderer)) {
    errors.push({
      code: "renderer-not-allowed",
      message: `Renderer is not available in Stage 0: ${ast.show.renderer}`,
      path: "show.renderer",
    });
  }

  if (
    ast.take &&
    (!Number.isInteger(ast.take.count) ||
      ast.take.count <= 0 ||
      ast.take.count > context.maxTake)
  ) {
    errors.push({
      code: "take-too-large",
      message: `Take must be between 1 and ${context.maxTake}.`,
      path: "take.count",
    });
  }

  if (!ast.take) {
    warnings.push({
      code: "unbounded-query",
      message:
        "This cell has no take clause, so it may render every matching fixture item.",
      path: "take",
    });
  }

  if (source) {
    ast.where.forEach((predicate, index) => {
      const field = source.fields[predicate.field];
      const path = `where.${index}`;
      if (!field) {
        errors.push({
          code: "unknown-field",
          message: `Unknown field on ${source.sourceId}: ${predicate.field}`,
          path,
        });
        return;
      }
      readsExternalContent =
        readsExternalContent || field.containsExternalContent;
      if (field.containsExternalContent) {
        warnings.push({
          code: "external-content-read",
          message: `${field.label} may contain external content and is treated as data, not instruction.`,
          path,
        });
      }
      if (!field.allowedOperators.includes(predicate.op)) {
        errors.push({
          code: "operator-not-allowed",
          message: `${predicate.op} is not allowed for ${field.name}.`,
          path,
        });
      }
      if (!valueMatchesField(field, predicate.op, predicate.value)) {
        errors.push({
          code: "type-mismatch",
          message: `Predicate value does not match ${field.name} (${field.type}).`,
          path,
        });
      }
    });

    for (const access of getRendererFieldAccess(ast.show.renderer, source)) {
      readsExternalContent =
        readsExternalContent || access.field.containsExternalContent;
      const path = `show.${ast.show.renderer}.${access.field.name}`;
      if (access.field.containsExternalContent) {
        pushWarning(warnings, {
          code: "renderer-external-content-display",
          message: `${ast.show.renderer} renderer may display external-content field ${access.field.label}.`,
          path,
        });
      }
      if (access.field.sensitive) {
        pushWarning(warnings, {
          code:
            ast.show.renderer === "raw"
              ? "raw-renderer-sensitive-output"
              : "sensitive-field-display",
          message:
            ast.show.renderer === "raw"
              ? `Raw renderer may expose sensitive field ${access.field.label}.`
              : `${ast.show.renderer} renderer may display sensitive field ${access.field.label}.`,
          path,
        });
      }
    }

    (ast.sort ?? []).forEach((sort, index) => {
      const field = source.fields[sort.field];
      if (!field) {
        errors.push({
          code: "unknown-field",
          message: `Unknown sort field on ${source.sourceId}: ${sort.field}`,
          path: `sort.${index}.field`,
        });
        return;
      }
      if (!field.sortable) {
        errors.push({
          code: "operator-not-allowed",
          message: `${field.name} is not sortable.`,
          path: `sort.${index}.field`,
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    readsExternalContent,
  };
}

function pushWarning(
  warnings: DslValidationWarning[],
  warning: DslValidationWarning,
): void {
  if (
    !warnings.some(
      (existing) =>
        existing.code === warning.code && existing.path === warning.path,
    )
  ) {
    warnings.push(warning);
  }
}

function valueMatchesField(
  field: FieldSchema,
  op: CellAst["where"][number]["op"],
  value: LiteralValue | FunctionCallValue | undefined,
): boolean {
  if ((op === "exists" || op === "not_exists") && value === undefined) {
    return true;
  }
  if (!value) {
    return false;
  }
  if (value.kind === "null") {
    return field.nullable;
  }
  if (value.kind === "function") {
    return (
      (field.type === "datetime" || field.type === "date") &&
      timeFunctions.has(value.name)
    );
  }
  if (field.type === "boolean") {
    return value.kind === "boolean";
  }
  if (field.type === "number") {
    return value.kind === "number";
  }
  if (field.type === "datetime" || field.type === "date") {
    return (
      value.kind === "datetime" ||
      value.kind === "date" ||
      value.kind === "string"
    );
  }
  if (field.type === "array") {
    return (
      value.kind === "string" ||
      value.kind === "number" ||
      value.kind === "boolean" ||
      value.kind === "array"
    );
  }
  return value.kind === "string" || value.kind === "enum";
}
