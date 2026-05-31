import { notFound } from "next/navigation";
import { AppShell } from "@/features/shell/app-shell";
import { requireSessionRoles } from "@/lib/server/session";
import { commerceBffService } from "@/lib/bff/service";
import { commitDropDealAction } from "./actions";

type SetDropTermsPageProps = {
  params: Promise<{ drop_id: string }>;
};

export default async function SetDropTermsPage({ params }: SetDropTermsPageProps) {
  const session = await requireSessionRoles("/create/drop", ["creator"]);
  const { drop_id } = await params;
  const dropId = decodeURIComponent(drop_id);

  // The drop is a just-created, unpublished draft (not yet discoverable), so we
  // fetch it unconditionally and enforce ownership ourselves.
  const drop = await commerceBffService.getDropById(dropId);
  if (!drop || drop.studioHandle !== session.handle) {
    notFound();
  }

  return (
    <AppShell
      title="set your terms"
      subtitle={`the deal collectors agree to for “${drop.title}”`}
      session={session}
      activeNav="townhall"
    >
      <section className="slice-panel">
        <h2 className="slice-title">your terms for &ldquo;{drop.title}&rdquo;</h2>
        <p className="slice-copy">
          These are the terms a collector agrees to when they collect this drop. We&rsquo;ve
          pre-filled a conservative default &mdash; edit anything you like, then confirm. Your work
          can&rsquo;t be sold until you set these, and you can change them later from the
          drop&rsquo;s page.
        </p>

        <form action={commitDropDealAction} className="slice-form">
          <input type="hidden" name="dropId" value={drop.id} />

          <label className="slice-field">
            <span className="slice-field-label">License</span>
            <select name="licenseType" defaultValue="personal-use-only">
              <option value="personal-use-only">Personal use only</option>
              <option value="personal-and-commercial">Personal &amp; commercial use</option>
              <option value="all-rights-reserved">All rights reserved</option>
            </select>
          </label>

          <label className="slice-field slice-field-check">
            <input type="checkbox" name="attributionRequired" defaultChecked />
            <span>Attribution required &mdash; collectors must credit you</span>
          </label>

          <label className="slice-field slice-field-check">
            <input type="checkbox" name="commercialUse" />
            <span>Allow commercial use</span>
          </label>

          <label className="slice-field slice-field-check">
            <input type="checkbox" name="derivativesAllowed" />
            <span>Allow derivatives &amp; remixes</span>
          </label>

          <label className="slice-field">
            <span className="slice-field-label">Resale royalty (%)</span>
            <input type="number" name="royaltyPct" min="0" max="100" step="0.5" defaultValue="0" />
            <small className="slice-copy">
              Applies if and when resale is enabled (currently off). Leave at 0 for none.
            </small>
          </label>

          <button type="submit" className="slice-button">
            Confirm terms &amp; publish
          </button>
        </form>
      </section>
    </AppShell>
  );
}
