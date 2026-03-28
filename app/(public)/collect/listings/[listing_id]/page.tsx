import { ListingDetailScreen } from "@/features/collect/listing-detail-screen";
import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";
import { notFound } from "next/navigation";

type ListingDetailPageProps = {
  params: Promise<{ listing_id: string }>;
};

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { listing_id: listingId } = await params;

  const session = await getOptionalSession();
  const inventoryResult = await gateway.getCollectInventory(
    session?.accountId ?? "",
    "all"
  );

  const listing = inventoryResult.listings.find(
    (l) => l.drop.id === listingId
  );

  if (!listing) {
    notFound();
  }

  const offersResult = await gateway.getCollectDropOffers(
    listingId,
    session?.accountId ?? null
  );

  return (
    <ListingDetailScreen
      session={session}
      listing={listing}
      offers={offersResult?.offers ?? []}
    />
  );
}
