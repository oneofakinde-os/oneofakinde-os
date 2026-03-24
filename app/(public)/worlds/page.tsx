import { WorldsScreen } from "@/features/explore/worlds-screen";
import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "worlds",
  description: "explore curated worlds — collections of drops from independent studios on oneofakinde.",
};

export default async function WorldsPage() {
  const [session, worlds] = await Promise.all([
    getOptionalSession(),
    gateway.listWorlds()
  ]);

  return <WorldsScreen session={session} worlds={worlds} />;
}
