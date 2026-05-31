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

  // The drop may be a just-created draft (not yet discoverable), so fetch it
  // unconditionally and enforce ownership ourselves.
  const drop = await commerceBffService.getDropById(dropId);
  if (!drop || drop.studioHandle !== session.handle) {
    notFound();
  }

  // Pre-fill from the current deal when one exists (editing, reached from the drop
  // page) — otherwise the conservative default (first time, from the create flow).
  // The same screen serves both set and edit.
  const [currentTerms, currentRights] = await Promise.all([
    commerceBffService.getCreatorTerms(dropId),
    commerceBffService.getRightsMetadataForDrop(dropId)
  ]);
  const isEditing = Boolean(currentTerms || currentRights);

  const licenseType = currentRights?.licenseType ?? "personal-use-only";
  const attributionRequired =
    currentTerms?.attributionRequired ?? currentRights?.attributionRequired ?? true;
  const commercialUse = currentTerms?.commercialUse ?? currentRights?.commercialUse ?? false;
  const derivativesAllowed =
    currentTerms?.derivativesAllowed ?? currentRights?.derivativesAllowed ?? false;
  const royaltyFraction = currentTerms?.royaltyPct ?? currentRights?.royaltyPct ?? null;
  const royaltyPercent = royaltyFraction != null ? Math.round(royaltyFraction * 10000) / 100 : 0;

  return (
    <AppShell
      title={isEditing ? "edit your terms" : "set your terms"}
      subtitle={`the deal collectors agree to for “${drop.title}”`}
      session={session}
      activeNav="townhall"
    >
      <section className="slice-panel">
        <h2 className="slice-title">your terms for &ldquo;{drop.title}&rdquo;</h2>
        <p className="slice-copy">
          {isEditing
            ? "These are the terms a collector agrees to when they collect this drop. Edit anything and save; your changes apply to future collects."
            : "These are the terms a collector agrees to when they collect this drop. We pre-filled a conservative default — edit anything, then confirm. Your work cannot be sold until you set these."}
        </p>

        <form action={commitDropDealAction} className="slice-form">
          <input type="hidden" name="dropId" value={drop.id} />

          <label className="slice-field">
            <span className="slice-field-label">License</span>
            <select name="licenseType" defaultValue={licenseType}>
              <option value="personal-use-only">Personal use only</option>
              <option value="personal-and-commercial">Personal &amp; commercial use</option>
              <option value="all-rights-reserved">All rights reserved</option>
            </select>
          </label>

          <label className="slice-field slice-field-check">
            <input type="checkbox" name="attributionRequired" defaultChecked={attributionRequired} />
            <span>Attribution required &mdash; collectors must credit you</span>
          </label>

          <label className="slice-field slice-field-check">
            <input type="checkbox" name="commercialUse" defaultChecked={commercialUse} />
            <span>Allow commercial use</span>
          </label>

          <label className="slice-field slice-field-check">
            <input type="checkbox" name="derivativesAllowed" defaultChecked={derivativesAllowed} />
            <span>Allow derivatives &amp; remixes</span>
          </label>

          <label className="slice-field">
            <span className="slice-field-label">Resale royalty (%)</span>
            <input type="number" name="royaltyPct" min="0" max="100" step="0.5" defaultValue={royaltyPercent} />
            <small className="slice-copy">
              Applies if and when resale is enabled (currently off). Leave at 0 for none.
            </small>
          </label>

          <button type="submit" className="slice-button">
            {isEditing ? "Save terms" : "Confirm terms & publish"}
          </button>
        </form>
      </section>
    </AppShell>
  );
}
