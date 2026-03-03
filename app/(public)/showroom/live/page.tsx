import { TownhallFeedScreen } from "@/features/townhall/townhall-feed-screen";
import { loadTownhallFeedContext } from "../load-feed-context";

export default async function TownhallLivePage() {
  const { viewer, drops, ownedDropIds, socialByDropId } = await loadTownhallFeedContext();
  return (
    <TownhallFeedScreen
      mode="live"
      viewer={viewer}
      drops={drops}
      ownedDropIds={ownedDropIds}
      initialSocialByDropId={socialByDropId}
    />
  );
}
