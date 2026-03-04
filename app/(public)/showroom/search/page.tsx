import { TownhallSearchScreen } from "@/features/townhall/townhall-search-screen";
import { executeCatalogSearch, parseCatalogSearchQuery } from "@/lib/catalog/search";
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

export default async function TownhallSearchPage({ searchParams }: TownhallSearchPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = parseCatalogSearchQuery(firstParam(resolvedSearchParams.q));
  const [session, search] = await Promise.all([
    getOptionalSession(),
    executeCatalogSearch({
      query
    })
  ]);

  return <TownhallSearchScreen session={session} search={search} />;
}
