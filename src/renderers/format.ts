import type {
  CellEvaluationResult,
  FieldType,
  ProvenanceEvidence,
  RenderedItem,
  TaintedValue,
} from "@/domain/types";

export interface FormatValueOptions {
  field?: string;
  fieldType?: FieldType;
  timeZone?: string;
  allDay?: boolean;
}

const dayMs = 24 * 60 * 60 * 1000;

export function formatValue(
  value: TaintedValue | undefined,
  options: FormatValueOptions = {},
): string {
  if (!value) {
    return "";
  }
  if (Array.isArray(value.value)) {
    return value.value.join(", ");
  }
  if (value.value === null || value.value === undefined) {
    return "";
  }
  if (
    typeof value.value === "string" &&
    (options.fieldType === "datetime" || options.fieldType === "date")
  ) {
    return formatDateValue(value.value, options);
  }
  return String(value.value);
}

export function formatTime(value: string | undefined): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDateValue(value: string, options: FormatValueOptions): string {
  const date = displayDateForValue(value, options);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const dateOnly =
    options.fieldType === "date" ||
    (options.allDay && (options.field === "start" || options.field === "end"));
  const formatOptions: Intl.DateTimeFormatOptions = dateOnly
    ? {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: options.timeZone,
      }
    : {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: options.timeZone,
      };
  try {
    return new Intl.DateTimeFormat("en-US", formatOptions).format(date);
  } catch {
    const fallbackOptions = { ...formatOptions };
    delete fallbackOptions.timeZone;
    return new Intl.DateTimeFormat("en-US", fallbackOptions).format(date);
  }
}

function displayDateForValue(value: string, options: FormatValueOptions): Date {
  const date = new Date(value);
  if (
    options.allDay &&
    options.field === "end" &&
    !Number.isNaN(date.getTime())
  ) {
    return new Date(date.getTime() - dayMs);
  }
  return date;
}

export function evidenceForItem(
  result: CellEvaluationResult,
  item: RenderedItem,
): ProvenanceEvidence | undefined {
  const evidenceId = item.evidenceIds[0];
  return result.evidence.find((evidence) => evidence.id === evidenceId);
}
