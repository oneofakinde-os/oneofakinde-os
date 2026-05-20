import { getRequestSession } from "@/lib/bff/auth";
import { ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

export async function GET(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return ok({
      accountId: "",
      channels: { in_app: true, email: true, push: false },
      mutedTypes: [],
      digestEnabled: false,
      quietHoursEnabled: false,
      quietHoursFromHour: 22,
      quietHoursFromMinute: 0,
      quietHoursToHour: 8,
      quietHoursToMinute: 0,
      quietHoursTimezone: "UTC",
      digestMode: "none",
      frequencyCap: 20,
      emailCategories: {
        transactional: true,
        social: true,
        creator_updates: true,
        marketing: false,
      },
    });
  }

  const prefs = await commerceBffService.getFullNotificationPreferences(
    session.accountId
  );
  return ok(prefs);
}

export async function PATCH(request: Request) {
  const session = await getRequestSession(request);
  if (!session) {
    return new Response("unauthorized", { status: 401 });
  }

  const body = await request.json();
  const result = await commerceBffService.updateNotificationPreferences(
    session.accountId,
    body
  );
  return ok(result);
}
