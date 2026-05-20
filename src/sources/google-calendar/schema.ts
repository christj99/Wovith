import { asSourceId } from "@/domain/ids";
import type {
  CanonicalOperator,
  FieldSchema,
  FieldType,
  SourceSchema,
} from "@/domain/types";

const stringOperators: CanonicalOperator[] = ["is", "is_not", "contains"];
const numberOperators: CanonicalOperator[] = [
  "is",
  "is_not",
  "greater_than",
  "less_than",
];
const timeOperators: CanonicalOperator[] = [
  "is",
  "is_not",
  "before",
  "after",
  "on_or_before",
  "on_or_after",
];

function field(
  name: string,
  label: string,
  type: FieldType,
  allowedOperators: CanonicalOperator[],
  options: Partial<FieldSchema> = {},
): FieldSchema {
  return {
    name,
    label,
    type,
    nullable: options.nullable ?? false,
    repeated: options.repeated ?? false,
    containsExternalContent: options.containsExternalContent ?? false,
    sensitive: options.sensitive ?? false,
    filterable: options.filterable ?? true,
    sortable:
      options.sortable ??
      ["datetime", "date", "number", "string"].includes(type),
    allowedOperators,
    rendererHints: options.rendererHints,
  };
}

export const GOOGLE_CALENDAR_EVENTS_SOURCE_ID = "google.calendar.events";

export const googleCalendarEventsSchema: SourceSchema = {
  sourceId: asSourceId(GOOGLE_CALENDAR_EVENTS_SOURCE_ID),
  displayName: "Google Calendar Events",
  description:
    "Read-only events from the user's primary Google Calendar for Stage 0.5.",
  itemIdField: "id",
  capabilities: ["supports-pagination"],
  defaultRenderer: "table",
  defaultSort: { field: "start", direction: "asc" },
  fields: {
    id: field("id", "Event ID", "id", stringOperators),
    title: field("title", "Title", "string", stringOperators, {
      containsExternalContent: true,
      rendererHints: ["list", "table"],
    }),
    start: field("start", "Start", "datetime", timeOperators, {
      rendererHints: ["list", "table"],
    }),
    end: field("end", "End", "datetime", timeOperators, {
      rendererHints: ["table"],
    }),
    attendees: field("attendees", "Attendees", "number", numberOperators, {
      rendererHints: ["table"],
    }),
    location: field("location", "Location", "string", stringOperators, {
      nullable: true,
      containsExternalContent: true,
      sensitive: true,
      rendererHints: ["list", "table"],
    }),
    description: field(
      "description",
      "Description",
      "string",
      stringOperators,
      {
        nullable: true,
        containsExternalContent: true,
        sensitive: true,
        rendererHints: ["list"],
      },
    ),
    organizer_email: field(
      "organizer_email",
      "Organizer Email",
      "string",
      stringOperators,
      {
        nullable: true,
        sensitive: true,
      },
    ),
    calendar_id: field("calendar_id", "Calendar ID", "id", stringOperators),
    calendar_summary: field(
      "calendar_summary",
      "Calendar",
      "string",
      stringOperators,
      {
        nullable: true,
      },
    ),
    status: field("status", "Status", "enum", stringOperators, {
      rendererHints: ["table"],
    }),
    event_type: field("event_type", "Event Type", "enum", stringOperators),
    html_link: field("html_link", "HTML Link", "url", stringOperators, {
      nullable: true,
      sensitive: true,
    }),
  },
};
