import type { DslValidationContext } from "@/domain/types";
import { STAGE_0_RENDERERS } from "@/sources/synthetic/schema";
import { sourceSchemaRegistry } from "@/sources/registry";

export const stage0ValidationContext: DslValidationContext = {
  sourceSchemas: sourceSchemaRegistry,
  maxTake: 100,
  allowedRenderers: [...STAGE_0_RENDERERS],
};

export const testNow = new Date("2026-05-20T13:00:00.000Z");

export const testClock = {
  now: testNow,
  timeZone: "America/New_York",
};
