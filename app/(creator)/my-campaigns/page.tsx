import { AppShell } from "@/features/shell/app-shell";
import { routes } from "@/lib/routes";
import { requireSessionRoles } from "@/lib/server/session";
import Link from "next/link";

const CAMPAIGNS = [
  { name: "season one relaunch", state: "running" as const, budget: "$320", conversion: "4.1%" },
  { name: "through the lens weekender", state: "scheduled" as const, budget: "$180", conversion: "2.4%" },
  { name: "voidrunner collectors pass", state: "draft" as const, budget: "$95", conversion: "n/a" },
];

function pillClass(state: string): string {
  return `ops-pill ${state}`;
}

export default async function MyCampaignsPage() {
  const session = await requireSessionRoles("/my-campaigns", ["creator"]);

  return (
    <AppShell title="my campaigns" subtitle="campaign execution table and launch status" session={session} activeNav="workshop">
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
              <span className={pillClass(campaign.state)}>{campaign.state}</span>
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
          <Link href={routes.dashboard()} className="slice-button ghost">
            back to dashboard
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
