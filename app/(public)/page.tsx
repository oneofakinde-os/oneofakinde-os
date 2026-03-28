import { EntryScreen } from "@/features/entry/entry-screen";
import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";

export default async function IndexPage() {
  const [session, drops, worlds] = await Promise.all([
    getOptionalSession(),
    gateway.listDrops(),
    gateway.listWorlds()
  ]);

  const featuredDrops = [...drops]
    .sort((a, b) => Date.parse(b.releaseDate) - Date.parse(a.releaseDate))
    .slice(0, 3);

  return (
    <EntryScreen
      session={session}
      featuredDrops={featuredDrops}
      worlds={worlds}
    />
  );
}
