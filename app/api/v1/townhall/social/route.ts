import { getRequestSession } from "@/lib/bff/auth";
import { ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";

function parseDropIds(raw: string | null): string[] {
  if (!raw) {
    return [];
  }

  return Array.from(
    new Set(
      raw
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
    )
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const session = await getRequestSession(request);
  const requestedDropIds = parseDropIds(url.searchParams.get("drop_ids"));
  const dropIds =
    requestedDropIds.length > 0
      ? requestedDropIds
      : (await commerceBffService.listDrops(session?.accountId ?? null)).map((drop) => drop.id);

  const social = await commerceBffService.getTownhallSocialSnapshot(
    session?.accountId ?? null,
    dropIds
  );

  return ok({ social });
}
