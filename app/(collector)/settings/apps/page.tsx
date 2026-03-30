import { SettingsNav } from "@/features/settings/settings-nav";
import { WalletConnectionsForm } from "@/features/settings/wallet-connections-form";
import { AppShell } from "@/features/shell/app-shell";
import { gateway } from "@/lib/gateway";
import { requireSession } from "@/lib/server/session";

const WALLET_STATUS_MESSAGES: Record<string, string> = {
  invalid_address: "please enter a valid wallet address.",
  invalid_chain: "please select a supported chain.",
  connect_failed: "could not connect wallet. the address may already be linked.",
  connected: "wallet connected. sign the challenge to verify ownership.",
  invalid_signature: "please provide a valid signature.",
  missing_wallet_id: "wallet not found.",
  verify_failed: "verification failed. check the signature and try again.",
  verified: "wallet verified and connected to your account.",
  disconnect_failed: "could not disconnect wallet. no active connection found.",
  disconnected: "wallet disconnected."
};

type AppsPageProps = {
  searchParams: Promise<{ wallet_status?: string }>;
};

export default async function SettingsAppsPage({ searchParams }: AppsPageProps) {
  const session = await requireSession("/settings/apps");
  const params = await searchParams;

  const wallets = await gateway.listWalletConnections(session.accountId);
  const statusMessage = params.wallet_status
    ? (WALLET_STATUS_MESSAGES[params.wallet_status] ?? null)
    : null;

  return (
    <AppShell title="settings" subtitle="connected apps" session={session}>
      <SettingsNav />

      <WalletConnectionsForm wallets={wallets} statusMessage={statusMessage} />

      <section className="slice-panel">
        <p className="slice-label">third-party integrations</p>
        <div className="ops-settings-grid">
          <p className="slice-copy">
            manage apps and services connected to your oneofakinde account.
            no integrations are active at this time.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
