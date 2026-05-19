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
