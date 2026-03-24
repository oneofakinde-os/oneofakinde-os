import { ExploreScreen } from "@/features/explore/explore-screen";
import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "explore",
  description: "discover drops, studios, and worlds across oneofakinde.",
};

export default async function ExplorePage() {
  const [session, drops, worlds] = await Promise.all([
    getOptionalSession(),
    gateway.listDrops(),
    gateway.listWorlds()
  ]);

  return <ExploreScreen session={session} drops={drops} worlds={worlds} />;
}
