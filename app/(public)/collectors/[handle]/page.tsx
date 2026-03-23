import "@/features/patron/patron-badge.css";
import { CollectorPublicScreen } from "@/features/collector/collector-public-screen";
import { commerceBffService } from "@/lib/bff/service";
import { getOptionalSession } from "@/lib/server/session";
import { notFound } from "next/navigation";

type CollectorPageProps = {
  params: Promise<{ handle: string }>;
};

export default async function CollectorPage({ params }: CollectorPageProps) {
  const { handle } = await params;

  const [session, collector] = await Promise.all([
    getOptionalSession(),
    commerceBffService.getCollectorPublic(handle)
  ]);

  if (!collector) {
    notFound();
  }

  return (
    <CollectorPublicScreen
      handle={collector.handle}
      displayName={collector.displayName}
      avatarUrl={collector.avatarUrl}
      bio={collector.bio}
      roles={collector.roles}
      memberSince={collector.memberSince}
      collectionCount={collector.collectionCount}
      badgeCount={collector.badgeCount}
      patronWorlds={collector.patronWorlds}
      ownedDrops={collector.ownedDrops}
      session={session}
    />
  );
}
