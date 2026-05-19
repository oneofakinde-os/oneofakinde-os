export type ReleaseCalendarEntry = {
  dropId: string;
  studioHandle: string;
  title: string;
  scheduledAt: string;
  timezone: string;
  status: "scheduled" | "published" | "cancelled";
};

export type CreatorTimezone = {
  accountId: string;
  ianaTimezone: string;
  declaredAt: string;
};

export function displayTimeForViewer(
  scheduledAtIso: string,
  viewerTimezone: string
): string {
  const d = new Date(scheduledAtIso);
  return d.toLocaleString("en-US", { timeZone: viewerTimezone });
}

export function isTimezoneDeclared(declaration: CreatorTimezone | null): boolean {
  return declaration !== null && declaration.ianaTimezone.length > 0;
}

export type CalendarView = "day" | "week" | "month";

export type LiveEvent = {
  id: string;
  worldId: string | null;
  studioHandle: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  status: "scheduled" | "live" | "ended" | "cancelled" | "rescheduled";
  recurring: boolean;
  recurrenceRule: string | null;
  rsvpCount: number;
  createdAt: string;
};

export type EventRsvp = {
  eventId: string;
  accountId: string;
  status: "attending" | "maybe" | "declined";
  rsvpedAt: string;
};

export type EventReminder = {
  eventId: string;
  accountId: string;
  remindAtMinutesBefore: number;
  sent: boolean;
};

export const DEFAULT_REMINDER_MINUTES_BEFORE = 15;

export function shouldSendReminder(
  reminder: EventReminder,
  eventStartIso: string,
  nowMs: number
): boolean {
  if (reminder.sent) return false;
  const eventStart = Date.parse(eventStartIso);
  const reminderTime = eventStart - reminder.remindAtMinutesBefore * 60_000;
  return nowMs >= reminderTime;
}

export type EventCancellation = {
  eventId: string;
  cancelledBy: string;
  reason: string;
  cancelledAt: string;
  notifyAttendees: boolean;
};

export type EventReschedule = {
  eventId: string;
  previousStartsAt: string;
  newStartsAt: string;
  rescheduledBy: string;
  rescheduledAt: string;
  notifyAttendees: boolean;
};

export function canRsvp(event: LiveEvent): boolean {
  return event.status === "scheduled";
}

export type AddToCalendarPayload = {
  title: string;
  description: string;
  startIso: string;
  endIso: string | null;
  timezone: string;
  location: string | null;
};

export function buildAddToCalendarPayload(event: LiveEvent): AddToCalendarPayload {
  return {
    title: event.title,
    description: event.description,
    startIso: event.startsAt,
    endIso: event.endsAt,
    timezone: event.timezone,
    location: null,
  };
}
