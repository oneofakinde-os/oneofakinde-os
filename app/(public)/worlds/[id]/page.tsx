import { WorldDetailScreen } from "@/features/world/world-detail-screen";
import { commerceBffService } from "@/lib/bff/service";
import type { CollectLiveSessionSnapshot } from "@/lib/domain/contracts";
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

  const [worldCollectSnapshot, worldPatronRosterResult, collectLiveSessions] = session
    ? await Promise.all([
        commerceBffService.getCollectWorldBundlesForWorld(session.accountId, world.id),
        commerceBffService.listWorldPatronRoster(session.accountId, world.id),
        commerceBffService.listCollectLiveSessions(session.accountId)
      ])
    : [null, null, [] as CollectLiveSessionSnapshot[]];
  const worldLiveSessions = collectLiveSessions.filter(
    (entry) => entry.liveSession.worldId === world.id
  );
  const worldCollectFullWorldUpgradePreview =
    worldCollectSnapshot?.bundles.find((entry) => entry.bundle.bundleType === "full_world")
      ?.upgradePreview ?? null;
  const worldPatronRosterSnapshot = worldPatronRosterResult?.ok
    ? worldPatronRosterResult.snapshot
    : null;
  const worldPatronRosterAccessState = session
    ? worldPatronRosterResult?.ok
      ? "eligible"
      : worldPatronRosterResult?.reason ?? "not_found"
    : "signed_out";

  return (
    <WorldDetailScreen
      world={world}
      drops={drops}
      session={session}
      worldCollectSnapshot={worldCollectSnapshot}
      worldCollectFullWorldUpgradePreview={worldCollectFullWorldUpgradePreview}
      worldPatronRosterSnapshot={worldPatronRosterSnapshot}
      worldPatronRosterAccessState={worldPatronRosterAccessState}
      worldLiveSessions={worldLiveSessions}
    />
  );
}
