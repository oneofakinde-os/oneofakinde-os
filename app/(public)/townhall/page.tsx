import { TownhallDiscourseScreen } from "@/features/townhall/townhall-discourse-screen";
import { loadTownhallDiscourseContext } from "./load-discourse-context";

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
