import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import { MediaUploadZone } from "@/features/workshop/media-upload-zone";
import type {
  Drop,
  DropLineageSnapshot,
  LiveSession,
  LiveSessionArtifact,
  PatronTierConfig,
  Session,
  TownhallModerationQueueItem,
  WorkshopAnalyticsPanel,
  WorkshopProProfile,
  WorldReleaseQueueItem,
  World
} from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import {
  WORKSHOP_PREVIEW_POLICY_OPTIONS,
  WORKSHOP_VISIBILITY_OPTIONS,
  type WorkshopPublishDraftState,
  type WorkshopPublishValidationSummary,
  type WorkshopWorldBuilderState
} from "@/lib/server/workshop";
import Link from "next/link";

type WorkshopRootScreenProps = {
  session: Session;
  channelTitle: string;
  channelSynopsis: string;
  publishDraft: WorkshopPublishDraftState;
  publishValidation: WorkshopPublishValidationSummary;
  worldBuilder: WorkshopWorldBuilderState;
  worlds: World[];
  drops: Drop[];
  liveSessions: LiveSession[];
  liveSessionArtifacts: LiveSessionArtifact[];
  workshopProProfile: WorkshopProProfile | null;
  patronTierConfigs: PatronTierConfig[];
  worldReleaseQueue: WorldReleaseQueueItem[];
  moderationQueue: TownhallModerationQueueItem[];
  publishNotice: string | null;
  eventNotice: string | null;
  patronNotice: string | null;
  artifactNotice: string | null;
  proNotice: string | null;
  releaseNotice: string | null;
  versionNotice: string | null;
  derivativeNotice: string | null;
  moderationNotice: string | null;
  analyticsPanel: WorkshopAnalyticsPanel | null;
  validatePublishGateAction: (formData: FormData) => Promise<void>;
  createLiveSessionAction: (formData: FormData) => Promise<void>;
  captureLiveSessionArtifactAction: (formData: FormData) => Promise<void>;
  approveLiveSessionArtifactAction: (formData: FormData) => Promise<void>;
  transitionWorkshopProStateAction: (formData: FormData) => Promise<void>;
  upsertPatronTierConfigAction: (formData: FormData) => Promise<void>;
  createWorldReleaseAction: (formData: FormData) => Promise<void>;
  updateWorldReleaseStatusAction: (formData: FormData) => Promise<void>;
  createDropVersionAction: (formData: FormData) => Promise<void>;
  createAuthorizedDerivativeAction: (formData: FormData) => Promise<void>;
  resolveModerationAction: (formData: FormData) => Promise<void>;
  dropLineageByDropId: Record<string, DropLineageSnapshot>;
};

const DROP_VERSION_OPTIONS = ["v1", "v2", "v3", "director_cut", "remaster"] as const;
const DERIVATIVE_KIND_OPTIONS = [
  "remix",
  "translation",
  "anthology_world",
  "collaborative_season"
] as const;
const LIVE_SESSION_ARTIFACT_KIND_OPTIONS = ["highlight", "recording", "transcript"] as const;

function toPatronCadenceLabel(cadence: PatronTierConfig["commitmentCadence"]): string {
  if (cadence === "weekly") return "week";
  if (cadence === "quarterly") return "quarter";
  return "month";
}

export function WorkshopRootScreen({
  session,
  channelTitle,
  channelSynopsis,
  publishDraft,
  publishValidation,
  worldBuilder,
  worlds,
  drops,
  liveSessions,
  liveSessionArtifacts,
  workshopProProfile,
  patronTierConfigs,
  worldReleaseQueue,
  moderationQueue,
  publishNotice,
  eventNotice,
  patronNotice,
  artifactNotice,
  proNotice,
  releaseNotice,
  versionNotice,
  derivativeNotice,
  moderationNotice,
  analyticsPanel,
  validatePublishGateAction,
  createLiveSessionAction,
  captureLiveSessionArtifactAction,
  approveLiveSessionArtifactAction,
  transitionWorkshopProStateAction,
  upsertPatronTierConfigAction,
  createWorldReleaseAction,
  updateWorldReleaseStatusAction,
  createDropVersionAction,
  createAuthorizedDerivativeAction,
  dropLineageByDropId,
  resolveModerationAction
}: WorkshopRootScreenProps) {
  const worldTitleById = new Map(worlds.map((world) => [world.id, world.title]));
  const dropTitleById = new Map(drops.map((drop) => [drop.id, drop.title]));
  const liveSessionTitleById = new Map(liveSessions.map((liveSession) => [liveSession.id, liveSession.title]));

  return (
    <AppShell
      title="workshop"
      subtitle="creator workspace for drop lifecycle and publishing"
      session={session}
      activeNav="townhall"
    >
      <section className="slice-panel">
        <p className="slice-label">creator @{session.handle}</p>
        <h2 className="slice-title">{channelTitle}</h2>
        <p className="slice-copy">{channelSynopsis}</p>

        <dl className="slice-list">
          <div>
            <dt>linked worlds</dt>
            <dd>{worlds.length}</dd>
          </div>
          <div>
            <dt>published drops</dt>
            <dd>{drops.length}</dd>
          </div>
        </dl>

        <div className="slice-button-row">
          <Link href={routes.spaceSetup()} className="slice-button ghost">
            open space setup
          </Link>
          <Link href={routes.townhall()} className="slice-button alt">
            open townhall
          </Link>
        </div>
      </section>

      <section className="slice-panel" data-testid="workshop-publish-stepper">
        <p className="slice-label">publish stepper</p>
        <p className="slice-copy">
          publish requires complete culture, access, and economics sections. access requires visibility and
          preview policy.
        </p>
        {publishNotice ? (
          <p className="slice-banner" role="status" aria-live="polite">
            {publishNotice}
          </p>
        ) : null}

        <div className="slice-button-row">
          <Link href="/workshop?compose=drop" className="slice-button">
            create drop flow
          </Link>
          <Link href="/workshop?compose=world" className="slice-button alt">
            create world flow
          </Link>
          <Link href={routes.create()} className="slice-button ghost">
            open create
          </Link>
        </div>

        {publishDraft.compose === "drop" ? (
          <>
            <p className="slice-meta">active flow: create drop</p>
            <form
              action={validatePublishGateAction}
              className="slice-form"
              data-testid="workshop-publish-gate-form"
            >
              <input type="hidden" name="compose" value="drop" />
              <input
                type="hidden"
                name="world_visual_identity_complete"
                value={worldBuilder.visualIdentityComplete ? "1" : "0"}
              />
              <input
                type="hidden"
                name="world_lore_complete"
                value={worldBuilder.loreComplete ? "1" : "0"}
              />
              <input
                type="hidden"
                name="world_entry_rule_complete"
                value={worldBuilder.entryRuleComplete ? "1" : "0"}
              />

              <label className="slice-field">
                <span className="slice-meta">culture section complete</span>
                <input
                  type="checkbox"
                  name="culture_complete"
                  value="1"
                  defaultChecked={publishDraft.cultureComplete}
                />
              </label>

              <label className="slice-field">
                <span className="slice-meta">access section complete</span>
                <input
                  type="checkbox"
                  name="access_complete"
                  value="1"
                  defaultChecked={publishDraft.accessComplete}
                />
              </label>

              <label className="slice-field">
                visibility
                <select
                  name="visibility"
                  className="slice-select"
                  defaultValue={publishDraft.visibility}
                  data-testid="workshop-visibility-selector"
                >
                  {WORKSHOP_VISIBILITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option === "world_members"
                        ? "world members"
                        : option === "collectors_only"
                          ? "collectors"
                          : "public"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="slice-field">
                preview policy
                <select
                  name="preview_policy"
                  className="slice-select"
                  defaultValue={publishDraft.previewPolicy}
                  data-testid="workshop-preview-policy-selector"
                >
                  {WORKSHOP_PREVIEW_POLICY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="slice-field">
                <span className="slice-meta">economics section complete</span>
                <input
                  type="checkbox"
                  name="economics_complete"
                  value="1"
                  defaultChecked={publishDraft.economicsComplete}
                />
              </label>

              <label className="slice-field">
                collaborator splits
                <input
                  name="collaborator_splits"
                  className="slice-input"
                  defaultValue={publishDraft.collaboratorSplitsRaw || `${session.handle}:100`}
                  placeholder="oneofakinde:70, collaborator:30"
                />
              </label>

              <div className="slice-button-row">
                <button type="submit" className="slice-button">
                  validate publish gate
                </button>
              </div>
            </form>

            <div style={{ marginTop: 14 }}>
              <p className="slice-label">drop media</p>
              <MediaUploadZone
                bucket="drop-media"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,audio/mpeg,audio/mp4"
                maxFiles={8}
                label="drop cover, preview poster, or media files here"
                hint="jpeg, png, webp, mp4, webm, mp3 — up to 50 MB each"
              />
            </div>

            <ul className="slice-list" aria-label="publish gate summary">
              <li>
                <span>culture</span>
                <span>{publishDraft.cultureComplete ? "complete" : "missing"}</span>
              </li>
              <li>
                <span>access</span>
                <span>{publishDraft.accessComplete ? "complete" : "missing"}</span>
              </li>
              <li>
                <span>economics</span>
                <span>{publishDraft.economicsComplete ? "complete" : "missing"}</span>
              </li>
              <li>
                <span>collaborator split total</span>
                <span>
                  {publishValidation.collaboratorSplitsTotal === null
                    ? "invalid"
                    : `${publishValidation.collaboratorSplitsTotal}%`}
                </span>
              </li>
            </ul>

            {publishValidation.blockingReasons.length > 0 ? (
              <p className="slice-meta">
                blockers: {publishValidation.blockingReasons.join(" ")}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p className="slice-meta">active flow: create world</p>
            <form
              action={validatePublishGateAction}
              className="slice-form"
              data-testid="workshop-world-stepper-form"
            >
              <input type="hidden" name="compose" value="world" />
              <input type="hidden" name="culture_complete" value={publishDraft.cultureComplete ? "1" : "0"} />
              <input type="hidden" name="access_complete" value={publishDraft.accessComplete ? "1" : "0"} />
              <input
                type="hidden"
                name="economics_complete"
                value={publishDraft.economicsComplete ? "1" : "0"}
              />
              <input type="hidden" name="visibility" value={publishDraft.visibility} />
              <input type="hidden" name="preview_policy" value={publishDraft.previewPolicy} />
              <input type="hidden" name="collaborator_splits" value={publishDraft.collaboratorSplitsRaw} />

              <label className="slice-field">
                <span className="slice-meta">visual identity configured</span>
                <input
                  type="checkbox"
                  name="world_visual_identity_complete"
                  value="1"
                  defaultChecked={worldBuilder.visualIdentityComplete}
                />
              </label>

              <label className="slice-field">
                <span className="slice-meta">lore configured</span>
                <input
                  type="checkbox"
                  name="world_lore_complete"
                  value="1"
                  defaultChecked={worldBuilder.loreComplete}
                />
              </label>

              <label className="slice-field">
                <span className="slice-meta">entry rule configured</span>
                <input
                  type="checkbox"
                  name="world_entry_rule_complete"
                  value="1"
                  defaultChecked={worldBuilder.entryRuleComplete}
                />
              </label>

              <div className="slice-button-row">
                <button type="submit" className="slice-button">
                  update world builder
                </button>
                <Link href={routes.spaceSetup()} className="slice-button ghost">
                  open space setup
                </Link>
              </div>
            </form>

            <div style={{ marginTop: 14 }}>
              <p className="slice-label">world media</p>
              <MediaUploadZone
                bucket="world-media"
                accept="image/jpeg,image/png,image/webp,audio/mpeg,audio/mp4"
                maxFiles={4}
                label="world cover image or ambient audio here"
                hint="jpeg, png, webp, mp3 — up to 20 MB each"
              />
            </div>

            <ul className="slice-list" aria-label="world builder summary">
              <li>
                <span>visual identity</span>
                <span>{worldBuilder.visualIdentityComplete ? "complete" : "missing"}</span>
              </li>
              <li>
                <span>lore</span>
                <span>{worldBuilder.loreComplete ? "complete" : "missing"}</span>
              </li>
              <li>
                <span>entry rule</span>
                <span>{worldBuilder.entryRuleComplete ? "complete" : "missing"}</span>
              </li>
            </ul>
          </>
        )}
      </section>

      {analyticsPanel ? (
        <section className="slice-panel">
          <p className="slice-label">workshop analytics + payout summary</p>
          <p className="slice-copy">
            creator funnel and payout settlement are shown together so conversion and payout parity are audited in one view.
          </p>
          <div className="ops-kpi-grid">
            <article className="ops-kpi">
              <h3>{analyticsPanel.dropsPublished}</h3>
              <p>drops published</p>
            </article>
            <article className="ops-kpi">
              <h3>{analyticsPanel.discoveryImpressions}</h3>
              <p>discovery impressions</p>
            </article>
            <article className="ops-kpi">
              <h3>{analyticsPanel.previewStarts}</h3>
              <p>preview starts</p>
            </article>
            <article className="ops-kpi">
              <h3>{analyticsPanel.accessStarts}</h3>
              <p>access starts</p>
            </article>
            <article className="ops-kpi">
              <h3>{analyticsPanel.completions}</h3>
              <p>completions</p>
            </article>
            <article className="ops-kpi">
              <h3>{analyticsPanel.collectIntents}</h3>
              <p>collect intent</p>
            </article>
            <article className="ops-kpi">
              <h3>{analyticsPanel.completedCollects}</h3>
              <p>completed collects</p>
            </article>
            <article className="ops-kpi">
              <h3>{(analyticsPanel.collectConversionRate * 100).toFixed(1)}%</h3>
              <p>collect conversion</p>
            </article>
          </div>

          <ul className="slice-list" aria-label="workshop payout summary">
            <li>
              <span>completed payout receipts</span>
              <span>{analyticsPanel.payouts.completedReceipts}</span>
            </li>
            <li>
              <span>gross / processing / commission</span>
              <span>
                {formatUsd(analyticsPanel.payouts.grossUsd)} /{" "}
                {formatUsd(analyticsPanel.payouts.processingUsd)} /{" "}
                {formatUsd(analyticsPanel.payouts.commissionUsd)}
              </span>
            </li>
            <li>
              <span>receipt payout vs ledger payout</span>
              <span>
                {formatUsd(analyticsPanel.payouts.payoutUsd)} /{" "}
                {formatUsd(analyticsPanel.payouts.payoutLedgerUsd)}
              </span>
            </li>
            <li>
              <span>payout parity delta</span>
              <span>{formatUsd(analyticsPanel.payouts.payoutParityDeltaUsd)}</span>
            </li>
            <li>
              <span>ledger payout line items / recipients</span>
              <span>
                {analyticsPanel.payouts.payoutLedgerLineItems} / {analyticsPanel.payouts.payoutRecipients}
              </span>
            </li>
            <li>
              <span>missing ledger receipt links</span>
              <span>{analyticsPanel.payouts.missingLedgerReceiptCount}</span>
            </li>
          </ul>

          <p className="slice-meta">
            freshness timestamp: {new Date(analyticsPanel.freshnessTimestamp).toLocaleString()}
          </p>
        </section>
      ) : null}

      <section className="slice-panel">
        <p className="slice-label">workshop pro state</p>
        <p className="slice-copy">
          state machine rail: active → past due → grace → locked. creator tooling remains available in all states.
        </p>
        {proNotice ? (
          <p className="slice-banner" role="status" aria-live="polite">
            {proNotice}
          </p>
        ) : null}

        {workshopProProfile ? (
          <>
            <p className="slice-meta">
              current state: {workshopProProfile.state.replaceAll("_", " ")}
            </p>
            <ul className="slice-list" aria-label="workshop pro profile">
              <li>
                <span>cycle anchor</span>
                <span>{new Date(workshopProProfile.cycleAnchorAt).toLocaleString()}</span>
              </li>
              <li>
                <span>past due at</span>
                <span>
                  {workshopProProfile.pastDueAt
                    ? new Date(workshopProProfile.pastDueAt).toLocaleString()
                    : "not set"}
                </span>
              </li>
              <li>
                <span>grace ends at</span>
                <span>
                  {workshopProProfile.graceEndsAt
                    ? new Date(workshopProProfile.graceEndsAt).toLocaleString()
                    : "not set"}
                </span>
              </li>
              <li>
                <span>locked at</span>
                <span>
                  {workshopProProfile.lockedAt
                    ? new Date(workshopProProfile.lockedAt).toLocaleString()
                    : "not set"}
                </span>
              </li>
            </ul>
            <form action={transitionWorkshopProStateAction} className="slice-button-row">
              {workshopProProfile.state === "active" ? (
                <button type="submit" name="next_state" value="past_due" className="slice-button">
                  move to past due
                </button>
              ) : null}
              {workshopProProfile.state === "past_due" ? (
                <button type="submit" name="next_state" value="grace" className="slice-button">
                  move to grace
                </button>
              ) : null}
              {workshopProProfile.state === "grace" ? (
                <button type="submit" name="next_state" value="locked" className="slice-button">
                  move to locked
                </button>
              ) : null}
              {workshopProProfile.state !== "active" ? (
                <button type="submit" name="next_state" value="active" className="slice-button ghost">
                  recover to active
                </button>
              ) : null}
            </form>
          </>
        ) : (
          <p className="slice-meta">workshop pro profile unavailable for this creator session.</p>
        )}
      </section>

      <section className="slice-panel">
        <p className="slice-label">patron tier configuration</p>
        <p className="slice-copy">
          set studio and world patron terms. active configs are used for patron commitment settlement rails.
        </p>
        {patronNotice ? (
          <p className="slice-banner" role="status" aria-live="polite">
            {patronNotice}
          </p>
        ) : null}

        <form action={upsertPatronTierConfigAction} className="slice-form">
          <label className="slice-field">
            scope
            <select name="patron_world_id" className="slice-select" defaultValue="">
              <option value="">studio-wide</option>
              {worlds.map((world) => (
                <option key={world.id} value={world.id}>
                  {world.title}
                </option>
              ))}
            </select>
          </label>

          <label className="slice-field">
            tier title
            <input
              name="patron_title"
              className="slice-input"
              required
              placeholder="studio patron"
              defaultValue="studio patron"
            />
          </label>

          <label className="slice-field">
            amount (cents)
            <input
              name="patron_amount_cents"
              className="slice-input"
              required
              inputMode="numeric"
              pattern="[0-9]+"
              defaultValue="500"
            />
          </label>

          <label className="slice-field">
            commitment cadence
            <select
              name="patron_commitment_cadence"
              className="slice-select"
              defaultValue="monthly"
            >
              <option value="weekly">weekly (7 days)</option>
              <option value="monthly">monthly (30 days)</option>
              <option value="quarterly">quarterly (90 days)</option>
            </select>
          </label>

          <label className="slice-field">
            early-access window (hours)
            <input
              name="patron_early_access_window_hours"
              className="slice-input"
              required
              inputMode="numeric"
              pattern="[0-9]+"
              defaultValue="48"
            />
          </label>

          <label className="slice-field">
            benefits summary
            <input
              name="patron_benefits_summary"
              className="slice-input"
              placeholder="support lane with visibility and event access."
            />
          </label>

          <label className="slice-field">
            status
            <select name="patron_status" className="slice-select" defaultValue="active">
              <option value="active">active</option>
              <option value="disabled">disabled</option>
            </select>
          </label>

          <div className="slice-button-row">
            <button type="submit" className="slice-button">
              save patron tier
            </button>
          </div>
        </form>

        {patronTierConfigs.length === 0 ? (
          <p className="slice-meta">no patron tiers configured yet.</p>
        ) : (
          <ul className="slice-grid" aria-label="patron tiers">
            {patronTierConfigs.map((config) => (
              <li key={config.id} className="slice-drop-card">
                <p className="slice-label">
                  {config.worldId ? worldTitleById.get(config.worldId) ?? config.worldId : "studio-wide"}
                </p>
                <h2 className="slice-title">{config.title}</h2>
                <p className="slice-copy">{config.benefitsSummary || "no summary provided."}</p>
                <p className="slice-meta">
                  {formatUsd(config.amountCents / 100)} every{" "}
                  {toPatronCadenceLabel(config.commitmentCadence)} ({config.periodDays} days)
                </p>
                <p className="slice-meta">
                  early-access window: {config.earlyAccessWindowHours} hours
                </p>
                <p className="slice-meta">
                  status: {config.status} · updated {new Date(config.updatedAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="slice-panel">
        <p className="slice-label">create live session</p>
        <p className="slice-copy">
          sessions created here are discovered in collect gated events and enforce rule-based eligibility.
        </p>
        {eventNotice ? (
          <p className="slice-banner" role="status" aria-live="polite">
            {eventNotice}
          </p>
        ) : null}
        <form action={createLiveSessionAction} className="slice-form">
          <label className="slice-field">
            title
            <input
              name="title"
              className="slice-input"
              required
              placeholder="members salon: dark matter"
            />
          </label>

          <label className="slice-field">
            synopsis
            <input
              name="synopsis"
              className="slice-input"
              placeholder="session notes and outcomes for eligible collectors."
            />
          </label>

          <label className="slice-field">
            world scope
            <select name="world_id" className="slice-select" defaultValue="">
              <option value="">studio-wide</option>
              {worlds.map((world) => (
                <option key={world.id} value={world.id}>
                  {world.title}
                </option>
              ))}
            </select>
          </label>

          <label className="slice-field">
            drop scope (optional)
            <select name="drop_id" className="slice-select" defaultValue="">
              <option value="">none</option>
              {drops.map((drop) => (
                <option key={drop.id} value={drop.id}>
                  {drop.title}
                </option>
              ))}
            </select>
          </label>

          <label className="slice-field">
            starts at
            <input type="datetime-local" name="starts_at" className="slice-input" required />
          </label>

          <label className="slice-field">
            ends at (optional)
            <input type="datetime-local" name="ends_at" className="slice-input" />
          </label>

          <label className="slice-field">
            eligibility rule
            <select name="eligibility_rule" className="slice-select" defaultValue="membership_active">
              <option value="public">public</option>
              <option value="membership_active">membership active</option>
              <option value="drop_owner">drop owner</option>
            </select>
          </label>

          <label className="slice-field">
            session type
            <select name="session_type" className="slice-select" defaultValue="event">
              <option value="opening">opening</option>
              <option value="event">event</option>
              <option value="studio_session">studio session</option>
            </select>
          </label>

          <label className="slice-field">
            capacity
            <input
              name="capacity"
              className="slice-input"
              inputMode="numeric"
              pattern="[0-9]+"
              defaultValue="200"
            />
          </label>

          <label className="slice-field">
            <span className="slice-meta">enable spatial audio</span>
            <input type="checkbox" name="spatial_audio" value="1" />
          </label>

          <div className="slice-button-row">
            <button type="submit" className="slice-button">
              create live session
            </button>
            <Link href={routes.collect()} className="slice-button ghost">
              open collect gated events
            </Link>
          </div>
        </form>
      </section>

      <section className="slice-panel">
        <p className="slice-label">workshop-created live sessions</p>
        {liveSessions.length === 0 ? (
          <p className="slice-copy">
            no live sessions yet. create one above to publish discovery into collect.
          </p>
        ) : (
          <ul className="slice-grid" aria-label="workshop live session list">
            {liveSessions.map((liveSession) => (
              <li key={liveSession.id} className="slice-drop-card">
                <p className="slice-label">{liveSession.studioHandle}</p>
                <h2 className="slice-title">{liveSession.title}</h2>
                <p className="slice-copy">{liveSession.synopsis || "no synopsis provided."}</p>
                <p className="slice-meta">
                  starts {new Date(liveSession.startsAt).toLocaleString()}
                  {liveSession.endsAt
                    ? ` · ends ${new Date(liveSession.endsAt).toLocaleString()}`
                    : " · no end date"}
                </p>
                <p className="slice-meta">
                  rule: {liveSession.eligibilityRule.replaceAll("_", " ")}
                  {liveSession.worldId
                    ? ` · world: ${worldTitleById.get(liveSession.worldId) ?? liveSession.worldId}`
                    : " · world: studio-wide"}
                </p>
                <p className="slice-meta">
                  type: {(liveSession.type ?? "event").replaceAll("_", " ")} · capacity:{" "}
                  {liveSession.capacity ?? 200}
                  {liveSession.spatialAudio ? " · spatial audio on" : " · spatial audio off"}
                </p>
                <p className="slice-meta">
                  drop: {liveSession.dropId ? dropTitleById.get(liveSession.dropId) ?? liveSession.dropId : "none"}
                </p>
                <div className="slice-button-row">
                  <Link href={routes.collect()} className="slice-button alt">
                    view in collect
                  </Link>
                  <Link href={routes.liveHub()} className="slice-button ghost">
                    open live
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="slice-panel">
        <p className="slice-label">live session artifacts</p>
        <p className="slice-copy">
          capture live-session outcomes as review-held artifacts, then approve to promote as public catalog drops.
        </p>
        {artifactNotice ? (
          <p className="slice-banner" role="status" aria-live="polite">
            {artifactNotice}
          </p>
        ) : null}
        <form action={captureLiveSessionArtifactAction} className="slice-form">
          <label className="slice-field">
            live session
            <select
              name="live_session_id"
              className="slice-select"
              defaultValue={liveSessions[0]?.id ?? ""}
              required
            >
              {liveSessions.map((liveSession) => (
                <option key={liveSession.id} value={liveSession.id}>
                  {liveSession.title}
                </option>
              ))}
            </select>
          </label>

          <label className="slice-field">
            artifact kind
            <select name="artifact_kind" className="slice-select" defaultValue="highlight">
              {LIVE_SESSION_ARTIFACT_KIND_OPTIONS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </label>

          <label className="slice-field">
            artifact title
            <input
              name="artifact_title"
              className="slice-input"
              required
              placeholder="post-session artifact title"
            />
          </label>

          <label className="slice-field">
            artifact synopsis
            <input
              name="artifact_synopsis"
              className="slice-input"
              placeholder="what happened in session and what shipped."
            />
          </label>

          <label className="slice-field">
            world scope (optional)
            <select name="artifact_world_id" className="slice-select" defaultValue="">
              <option value="">derive from session/source drop</option>
              {worlds.map((world) => (
                <option key={world.id} value={world.id}>
                  {world.title}
                </option>
              ))}
            </select>
          </label>

          <label className="slice-field">
            source drop (optional)
            <select name="artifact_source_drop_id" className="slice-select" defaultValue="">
              <option value="">derive from session</option>
              {drops.map((drop) => (
                <option key={drop.id} value={drop.id}>
                  {drop.title}
                </option>
              ))}
            </select>
          </label>

          <div className="slice-button-row">
            <button type="submit" className="slice-button" disabled={liveSessions.length === 0}>
              capture artifact
            </button>
          </div>
        </form>

        {liveSessionArtifacts.length === 0 ? (
          <p className="slice-meta">no artifacts captured yet.</p>
        ) : (
          <ul className="slice-grid" aria-label="live session artifacts">
            {liveSessionArtifacts.map((artifact) => (
              <li key={artifact.id} className="slice-drop-card">
                <p className="slice-label">
                  {artifact.status === "held_for_review" ? "held for review" : "approved"}
                </p>
                <h2 className="slice-title">{artifact.title}</h2>
                <p className="slice-meta">kind: {artifact.artifactKind}</p>
                <p className="slice-copy">{artifact.synopsis || "no synopsis provided."}</p>
                <p className="slice-meta">
                  session:{" "}
                  {liveSessionTitleById.get(artifact.liveSessionId) ?? artifact.liveSessionId}
                </p>
                <p className="slice-meta">
                  world:{" "}
                  {artifact.worldId
                    ? worldTitleById.get(artifact.worldId) ?? artifact.worldId
                    : "not set"}
                  {artifact.sourceDropId
                    ? ` · source drop: ${dropTitleById.get(artifact.sourceDropId) ?? artifact.sourceDropId}`
                    : ""}
                </p>
                <p className="slice-meta">
                  captured {new Date(artifact.capturedAt).toLocaleString()}
                  {artifact.approvedAt
                    ? ` · approved ${new Date(artifact.approvedAt).toLocaleString()}`
                    : ""}
                </p>
                {artifact.catalogDropId ? (
                  <p className="slice-meta">
                    catalog drop: {dropTitleById.get(artifact.catalogDropId) ?? artifact.catalogDropId}
                  </p>
                ) : null}
                {artifact.status === "held_for_review" ? (
                  <form action={approveLiveSessionArtifactAction} className="slice-button-row">
                    <input type="hidden" name="artifact_id" value={artifact.id} />
                    <button type="submit" className="slice-button">
                      approve to catalog
                    </button>
                  </form>
                ) : (
                  <div className="slice-button-row">
                    {artifact.catalogDropId ? (
                      <Link href={routes.drop(artifact.catalogDropId)} className="slice-button alt">
                        open approved drop
                      </Link>
                    ) : null}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="slice-panel">
        <p className="slice-label">world release queue</p>
        <p className="slice-copy">
          schedule world drops with pacing rails. queue spacing enforces manual, daily, or weekly cadence.
        </p>
        {releaseNotice ? (
          <p className="slice-banner" role="status" aria-live="polite">
            {releaseNotice}
          </p>
        ) : null}
        <form action={createWorldReleaseAction} className="slice-form">
          <label className="slice-field">
            world
            <select name="world_id" className="slice-select" defaultValue={worlds[0]?.id ?? ""} required>
              {worlds.map((world) => (
                <option key={world.id} value={world.id}>
                  {world.title}
                </option>
              ))}
            </select>
          </label>

          <label className="slice-field">
            drop
            <select name="drop_id" className="slice-select" defaultValue={drops[0]?.id ?? ""} required>
              {drops.map((drop) => (
                <option key={drop.id} value={drop.id}>
                  {drop.title} ({drop.worldLabel})
                </option>
              ))}
            </select>
          </label>

          <label className="slice-field">
            scheduled for
            <input type="datetime-local" name="scheduled_for" className="slice-input" required />
          </label>

          <label className="slice-field">
            pacing mode
            <select name="pacing_mode" className="slice-select" defaultValue="weekly">
              <option value="manual">manual</option>
              <option value="daily">daily</option>
              <option value="weekly">weekly</option>
            </select>
          </label>

          <div className="slice-button-row">
            <button type="submit" className="slice-button">
              schedule release
            </button>
            <Link href={routes.worlds()} className="slice-button ghost">
              open worlds
            </Link>
          </div>
        </form>

        {worldReleaseQueue.length === 0 ? (
          <p className="slice-meta">no queued world releases yet.</p>
        ) : (
          <ul className="slice-grid" aria-label="world release queue">
            {worldReleaseQueue.map((release) => (
              <li key={release.id} className="slice-drop-card">
                <p className="slice-label">
                  {worldTitleById.get(release.worldId) ?? release.worldId} · {release.status}
                </p>
                <h2 className="slice-title">{dropTitleById.get(release.dropId) ?? release.dropId}</h2>
                <p className="slice-meta">
                  scheduled {new Date(release.scheduledFor).toLocaleString()} · pacing {release.pacingMode} (
                  {release.pacingWindowHours}h)
                </p>
                {release.publishedAt ? (
                  <p className="slice-meta">published {new Date(release.publishedAt).toLocaleString()}</p>
                ) : null}
                {release.canceledAt ? (
                  <p className="slice-meta">canceled {new Date(release.canceledAt).toLocaleString()}</p>
                ) : null}
                {release.status === "scheduled" ? (
                  <form action={updateWorldReleaseStatusAction} className="slice-button-row">
                    <input type="hidden" name="release_id" value={release.id} />
                    <button type="submit" name="status" value="published" className="slice-button">
                      mark published
                    </button>
                    <button type="submit" name="status" value="canceled" className="slice-button ghost">
                      cancel
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="slice-panel">
        <p className="slice-label">townhall moderation queue</p>
        {moderationNotice ? (
          <p className="slice-banner" role="status" aria-live="polite">
            {moderationNotice}
          </p>
        ) : null}
        {moderationQueue.length === 0 ? (
          <p className="slice-copy">
            no moderation cases are waiting. reports and creator appeals will appear here.
          </p>
        ) : (
          <ul className="slice-grid" aria-label="townhall moderation queue">
            {moderationQueue.map((entry) => (
              <li key={entry.commentId} className="slice-drop-card">
                <p className="slice-label">{entry.dropTitle}</p>
                <h2 className="slice-title">@{entry.authorHandle}</h2>
                <p className="slice-copy">{entry.body}</p>
                <p className="slice-meta">
                  reports: {entry.reportCount}
                  {entry.appealRequested ? " · appeal requested" : ""}
                </p>
                <p className="slice-meta">
                  {entry.visibility} · created{" "}
                  {new Date(entry.createdAt).toLocaleString()}
                </p>
                {entry.reportedAt ? (
                  <p className="slice-meta">last report {new Date(entry.reportedAt).toLocaleString()}</p>
                ) : null}
                {entry.appealRequestedAt ? (
                  <p className="slice-meta">
                    appeal requested {new Date(entry.appealRequestedAt).toLocaleString()}
                  </p>
                ) : null}
                <form action={resolveModerationAction} className="slice-button-row">
                  <input type="hidden" name="drop_id" value={entry.dropId} />
                  <input type="hidden" name="comment_id" value={entry.commentId} />
                  {entry.visibility !== "visible" ? (
                    <button type="submit" name="resolution" value="restore" className="slice-button">
                      restore comment
                    </button>
                  ) : null}
                  {entry.visibility !== "hidden" ? (
                    <button type="submit" name="resolution" value="hide" className="slice-button">
                      hide comment
                    </button>
                  ) : null}
                  {entry.visibility !== "restricted" ? (
                    <button type="submit" name="resolution" value="restrict" className="slice-button">
                      restrict comment
                    </button>
                  ) : null}
                  {entry.visibility !== "deleted" ? (
                    <button type="submit" name="resolution" value="delete" className="slice-button">
                      delete comment
                    </button>
                  ) : null}
                  <button type="submit" name="resolution" value="dismiss" className="slice-button ghost">
                    dismiss reports
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="slice-panel">
        <p className="slice-label">worlds</p>
        {worlds.length === 0 ? (
          <p className="slice-copy">
            no linked worlds were found for this creator account yet.
          </p>
        ) : (
          <ul className="slice-world-grid" aria-label="workshop world list">
            {worlds.map((world) => (
              <li key={world.id} className="slice-world-card">
                <h2 className="slice-title">{world.title}</h2>
                <p className="slice-copy">{world.synopsis}</p>
                <div className="slice-button-row">
                  <Link href={routes.world(world.id)} className="slice-button ghost">
                    open world
                  </Link>
                  <Link href={routes.worldDrops(world.id)} className="slice-button alt">
                    open drops
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="slice-panel">
        <p className="slice-label">drops</p>
        {versionNotice ? (
          <p className="slice-banner" role="status" aria-live="polite">
            {versionNotice}
          </p>
        ) : null}
        {derivativeNotice ? (
          <p className="slice-banner" role="status" aria-live="polite">
            {derivativeNotice}
          </p>
        ) : null}
        {drops.length === 0 ? (
          <p className="slice-copy">
            no drops have been published yet for this creator account.
          </p>
        ) : (
          <ul className="slice-grid" aria-label="workshop drop list" data-testid="workshop-lineage-panel">
            {drops.map((drop) => (
              <li key={drop.id} className="slice-drop-card" data-testid={`workshop-drop-lineage-${drop.id}`}>
                {(() => {
                  const lineage = dropLineageByDropId[drop.id] ?? {
                    dropId: drop.id,
                    versions: [],
                    derivatives: []
                  };
                  const derivativeTargets = drops.filter((candidate) => candidate.id !== drop.id);

                  return (
                    <>
                      <p className="slice-label">{drop.worldLabel}</p>
                      <h2 className="slice-title">{drop.title}</h2>
                      <p className="slice-copy">{drop.synopsis}</p>
                      <p className="slice-meta">{formatUsd(drop.priceUsd)}</p>
                      <p className="slice-meta">
                        versions {lineage.versions.length} · derivatives {lineage.derivatives.length}
                      </p>
                      <div className="slice-button-row">
                        <Link href={routes.drop(drop.id)} className="slice-button ghost">
                          open drop
                        </Link>
                        <Link href={routes.dropDetails(drop.id)} className="slice-button alt">
                          details
                        </Link>
                        <Link href={routes.dropActivity(drop.id)} className="slice-button alt">
                          activity
                        </Link>
                      </div>

                      <details>
                        <summary className="slice-meta">create version</summary>
                        <form action={createDropVersionAction} className="slice-form">
                          <input type="hidden" name="drop_id" value={drop.id} />
                          <label className="slice-field">
                            version label
                            <select name="label" className="slice-select" defaultValue="v2" required>
                              {DROP_VERSION_OPTIONS.map((label) => (
                                <option key={label} value={label}>
                                  {label.replaceAll("_", " ")}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="slice-field">
                            notes
                            <input
                              name="notes"
                              className="slice-input"
                              placeholder="change log for this version"
                            />
                          </label>
                          <label className="slice-field">
                            released at (optional)
                            <input name="released_at" className="slice-input" placeholder="2026-03-10T20:00:00Z" />
                          </label>
                          <div className="slice-button-row">
                            <button type="submit" className="slice-button">
                              create version
                            </button>
                          </div>
                        </form>
                      </details>

                      <details>
                        <summary className="slice-meta">authorize derivative</summary>
                        <form action={createAuthorizedDerivativeAction} className="slice-form">
                          <input type="hidden" name="source_drop_id" value={drop.id} />
                          <label className="slice-field">
                            derivative target
                            <select name="derivative_drop_id" className="slice-select" defaultValue="" required>
                              <option value="" disabled>
                                choose target drop
                              </option>
                              {derivativeTargets.map((candidate) => (
                                <option key={candidate.id} value={candidate.id}>
                                  {candidate.title}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="slice-field">
                            derivative kind
                            <select name="kind" className="slice-select" defaultValue="remix" required>
                              {DERIVATIVE_KIND_OPTIONS.map((kind) => (
                                <option key={kind} value={kind}>
                                  {kind.replaceAll("_", " ")}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="slice-field">
                            attribution
                            <input
                              name="attribution"
                              className="slice-input"
                              required
                              placeholder="credited derivative lineage statement"
                            />
                          </label>
                          <label className="slice-field">
                            revenue splits
                            <input
                              name="revenue_splits"
                              className="slice-input"
                              required
                              placeholder="oneofakinde:70, collaborator:30"
                            />
                          </label>
                          <div className="slice-button-row">
                            <button type="submit" className="slice-button">
                              authorize derivative
                            </button>
                          </div>
                        </form>
                      </details>

                      <details open={lineage.versions.length > 0}>
                        <summary className="slice-meta">version timeline</summary>
                        {lineage.versions.length === 0 ? (
                          <p className="slice-meta">no versions recorded yet.</p>
                        ) : (
                          <ul className="slice-list" aria-label={`${drop.title} versions`}>
                            {lineage.versions.map((version) => (
                              <li key={version.id}>
                                <span>{version.label.replaceAll("_", " ")}</span>
                                <span>{new Date(version.createdAt).toLocaleString()}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </details>

                      <details open={lineage.derivatives.length > 0}>
                        <summary className="slice-meta">authorized derivatives</summary>
                        {lineage.derivatives.length === 0 ? (
                          <p className="slice-meta">no derivatives authorized yet.</p>
                        ) : (
                          <ul className="slice-list" aria-label={`${drop.title} derivatives`}>
                            {lineage.derivatives.map((derivative) => (
                              <li key={derivative.id}>
                                <span>
                                  {derivative.kind.replaceAll("_", " ")} · {dropTitleById.get(derivative.derivativeDropId) ?? derivative.derivativeDropId}
                                </span>
                                <span>
                                  {derivative.revenueSplits
                                    .map((entry) => `${entry.recipientHandle}:${entry.sharePercent}%`)
                                    .join(" · ")}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </details>
                    </>
                  );
                })()}
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
