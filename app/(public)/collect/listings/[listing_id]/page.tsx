import { ListingDetailScreen } from "@/features/collect/listing-detail-screen";
import { commerceBffService } from "@/lib/bff/service";
import { getOptionalSession } from "@/lib/server/session";
import { notFound } from "next/navigation";

type ListingDetailPageProps = {
  params: Promise<{ listing_id: string }>;
};

export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const { listing_id: listingId } = await params;

  const session = await getOptionalSession();
  const inventoryResult = await commerceBffService.getCollectInventory(
    session?.accountId ?? "",
    "all"
  );

  const listing = inventoryResult.listings.find(
    (l) => l.drop.id === listingId
  );

  if (!listing) {
    notFound();
  }

  const offersResult = await commerceBffService.getCollectDropOffers(
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
