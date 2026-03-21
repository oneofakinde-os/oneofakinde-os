import { RouteStub } from "@/components/route-stub";

export default function ConnectPage() {
  return (
    <RouteStub
      title="connect"
      route="/connect"
      roles={["public", "collector", "creator"]}
      publicSafe={true}
      summary="community discourse and market conversation — the social-market lane inside townhall"
    />
  );
}
