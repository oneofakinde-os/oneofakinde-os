import { getRequestSession, requireRequestSession } from "@/lib/bff/auth";
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
import { commerceBffService } from "@/lib/bff/service";
import type { TownhallPostLinkedObjectKind } from "@/lib/domain/contracts";

type StudioConversationRouteParams = {
  handle: string;
};

type StudioConversationAction = "report" | "appeal" | "hide" | "restrict" | "delete" | "restore";

type StudioConversationBody = {
  body?: string;
  action?: string;
  messageId?: string;
  linkedObject?: {
    kind?: string;
    id?: string;
  } | null;
};

const ACTIONS = new Set<StudioConversationAction>([
  "report",
  "appeal",
  "hide",
  "restrict",
  "delete",
  "restore"
]);
const MODERATION_ACTIONS = new Set<StudioConversationAction>(["hide", "restrict", "delete", "restore"]);

function parseLimit(raw: string | null): number {
  if (!raw) {
    return 24;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 24;
  }

  return Math.min(40, Math.max(1, Math.floor(parsed)));
}

function isLinkedObjectKind(value: string): value is TownhallPostLinkedObjectKind {
  return value === "drop" || value === "world" || value === "studio";
}

function isStudioConversationAction(value: string): value is StudioConversationAction {
  return ACTIONS.has(value as StudioConversationAction);
}

export async function GET(
  request: Request,
  context: RouteContext<StudioConversationRouteParams>
) {
  const handle = await getRequiredRouteParam(context, "handle");
  if (!handle) {
    return badRequest("handle is required");
  }

  const session = await getRequestSession(request);
  const thread = await commerceBffService.getStudioConversationThread(
    session?.accountId ?? null,
    handle,
    { limit: parseLimit(new URL(request.url).searchParams.get("limit")) }
  );
  if (!thread.ok) {
    return notFound("studio not found");
  }

  return ok({ thread: thread.thread });
}

export async function POST(
  request: Request,
  context: RouteContext<StudioConversationRouteParams>
) {
  const handle = await getRequiredRouteParam(context, "handle");
  if (!handle) {
    return badRequest("handle is required");
  }

  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const payload = await safeJson<StudioConversationBody>(request);
  const payloadRecord = payload as Record<string, unknown> | null;
  const action = getOptionalBodyString(payloadRecord, "action");

  if (action) {
    if (!isStudioConversationAction(action)) {
      return badRequest("action must be report, appeal, hide, restrict, delete, or restore");
    }

    const messageId = getRequiredBodyString(payloadRecord, "messageId");
    if (!messageId) {
      return badRequest("messageId is required when action is provided");
    }

    if (MODERATION_ACTIONS.has(action)) {
      if (
        !guard.session.roles.includes("creator") ||
        guard.session.handle.toLowerCase() !== handle.toLowerCase()
      ) {
        return forbidden("studio creator role is required for moderation actions");
      }
    }

    const result = await commerceBffService.actOnStudioConversationMessage(
      guard.session.accountId,
      handle,
      messageId,
      action
    );
    if (!result.ok) {
      return result.reason === "not_found"
        ? notFound("message not found")
        : forbidden("not allowed to act on this studio conversation message");
    }

    const status = action === "report" || action === "appeal" ? 201 : 200;
    return ok({ thread: result.thread }, status);
  }

  const body = getRequiredBodyString(payloadRecord, "body");
  if (!body) {
    return badRequest("message body is required when action is not provided");
  }

  const linkedObjectInput = payload?.linkedObject;
  let linkedObject:
    | {
        kind: TownhallPostLinkedObjectKind;
        id: string;
      }
    | undefined;

  if (linkedObjectInput && typeof linkedObjectInput === "object") {
    const kind = linkedObjectInput.kind;
    const id = linkedObjectInput.id;
    if (typeof kind !== "string" || !isLinkedObjectKind(kind)) {
      return badRequest("linkedObject.kind must be drop, world, or studio");
    }
    if (typeof id !== "string" || !id.trim()) {
      return badRequest("linkedObject.id is required when linkedObject is provided");
    }
    linkedObject = {
      kind,
      id
    };
  }

  const created = await commerceBffService.createStudioConversationMessage(
    guard.session.accountId,
    handle,
    body,
    linkedObject
  );
  if (!created.ok) {
    if (created.reason === "not_found") {
      return notFound("studio not found");
    }
    return badRequest("message body or linkedObject is invalid");
  }

  return ok({ thread: created.thread }, 201);
}
