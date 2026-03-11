import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import type {
  Drop,
  DropLineageSnapshot,
  LiveSession,
  PatronTierConfig,
  Session,
  TownhallModerationQueueItem,
  WorkshopAnalyticsPanel,
  WorldReleaseQueueItem,
  World
} from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type WorkshopRootScreenProps = {
  session: Session;
  channelTitle: string;
  channelSynopsis: string;
  worlds: World[];
  drops: Drop[];
  liveSessions: LiveSession[];
  patronTierConfigs: PatronTierConfig[];
  worldReleaseQueue: WorldReleaseQueueItem[];
  moderationQueue: TownhallModerationQueueItem[];
  eventNotice: string | null;
  patronNotice: string | null;
  releaseNotice: string | null;
  versionNotice: string | null;
  derivativeNotice: string | null;
  moderationNotice: string | null;
  analyticsPanel: WorkshopAnalyticsPanel | null;
  createLiveSessionAction: (formData: FormData) => Promise<void>;
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

export function WorkshopRootScreen({
  session,
  channelTitle,
  channelSynopsis,
  worlds,
  drops,
  liveSessions,
  patronTierConfigs,
  worldReleaseQueue,
  moderationQueue,
  eventNotice,
  patronNotice,
  releaseNotice,
  versionNotice,
  derivativeNotice,
  moderationNotice,
  analyticsPanel,
  createLiveSessionAction,
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

      {analyticsPanel ? (
        <section className="slice-panel">
          <p className="slice-label">workshop analytics v0</p>
          <div className="ops-kpi-grid">
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
          <p className="slice-meta">updated {new Date(analyticsPanel.updatedAt).toLocaleString()}</p>
        </section>
      ) : null}

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
            period (days)
            <input
              name="patron_period_days"
              className="slice-input"
              required
              inputMode="numeric"
              pattern="[0-9]+"
              defaultValue="30"
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
                  {formatUsd(config.amountCents / 100)} every {config.periodDays} days
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
