import { getRequestSession } from "@/lib/bff/auth";
import { badRequest, ok, safeJson } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import { FORBIDDEN_FILTER_KEYS } from "@/lib/domain/discovery";
import type { DiscoveryFilterInput } from "@/lib/domain/contracts";

export async function POST(request: Request) {
  const session = await getRequestSession(request);

  const body = await safeJson<Record<string, unknown>>(request);
  if (!body) return badRequest("request body is required");

  for (const key of Object.keys(body)) {
    if (FORBIDDEN_FILTER_KEYS.has(key)) {
      return badRequest(`filter key '${key}' is not permitted`);
    }
  }

  const filters: DiscoveryFilterInput = {
    category: Array.isArray(body.category) ? (body.category as DiscoveryFilterInput["category"]) : undefined,
    medium: Array.isArray(body.medium) ? (body.medium as DiscoveryFilterInput["medium"]) : undefined,
    tags: Array.isArray(body.tags) ? (body.tags as string[]) : undefined,
    dropType: Array.isArray(body.dropType) ? (body.dropType as DiscoveryFilterInput["dropType"]) : undefined,
    proofReady: typeof body.proofReady === "boolean" ? body.proofReady : undefined,
    followedStudiosOnly: typeof body.followedStudiosOnly === "boolean" ? body.followedStudiosOnly : undefined,
    collectedFromOnly: typeof body.collectedFromOnly === "boolean" ? body.collectedFromOnly : undefined,
    savedBeforeOnly: typeof body.savedBeforeOnly === "boolean" ? body.savedBeforeOnly : undefined,
    collectNow: typeof body.collectNow === "boolean" ? body.collectNow : undefined,
    priceMaxUsd: typeof body.priceMaxUsd === "number" ? body.priceMaxUsd : undefined,
    freeToSave: typeof body.freeToSave === "boolean" ? body.freeToSave : undefined,
    membershipIncluded: typeof body.membershipIncluded === "boolean" ? body.membershipIncluded : undefined,
    fromMyWorlds: typeof body.fromMyWorlds === "boolean" ? body.fromMyWorlds : undefined,
  };

  const drops = await commerceBffService.listDiscoveryDrops(session?.accountId ?? null, filters);
  return ok({ drops });
}
