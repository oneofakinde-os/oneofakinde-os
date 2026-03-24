import { CollectorPublicScreen } from "@/features/collector/collector-public-screen";
import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type CollectorPageProps = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({ params }: CollectorPageProps): Promise<Metadata> {
  const { handle } = await params;
  const collector = await commerceBffService.getCollectorPublic(handle);

  if (!collector) {
    return { title: "collector not found" };
  }

  const description = collector.bio
    ? `${collector.bio.slice(0, 155)}${collector.bio.length > 155 ? "\u2026" : ""}`
    : `@${collector.handle} on oneofakinde — ${collector.collectionCount} drops collected`;

  return {
    title: `@${collector.handle}`,
    description,
    openGraph: {
      title: collector.displayName,
      description,
      type: "profile",
      ...(collector.avatarUrl ? { images: [{ url: collector.avatarUrl }] } : {}),
    },
  };
}

export default async function CollectorPage({ params }: CollectorPageProps) {
  const { handle } = await params;

  const [session, collector] = await Promise.all([
    getOptionalSession(),
    gateway.getCollectorPublic(handle)
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
