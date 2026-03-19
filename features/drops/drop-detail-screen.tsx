import type { UrlObject } from "url";
import { formatUsd } from "@/features/shared/format";
import type { DropLineageSnapshot, Drop, Session } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type DropDetailScreenProps = {
  backHref?: UrlObject;
  lineage?: DropLineageSnapshot | null;
  drop: Drop;
  session: Session | null;
};

const PRICE_HISTORY = [18, 22, 19, 24, 26, 28, 31, 29, 34, 36, 39, 42];

function formatDropVisibility(drop: Drop): string {
  if (!drop.visibility) {
    return "inherit world default";
  }

  const label =
    drop.visibility === "public"
      ? "public"
      : drop.visibility === "world_members"
        ? "world members"
        : "collectors only";

  if (!drop.visibilitySource) {
    return label;
  }

  return drop.visibilitySource === "world_default"
    ? `${label} (world default)`
    : `${label} (drop override)`;
}

function formatPreviewPolicy(policy: Drop["previewPolicy"]): string {
  if (policy === "full") return "full preview";
  if (policy === "limited") return "limited preview";
  if (policy === "poster") return "poster-only preview";
  return "inherit world preview policy";
}

export function DropDetailScreen({
  drop,
  session,
  backHref,
  lineage
}: DropDetailScreenProps) {
  const collectHref = session
    ? routes.collectDrop(drop.id)
    : routes.signIn(routes.collectDrop(drop.id));
  const watchHref = session ? routes.dropWatch(drop.id) : routes.signIn(routes.dropWatch(drop.id));
  const libraryHref = session ? routes.library() : routes.signIn(routes.library());

  return (
    <main className="dropflow-page">
      <section className="dropflow-phone-shell" aria-label="drop detail surface">
        <header className="dropflow-header">
          <Link href={backHref ?? routes.townhall()} className="dropflow-icon-link" aria-label="back to townhall">
            ←
          </Link>
          <p className="dropflow-brand">oneofakinde</p>
          <Link href={routes.townhallSearch()} className="dropflow-icon-link" aria-label="search in townhall">
            ⌕
          </Link>
        </header>

        <section className="dropflow-stage">
          <div className="dropflow-backdrop" />
          <div className="dropflow-overlay" />

          <aside className="dropflow-social-rail" aria-label="drop social actions">
            <button type="button" className="dropflow-social-action" disabled>
              ♡
            </button>
            <button type="button" className="dropflow-social-action" disabled>
              ◈
            </button>
            <button type="button" className="dropflow-social-action" disabled>
              ➤
            </button>
          </aside>

          <div className="dropflow-content">
            <p className="dropflow-meta">@{drop.studioHandle} · {formatUsd(drop.priceUsd)}</p>
            <h1 className="dropflow-title">{drop.title}</h1>
            <p className="dropflow-subtitle">
              {drop.seasonLabel} · {drop.episodeLabel}
            </p>
            <p className="dropflow-synopsis">{drop.synopsis}</p>
            <p className="dropflow-meta">{drop.releaseDate} · {drop.worldLabel}</p>

            <div className="dropflow-cta-row">
              <Link href={collectHref} className="dropflow-primary-cta">
                collect
              </Link>
              <Link href={watchHref} className="dropflow-secondary-cta">
                watch
              </Link>
              <Link href={libraryHref} className="dropflow-secondary-cta">
                save to library
              </Link>
            </div>
          </div>
        </section>

        <nav className="dropflow-tabs" aria-label="drop sections">
          <Link href={routes.dropDetails(drop.id)} className="dropflow-tab active">
            details
          </Link>
          <Link href={routes.dropProperties(drop.id)} className="dropflow-tab">
            properties
          </Link>
          <Link href={routes.dropOffers(drop.id)} className="dropflow-tab">
            offers
          </Link>
          <Link href={routes.dropActivity(drop.id)} className="dropflow-tab">
            activity
          </Link>
        </nav>

        <section className="dropflow-panel" aria-label="drop insight panel">
          <div className="dropflow-panel-head">
            <p>price history</p>
            <span>last 6 months</span>
          </div>
          <div className="dropflow-chart" role="img" aria-label="price history graph">
            {PRICE_HISTORY.map((point, index) => (
              <span key={`${point}-${index}`} style={{ height: `${point + 18}%` }} />
            ))}
          </div>

          <dl className="dropflow-metadata-grid">
            <div>
              <dt>world</dt>
              <dd>
                <Link href={routes.world(drop.worldId)}>{drop.worldLabel}</Link>
              </dd>
            </div>
            <div>
              <dt>studio</dt>
              <dd>
                <Link href={routes.studio(drop.studioHandle)}>@{drop.studioHandle}</Link>
              </dd>
            </div>
            <div>
              <dt>mode access</dt>
              <dd>watch · listen · read · photos</dd>
            </div>
            <div data-testid="drop-visibility-row">
              <dt>visibility</dt>
              <dd>{formatDropVisibility(drop)}</dd>
            </div>
            <div data-testid="drop-preview-policy-row">
              <dt>preview policy</dt>
              <dd>{formatPreviewPolicy(drop.previewPolicy)}</dd>
            </div>
            <div>
              <dt>certificate</dt>
              <dd>issued on purchase</dd>
            </div>
          </dl>

          {lineage ? (
            <section className="dropflow-lineage-panel" data-testid="drop-lineage-panel" aria-label="drop lineage panel">
              <div className="dropflow-panel-head">
                <p>lineage</p>
                <span>public record</span>
              </div>

              <dl className="dropflow-metadata-grid">
                <div>
                  <dt>root drop</dt>
                  <dd>{(lineage as { rootDropTitle?: string; rootDropId?: string }).rootDropTitle ?? (lineage as { rootDropId?: string }).rootDropId ?? "—"}</dd>
                </div>
                <div>
                  <dt>parent drop</dt>
                  <dd>{(lineage as { parentDropTitle?: string; parentDropId?: string }).parentDropTitle ?? (lineage as { parentDropId?: string }).parentDropId ?? "—"}</dd>
                </div>
                <div>
                  <dt>edition depth</dt>
                  <dd>{String((lineage as { editionDepth?: number; depth?: number }).editionDepth ?? (lineage as { depth?: number }).depth ?? 0)}</dd>
                </div>
                <div>
                  <dt>authorized derivatives</dt>
                  <dd>{String(lineage.derivatives?.length ?? 0)}</dd>
                </div>
              </dl>
            </section>
          ) : null}
        </section>
      </section>

      <aside className="dropflow-side-notes" aria-label="drop context notes">
        <details open data-testid="drop-canonical-info-drawer">
          <summary>canonical info drawer</summary>
          <h2>{drop.title}</h2>
          <p>drop detail is now modeled as a high-visibility conversion surface.</p>
          <p>default actions: collect, watch path, and save-to-library.</p>
          <dl className="dropflow-metadata-grid">
            <div>
              <dt>visibility rail</dt>
              <dd>{formatDropVisibility(drop)}</dd>
            </div>
            <div>
              <dt>preview rail</dt>
              <dd>{formatPreviewPolicy(drop.previewPolicy)}</dd>
            </div>
            <div>
              <dt>collect gate</dt>
              <dd>{session ? "collector session active" : "sign in required for collect actions"}</dd>
            </div>
          </dl>
        </details>
      </aside>
    </main>
  );
}
