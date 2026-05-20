import { describe, expect, it } from "vitest";

import {
  resolveAstValue,
  startOfDayInTimeZone,
  toDateComparable,
} from "@/domain/time";
import { testClock } from "@/testing/context";

describe("evaluation clock date helpers", () => {
  it("resolves today using the evaluation timezone", () => {
    expect(
      startOfDayInTimeZone(testClock.now, testClock.timeZone).toISOString(),
    ).toBe("2026-05-20T04:00:00.000Z");
    expect(
      resolveAstValue({ kind: "function", name: "today", args: [] }, testClock),
    ).toBe("2026-05-20T04:00:00.000Z");
  });

  it("resolves days_ago and in_days from clock.now", () => {
    expect(
      resolveAstValue(
        {
          kind: "function",
          name: "days_ago",
          args: [{ kind: "number", value: 7 }],
        },
        testClock,
      ),
    ).toBe("2026-05-13T13:00:00.000Z");
    expect(
      resolveAstValue(
        {
          kind: "function",
          name: "in_days",
          args: [{ kind: "number", value: 3 }],
        },
        testClock,
      ),
    ).toBe("2026-05-23T13:00:00.000Z");
  });

  it("returns null for invalid date comparables", () => {
    expect(toDateComparable(null)).toBeNull();
    expect(toDateComparable(undefined)).toBeNull();
    expect(toDateComparable("not-a-date")).toBeNull();
  });
});
