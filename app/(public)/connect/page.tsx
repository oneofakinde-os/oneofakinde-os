import { ConnectScreen } from "@/features/connect/connect-screen";
import { loadConnectContext } from "./load-connect-context";

export default async function ConnectPage() {
  const { viewer, posts, filter } = await loadConnectContext();
  return (
    <ConnectScreen
      viewer={viewer}
      initialPosts={posts}
      initialFilter={filter}
    />
  );
}
