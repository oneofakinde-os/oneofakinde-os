import { AppShell } from "@/features/shell/app-shell";
import { CreateDropStepper } from "@/features/create/create-drop-stepper";
import { gateway } from "@/lib/gateway";
import { requireSessionRoles } from "@/lib/server/session";
import { createDropAction } from "./actions";

export default async function CreateDropPage() {
  const session = await requireSessionRoles("/create/drop", ["creator"]);
  const studio = await gateway.getStudioByHandle(session.handle);

  const worlds = studio
    ? (
        await Promise.all(
          studio.worldIds.map((id) => gateway.getWorldById(id))
        )
      ).filter((w): w is NonNullable<typeof w> => w !== null)
    : [];

  return (
    <AppShell
      title="create drop"
      subtitle="publish a new work to your studio"
      session={session}
      activeNav="townhall"
    >
      {worlds.length === 0 ? (
        <section className="slice-panel">
          <h2 className="slice-title">create a world first</h2>
          <p className="slice-copy">
            drops live inside worlds. create your first world before publishing
            a drop.
          </p>
          <a href="/create/world" className="slice-button">
            create world
          </a>
        </section>
      ) : (
        <CreateDropStepper
          worlds={worlds}
          createDropAction={createDropAction}
        />
      )}
    </AppShell>
  );
}
