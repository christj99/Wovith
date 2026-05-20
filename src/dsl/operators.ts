import type { CanonicalOperator } from "@/domain/types";

export const dslOperatorToCanonical: Record<string, CanonicalOperator> = {
  is: "is",
  "is not": "is_not",
  contains: "contains",
  before: "before",
  after: "after",
  "on or before": "on_or_before",
  "on or after": "on_or_after",
  "greater than": "greater_than",
  "less than": "less_than",
  exists: "exists",
  "not exists": "not_exists",
};

export const canonicalOperatorToDsl: Record<CanonicalOperator, string> = {
  is: "is",
  is_not: "is not",
  contains: "contains",
  before: "before",
  after: "after",
  on_or_before: "on or before",
  on_or_after: "on or after",
  greater_than: "greater than",
  less_than: "less than",
  exists: "exists",
  not_exists: "not exists",
};

export function predicateToDsl(field: string, op: CanonicalOperator): string {
  return `${field} ${canonicalOperatorToDsl[op]}`;
}
