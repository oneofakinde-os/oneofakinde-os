import { AppShell } from "@/features/shell/app-shell";
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
      subtitle="owned drops with certificate links and recent receipt status"
      session={session}
      activeNav="my_collection"
    >
      {status ? (
        <section className="slice-banner" aria-live="polite">
          {status === "completed"
            ? "purchase completed"
            : status === "checkout_success"
              ? "checkout completed. waiting for receipt confirmation."
              : "drop already in my collection"}
          {receipt ? ` · receipt ${receipt.id}` : ""}
          {certificate ? (
            <>
              {" "}
              · <Link href={routes.certificate(certificate.id)}>open certificate</Link>
            </>
          ) : null}
        </section>
      ) : null}

      {receipt ? (
        <section className="slice-panel">
          <p className="slice-label">step 7 of 9 · receipt</p>
          <p className="slice-label">receipt detail</p>
          <dl className="slice-list">
            <div>
              <dt>receipt id</dt>
              <dd>{receipt.id}</dd>
            </div>
            <div>
              <dt>status</dt>
              <dd>{receipt.status}</dd>
            </div>
            <div>
              <dt>amount</dt>
              <dd>{formatUsd(receipt.amountUsd)}</dd>
            </div>
            <div>
              <dt>purchased</dt>
              <dd>{receipt.purchasedAt}</dd>
            </div>
          </dl>

          {certificate ? (
            <div className="slice-button-row">
              <Link href={routes.certificate(certificate.id)} className="slice-button alt">
                open certificate
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}

      {analyticsPanel ? (
        <section className="slice-panel">
          <p className="slice-label">my collection analytics v0</p>
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
          <dl className="slice-list">
            <div>
              <dt>likes</dt>
              <dd>{analyticsPanel.participation.likes}</dd>
            </div>
            <div>
              <dt>comments</dt>
              <dd>{analyticsPanel.participation.comments}</dd>
            </div>
            <div>
              <dt>shares</dt>
              <dd>{analyticsPanel.participation.shares}</dd>
            </div>
            <div>
              <dt>saves</dt>
              <dd>{analyticsPanel.participation.saves}</dd>
            </div>
          </dl>
          <p className="slice-meta">updated {new Date(analyticsPanel.updatedAt).toLocaleString()}</p>
        </section>
      ) : null}

      <section className="slice-panel">
        <p className="slice-label">step 8 of 9 · my collection</p>
        <div className="slice-row">
          <p className="slice-label">{collection.ownedDrops.length} collected drops</p>
          <p className="slice-total">total spent {formatUsd(collection.totalSpentUsd)}</p>
        </div>

        {collection.ownedDrops.length === 0 ? (
          <p className="slice-copy">your my collection is empty. explore and collect a drop to begin.</p>
        ) : (
          <ul className="slice-grid" aria-label="my collection drop list">
            {collection.ownedDrops.map((owned) => (
              <li key={owned.certificateId} className="slice-drop-card">
                <p className="slice-label">{owned.drop.worldLabel}</p>
                <h2 className="slice-title">{owned.drop.title}</h2>
                <p className="slice-copy">{owned.drop.synopsis}</p>
                <p className="slice-meta">certificate: {owned.certificateId}</p>
                <div className="slice-button-row">
                  <Link href={routes.drop(owned.drop.id)} className="slice-button ghost">
                    open drop
                  </Link>
                  <Link href={routes.dropWatch(owned.drop.id)} className="slice-button alt">
                    watch
                  </Link>
                  <Link href={routes.dropListen(owned.drop.id)} className="slice-button alt">
                    listen
                  </Link>
                  <Link href={routes.dropRead(owned.drop.id)} className="slice-button alt">
                    read
                  </Link>
                  <Link href={routes.dropPhotos(owned.drop.id)} className="slice-button alt">
                    photos
                  </Link>
                  <Link href={routes.certificate(owned.certificateId)} className="slice-button alt">
                    certificate
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
