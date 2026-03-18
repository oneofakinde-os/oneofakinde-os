import type { Session } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type AppShellNavKey = "townhall" | "collect" | "my_collection" | "library" | "worlds";

type AppShellProps = {
  title: string;
  subtitle: string;
  session?: Session | null;
  activeNav?: AppShellNavKey;
  children: React.ReactNode;
};

export function AppShell({ title, subtitle, session, activeNav, children }: AppShellProps) {
  return (
    <main className="slice-shell">
      <header className="slice-topbar">
        <div>
          <p className="slice-kicker">oneofakinde</p>
          <h1 className="slice-h1">{title}</h1>
          <p className="slice-subtitle">{subtitle}</p>
        </div>

        <nav className="slice-nav" aria-label="primary">
          <Link href={routes.townhall()} className={`slice-link ${activeNav === "townhall" ? "active" : ""}`}>
            townhall
          </Link>
          <Link href={routes.collect()} className={`slice-link ${activeNav === "collect" ? "active" : ""}`}>
            collect
          </Link>
          <Link
            href={routes.myCollection()}
            className={`slice-link ${activeNav === "my_collection" ? "active" : ""}`}
          >
            my collection
          </Link>
          <Link href={routes.library()} className={`slice-link ${activeNav === "library" ? "active" : ""}`}>
            library
          </Link>
          <Link href={routes.worlds()} className={`slice-link ${activeNav === "worlds" ? "active" : ""}`}>
            worlds
          </Link>
          {session ? (
            <Link href={routes.logout()} className="slice-link">
              log out
            </Link>
          ) : (
            <Link href={routes.signIn()} className="slice-link">
              sign in
            </Link>
          )}
        </nav>
      </header>

      {session ? <p className="slice-session">signed in as @{session.handle}</p> : <p className="slice-session">public preview mode</p>}

      <section className="slice-content">{children}</section>
    </main>
  );
}
