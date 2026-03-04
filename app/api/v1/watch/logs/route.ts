import { requireRequestSession } from "@/lib/bff/auth";
import { getRequiredSearchParam, ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

function parseLimit(url: URL): number | undefined {
  const raw = url.searchParams.get("limit");
  if (raw === null) {
    return undefined;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
}

export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  const url = new URL(request.url);
  const dropId = getRequiredSearchParam(url, "drop_id");
  const limit = parseLimit(url);

  const logs = await commerceBffService.listWatchTelemetryLogs({
    accountId: guard.session.accountId,
    dropId,
    limit
  });

  return ok({ logs });
}
