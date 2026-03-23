import { OptimizedImage } from "@/features/media/optimized-image";
import { SliceFrame } from "@/components/slice-frame";
import { gateway } from "@/lib/gateway";
import { routes } from "@/lib/routes";
import { requireSession } from "@/lib/server/session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { purchaseDropAction } from "./actions";

type CollectDropPageProps = {
  params: Promise<{ drop_id: string }>;
  searchParams: Promise<{ status?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(amount);
}

function statusBanner(status: string): string {
  switch (status) {
    case "checkout_cancelled":
      return "checkout cancelled. you can retry anytime.";
    case "checkout_missing_url":
      return "checkout could not start. please retry in a moment.";
    case "checkout_unavailable":
      return "checkout is temporarily unavailable. please try again later.";
    default:
      return "checkout status updated.";
  }
}

export default async function CollectDropPage({ params, searchParams }: CollectDropPageProps) {
  const { drop_id: dropId } = await params;
  const resolvedParams = await searchParams;
  const status = firstParam(resolvedParams.status);
  const session = await requireSession(`/pay/buy/${dropId}`);
  const checkout = await gateway.getCheckoutPreview(session.accountId, dropId);

  if (!checkout) {
    notFound();
  }

  const isAlreadyOwned = checkout.totalUsd === 0;
  const posterSrc = checkout.drop.previewMedia?.watch?.posterSrc
    ?? checkout.drop.previewMedia?.photos?.src
    ?? null;
  const provider = process.env.OOK_PAYMENTS_PROVIDER?.trim().toLowerCase() ?? "manual";
  const isStripe = provider === "stripe";

  return (
    <SliceFrame
      title="collect"
      subtitle={`checkout · ${checkout.drop.title}`}
      session={session}
    >
      {status ? (
        <section className="slice-banner" aria-live="polite">
          {statusBanner(status)}
        </section>
      ) : null}

      <article className="slice-panel">
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          {posterSrc ? (
            <OptimizedImage
              src={posterSrc}
              alt={checkout.drop.title}
              width={80}
              height={120}
              preset="thumbnail"
              style={{ borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
            />
          ) : null}
          <div>
            <p className="slice-label">collect</p>
            <h2 className="slice-title">{checkout.drop.title}</h2>
            <p className="slice-meta">
              by{" "}
              <Link href={routes.studio(checkout.drop.studioHandle)} className="slice-link">
                @{checkout.drop.studioHandle}
              </Link>
            </p>
          </div>
        </div>

        <dl className="slice-metadata-grid" style={{ marginTop: 20 }}>
          <div>
            <dt className="slice-meta">subtotal</dt>
            <dd className="slice-copy">{formatUsd(checkout.subtotalUsd)}</dd>
          </div>
          <div>
            <dt className="slice-meta">processing</dt>
            <dd className="slice-copy">{formatUsd(checkout.processingUsd)}</dd>
          </div>
          <div>
            <dt className="slice-meta">total</dt>
            <dd className="slice-copy" style={{ fontWeight: 600 }}>{formatUsd(checkout.totalUsd)}</dd>
          </div>
        </dl>

        {checkout.quote.lineItems && checkout.quote.lineItems.length > 0 ? (
          <details style={{ marginTop: 16 }}>
            <summary className="slice-meta" style={{ cursor: "pointer" }}>
              settlement breakdown
            </summary>
            <dl className="slice-list" style={{ marginTop: 8 }}>
              {checkout.quote.lineItems
                .filter((item) => item.scope === "public")
                .map((item, index) => (
                  <div key={index}>
                    <dt className="slice-meta">{item.kind.replaceAll("_", " ")}</dt>
                    <dd className="slice-meta">{formatUsd(item.amountUsd)}</dd>
                  </div>
                ))}
            </dl>
          </details>
        ) : null}

        <p className="slice-copy" style={{ marginTop: 16 }}>
          {isAlreadyOwned
            ? "this drop is already in your my collection."
            : isStripe
              ? "you will be redirected to Stripe for secure payment. your drop will be added to your collection once payment is confirmed."
              : "continue to complete your purchase. your drop will be added to your collection immediately."}
        </p>

        <div className="slice-button-row" style={{ marginTop: 16 }}>
          <Link href={routes.drop(checkout.drop.id)} className="slice-button ghost">
            back to drop
          </Link>
          <Link href={routes.showroom()} className="slice-button alt">
            showroom
          </Link>
        </div>

        <form action={purchaseDropAction} className="slice-form" style={{ marginTop: 8 }}>
          <input type="hidden" name="drop_id" value={checkout.drop.id} />
          <button type="submit" className="slice-button">
            {isAlreadyOwned
              ? "open my collection"
              : isStripe
                ? `pay ${formatUsd(checkout.totalUsd)} with Stripe`
                : `collect for ${formatUsd(checkout.totalUsd)}`}
          </button>
        </form>
      </article>
    </SliceFrame>
  );
}
