import { WorldDetailScreen } from "@/features/world/world-detail-screen";
import { commerceBffService } from "@/lib/bff/service";
import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";
import { notFound } from "next/navigation";

type WorldPageProps = {
  params: Promise<{ id: string }>;
};

export default async function WorldPage({ params }: WorldPageProps) {
  const { id } = await params;

  const [session, world, drops] = await Promise.all([
    getOptionalSession(),
    gateway.getWorldById(id),
    gateway.listDropsByWorldId(id)
  ]);

  if (!world) {
    notFound();
  }

  const worldCollectSnapshot = session
    ? await commerceBffService.getCollectWorldBundlesForWorld(session.accountId, world.id)
    : null;
  const worldCollectFullWorldUpgradePreview =
    worldCollectSnapshot?.bundles.find((entry) => entry.bundle.bundleType === "full_world")
      ?.upgradePreview ?? null;

  return (
    <WorldDetailScreen
      world={world}
      drops={drops}
      session={session}
      worldCollectSnapshot={worldCollectSnapshot}
      worldCollectFullWorldUpgradePreview={worldCollectFullWorldUpgradePreview}
    />
  );
}
