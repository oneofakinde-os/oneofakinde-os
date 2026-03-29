import { AppShell } from "@/features/shell/app-shell";
import { routes } from "@/lib/routes";
import { requireSessionRoles } from "@/lib/server/session";
import Link from "next/link";

export default async function PayoutsPage() {
  const session = await requireSessionRoles("/payouts", ["creator"]);

  return (
    <AppShell title="payouts" subtitle="payout setup, pending balance, and transfer history" session={session} activeNav="workshop">
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

      <section className="slice-panel">
        <div className="slice-button-row">
          <Link href={routes.dashboard()} className="slice-button ghost">
            back to dashboard
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
