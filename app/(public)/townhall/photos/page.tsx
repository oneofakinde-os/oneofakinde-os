import { TownhallFeedScreen } from "@/features/townhall/townhall-feed-screen";
import { loadTownhallFeedContext } from "../load-feed-context";

export default async function TownhallPhotosPage() {
  const { viewer, drops, ownedDropIds, socialByDropId } = await loadTownhallFeedContext();
  return (
    <TownhallFeedScreen
      mode="photos"
      viewer={viewer}
      drops={drops}
      ownedDropIds={ownedDropIds}
      initialSocialByDropId={socialByDropId}
    />
  );
}
