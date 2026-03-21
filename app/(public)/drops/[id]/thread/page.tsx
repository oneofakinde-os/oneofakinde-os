import { DropThreadPanel } from "@/features/drops/drop-thread-panel";
import { gateway } from "@/lib/gateway";
import { routes } from "@/lib/routes";
import { getOptionalSession } from "@/lib/server/session";
import { notFound } from "next/navigation";

type DropThreadPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DropThreadPage({ params }: DropThreadPageProps) {
  const { id } = await params;

  const [drop, session] = await Promise.all([
    gateway.getDropById(id),
    getOptionalSession()
  ]);

  if (!drop) {
    notFound();
  }

  return (
    <main className="route-shell">
      <DropThreadPanel
        dropId={drop.id}
        canInteract={Boolean(session)}
        signInHref={routes.signIn(`/drops/${drop.id}/thread`)}
      />
    </main>
  );
}
