import { DropOffersScreen } from "@/features/collect/drop-offers-screen";
import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";
import { notFound } from "next/navigation";

type DropOffersPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DropOffersPage({ params }: DropOffersPageProps) {
  const { id } = await params;

  const session = await getOptionalSession();
  const [drop, collect] = await Promise.all([
    gateway.getDropById(id),
    gateway.getCollectDropOffers(id, session?.accountId ?? null)
  ]);

  if (!drop || !collect) {
    notFound();
  }

  return (
    <DropOffersScreen
      drop={drop}
      session={session}
      listing={collect.listing}
      offers={collect.offers}
    />
  );
}
