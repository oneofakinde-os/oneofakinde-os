import { DropDetailScreen } from "@/features/drops/drop-detail-screen";
import { commerceBffService } from "@/lib/bff/service";
import { gateway } from "@/lib/gateway";
import { routes } from "@/lib/routes";
import { buildDropMetadata } from "@/lib/seo/metadata";
import { getOptionalSession } from "@/lib/server/session";
import { normalizeReturnTo } from "@/lib/session";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { UrlObject } from "node:url";

type DropDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: DropDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const drop = await gateway.getDropById(id);

  if (!drop) {
    return {
      title: "drop not found",
      description: "the requested drop could not be found."
    };
  }

  return buildDropMetadata(drop);
}

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
  const returnTo = normalizeReturnTo(firstQueryValue(resolvedSearchParams.returnTo), routes.showroom());

  const [drop, session, lineage, liveArtifacts] = await Promise.all([
    gateway.getDropById(id),
    getOptionalSession(),
    gateway.getDropLineage(id),
    gateway.getDropLiveArtifacts(id)
  ]);

  if (!drop) {
    notFound();
  }

  const [ownershipHistory, offersResult] = await Promise.all([
    commerceBffService.getDropOwnershipHistory(id),
    session
      ? commerceBffService.getCollectDropOffers(id, session.accountId)
      : Promise.resolve(null)
  ]);

  return (
    <DropDetailScreen
      drop={drop}
      lineage={lineage}
      liveArtifacts={liveArtifacts}
      session={session}
      backHref={toHrefObject(returnTo)}
      ownershipHistory={ownershipHistory}
      recentOffers={offersResult?.offers ?? []}
    />
  );
}
