import { WorldDetailScreen } from "@/features/world/world-detail-screen";
import type { CollectLiveSessionSnapshot } from "@/lib/domain/contracts";
import { gateway } from "@/lib/gateway";
import { buildWorldMetadata } from "@/lib/seo/metadata";
import { getOptionalSession } from "@/lib/server/session";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type WorldPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: WorldPageProps): Promise<Metadata> {
  const { id } = await params;
  const world = await gateway.getWorldById(id);

  if (!world) {
    return {
      title: "world not found",
      description: "the requested world could not be found."
    };
  }

  return buildWorldMetadata(world);
}

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

  const [worldCollectSnapshot, worldPatronRosterResult, collectLiveSessions, isMember] = session
    ? await Promise.all([
        gateway.getCollectWorldBundlesForWorld(session.accountId, world.id),
        gateway.listWorldPatronRoster(session.accountId, world.id),
        gateway.listCollectLiveSessions(session.accountId),
        gateway.hasActiveMembership(session.accountId, world.id)
      ])
    : [null, null, [] as CollectLiveSessionSnapshot[], false];
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
      isMember={isMember}
      worldCollectSnapshot={worldCollectSnapshot}
      worldCollectFullWorldUpgradePreview={worldCollectFullWorldUpgradePreview}
      worldPatronRosterSnapshot={worldPatronRosterSnapshot}
      worldPatronRosterAccessState={worldPatronRosterAccessState}
      worldLiveSessions={worldLiveSessions}
    />
  );
}
