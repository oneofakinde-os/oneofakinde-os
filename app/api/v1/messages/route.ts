import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, forbidden, getRequiredBodyString, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

type CreateMessageThreadBody = {
  recipientHandles?: string[] | string;
  recipients?: string;
  body?: string;
  title?: string;
};

function parseRecipientHandles(payload: Record<string, unknown> | null): string[] {
  const rawHandles = payload?.recipientHandles;
  if (Array.isArray(rawHandles)) {
    return rawHandles.filter((entry): entry is string => typeof entry === "string");
  }

  if (typeof rawHandles === "string") {
    return rawHandles.split(/[\s,]+/).filter(Boolean);
  }

  const recipients = payload?.recipients;
  if (typeof recipients === "string") {
    return recipients.split(/[\s,]+/).filter(Boolean);
  }

  return [];
}

/**
 * GET /api/v1/messages
 *
 * Returns the authenticated viewer's direct/group message inbox.
 */
export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const inbox = await commerceBffService.getMessageInbox(guard.session.accountId);
  return ok({ inbox: inbox ?? { threads: [], unreadCount: 0, requestCount: 0 } });
}

/**
 * POST /api/v1/messages
 *
 * Creates a direct/group thread or appends to the existing direct thread.
 */
export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const payload = await safeJson<CreateMessageThreadBody>(request);
  const payloadRecord = payload as Record<string, unknown> | null;
  const body = getRequiredBodyString(payloadRecord, "body");
  const recipientHandles = parseRecipientHandles(payloadRecord);
  const title = typeof payloadRecord?.title === "string" ? payloadRecord.title : undefined;

  if (!body || recipientHandles.length === 0) {
    return badRequest("recipientHandles and body are required");
  }

  const result = await commerceBffService.createMessageThread(guard.session.accountId, {
    recipientHandles,
    body,
    title
  });

  if (!result.ok) {
    if (result.reason === "blocked") {
      return forbidden("blocked");
    }
    if (result.reason === "forbidden") {
      return forbidden("message thread is not available");
    }
    return badRequest("recipientHandles or body are invalid");
  }

  return ok({ thread: result.thread }, 201);
}
