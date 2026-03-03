import { TownhallSearchScreen } from "@/features/townhall/townhall-search-screen";
import type { Studio } from "@/lib/domain/contracts";
import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";

type TownhallSearchPageProps = {
  searchParams: Promise<{
    q?: string | string[];
  }>;
};

function firstParam(value?: string | string[]): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function normalizeQuery(value: string): string {
  return value.trim().slice(0, 120);
}

export default async function TownhallSearchPage({ searchParams }: TownhallSearchPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = normalizeQuery(firstParam(resolvedSearchParams.q));

  const [session, drops, worlds] = await Promise.all([getOptionalSession(), gateway.listDrops(), gateway.listWorlds()]);

  const handles = Array.from(new Set([...drops.map((drop) => drop.studioHandle), ...worlds.map((world) => world.studioHandle)]));
  const studioResults = await Promise.all(handles.map((handle) => gateway.getStudioByHandle(handle)));
  const studios = studioResults.filter((studio): studio is Studio => studio !== null);

  return <TownhallSearchScreen query={query} session={session} drops={drops} worlds={worlds} studios={studios} />;
}
