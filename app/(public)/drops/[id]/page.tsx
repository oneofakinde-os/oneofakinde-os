import { DropDetailScreen } from "@/features/drops/drop-detail-screen";
import { gateway } from "@/lib/gateway";
import { routes } from "@/lib/routes";
import { getOptionalSession } from "@/lib/server/session";
import { normalizeReturnTo } from "@/lib/session";
import { notFound } from "next/navigation";
import type { UrlObject } from "node:url";

type DropDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstQueryValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function toHrefObject(pathnameWithSearch: string): UrlObject {
  const parsed = new URL(pathnameWithSearch, "https://oneofakinde.local");
  const query: Record<string, string> = {};
  for (const [key, value] of parsed.searchParams.entries()) {
    query[key] = value;
  }

  return Object.keys(query).length > 0
    ? {
        pathname: parsed.pathname,
        query
      }
    : { pathname: parsed.pathname };
}

export default async function DropDetailPage({ params, searchParams }: DropDetailPageProps) {
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const returnTo = normalizeReturnTo(firstQueryValue(resolvedSearchParams.returnTo), routes.townhall());

  const [drop, session, lineage] = await Promise.all([
    gateway.getDropById(id),
    getOptionalSession(),
    gateway.getDropLineage(id)
  ]);

  if (!drop) {
    notFound();
  }

  return (
    <DropDetailScreen
      drop={drop}
      lineage={lineage}
      session={session}
      backHref={toHrefObject(returnTo)}
    />
  );
}
