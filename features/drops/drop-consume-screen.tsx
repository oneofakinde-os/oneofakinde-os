import { formatUsd } from "@/features/shared/format";
import type { Certificate, Drop, PurchaseReceipt, Session } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type ConsumeMode = "watch" | "listen" | "read" | "photos";

type DropConsumeScreenProps = {
  mode: ConsumeMode;
  session: Session;
  drop: Drop;
  hasEntitlement: boolean;
  receipt: PurchaseReceipt | null;
  certificate: Certificate | null;
};

const MODE_COPY: Record<ConsumeMode, { title: string; intro: string; active: string }> = {
  watch: {
    title: "watch",
    intro: "watch mode is unlocked for this drop.",
    active: "now watching"
  },
  listen: {
    title: "listen",
    intro: "listen mode is unlocked for this drop.",
    active: "now listening"
  },
  read: {
    title: "read",
    intro: "read mode is unlocked for this drop.",
    active: "now reading"
  },
  photos: {
    title: "photos",
    intro: "photos mode is unlocked for this drop.",
    active: "now viewing photos for"
  }
};

function modeHref(mode: ConsumeMode, dropId: string): ReturnType<typeof routes.dropWatch> {
  if (mode === "watch") return routes.dropWatch(dropId);
  if (mode === "listen") return routes.dropListen(dropId);
  if (mode === "read") return routes.dropRead(dropId);
  return routes.dropPhotos(dropId);
}

function modeClass(active: boolean): string {
  return `dropmedia-mode-link ${active ? "active" : ""}`;
}

export function DropConsumeScreen({
  mode,
  session,
  drop,
  hasEntitlement,
  receipt,
  certificate
}: DropConsumeScreenProps) {
  const copy = MODE_COPY[mode];
  const collectHref = routes.collectDrop(drop.id);

  return (
    <main className="dropmedia-page">
      <section className="dropmedia-phone-shell" aria-label={`${copy.title} mode`}>
        <header className="dropmedia-header">
          <Link href={routes.drop(drop.id)} className="dropmedia-icon-link" aria-label="back to drop">
            ←
          </Link>
          <p className="dropmedia-brand">oneofakinde</p>
          <Link href={routes.townhall()} className="dropmedia-icon-link" aria-label="open townhall">
            ⌕
          </Link>
        </header>

        {!hasEntitlement ? (
          <section className="dropmedia-paywall" aria-label="entitlement required">
            <p className="dropmedia-paywall-label">access required</p>
            <h1 className="dropmedia-paywall-title">collect this drop to unlock {copy.title}</h1>
            <p className="dropmedia-paywall-copy">
              collect once and this mode opens with receipt + certificate coverage.
            </p>
            <div className="dropmedia-paywall-actions">
              <Link href={collectHref} className="dropmedia-primary-cta">
                collect {formatUsd(drop.priceUsd)}
              </Link>
              <Link href={routes.drop(drop.id)} className="dropmedia-secondary-cta">
                open drop
              </Link>
            </div>
          </section>
        ) : (
          <>
            <section className="dropmedia-stage" aria-label="active consume stage">
              <div className="dropmedia-backdrop" />
              <div className="dropmedia-overlay" />

              <aside className="dropmedia-social-rail" aria-label="social interactions">
                <button type="button" className="dropmedia-social-action" disabled>
                  ♡
                </button>
                <button type="button" className="dropmedia-social-action" disabled>
                  ◈
                </button>
                <button type="button" className="dropmedia-social-action" disabled>
                  ➤
                </button>
                <button type="button" className="dropmedia-social-action" disabled>
                  +
                </button>
              </aside>

              <div className="dropmedia-content">
                <p className="dropmedia-meta">@{drop.studioHandle} · {formatUsd(drop.priceUsd)}</p>
                <h1 className="dropmedia-title">{drop.title}</h1>
                <p className="dropmedia-subtitle">
                  {drop.seasonLabel} · {drop.episodeLabel}
                </p>
                <p className="dropmedia-copy">
                  {copy.active} {drop.title}
                </p>
                <p className="dropmedia-copy">{copy.intro}</p>

                <div className="dropmedia-mode-row" aria-label="consume mode switcher">
                  <Link href={modeHref("watch", drop.id)} className={modeClass(mode === "watch")}>
                    watch
                  </Link>
                  <Link href={modeHref("listen", drop.id)} className={modeClass(mode === "listen")}>
                    listen
                  </Link>
                  <Link href={modeHref("read", drop.id)} className={modeClass(mode === "read")}>
                    read
                  </Link>
                  <Link href={modeHref("photos", drop.id)} className={modeClass(mode === "photos")}>
                    photos
                  </Link>
                </div>

                <div className="dropmedia-actions">
                  <Link href={routes.myCollection()} className="dropmedia-secondary-cta">
                    my collection
                  </Link>
                  {certificate ? (
                    <Link href={routes.certificate(certificate.id)} className="dropmedia-secondary-cta">
                      certificate
                    </Link>
                  ) : null}
                </div>
              </div>
            </section>

            <dl className="dropmedia-panel" aria-label="entitlement metadata">
              <div>
                <dt>world</dt>
                <dd>{drop.worldLabel}</dd>
              </div>
              <div>
                <dt>receipt</dt>
                <dd>{receipt?.id ?? "n/a"}</dd>
              </div>
              <div>
                <dt>certificate</dt>
                <dd>{certificate?.id ?? "n/a"}</dd>
              </div>
              <div>
                <dt>session</dt>
                <dd>@{session.handle}</dd>
              </div>
            </dl>
          </>
        )}
      </section>

      <aside className="dropmedia-side-notes" aria-label="mode notes">
        <h2>{copy.title} mode</h2>
        <p>entitlement gate and receipt/certificate drilldown stay visible in this surface.</p>
      </aside>
    </main>
  );
}
