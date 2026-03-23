"use client";

import { OptimizedImage } from "@/features/media/optimized-image";
import { AppShell } from "@/features/shell/app-shell";
import { StatusToast } from "@/features/shared/status-toast";
import { ResaleListingForm } from "@/features/collect/resale-listing-form";
import { CollectionCurationPanel } from "@/features/collection/collection-curation-panel";
import { ShowcaseToggle } from "@/features/collection/collection-curation-toolbar";
import { formatUsd } from "@/features/shared/format";
import type {
  Certificate,
  MyCollectionAnalyticsPanel,
  MyCollectionSnapshot,
  PurchaseReceipt,
  Session
} from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type MyCollectionScreenProps = {
  session: Session;
  collection: MyCollectionSnapshot;
  status: string | null;
  receipt: PurchaseReceipt | null;
  certificate: Certificate | null;
  analyticsPanel: MyCollectionAnalyticsPanel | null;
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return iso;
  }
}

function statusMessage(status: string): string {
  switch (status) {
    case "completed":
      return "purchase completed!";
    case "checkout_success":
      return "checkout completed. waiting for receipt confirmation.";
    case "already_owned":
      return "this drop is already in your collection.";
    case "checkout_cancelled":
      return "checkout cancelled. you can retry anytime.";
    case "payment_pending":
      return "payment is processing. your drop will appear shortly.";
    default:
      return "collection updated.";
  }
}

export function MyCollectionScreen({
  session,
  collection,
  status,
  receipt,
  certificate,
  analyticsPanel
}: MyCollectionScreenProps) {
  return (
    <AppShell
      title="my collection"
      subtitle={`${collection.ownedDrops.length} drops · ${formatUsd(collection.totalSpentUsd)} total`}
      session={session}
      activeNav="my_collection"
    >
      <StatusToast
        status={status}
        messages={{
          completed: { message: "purchase completed! drop added to your collection.", variant: "success" },
          checkout_success: { message: "checkout completed — receipt on the way.", variant: "success" },
          already_owned: { message: "this drop is already in your collection.", variant: "info" },
          checkout_cancelled: { message: "checkout cancelled. you can retry anytime.", variant: "warning" },
          payment_pending: { message: "payment processing — your drop will appear shortly.", variant: "info" }
        }}
      />

      {/* ── Status banner ────────────────────────────────────── */}
      {status ? (
        <section className="slice-banner" aria-live="polite">
          {statusMessage(status)}
          {receipt ? ` · receipt ${receipt.id}` : ""}
          {certificate ? (
            <>
              {" "}
              ·{" "}
              <Link href={routes.certificate(certificate.id)} className="slice-link">
                open certificate
              </Link>
            </>
          ) : null}
        </section>
      ) : null}

      {/* ── Receipt detail (when arriving from checkout) ────── */}
      {receipt ? (
        <section className="slice-panel">
          <p className="slice-label">receipt</p>
          <dl className="slice-metadata-grid">
            <div>
              <dt className="slice-meta">receipt id</dt>
              <dd className="slice-copy">{receipt.id}</dd>
            </div>
            <div>
              <dt className="slice-meta">status</dt>
              <dd className="slice-copy">{receipt.status}</dd>
            </div>
            <div>
              <dt className="slice-meta">amount</dt>
              <dd className="slice-copy">{formatUsd(receipt.amountUsd)}</dd>
            </div>
            <div>
              <dt className="slice-meta">purchased</dt>
              <dd className="slice-copy">{formatDate(receipt.purchasedAt)}</dd>
            </div>
          </dl>

          {certificate ? (
            <div className="slice-button-row" style={{ marginTop: 12 }}>
              <Link href={routes.certificate(certificate.id)} className="slice-button alt">
                open certificate
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ── Analytics panel ──────────────────────────────────── */}
      {analyticsPanel ? (
        <section className="slice-panel">
          <p className="slice-label">collection analytics</p>
          <div className="ops-kpi-grid">
            <article className="ops-kpi">
              <h3>{analyticsPanel.holdingsCount}</h3>
              <p>holdings</p>
            </article>
            <article className="ops-kpi">
              <h3>{analyticsPanel.worldCount}</h3>
              <p>worlds held</p>
            </article>
            <article className="ops-kpi">
              <h3>{formatUsd(analyticsPanel.averageCollectPriceUsd)}</h3>
              <p>avg collect price</p>
            </article>
            <article className="ops-kpi">
              <h3>{analyticsPanel.recentCollectCount30d}</h3>
              <p>collects in 30d</p>
            </article>
          </div>
          <dl className="slice-metadata-grid" style={{ marginTop: 12 }}>
            <div>
              <dt className="slice-meta">likes</dt>
              <dd className="slice-copy">{analyticsPanel.participation.likes}</dd>
            </div>
            <div>
              <dt className="slice-meta">comments</dt>
              <dd className="slice-copy">{analyticsPanel.participation.comments}</dd>
            </div>
            <div>
              <dt className="slice-meta">shares</dt>
              <dd className="slice-copy">{analyticsPanel.participation.shares}</dd>
            </div>
            <div>
              <dt className="slice-meta">saves</dt>
              <dd className="slice-copy">{analyticsPanel.participation.saves}</dd>
            </div>
          </dl>
          <p className="slice-meta" style={{ marginTop: 8 }}>
            updated {formatDate(analyticsPanel.updatedAt)}
          </p>
        </section>
      ) : null}

      {/* ── Owned drops ──────────────────────────────────────── */}
      <section className="slice-panel">
        <div className="slice-row">
          <p className="slice-label">{collection.ownedDrops.length} collected drops</p>
          <p className="slice-meta">{formatUsd(collection.totalSpentUsd)} total</p>
        </div>

        {collection.ownedDrops.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <p className="slice-copy">your collection is empty.</p>
            <p className="slice-meta" style={{ marginTop: 8 }}>explore the showroom and collect your first drop.</p>
            <div className="slice-button-row" style={{ marginTop: 16, justifyContent: "center" }}>
              <Link href={routes.showroom()} className="slice-button">
                explore showroom
              </Link>
              <Link href={routes.townhall()} className="slice-button ghost">
                browse townhall
              </Link>
            </div>
          </div>
        ) : (
          <CollectionCurationPanel
            ownedDrops={collection.ownedDrops}
            renderDrop={(owned, { isShowcased, onShowcaseToggle }) => {
              const posterSrc = owned.drop.previewMedia?.watch?.posterSrc
                ?? owned.drop.previewMedia?.photos?.src
                ?? null;

              return (
                <>
                  {/* Drop header with poster */}
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    {posterSrc ? (
                      <OptimizedImage
                        src={posterSrc}
                        alt={owned.drop.title}
                        width={60}
                        height={90}
                        preset="thumbnail"
                        style={{ borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
                      />
                    ) : (
                      <span
                        className="slice-avatar-placeholder"
                        style={{ width: 60, height: 90, borderRadius: 6, fontSize: 18 }}
                        aria-hidden
                      >
                        {owned.drop.title.charAt(0)}
                      </span>
                    )}
                    <div style={{ flex: 1 }}>
                      <p className="slice-meta">{owned.drop.worldLabel}</p>
                      <h3 className="slice-title" style={{ fontSize: "1rem" }}>{owned.drop.title}</h3>
                      <p className="slice-meta">
                        by{" "}
                        <Link href={routes.studio(owned.drop.studioHandle)} className="slice-link">
                          @{owned.drop.studioHandle}
                        </Link>
                        {" · "}collected {formatDate(owned.acquiredAt)}
                      </p>
                      <p className="slice-meta" style={{ marginTop: 4 }}>
                        certificate: {owned.certificateId.slice(0, 12)}...
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="slice-button-row" style={{ marginTop: 10 }}>
                    <Link href={routes.drop(owned.drop.id)} className="slice-button ghost">
                      open
                    </Link>
                    <Link href={routes.dropWatch(owned.drop.id)} className="slice-button alt">
                      watch
                    </Link>
                    <Link href={routes.dropListen(owned.drop.id)} className="slice-button alt">
                      listen
                    </Link>
                    <Link href={routes.dropPhotos(owned.drop.id)} className="slice-button alt">
                      photos
                    </Link>
                    <Link href={routes.certificate(owned.certificateId)} className="slice-button alt">
                      certificate
                    </Link>
                    <ShowcaseToggle
                      dropId={owned.drop.id}
                      isShowcased={isShowcased}
                      onToggle={onShowcaseToggle}
                    />
                  </div>

                  {/* Resale listing */}
                  <ResaleListingForm
                    dropId={owned.drop.id}
                    dropTitle={owned.drop.title}
                    originalPriceUsd={owned.drop.priceUsd}
                  />
                </>
              );
            }}
          />
        )}
      </section>
    </AppShell>
  );
}
