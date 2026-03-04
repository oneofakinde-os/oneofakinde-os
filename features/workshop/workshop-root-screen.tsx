import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import type {
  Drop,
  LiveSession,
  Session,
  TownhallModerationQueueItem,
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
  worldReleaseQueue: WorldReleaseQueueItem[];
  moderationQueue: TownhallModerationQueueItem[];
  eventNotice: string | null;
  releaseNotice: string | null;
  moderationNotice: string | null;
  createLiveSessionAction: (formData: FormData) => Promise<void>;
  createWorldReleaseAction: (formData: FormData) => Promise<void>;
  updateWorldReleaseStatusAction: (formData: FormData) => Promise<void>;
  resolveModerationAction: (formData: FormData) => Promise<void>;
};

export function WorkshopRootScreen({
  session,
  channelTitle,
  channelSynopsis,
  worlds,
  drops,
  liveSessions,
  worldReleaseQueue,
  moderationQueue,
  eventNotice,
  releaseNotice,
  moderationNotice,
  createLiveSessionAction,
  createWorldReleaseAction,
  updateWorldReleaseStatusAction,
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
        {drops.length === 0 ? (
          <p className="slice-copy">
            no drops have been published yet for this creator account.
          </p>
        ) : (
          <ul className="slice-grid" aria-label="workshop drop list">
            {drops.map((drop) => (
              <li key={drop.id} className="slice-drop-card">
                <p className="slice-label">{drop.worldLabel}</p>
                <h2 className="slice-title">{drop.title}</h2>
                <p className="slice-copy">{drop.synopsis}</p>
                <p className="slice-meta">{formatUsd(drop.priceUsd)}</p>
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
