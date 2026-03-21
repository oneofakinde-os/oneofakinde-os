import { ReceiptBadgeCard } from "@/features/collect/receipt-badge-card";
import "@/features/collect/receipt-badge-card.css";
import { routes } from "@/lib/routes";
import Link from "next/link";
import { notFound } from "next/navigation";

type BadgePageProps = {
  params: Promise<{ badge_id: string }>;
};

async function fetchBadge(badgeId: string) {
  const { commerceBffService } = await import("@/lib/bff/service");
  return commerceBffService.getReceiptBadgeById(badgeId);
}

export default async function BadgePage({ params }: BadgePageProps) {
  const { badge_id } = await params;
  const badge = await fetchBadge(badge_id);

  if (!badge) {
    notFound();
  }

  return (
    <main className="badge-public-page" data-testid="badge-public-page">
      <section className="badge-public-shell" aria-label="public collect badge">
        <header className="badge-public-header">
          <Link href={routes.showroom()} className="badge-public-brand">
            oneofakinde
          </Link>
          <p className="badge-public-subtitle">collect proof</p>
        </header>
        <ReceiptBadgeCard badge={badge} size="full" />
        <footer className="badge-public-footer">
          <p>verified on the oneofakinde platform</p>
        </footer>
      </section>
    </main>
  );
}
