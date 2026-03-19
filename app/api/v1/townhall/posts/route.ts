import { getRequestSession, requireRequestSession } from "@/lib/bff/auth";
import { badRequest, getRequiredBodyString, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import type { TownhallPostLinkedObjectKind } from "@/lib/domain/contracts";

type CreatePostBody = {
  body?: string;
  linkedObject?: {
    kind?: string;
    id?: string;
    label?: string;
    href?: string;
  } | null;
};

function parseLimit(raw: string | null): number {
  if (!raw) {
    return 20;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return 20;
  }

  return Math.min(40, Math.max(1, Math.floor(parsed)));
}

function isLinkedObjectKind(value: string): value is TownhallPostLinkedObjectKind {
  return value === "drop" || value === "world" || value === "studio";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const session = await getRequestSession(request);
  const posts = await commerceBffService.getTownhallPosts(session?.accountId ?? null, {
    limit: parseLimit(url.searchParams.get("limit"))
  });

  return ok(posts);
}

export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const payload = await safeJson<CreatePostBody>(request);
  const body = getRequiredBodyString(payload as Record<string, unknown> | null, "body");
  if (!body) {
    return badRequest("post body is required");
  }

  const linkedObjectPayload = payload?.linkedObject;
  let linkedObject:
    | {
        kind: TownhallPostLinkedObjectKind;
        id: string;
        label?: string;
        href?: string;
      }
    | null = null;

  if (linkedObjectPayload && typeof linkedObjectPayload === "object") {
    const kind = linkedObjectPayload.kind;
    const id = linkedObjectPayload.id;
    if (typeof kind !== "string" || !isLinkedObjectKind(kind)) {
      return badRequest("linkedObject.kind must be drop, world, or studio");
    }
    if (typeof id !== "string" || !id.trim()) {
      return badRequest("linkedObject.id is required when linkedObject is provided");
    }
    linkedObject = {
      kind,
      id,
      label: typeof linkedObjectPayload.label === "string" ? linkedObjectPayload.label : undefined,
      href: typeof linkedObjectPayload.href === "string" ? linkedObjectPayload.href : undefined
    };
  }

  const post = await commerceBffService.createTownhallPost(guard.session.accountId, {
    body,
    linkedObject
  });

  if (!post) {
    return badRequest("post could not be created");
  }

  return ok({ post }, 201);
}
