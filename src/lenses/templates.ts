import type { LensTemplate } from "./template-types";

const dailyWorkLens: LensTemplate = {
  id: "daily-work",
  name: "Daily Work Lens",
  description: "Daily clarity from your read-only Google Calendar.",
  stage: "stage-1",
  cells: [
    {
      id: "todays_events",
      title: "Today's Events",
      description: "Events starting today, shown in order.",
      enabled: true,
      dsl: `from google.calendar.events
where start on or after today()
where start before in_days(1)
sort by start asc
take 20
show as table`,
    },
    {
      id: "next_7_days",
      title: "Next 7 Days",
      description: "Upcoming commitments in the next week.",
      enabled: true,
      dsl: `from google.calendar.events
where start after now()
where start before in_days(7)
sort by start asc
take 20
show as table`,
    },
    {
      id: "upcoming_events",
      title: "Upcoming Events",
      description: "Upcoming events from your primary Google Calendar.",
      enabled: true,
      dsl: `from google.calendar.events
where start after now()
where start before in_days(90)
sort by start asc
take 10
show as table`,
    },
    {
      id: "all_day_commitments",
      title: "All-Day Commitments",
      description: "All-day commitments in the next 30 days.",
      enabled: true,
      dsl: `from google.calendar.events
where all_day is true
where start after now()
where start before in_days(30)
sort by start asc
take 20
show as table`,
    },
    {
      id: "long_meetings",
      title: "Long Meetings",
      description: "Events longer than an hour in the next 30 days.",
      enabled: true,
      dsl: `from google.calendar.events
where duration_minutes greater than 60
where start after now()
where start before in_days(30)
sort by start asc
take 20
show as table`,
    },
  ],
};

const meetingPrepLens: LensTemplate = {
  id: "meeting-prep",
  name: "Meeting Prep Lens",
  description: "Upcoming meetings that may need context or attention.",
  stage: "stage-1",
  cells: [
    {
      id: "meetings_missing_location",
      title: "Meetings Missing Location",
      description: "Upcoming events without a location.",
      enabled: true,
      dsl: `from google.calendar.events
where start after now()
where start before in_days(14)
where location is null
sort by start asc
take 20
show as table`,
    },
    {
      id: "meetings_many_attendees",
      title: "Meetings With Many Attendees",
      description: "Upcoming meetings with more than four attendees.",
      enabled: true,
      dsl: `from google.calendar.events
where start after now()
where start before in_days(14)
where attendees greater than 4
sort by start asc
take 20
show as table`,
    },
    {
      id: "meetings_with_description",
      title: "Meetings With Description",
      description: "Upcoming events that include description text.",
      enabled: true,
      dsl: `from google.calendar.events
where start after now()
where start before in_days(14)
where description exists
sort by start asc
take 20
show as table`,
    },
    {
      id: "untitled_events",
      title: "Untitled Events",
      description: "Upcoming events whose Calendar summary is missing.",
      enabled: true,
      dsl: `from google.calendar.events
where title_missing is true
where start after now()
where start before in_days(30)
sort by start asc
take 20
show as table`,
    },
  ],
};

const calendarHealthLens: LensTemplate = {
  id: "calendar-health",
  name: "Calendar Health Lens",
  description: "Calendar structure and friction signals.",
  stage: "stage-1",
  cells: [
    {
      id: "events_missing_location",
      title: "Events Missing Location",
      description: "Events in the next 30 days without a location.",
      enabled: true,
      dsl: `from google.calendar.events
where start after now()
where start before in_days(30)
where location is null
sort by start asc
take 20
show as table`,
    },
    {
      id: "all_day_events_next_30",
      title: "All-Day Events Next 30 Days",
      description: "All-day events in the next 30 days.",
      enabled: true,
      dsl: `from google.calendar.events
where all_day is true
where start after now()
where start before in_days(30)
sort by start asc
take 20
show as table`,
    },
    {
      id: "dense_meetings",
      title: "Dense Meetings / High-Attendee Events",
      description: "Events with more than four attendees in the next 30 days.",
      enabled: true,
      dsl: `from google.calendar.events
where start after now()
where start before in_days(30)
where attendees greater than 4
sort by start asc
take 20
show as table`,
    },
    {
      id: "outside_work_hours",
      title: "Outside Work Hours",
      description: "Events starting before 8 AM or at/after 6 PM.",
      enabled: true,
      dsl: `from google.calendar.events
where is_outside_work_hours is true
where start after now()
where start before in_days(30)
sort by start asc
take 20
show as table`,
    },
  ],
};

const templates = [dailyWorkLens, meetingPrepLens, calendarHealthLens];

export function listLensTemplates(): LensTemplate[] {
  return templates;
}

export function getLensTemplate(templateId: string): LensTemplate | null {
  return templates.find((template) => template.id === templateId) ?? null;
}
