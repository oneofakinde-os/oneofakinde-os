import { TownhallDiscourseScreen } from "@/features/townhall/townhall-discourse-screen";
import type { Metadata } from "next";
import { loadTownhallDiscourseContext } from "./load-discourse-context";

export const metadata: Metadata = {
  title: "townhall",
  description: "the community feed — discuss drops, share thoughts, and connect with collectors on oneofakinde.",
};

export default async function TownhallPage() {
  const { viewer, posts, filter } = await loadTownhallDiscourseContext();
  return (
    <TownhallDiscourseScreen
      viewer={viewer}
      initialPosts={posts}
      initialFilter={filter}
    />
  );
}
