import Link from "next/link";
import type { Route } from "next";
import type { Drop, Session, Studio, World } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";

type SearchPayload = {
  query?: string;
  drops?: any[];
  worlds?: any[];
  studios?: any[];
};

type TownhallSearchScreenProps = {
  query?: string;
  session: Session | null;
  drops?: Drop[];
  worlds?: World[];
  studios?: Studio[];
  search?: SearchPayload;
  basePath?: Route;
};

function textValue(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "result";
}

export function TownhallSearchScreen({
  query,
  session,
  drops,
  worlds,
  studios,
  search,
  basePath,
}: TownhallSearchScreenProps) {
  void session;
  const resolvedQuery = search?.query ?? query ?? "";
  const resolvedDrops = search?.drops ?? drops ?? [];
  const resolvedWorlds = search?.worlds ?? worlds ?? [];
  const resolvedStudios = search?.studios ?? studios ?? [];
  const resolvedBasePath = basePath ?? routes.townhallSearch();

  return (
    <main className="townhall-search-screen">
      <section className="townhall-search-shell">
        <p className="townhall-search-label">search</p>
        <h1 className="townhall-search-title">{resolvedQuery || "discover"}</h1>
        <p className="townhall-search-copy">
          {resolvedDrops.length + resolvedWorlds.length + resolvedStudios.length} results
        </p>

        <div className="townhall-search-actions">
          <Link href={resolvedBasePath} className="townhall-search-link">
            reset
          </Link>
          <Link href={routes.showroom()} className="townhall-search-link">
            showroom
          </Link>
        </div>

        <ul className="townhall-search-grid">
          {resolvedDrops.map((drop: any) => (
            <li key={`drop-${drop.id ?? drop.slug ?? Math.random()}`} className="townhall-search-card">
              <Link href={routes.drop(String(drop.id ?? drop.slug ?? ""))} className="townhall-search-card-link">
                {textValue(drop.title, drop.name, drop.slug)}
              </Link>
            </li>
          ))}
          {resolvedWorlds.map((world: any) => (
            <li key={`world-${world.id ?? world.slug ?? Math.random()}`} className="townhall-search-card">
              <Link href={routes.world(String(world.id ?? world.slug ?? ""))} className="townhall-search-card-link">
                {textValue(world.title, world.name, world.slug)}
              </Link>
            </li>
          ))}
          {resolvedStudios.map((studio: any) => (
            <li key={`studio-${studio.handle ?? studio.id ?? Math.random()}`} className="townhall-search-card">
              <Link href={routes.studio(String(studio.handle ?? studio.id ?? ""))} className="townhall-search-card-link">
                {textValue(studio.name, studio.title, studio.handle)}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
