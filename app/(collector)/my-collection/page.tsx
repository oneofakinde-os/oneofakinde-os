import { MyCollectionScreen } from "@/features/collection/my-collection-screen";
import { gateway } from "@/lib/gateway";
import { requireSession } from "@/lib/server/session";
import { notFound } from "next/navigation";

type MyCollectionPageProps = {
  searchParams: Promise<{
    receipt?: string | string[];
    status?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

// my collection
export default async function MyCollectionPage({ searchParams }: MyCollectionPageProps) {
  const session = await requireSession("/my-collection");
  const collection = await gateway.getMyCollection(session.accountId);

  if (!collection) {
    notFound();
  }

  const resolvedSearchParams = await searchParams;
  const receiptId = firstParam(resolvedSearchParams.receipt);
  const status = firstParam(resolvedSearchParams.status);

  const [receipt, certificate] = await Promise.all([
    receiptId ? gateway.getReceipt(session.accountId, receiptId) : Promise.resolve(null),
    receiptId ? gateway.getCertificateByReceipt(session.accountId, receiptId) : Promise.resolve(null)
  ]);
  const analyticsPanel = await gateway.getMyCollectionAnalyticsPanel(session.accountId);

  return (
    <MyCollectionScreen
      session={session}
      collection={collection}
      status={status}
      receipt={receipt}
      certificate={certificate}
      analyticsPanel={analyticsPanel}
    />
  );
}
