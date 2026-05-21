import { asSourceId } from "@/domain/ids";
import type {
  CanonicalOperator,
  FieldSchema,
  FieldType,
  SourceSchema,
} from "@/domain/types";

const stringOperators: CanonicalOperator[] = ["is", "is_not", "contains"];
const nullableStringOperators: CanonicalOperator[] = [
  ...stringOperators,
  "exists",
  "not_exists",
];
const numberOperators: CanonicalOperator[] = [
  "is",
  "is_not",
  "greater_than",
  "less_than",
];
const booleanOperators: CanonicalOperator[] = ["is", "is_not"];
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
  defaultTableColumns: [
    "title",
    "start",
    "end",
    "attendees",
    "location",
    "status",
  ],
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
    all_day: field("all_day", "All Day", "boolean", booleanOperators, {
      sortable: false,
    }),
    duration_minutes: field(
      "duration_minutes",
      "Duration",
      "number",
      numberOperators,
      {
        nullable: true,
      },
    ),
    has_location: field(
      "has_location",
      "Has Location",
      "boolean",
      booleanOperators,
      {
        sortable: false,
      },
    ),
    has_description: field(
      "has_description",
      "Has Description",
      "boolean",
      booleanOperators,
      {
        sortable: false,
      },
    ),
    title_missing: field(
      "title_missing",
      "Title Missing",
      "boolean",
      booleanOperators,
      {
        sortable: false,
      },
    ),
    is_outside_work_hours: field(
      "is_outside_work_hours",
      "Outside Work Hours",
      "boolean",
      booleanOperators,
      {
        sortable: false,
      },
    ),
    location: field("location", "Location", "string", nullableStringOperators, {
      nullable: true,
      containsExternalContent: true,
      sensitive: true,
      rendererHints: ["list", "table"],
    }),
    description: field(
      "description",
      "Description",
      "string",
      nullableStringOperators,
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
      nullableStringOperators,
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
      nullableStringOperators,
      {
        nullable: true,
      },
    ),
    status: field("status", "Status", "enum", stringOperators, {
      rendererHints: ["table"],
    }),
    event_type: field("event_type", "Event Type", "enum", stringOperators),
    html_link: field("html_link", "HTML Link", "url", nullableStringOperators, {
      nullable: true,
      sensitive: true,
    }),
  },
};
