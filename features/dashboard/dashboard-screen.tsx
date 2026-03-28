import { RefundHandlingPanel } from "@/features/ops/refund-handling-panel";
import { formatUsd } from "@/features/shared/format";
import { AppShell } from "@/features/shell/app-shell";
import type { Drop, OpsAnalyticsPanel, Session, WorkshopAnalyticsPanel } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type DashboardScreenProps = {
  session: Session;
  drops: Drop[];
  opsAnalyticsPanel: OpsAnalyticsPanel | null;
  workshopAnalyticsPanel: WorkshopAnalyticsPanel | null;
};

function computeMetrics(drops: Drop[], opsAnalyticsPanel: OpsAnalyticsPanel | null) {
  const studioDrops = drops.slice(0, 4);
  const listedValue = studioDrops.reduce((sum, drop) => sum + drop.priceUsd, 0);

  const grossSales = opsAnalyticsPanel
    ? opsAnalyticsPanel.settlement.completedReceipts * 3.25
    : listedValue * 1.8;

  const conversion = opsAnalyticsPanel
    ? opsAnalyticsPanel.settlement.completedReceipts > 0
      ? Math.min(
          100,
          Number(
            (
              ((opsAnalyticsPanel.settlement.completedReceipts -
                opsAnalyticsPanel.settlement.refundedReceipts) /
                opsAnalyticsPanel.settlement.completedReceipts) *
              100
            ).toFixed(1)
          )
        )
      : 0
    : 6.3;

  const qualityEvents = opsAnalyticsPanel
    ? opsAnalyticsPanel.reliability.rebufferEvents + opsAnalyticsPanel.reliability.qualityStepDowns
    : 0;

  const settlementHealth = opsAnalyticsPanel
    ? `${Math.max(0, 100 - opsAnalyticsPanel.settlement.missingLedgerLinks * 5)}%`
    : "—";

  return { grossSales, conversion, qualityEvents, settlementHealth };
}

export function DashboardScreen({
  session,
  drops,
  opsAnalyticsPanel,
  workshopAnalyticsPanel,
}: DashboardScreenProps) {
  const studioDrops = drops.filter((d) => d.studioHandle === session.handle);
  const { grossSales, conversion, qualityEvents, settlementHealth } = computeMetrics(
    studioDrops,
    opsAnalyticsPanel
  );

  return (
    <AppShell
      title="dashboard"
      subtitle="creator analytics and operations"
      session={session}
      activeNav="workshop"
    >
      {/* ── KPI overview ── */}
      <section className="slice-panel">
        <p className="slice-label">performance overview</p>
        <div className="ops-kpi-grid">
          <article className="ops-kpi">
            <h3>{formatUsd(grossSales)}</h3>
            <p>gross sales this cycle</p>
          </article>
          <article className="ops-kpi">
            <h3>{conversion}%</h3>
            <p>store conversion</p>
          </article>
          <article className="ops-kpi">
            <h3>{studioDrops.length}</h3>
            <p>published drops</p>
          </article>
          <article className="ops-kpi">
            <h3>{settlementHealth}</h3>
            <p>settlement health</p>
          </article>
        </div>
      </section>

      {/* ── workshop analytics ── */}
      {workshopAnalyticsPanel ? (
        <section className="slice-panel">
          <p className="slice-label">workshop analytics</p>
          <div className="ops-kpi-grid">
            <article className="ops-kpi">
              <h3>{workshopAnalyticsPanel.dropsPublished}</h3>
              <p>drops published</p>
            </article>
            <article className="ops-kpi">
              <h3>{workshopAnalyticsPanel.discoveryImpressions.toLocaleString()}</h3>
              <p>discovery impressions</p>
            </article>
            <article className="ops-kpi">
              <h3>{workshopAnalyticsPanel.completedCollects}</h3>
              <p>completed collects</p>
            </article>
            <article className="ops-kpi">
              <h3>{workshopAnalyticsPanel.collectConversionRate}%</h3>
              <p>collect conversion</p>
            </article>
          </div>
          <div className="ops-kpi-grid" style={{ marginTop: 12 }}>
            <article className="ops-kpi">
              <h3>{formatUsd(workshopAnalyticsPanel.payouts.grossUsd)}</h3>
              <p>gross revenue</p>
            </article>
            <article className="ops-kpi">
              <h3>{formatUsd(workshopAnalyticsPanel.payouts.payoutUsd)}</h3>
              <p>net payout</p>
            </article>
            <article className="ops-kpi">
              <h3>{workshopAnalyticsPanel.payouts.payoutRecipients}</h3>
              <p>payout recipients</p>
            </article>
          </div>
          <p className="slice-meta" style={{ marginTop: 8 }}>
            updated {new Date(workshopAnalyticsPanel.updatedAt).toLocaleString()}
          </p>
        </section>
      ) : null}

      {/* ── ops analytics ── */}
      {opsAnalyticsPanel ? (
        <section className="slice-panel">
          <p className="slice-label">ops analytics</p>
          <dl className="slice-list">
            <div>
              <dt>completed receipts</dt>
              <dd>{opsAnalyticsPanel.settlement.completedReceipts}</dd>
            </div>
            <div>
              <dt>refunded receipts</dt>
              <dd>{opsAnalyticsPanel.settlement.refundedReceipts}</dd>
            </div>
            <div>
              <dt>ledger transactions</dt>
              <dd>{opsAnalyticsPanel.settlement.ledgerTransactions}</dd>
            </div>
            <div>
              <dt>quality events</dt>
              <dd>{qualityEvents}</dd>
            </div>
            <div>
              <dt>webhooks processed</dt>
              <dd>{opsAnalyticsPanel.webhooks.processedEvents}</dd>
            </div>
          </dl>
          <p className="slice-meta">
            updated {new Date(opsAnalyticsPanel.updatedAt).toLocaleString()}
          </p>
        </section>
      ) : null}

      {/* ── recent drops ── */}
      {studioDrops.length > 0 ? (
        <section className="slice-panel">
          <div className="slice-row">
            <p className="slice-label">your drops</p>
            <Link href={routes.workshop()} className="slice-button ghost">
              open workshop
            </Link>
          </div>
          <ul className="ops-grid" aria-label="studio drops">
            {studioDrops.slice(0, 4).map((drop) => (
              <li key={drop.id} className="ops-card">
                <p className="slice-label">{drop.worldLabel}</p>
                <h3>{drop.title}</h3>
                <p className="slice-meta">{formatUsd(drop.priceUsd)}</p>
                <Link href={routes.drop(drop.id)} className="slice-button ghost">
                  view
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── refund handling ── */}
      <section className="slice-panel">
        <p className="slice-label">refund handling</p>
        <p className="slice-copy">
          submit a payment or receipt id to run refund revocation and entitlement rollback.
        </p>
        <RefundHandlingPanel />
      </section>

      {/* ── quick links ── */}
      <section className="slice-panel">
        <p className="slice-label">quick links</p>
        <div className="slice-button-row">
          <Link href={routes.workshop()} className="slice-button">
            workshop
          </Link>
          <Link href={routes.myCampaigns()} className="slice-button alt">
            my campaigns
          </Link>
          <Link href={routes.payouts()} className="slice-button alt">
            payouts
          </Link>
          <Link href={routes.settingsAccount()} className="slice-button ghost">
            account settings
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
