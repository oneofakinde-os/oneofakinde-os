import { getRequestSession, requireRequestSession } from "@/lib/bff/auth";
import {
  badRequest,
  getRequiredBodyString,
  getRequiredRouteParam,
  notFound,
  ok,
  safeJson,
  type RouteContext
} from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { TownhallShareChannel } from "@/lib/domain/contracts";

type PostRouteParams = {
  post_id: string;
};

type PostActionBody = {
  action?: string;
  channel?: string;
};

function parseShareChannel(value: string | undefined): TownhallShareChannel | null {
  if (value === "sms" || value === "internal_dm" || value === "whatsapp" || value === "telegram") {
    return value;
  }

  return null;
}

export async function GET(request: Request, context: RouteContext<PostRouteParams>) {
  const postId = await getRequiredRouteParam(context, "post_id");
  if (!postId) {
    return notFound("post not found");
  }

  const session = await getRequestSession(request);
  const post = await commerceBffService.getTownhallPost(session?.accountId ?? null, postId);
  if (!post) {
    return notFound("post not found");
  }

  return ok({ post });
}

export async function POST(request: Request, context: RouteContext<PostRouteParams>) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const postId = await getRequiredRouteParam(context, "post_id");
  if (!postId) {
    return notFound("post not found");
  }

  const payload = await safeJson<PostActionBody>(request);
  const action = getRequiredBodyString(payload as Record<string, unknown> | null, "action");
  if (!action) {
    return badRequest("action is required");
  }

  if (action === "report") {
    const post = await commerceBffService.reportTownhallPost(guard.session.accountId, postId);
    if (!post) {
      return notFound("post not found");
    }
    return ok({ post }, 201);
  }

  if (action === "appeal") {
    const post = await commerceBffService.appealTownhallPost(guard.session.accountId, postId);
    if (!post) {
      return notFound("post not found");
    }
    return ok({ post }, 201);
  }

  if (action === "save") {
    const post = await commerceBffService.saveTownhallPost(guard.session.accountId, postId);
    if (!post) {
      return notFound("post not found");
    }
    return ok({ post }, 201);
  }

  if (action === "unsave") {
    const post = await commerceBffService.unsaveTownhallPost(guard.session.accountId, postId);
    if (!post) {
      return notFound("post not found");
    }
    return ok({ post });
  }

  if (action === "follow") {
    const post = await commerceBffService.followTownhallPost(guard.session.accountId, postId);
    if (!post) {
      return notFound("post not found");
    }
    return ok({ post }, 201);
  }

  if (action === "unfollow") {
    const post = await commerceBffService.unfollowTownhallPost(guard.session.accountId, postId);
    if (!post) {
      return notFound("post not found");
    }
    return ok({ post });
  }

  if (action === "share") {
    const channel = parseShareChannel(payload?.channel);
    if (!channel) {
      return badRequest("channel must be sms, internal_dm, whatsapp, or telegram");
    }

    const post = await commerceBffService.recordTownhallPostShare(
      guard.session.accountId,
      postId,
      channel
    );
    if (!post) {
      return notFound("post not found");
    }
    return ok({ post }, 201);
  }

  if (action === "hide" || action === "restrict" || action === "delete" || action === "restore") {
    const post = await commerceBffService.moderateTownhallPost(
      guard.session.accountId,
      postId,
      action
    );
    if (!post) {
      return notFound("post not found");
    }
    return ok({ post });
  }

  return badRequest(
    "action must be report, appeal, save, unsave, follow, unfollow, share, hide, restrict, delete, or restore"
  );
}
