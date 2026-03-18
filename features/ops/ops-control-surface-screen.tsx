import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import type { Drop, OpsAnalyticsPanel, Session } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

export type OpsSurface =
  | "auctions"
  | "invest"
  | "following"
  | "create"
  | "dashboard"
  | "campaigns"
  | "payouts"
  | "settings_account"
  | "settings_security"
  | "settings_apps"
  | "settings_notifications";

type OpsControlSurfaceScreenProps = {
  surface: OpsSurface;
  session: Session | null;
  drops?: Drop[];
  opsAnalyticsPanel?: OpsAnalyticsPanel | null;
};

type SurfaceMeta = {
  title: string;
  subtitle: string;
  activeNav: "townhall" | "my_collection" | "library" | "worlds";
};

type CampaignState = "running" | "scheduled" | "draft";

type CampaignRow = {
  name: string;
  state: CampaignState;
  budget: string;
  conversion: string;
};

type AppIntegration = {
  name: string;
  state: "connected" | "available";
  note: string;
};

const SURFACE_META: Record<OpsSurface, SurfaceMeta> = {
  auctions: {
    title: "auctions",
    subtitle: "live bidding lanes for active drops and world editions",
    activeNav: "townhall"
  },
  invest: {
    title: "invest",
    subtitle: "positioning panel for collector participation and offers",
    activeNav: "townhall"
  },
  following: {
    title: "following",
    subtitle: "saved-library users and followed creator world updates",
    activeNav: "library"
  },
  create: {
    title: "create",
    subtitle: "entry point for authoring drops, worlds, and campaign launches",
    activeNav: "townhall"
  },
  dashboard: {
    title: "dashboard",
    subtitle: "creator analytics for conversion, reach, and sell-through",
    activeNav: "worlds"
  },
  campaigns: {
    title: "my campaigns",
    subtitle: "campaign execution table and launch status tracking",
    activeNav: "worlds"
  },
  payouts: {
    title: "payouts",
    subtitle: "payout setup, pending balance, and transfer history",
    activeNav: "worlds"
  },
  settings_account: {
    title: "account details",
    subtitle: "identity and contact controls for profile and studio presence",
    activeNav: "my_collection"
  },
  settings_security: {
    title: "security",
    subtitle: "sessions, credentials, and account hardening controls",
    activeNav: "my_collection"
  },
  settings_apps: {
    title: "apps / extensions",
    subtitle: "connected apps and extension authorization controls",
    activeNav: "my_collection"
  },
  settings_notifications: {
    title: "notifications",
    subtitle: "delivery preferences for townhall, market, and account events",
    activeNav: "my_collection"
  }
};

const CAMPAIGNS: CampaignRow[] = [
  { name: "season one relaunch", state: "running", budget: "$320", conversion: "4.1%" },
  { name: "through the lens weekender", state: "scheduled", budget: "$180", conversion: "2.4%" },
  { name: "voidrunner collectors pass", state: "draft", budget: "$95", conversion: "n/a" }
];

const APPS: AppIntegration[] = [
  { name: "newsletter relay", state: "connected", note: "publishes campaign updates to subscribers" },
  { name: "community sync", state: "connected", note: "mirrors townhall highlights to socials" },
  { name: "analytics exporter", state: "available", note: "sends dashboard snapshots to warehouse" },
  { name: "creator crm", state: "available", note: "maps followers and collectors to crm segments" }
];

function firstDrops(drops: Drop[]): Drop[] {
  return drops.slice(0, 4);
}

function uniqueCreatorHandles(drops: Drop[]): string[] {
  return Array.from(new Set(drops.map((drop) => drop.studioHandle))).slice(0, 4);
}

function campaignBadgeClass(state: CampaignState): string {
  return `ops-pill ${state}`;
}

function renderAuctionBody(session: Session | null, drops: Drop[]) {
  const featuredDrops = firstDrops(drops);
  const totalCatalogValue = featuredDrops.reduce((sum, drop) => sum + drop.priceUsd, 0);

  return (
    <>
      <section className="slice-panel">
        <p className="slice-label">featured lanes</p>
        <h2 className="slice-title">active auctions</h2>
        <p className="slice-copy">auction lanes combine timed bids with world context and certificate-aware settlement.</p>
        {featuredDrops.length === 0 ? (
          <p className="slice-copy">no drops are available for auctions yet.</p>
        ) : (
          <ul className="ops-grid" aria-label="auction lanes">
            {featuredDrops.map((drop, index) => (
              <li key={drop.id} className="ops-card">
                <p className="slice-label">{drop.worldLabel}</p>
                <h3>{drop.title}</h3>
                <p className="slice-meta">current bid {formatUsd(drop.priceUsd + 3 + index * 2)}</p>
                <p className="slice-meta">ends in {18 - index * 3}h</p>
                <div className="slice-button-row">
                  <Link href={routes.drop(drop.id)} className="slice-button ghost">
                    open lane
                  </Link>
                  <Link
                    href={session ? routes.collectDrop(drop.id) : routes.signIn(routes.collectDrop(drop.id))}
                    className="slice-button alt"
                  >
                    place bid
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="slice-panel">
        <p className="slice-label">market pulse</p>
        <div className="ops-kpi-grid">
          <article className="ops-kpi">
            <h3>{featuredDrops.length}</h3>
            <p>active lanes</p>
          </article>
          <article className="ops-kpi">
            <h3>{formatUsd(totalCatalogValue)}</h3>
            <p>visible lane value</p>
          </article>
          <article className="ops-kpi">
            <h3>96%</h3>
            <p>certificate settlement reliability</p>
          </article>
        </div>
      </section>
    </>
  );
}

function renderInvestBody(session: Session, drops: Drop[]) {
  const opportunities = firstDrops(drops).map((drop, index) => ({
    drop,
    momentum: `${12 + index * 4}%`,
    floor: formatUsd(Math.max(1, drop.priceUsd - 1.5))
  }));

  return (
    <>
      <section className="slice-panel">
        <p className="slice-label">collector wallet @{session.handle}</p>
        <h2 className="slice-title">invest opportunities</h2>
        <p className="slice-copy">position into drops with transparent receipt and certificate track records.</p>
        <div className="ops-table" role="table" aria-label="invest opportunities">
          <div className="ops-row header" role="row">
            <span>drop</span>
            <span>momentum</span>
            <span>floor</span>
            <span>action</span>
          </div>
          {opportunities.map((entry) => (
            <div key={entry.drop.id} className="ops-row" role="row">
              <span>{entry.drop.title}</span>
              <span>{entry.momentum}</span>
              <span>{entry.floor}</span>
              <Link href={routes.collectDrop(entry.drop.id)} className="slice-link">
                invest
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="slice-panel">
        <p className="slice-label">portfolio snapshot</p>
        <div className="ops-kpi-grid">
          <article className="ops-kpi">
            <h3>{opportunities.length}</h3>
            <p>tracked positions</p>
          </article>
          <article className="ops-kpi">
            <h3>{formatUsd(opportunities.length * 14.25)}</h3>
            <p>estimated current value</p>
          </article>
          <article className="ops-kpi">
            <h3>+18.6%</h3>
            <p>30d growth</p>
          </article>
        </div>
      </section>
    </>
  );
}

function renderFollowingBody(session: Session, drops: Drop[]) {
  const handles = uniqueCreatorHandles(drops);

  return (
    <>
      <section className="slice-panel">
        <p className="slice-label">social graph</p>
        <h2 className="slice-title">@{session.handle} following</h2>
        <p className="slice-copy">creator identities and world updates that feed your library surfaces.</p>
        <ul className="ops-grid" aria-label="following list">
          {handles.map((handle, index) => (
            <li key={handle} className="ops-card">
              <h3>@{handle}</h3>
              <p className="slice-meta">{2 + index} new drops this cycle</p>
              <p className="slice-meta">{12 + index * 3} townhall posts this month</p>
              <div className="slice-button-row">
                <Link href={routes.studio(handle)} className="slice-button ghost">
                  open studio
                </Link>
                <Link href={routes.worlds()} className="slice-button alt">
                  world feed
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="slice-panel">
        <p className="slice-label">library users</p>
        <div className="ops-kpi-grid">
          <article className="ops-kpi">
            <h3>{handles.length}</h3>
            <p>followed creators</p>
          </article>
          <article className="ops-kpi">
            <h3>34</h3>
            <p>new posts this week</p>
          </article>
          <article className="ops-kpi">
            <h3>9</h3>
            <p>new drops this week</p>
          </article>
        </div>
      </section>
    </>
  );
}

function renderCreateBody(session: Session, drops: Drop[]) {
  const publishedCount = drops.filter((drop) => drop.studioHandle === session.handle).length;

  return (
    <>
      <section className="slice-panel">
        <p className="slice-label">creator launchpad</p>
        <h2 className="slice-title">start your next drop or world</h2>
        <p className="slice-copy">create is the launch rail for drop authoring, world placement, and campaign activation.</p>
        <div className="slice-button-row">
          <Link href={routes.workshop()} className="slice-button">
            open workshop suite
          </Link>
          <Link href={routes.spaceSetup()} className="slice-button alt">
            open space setup
          </Link>
          <Link href={routes.dashboard()} className="slice-button ghost">
            open dashboard
          </Link>
        </div>
      </section>

      <section className="slice-panel">
        <p className="slice-label">creation status</p>
        <div className="ops-kpi-grid">
          <article className="ops-kpi">
            <h3>{publishedCount}</h3>
            <p>published drops</p>
          </article>
          <article className="ops-kpi">
            <h3>2</h3>
            <p>draft drops</p>
          </article>
          <article className="ops-kpi">
            <h3>1</h3>
            <p>world in setup</p>
          </article>
        </div>
      </section>
    </>
  );
}

function renderDashboardBody(drops: Drop[], opsAnalyticsPanel: OpsAnalyticsPanel | null) {
  const listedValue = firstDrops(drops).reduce((sum, drop) => sum + drop.priceUsd, 0);
  const grossSales = opsAnalyticsPanel
    ? opsAnalyticsPanel.settlement.completedReceipts * 3.25
    : listedValue * 1.8;
  const conversion = opsAnalyticsPanel
    ? opsAnalyticsPanel.settlement.completedReceipts > 0
      ? Math.min(
          100,
          Number(
            (
              ((opsAnalyticsPanel.settlement.completedReceipts - opsAnalyticsPanel.settlement.refundedReceipts) /
                opsAnalyticsPanel.settlement.completedReceipts) *
              100
            ).toFixed(1)
          )
        )
      : 0
    : 6.3;
  const impressions = opsAnalyticsPanel
    ? opsAnalyticsPanel.reliability.rebufferEvents + opsAnalyticsPanel.reliability.qualityStepDowns
    : 18400;
  const settlementHealth = opsAnalyticsPanel
    ? `${Math.max(0, 100 - opsAnalyticsPanel.settlement.missingLedgerLinks * 5)}%`
    : "41%";

  return (
    <>
      <section className="slice-panel">
        <p className="slice-label">performance</p>
        <h2 className="slice-title">creator analytics snapshot</h2>
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
            <h3>{impressions.toLocaleString()}</h3>
            <p>quality + rebuffer events</p>
          </article>
          <article className="ops-kpi">
            <h3>{settlementHealth}</h3>
            <p>settlement health</p>
          </article>
        </div>
      </section>

      {opsAnalyticsPanel ? (
        <section className="slice-panel">
          <p className="slice-label">ops analytics v0</p>
          <dl className="slice-list">
            <div>
              <dt>ledger transactions</dt>
              <dd>{opsAnalyticsPanel.settlement.ledgerTransactions}</dd>
            </div>
            <div>
              <dt>ledger line items</dt>
              <dd>{opsAnalyticsPanel.settlement.ledgerLineItems}</dd>
            </div>
            <div>
              <dt>webhooks processed</dt>
              <dd>{opsAnalyticsPanel.webhooks.processedEvents}</dd>
            </div>
            <div>
              <dt>failed payments</dt>
              <dd>{opsAnalyticsPanel.webhooks.failedPayments}</dd>
            </div>
          </dl>
          <p className="slice-meta">updated {new Date(opsAnalyticsPanel.updatedAt).toLocaleString()}</p>
        </section>
      ) : null}

      <section className="slice-panel">
        <p className="slice-label">quick links</p>
        <div className="slice-button-row">
          <Link href={routes.myCampaigns()} className="slice-button alt">
            my campaigns
          </Link>
          <Link href={routes.payouts()} className="slice-button alt">
            payouts
          </Link>
          <Link href={routes.workshop()} className="slice-button ghost">
            workshop
          </Link>
        </div>
      </section>
    </>
  );
}

function renderCampaignsBody() {
  return (
    <>
      <section className="slice-panel">
        <p className="slice-label">campaign table</p>
        <h2 className="slice-title">running + planned campaigns</h2>
        <div className="ops-table" role="table" aria-label="campaign table">
          <div className="ops-row header" role="row">
            <span>campaign</span>
            <span>status</span>
            <span>budget</span>
            <span>conversion</span>
          </div>
          {CAMPAIGNS.map((campaign) => (
            <div key={campaign.name} className="ops-row" role="row">
              <span>{campaign.name}</span>
              <span className={campaignBadgeClass(campaign.state)}>{campaign.state}</span>
              <span>{campaign.budget}</span>
              <span>{campaign.conversion}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="slice-panel">
        <p className="slice-label">actions</p>
        <div className="slice-button-row">
          <Link href={routes.create()} className="slice-button">
            create campaign
          </Link>
          <Link href={routes.dashboard()} className="slice-button alt">
            back to dashboard
          </Link>
        </div>
      </section>
    </>
  );
}

function renderPayoutsBody() {
  return (
    <>
      <section className="slice-panel">
        <p className="slice-label">payout status</p>
        <h2 className="slice-title">next transfer in 2 days</h2>
        <dl className="slice-list">
          <div>
            <dt>pending balance</dt>
            <dd>$1,276.40</dd>
          </div>
          <div>
            <dt>destination</dt>
            <dd>bank **** 4821</dd>
          </div>
          <div>
            <dt>last payout</dt>
            <dd>$842.10 · feb 14</dd>
          </div>
        </dl>
      </section>

      <section className="slice-panel">
        <p className="slice-label">history</p>
        <div className="ops-table" role="table" aria-label="payout history">
          <div className="ops-row header" role="row">
            <span>date</span>
            <span>amount</span>
            <span>status</span>
          </div>
          <div className="ops-row" role="row">
            <span>feb 14, 2026</span>
            <span>$842.10</span>
            <span className="ops-pill running">paid</span>
          </div>
          <div className="ops-row" role="row">
            <span>jan 31, 2026</span>
            <span>$521.72</span>
            <span className="ops-pill running">paid</span>
          </div>
        </div>
      </section>
    </>
  );
}

function renderSettingsAccountBody(session: Session) {
  return (
    <section className="slice-panel">
      <p className="slice-label">identity + contact</p>
      <div className="ops-settings-grid">
        <label className="slice-field">
          email
          <input className="slice-input" value={session.email} readOnly />
        </label>
        <label className="slice-field">
          handle
          <input className="slice-input" value={`@${session.handle}`} readOnly />
        </label>
        <label className="slice-field">
          display name
          <input className="slice-input" value={session.displayName} readOnly />
        </label>
        <label className="slice-field">
          role access
          <input className="slice-input" value={session.roles.join(", ")} readOnly />
        </label>
      </div>
    </section>
  );
}

function renderSettingsSecurityBody(session: Session) {
  return (
    <section className="slice-panel">
      <p className="slice-label">security controls</p>
      <dl className="slice-list">
        <div>
          <dt>active sessions</dt>
          <dd>3 devices</dd>
        </div>
        <div>
          <dt>2fa status</dt>
          <dd>enabled</dd>
        </div>
        <div>
          <dt>last sign in</dt>
          <dd>@{session.handle} · 12 minutes ago</dd>
        </div>
      </dl>
      <div className="slice-button-row">
        <Link href={routes.settingsNotifications()} className="slice-button alt">
          notification rules
        </Link>
        <Link href={routes.settingsAccount()} className="slice-button ghost">
          account details
        </Link>
      </div>
    </section>
  );
}

function renderSettingsAppsBody() {
  return (
    <section className="slice-panel">
      <p className="slice-label">connected apps</p>
      <ul className="ops-grid" aria-label="connected apps">
        {APPS.map((app) => (
          <li key={app.name} className="ops-card">
            <h3>{app.name}</h3>
            <p className="slice-meta">{app.note}</p>
            <span className={campaignBadgeClass(app.state === "connected" ? "running" : "draft")}>
              {app.state}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function renderSettingsNotificationsBody() {
  return (
    <section className="slice-panel">
      <p className="slice-label">delivery channels</p>
      <div className="ops-settings-grid">
        <label className="ops-toggle">
          <input type="checkbox" defaultChecked />
          <span>townhall replies and mentions</span>
        </label>
        <label className="ops-toggle">
          <input type="checkbox" defaultChecked />
          <span>drop purchase and receipt updates</span>
        </label>
        <label className="ops-toggle">
          <input type="checkbox" defaultChecked />
          <span>campaign performance alerts</span>
        </label>
        <label className="ops-toggle">
          <input type="checkbox" />
          <span>weekly digest only</span>
        </label>
      </div>
    </section>
  );
}

function renderBody(
  surface: OpsSurface,
  session: Session | null,
  drops: Drop[],
  opsAnalyticsPanel: OpsAnalyticsPanel | null
) {
  if (surface === "auctions") return renderAuctionBody(session, drops);
  if (surface === "invest" && session) return renderInvestBody(session, drops);
  if (surface === "following" && session) return renderFollowingBody(session, drops);
  if (surface === "create" && session) return renderCreateBody(session, drops);
  if (surface === "dashboard") return renderDashboardBody(drops, opsAnalyticsPanel);
  if (surface === "campaigns") return renderCampaignsBody();
  if (surface === "payouts") return renderPayoutsBody();
  if (surface === "settings_account" && session) return renderSettingsAccountBody(session);
  if (surface === "settings_security" && session) return renderSettingsSecurityBody(session);
  if (surface === "settings_apps") return renderSettingsAppsBody();
  if (surface === "settings_notifications") return renderSettingsNotificationsBody();

  return (
    <section className="slice-panel">
      <p className="slice-label">session required</p>
      <p className="slice-copy">sign in to continue on this surface.</p>
    </section>
  );
}

export function OpsControlSurfaceScreen({
  surface,
  session,
  drops = [],
  opsAnalyticsPanel = null
}: OpsControlSurfaceScreenProps) {
  const meta = SURFACE_META[surface];

  return (
    <AppShell title={meta.title} subtitle={meta.subtitle} session={session} activeNav={meta.activeNav}>
      {renderBody(surface, session, drops, opsAnalyticsPanel)}
    </AppShell>
  );
}
