import { DropConsumeScreen } from "@/features/drops/drop-consume-screen";
import { gateway } from "@/lib/gateway";
import { requireSession } from "@/lib/server/session";
import { notFound } from "next/navigation";

type DropWatchPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DropWatchPage({ params }: DropWatchPageProps) {
  const { id } = await params;
  const session = await requireSession(`/drops/${id}/watch`);

  const drop = await gateway.getDropById(id);
  if (!drop) {
    notFound();
  }

  const hasEntitlement = await gateway.hasDropEntitlement(session.accountId, id);
  let hasWatchAccess = false;

  if (hasEntitlement) {
    const watchAccessToken = await gateway.createWatchAccessToken(
      session.accountId,
      id
    );

    if (watchAccessToken) {
      const consumeResult = await gateway.consumeWatchAccessToken({
        accountId: session.accountId,
        dropId: id,
        token: watchAccessToken.token
      });
      hasWatchAccess = consumeResult.granted;

      if (consumeResult.granted) {
        await gateway.recordTownhallTelemetryEvent({
          accountId: session.accountId,
          dropId: id,
          eventType: "access_start",
          metadata: {
            source: "drop",
            surface: "watch",
            action: "open"
          }
        });
      }
    }
  }

  const hasWatchEntitlement = hasEntitlement && hasWatchAccess;

  const collection = hasWatchEntitlement
    ? await gateway.getMyCollection(session.accountId)
    : null;

  const ownedDrop = collection?.ownedDrops.find((entry) => entry.drop.id === id) ?? null;

  const [receipt, certificate] = await Promise.all([
    ownedDrop
      ? gateway.getReceipt(session.accountId, ownedDrop.receiptId)
      : Promise.resolve(null),
    ownedDrop
      ? gateway.getCertificateById(ownedDrop.certificateId)
      : Promise.resolve(null)
  ]);

  return (
    <DropConsumeScreen
      mode="watch"
      session={session}
      drop={drop}
      hasEntitlement={hasWatchEntitlement}
      receipt={receipt}
      certificate={certificate}
    />
  );
}
