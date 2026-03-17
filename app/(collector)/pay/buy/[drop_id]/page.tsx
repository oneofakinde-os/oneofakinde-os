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

  return (
    <SliceFrame
      title="collect"
      subtitle="checkout handoff with collect, receipt, and refund context"
      session={session}
    >
      {status ? (
        <section className="slice-banner" aria-live="polite">
          {status === "checkout_cancelled"
            ? "checkout cancelled. you can retry anytime."
            : status === "checkout_missing_url"
              ? "checkout could not start. retry in a moment."
              : status === "checkout_unavailable"
                ? "checkout is temporarily unavailable."
                : "checkout status updated."}
        </section>
      ) : null}

      <article className="slice-panel">
        <p className="slice-label">step 6 of 9 · collect</p>
        <h2 className="slice-title">{checkout.drop.title}</h2>

        <dl className="slice-list">
          <div>
            <dt>subtotal</dt>
            <dd>{formatUsd(checkout.subtotalUsd)}</dd>
          </div>
          <div>
            <dt>processing</dt>
            <dd>{formatUsd(checkout.processingUsd)}</dd>
          </div>
          <div>
            <dt>total</dt>
            <dd>{formatUsd(checkout.totalUsd)}</dd>
          </div>
        </dl>

        <p className="slice-copy">
          {isAlreadyOwned
            ? "this drop is already in your my collection. continue to view receipt history."
            : "continue to hosted checkout. entitlement is granted only after verified payment webhook processing."}
        </p>

        <div className="slice-button-row">
          <Link href={routes.drop(checkout.drop.id)} className="slice-button ghost">
            back to drop
          </Link>
          <Link href={routes.townhall()} className="slice-button alt">
            back to townhall
          </Link>
        </div>

        <form action={purchaseDropAction} className="slice-form">
          <input type="hidden" name="drop_id" value={checkout.drop.id} />
          <button type="submit" className="slice-button">
            {isAlreadyOwned ? "open my collection" : "continue checkout"}
          </button>
        </form>
      </article>
    </SliceFrame>
  );
}
