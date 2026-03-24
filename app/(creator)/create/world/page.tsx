import { AppShell } from "@/features/shell/app-shell";
import { CreateWorldStepper } from "@/features/create/create-world-stepper";
import { requireSessionRoles } from "@/lib/server/session";
import { createWorldAction } from "./actions";

export default async function CreateWorldPage() {
  const session = await requireSessionRoles("/create/world", ["creator"]);

  return (
    <AppShell
      title="create world"
      subtitle="build a new thematic collection for your drops"
      session={session}
      activeNav="townhall"
    >
      <CreateWorldStepper createWorldAction={createWorldAction} />
    </AppShell>
  );
}
