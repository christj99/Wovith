import { asIsoDateTime } from "./ids";
import type {
  EvaluationClock,
  FunctionCallValue,
  IsoDateTime,
  LiteralValue,
} from "./types";

const dayMs = 24 * 60 * 60 * 1000;

export function resolveAstValue(
  value: LiteralValue | FunctionCallValue | undefined,
  clock: EvaluationClock,
): unknown {
  if (!value) {
    return undefined;
  }
  if (value.kind !== "function") {
    return value.value;
  }
  if (value.name === "now") {
    return asIsoDateTime(clock.now.toISOString());
  }
  if (value.name === "today") {
    return asIsoDateTime(
      startOfDayInTimeZone(clock.now, clock.timeZone).toISOString(),
    );
  }
  const firstArg = value.args[0];
  const amount = firstArg?.kind === "number" ? firstArg.value : 0;
  if (value.name === "days_ago") {
    return asIsoDateTime(
      new Date(clock.now.getTime() - amount * dayMs).toISOString(),
    );
  }
  if (value.name === "in_days") {
    return asIsoDateTime(
      new Date(clock.now.getTime() + amount * dayMs).toISOString(),
    );
  }
  return undefined;
}

export function previewAstValue(
  value: LiteralValue | FunctionCallValue | undefined,
): string {
  if (!value) {
    return "";
  }
  if (value.kind === "function") {
    const args = value.args.map((arg) => previewAstValue(arg)).join(", ");
    return `${value.name}(${args})`;
  }
  if (
    value.kind === "string" ||
    value.kind === "enum" ||
    value.kind === "date" ||
    value.kind === "datetime"
  ) {
    return String(value.value);
  }
  if (value.kind === "array") {
    return `[${value.value.map((entry) => previewAstValue(entry)).join(", ")}]`;
  }
  return String(value.value);
}

export function toDateComparable(value: unknown): number | null {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : time;
  }
  if (typeof value === "string") {
    const time = Date.parse(value);
    return Number.isNaN(time) ? null : time;
  }
  return null;
}

export function isIsoDateTime(value: unknown): value is IsoDateTime {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function startOfDayInTimeZone(date: Date, timeZone: string): Date {
  const parts = getTimeZoneParts(date, timeZone);
  const utcGuess = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0),
  );
  const offset = getTimeZoneOffsetMs(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offset);
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = getTimeZoneParts(date, timeZone);
  const zonedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return zonedAsUtc - date.getTime();
}

function getTimeZoneParts(
  date: Date,
  timeZone: string,
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const values = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  const hour = Number(values.hour) === 24 ? 0 : Number(values.hour);
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour,
    minute: Number(values.minute),
    second: Number(values.second),
  };
}
