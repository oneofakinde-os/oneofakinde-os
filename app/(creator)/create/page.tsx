import { AppShell } from "@/features/shell/app-shell";
import { routes } from "@/lib/routes";
import { requireSessionRoles } from "@/lib/server/session";
import Link from "next/link";

export default async function CreatePage() {
  const session = await requireSessionRoles("/create", ["creator"]);

  return (
    <AppShell
      title="create"
      subtitle="launch new world and drop flows from the workshop stepper"
      session={session}
      activeNav="townhall"
    >
      <section className="slice-panel">
        <p className="slice-label">new release</p>
        <h2 className="slice-title">choose a creation flow</h2>
        <p className="slice-copy">
          use workshop steppers to complete publish contract sections before release.
        </p>
        <div className="slice-button-row">
          <Link href="/workshop?compose=drop" className="slice-button">
            create drop stepper
          </Link>
          <Link href="/workshop?compose=world" className="slice-button alt">
            create world stepper
          </Link>
          <Link href={routes.workshop()} className="slice-button ghost">
            open workshop hub
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
