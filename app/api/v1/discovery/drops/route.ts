import { getRequestSession } from "@/lib/bff/auth";
import { badRequest, ok } from "@/lib/bff/http";
import { commerceBffService } from "@/lib/bff/service";
import { FORBIDDEN_FILTER_KEYS } from "@/lib/domain/discovery";
import type { DiscoveryFilterInput } from "@/lib/domain/contracts";

export async function GET(request: Request) {
  const session = await getRequestSession(request);
  const url = new URL(request.url);

  for (const key of url.searchParams.keys()) {
    if (FORBIDDEN_FILTER_KEYS.has(key)) {
      return badRequest(`query parameter '${key}' is not permitted in discovery`);
    }
  }

  const filters: DiscoveryFilterInput = {};

  const categoryParam = url.searchParams.get("category");
  if (categoryParam) filters.category = categoryParam.split(",") as DiscoveryFilterInput["category"];

  const mediumParam = url.searchParams.get("medium");
  if (mediumParam) filters.medium = mediumParam.split(",") as DiscoveryFilterInput["medium"];

  const dropTypeParam = url.searchParams.get("dropType");
  if (dropTypeParam) filters.dropType = dropTypeParam.split(",") as DiscoveryFilterInput["dropType"];

  const tagsParam = url.searchParams.get("tags");
  if (tagsParam) filters.tags = tagsParam.split(",");

  if (url.searchParams.get("proofReady") === "true") filters.proofReady = true;
  if (url.searchParams.get("followedStudiosOnly") === "true") filters.followedStudiosOnly = true;
  if (url.searchParams.get("collectedFromOnly") === "true") filters.collectedFromOnly = true;
  if (url.searchParams.get("savedBeforeOnly") === "true") filters.savedBeforeOnly = true;
  if (url.searchParams.get("collectNow") === "true") filters.collectNow = true;
  if (url.searchParams.get("freeToSave") === "true") filters.freeToSave = true;
  if (url.searchParams.get("membershipIncluded") === "true") filters.membershipIncluded = true;
  if (url.searchParams.get("fromMyWorlds") === "true") filters.fromMyWorlds = true;

  const priceMaxParam = url.searchParams.get("priceMaxUsd");
  if (priceMaxParam) {
    const priceMax = parseFloat(priceMaxParam);
    if (Number.isFinite(priceMax)) filters.priceMaxUsd = priceMax;
  }

  const hasFilters = Object.keys(filters).length > 0;
  const drops = await commerceBffService.listDiscoveryDrops(
    session?.accountId ?? null,
    hasFilters ? filters : undefined
  );

  return ok({ drops });
}
