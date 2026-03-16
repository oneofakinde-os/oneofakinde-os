import { formatUsd } from "@/features/shared/format";
import type { Drop, Session } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type DropDetailScreenProps = {
  drop: Drop;
  session: Session | null;
};

const PRICE_HISTORY = [18, 22, 19, 24, 26, 28, 31, 29, 34, 36, 39, 42];

export function DropDetailScreen({ drop, session }: DropDetailScreenProps) {
  const collectHref = session
    ? routes.collectDrop(drop.id)
    : routes.signIn(routes.collectDrop(drop.id));
  const watchHref = session ? routes.dropWatch(drop.id) : routes.signIn(routes.dropWatch(drop.id));
  const favoritesHref = session ? routes.favorites() : routes.signIn(routes.favorites());

  return (
    <main className="dropflow-page">
      <section className="dropflow-phone-shell" aria-label="drop detail surface">
        <header className="dropflow-header">
          <Link href={routes.townhall()} className="dropflow-icon-link" aria-label="back to townhall">
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
              <Link href={favoritesHref} className="dropflow-secondary-cta">
                add to favorites
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
            <div>
              <dt>certificate</dt>
              <dd>issued on purchase</dd>
            </div>
          </dl>
        </section>
      </section>

      <aside className="dropflow-side-notes" aria-label="drop context notes">
        <h2>{drop.title}</h2>
        <p>drop detail is now modeled as a high-visibility conversion surface.</p>
        <p>default actions: collect, watch path, and save-to-favorites.</p>
      </aside>
    </main>
  );
}
