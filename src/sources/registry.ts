import type { SourceSchema } from "@/domain/types";

import {
  GOOGLE_CALENDAR_EVENTS_SOURCE_ID,
  googleCalendarEventsSchema,
} from "./google-calendar/schema";
import { syntheticSourceSchemas } from "./synthetic/schema";

export const sourceSchemaRegistry: Record<string, SourceSchema> = {
  ...syntheticSourceSchemas,
  [GOOGLE_CALENDAR_EVENTS_SOURCE_ID]: googleCalendarEventsSchema,
};
