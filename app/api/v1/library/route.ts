import { requireRequestSession } from "@/lib/bff/auth";
import { commerceBffService } from "@/lib/bff/service";
import { notFound, ok } from "@/lib/bff/http";

function parseQueueLimit(raw: string | null): number | undefined {
  if (!raw) {
    return undefined;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.max(1, Math.floor(parsed));
}

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const queueLimit = parseQueueLimit(new URL(request.url).searchParams.get("queue_limit"));
  const library = await commerceBffService.getLibrary(guard.session.accountId, {
    queueLimit
  });
  if (!library) {
    return notFound("library not found");
  }

  return ok({ library });
}
