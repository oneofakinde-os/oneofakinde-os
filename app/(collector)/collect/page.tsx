import { CollectMarketplaceScreen } from "@/features/collect/collect-marketplace-screen";
import { gateway } from "@/lib/gateway";
import { requireSession } from "@/lib/server/session";
import type { CollectMarketLane } from "@/lib/domain/contracts";

type CollectPageProps = {
  searchParams: Promise<{ lane?: string | string[]; drop?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? value[0] ?? "" : value;
}

function isLane(value: string): value is CollectMarketLane {
  return value === "all" || value === "sale" || value === "auction" || value === "resale";
}

export default async function CollectPage({ searchParams }: CollectPageProps) {
  const session = await requireSession("/collect");
  const resolvedParams = await searchParams;
  const laneValue = firstParam(resolvedParams.lane).toLowerCase();
  const initialLane = isLane(laneValue) ? laneValue : "all";
  const dropValue = firstParam(resolvedParams.drop).trim();
  const focusDropId = dropValue.length > 0 ? dropValue : null;
  const [drops, memberships, liveSessions] = await Promise.all([
    gateway.listDrops(session.accountId),
    gateway.listMembershipEntitlements(session.accountId),
    gateway.listCollectLiveSessions(session.accountId)
  ]);

  return (
    <CollectMarketplaceScreen
      session={session}
      drops={drops}
      memberships={memberships}
      liveSessions={liveSessions}
      initialLane={initialLane}
      focusDropId={focusDropId}
    />
  );
}
