import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import { gateway } from "@/lib/gateway";
import { routes } from "@/lib/routes";
import { requireSession } from "@/lib/server/session";
import Link from "next/link";
import { notFound } from "next/navigation";

type WorldUpgradePageProps = {
  params: Promise<{ id: string }>;
};

export default async function WorldUpgradePage({ params }: WorldUpgradePageProps) {
  const { id } = await params;
  const session = await requireSession(routes.signIn(routes.worldUpgrade(id)));
  const world = await gateway.getWorldById(id);

  if (!world) {
    notFound();
  }

  const bundleSnapshot = await gateway.getCollectWorldBundlesForWorld(
    session.accountId,
    id
  );

  return (
    <AppShell title={world.title} subtitle="upgrade" session={session}>
      <section className="slice-panel" data-testid="world-upgrade-panel">
        <p className="slice-label">world bundle upgrade</p>
        <p className="slice-copy">
          upgrade your ownership to include more drops and future releases.
        </p>

        {!bundleSnapshot ? (
          <p className="slice-meta">
            bundle information is currently unavailable.{" "}
            <Link href={routes.world(id)} className="slice-link">
              back to world
            </Link>
          </p>
        ) : (
          <>
            {bundleSnapshot.activeOwnership ? (
              <dl className="slice-dl">
                <dt>current bundle</dt>
                <dd>{bundleSnapshot.activeOwnership.bundleType.replaceAll("_", " ")}</dd>
                <dt>purchased</dt>
                <dd>{new Date(bundleSnapshot.activeOwnership.purchasedAt).toLocaleDateString()}</dd>
                <dt>amount paid</dt>
                <dd>{formatUsd(bundleSnapshot.activeOwnership.amountPaidUsd)}</dd>
              </dl>
            ) : (
              <p className="slice-meta">you do not currently own a bundle for this world.</p>
            )}

            <ul className="slice-list" data-testid="world-upgrade-bundles">
              {bundleSnapshot.bundles.map((entry) => (
                <li key={entry.bundle.bundleType} className="slice-list-item">
                  <p className="slice-label">{entry.bundle.bundleType.replaceAll("_", " ")}</p>
                  <p className="slice-meta">
                    {entry.bundle.synopsis} · {formatUsd(entry.bundle.priceUsd)}
                  </p>
                  <p className="slice-meta">
                    {entry.upgradePreview.eligible
                      ? `eligible · credit ${formatUsd(entry.upgradePreview.previousOwnershipCreditUsd)} · total ${formatUsd(entry.upgradePreview.totalUsd)}`
                      : `not eligible (${entry.upgradePreview.eligibilityReason.replaceAll("_", " ")})`}
                  </p>
                  {entry.upgradePreview.eligible && (
                    <div className="slice-button-row">
                      <Link
                        href={routes.collectDrop(world.id)}
                        className="slice-button"
                      >
                        upgrade to {entry.bundle.bundleType.replaceAll("_", " ")}
                      </Link>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="slice-button-row" style={{ marginTop: "var(--space-md)" }}>
          <Link href={routes.world(id)} className="slice-button ghost">
            back to world
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
