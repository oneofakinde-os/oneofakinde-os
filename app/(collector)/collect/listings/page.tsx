import { CollectorListingsScreen } from "@/features/collect/collector-listings-screen";
import { AppShell } from "@/features/shell/app-shell";
import { gateway } from "@/lib/gateway";
import { requireSession } from "@/lib/server/session";

const LISTING_STATUS_MESSAGES: Record<string, string> = {
  withdrawn: "listing withdrawn successfully.",
  withdraw_failed: "could not withdraw listing. it may have already been settled."
};

type ListingsPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function CollectorListingsPage({ searchParams }: ListingsPageProps) {
  const session = await requireSession("/collect/listings");
  const params = await searchParams;

  const listings = await gateway.listCollectorOffers(session.accountId);
  const statusMessage = params.status
    ? (LISTING_STATUS_MESSAGES[params.status] ?? null)
    : null;

  return (
    <AppShell title="my listings" subtitle="manage your resale and offer activity" session={session} activeNav="collect">
      <CollectorListingsScreen
        session={session}
        listings={listings}
        statusMessage={statusMessage}
      />
    </AppShell>
  );
}
