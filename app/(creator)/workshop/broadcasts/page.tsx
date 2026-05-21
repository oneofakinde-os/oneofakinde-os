import { BroadcastComposer } from "@/features/workshop/broadcast-composer";
import { AppShell } from "@/features/shell/app-shell";
import { commerceBffService } from "@/lib/bff/service";
import { routes } from "@/lib/routes";
import { requireSession } from "@/lib/server/session";

export default async function WorkshopBroadcastsPage() {
  const session = await requireSession(routes.signIn(routes.workshopBroadcasts()));

  if (!session.roles.includes("creator")) {
    const { redirect } = await import("next/navigation");
    redirect(routes.workshop());
  }

  const broadcasts = await commerceBffService.listBroadcasts(session.accountId);

  return (
    <AppShell title="workshop" subtitle="broadcasts" session={session} activeNav="workshop">
      <section className="slice-panel">
        <p className="slice-label">creator broadcasts</p>
        <p className="slice-copy">
          send a newsletter or announcement to your followers or patrons.
          recipients receive it in their notifications. limited to 2 sends per
          day to keep updates meaningful.
        </p>
      </section>

      <BroadcastComposer initialBroadcasts={broadcasts} />
    </AppShell>
  );
}
