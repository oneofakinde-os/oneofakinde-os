import { CollectMarketplaceScreen } from "@/features/collect/collect-marketplace-screen";
import { gateway } from "@/lib/gateway";
import { requireSession } from "@/lib/server/session";

type CollectPageProps = {
  searchParams: Promise<{ lane?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? value[0] ?? "" : value;
}

function isLane(value: string): value is "all" | "sale" | "auction" | "resale" {
  return value === "all" || value === "sale" || value === "auction" || value === "resale";
}

export default async function CollectPage({ searchParams }: CollectPageProps) {
  const session = await requireSession("/collect");
  const drops = await gateway.listDrops();
  const resolvedParams = await searchParams;
  const laneValue = firstParam(resolvedParams.lane).toLowerCase();
  const initialLane = isLane(laneValue) ? laneValue : "all";

  return <CollectMarketplaceScreen session={session} drops={drops} initialLane={initialLane} />;
}
