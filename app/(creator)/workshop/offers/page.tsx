import { WorkshopOffersScreen } from "@/features/workshop/workshop-offers-screen";
import { gateway } from "@/lib/gateway";
import { requireSessionRoles } from "@/lib/server/session";
import { acceptOfferAction, settleOfferAction } from "./actions";

type WorkshopOffersPageProps = {
  searchParams: Promise<{
    offer_status?: string | string[];
    offer_drop?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function toOfferNotice(status: string | null, dropId: string | null): string | null {
  if (!status) return null;
  if (status === "accepted") {
    return dropId
      ? `offer accepted for drop ${dropId}. it can now be settled.`
      : "offer accepted. it can now be settled.";
  }
  if (status === "settled") {
    return dropId
      ? `resale settled for drop ${dropId}. ownership transferred, royalties distributed.`
      : "resale settled. ownership transferred, royalties distributed.";
  }
  if (status === "accept_failed") {
    return "offer could not be accepted. it may have been withdrawn or expired.";
  }
  if (status === "settle_failed") {
    return "offer could not be settled. check the offer state and execution price.";
  }
  if (status === "invalid_input") {
    return "invalid request. please try again.";
  }
  return "offer status updated.";
}

export default async function WorkshopOffersPage({ searchParams }: WorkshopOffersPageProps) {
  const session = await requireSessionRoles("/workshop/offers", ["creator"]);
  const resolvedParams = await searchParams;
  const offerStatus = firstParam(resolvedParams.offer_status);
  const offerDrop = firstParam(resolvedParams.offer_drop);

  // Load the creator's drops and their offers
  const drops = await gateway.listDropsByStudioHandle(
    session.handle,
    session.accountId
  );

  const dropsWithOffers = await Promise.all(
    drops.map(async (drop) => {
      const result = await gateway.getCollectDropOffers(drop.id, session.accountId);
      return {
        drop,
        listing: result?.listing ?? null,
        offers: result?.offers ?? []
      };
    })
  );

  return (
    <WorkshopOffersScreen
      session={session}
      dropsWithOffers={dropsWithOffers}
      notice={toOfferNotice(offerStatus, offerDrop)}
      acceptOfferAction={acceptOfferAction}
      settleOfferAction={settleOfferAction}
    />
  );
}
