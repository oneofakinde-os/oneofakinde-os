import {
  badRequest,
  forbidden,
  getOptionalBodyString,
  getRequiredBodyString,
  getRequiredRouteParam,
  notFound,
  ok,
  safeJson,
  type RouteContext
} from "@/lib/bff/http";
import { requireRequestSession } from "@/lib/bff/auth";
import { commerceBffService } from "@/lib/bff/service";
import type { TownhallShareChannel } from "@/lib/domain/contracts";

type ShareRouteParams = {
  drop_id: string;
};

type ShareBody = {
  channel?: string;
  recipientHandles?: string[] | string;
  recipients?: string;
  message?: string;
  shareUrl?: string;
};

function isShareChannel(value: string): value is TownhallShareChannel {
  return value === "sms" || value === "internal_dm" || value === "whatsapp" || value === "telegram";
}

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

export async function POST(request: Request, context: RouteContext<ShareRouteParams>) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const dropId = await getRequiredRouteParam(context, "drop_id");
  if (!dropId) {
    return notFound("drop not found");
  }

  const payload = await safeJson<ShareBody>(request);
  const payloadRecord = payload as Record<string, unknown> | null;
  const requestedChannel = getRequiredBodyString(payloadRecord, "channel");
  const channel = requestedChannel ?? "internal_dm";
  if (!isShareChannel(channel)) {
    return badRequest("channel must be sms, internal_dm, whatsapp, or telegram");
  }
  const recipientHandles = parseRecipientHandles(payloadRecord);
  const message = getOptionalBodyString(payloadRecord, "message") ?? undefined;
  const shareUrl = getOptionalBodyString(payloadRecord, "shareUrl") ?? undefined;

  // Sprint 0.2 — block enforcement: blocked viewers cannot share blocker's drops.
  if (await commerceBffService.isViewerBlockedByDropStudio(guard.session.accountId, dropId)) {
    return forbidden("blocked");
  }

  const result = await commerceBffService.recordTownhallShare(
    guard.session.accountId,
    dropId,
    channel,
    {
      recipientHandles,
      message,
      shareUrl
    }
  );
  if (!result.ok) {
    if (result.reason === "blocked" || result.reason === "forbidden") {
      return forbidden(result.reason);
    }
    if (result.reason === "invalid") {
      return badRequest("recipientHandles are required for internal_dm shares");
    }
    return notFound("drop not found");
  }

  return ok(
    {
      social: result.social,
      ...(result.thread ? { thread: result.thread } : {})
    },
    201
  );
}
