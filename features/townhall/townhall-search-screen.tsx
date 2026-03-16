import { formatUsd } from "@/features/shared/format";
import type { Drop, Session, Studio, World } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";
import { TownhallBottomNav } from "./townhall-bottom-nav";
import { ArrowLeftIcon, SearchIcon } from "./townhall-icons";

type TownhallSearchScreenProps = {
  query: string;
  session: Session | null;
  drops: Drop[];
  worlds: World[];
  studios: Studio[];
};

type SearchUser = {
  handle: string;
  title: string;
  synopsis: string;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function fieldScore(query: string, value: string): number {
  const normalizedQuery = normalize(query);
  const normalizedValue = normalize(value);

  if (!normalizedQuery || !normalizedValue) return 0;
  if (normalizedValue === normalizedQuery) return 400;
  if (normalizedValue.startsWith(normalizedQuery)) return 250;

  const index = normalizedValue.indexOf(normalizedQuery);
  if (index < 0) return 0;

  return 120 - Math.min(index, 100);
}

function scoreByFields(query: string, values: string[]): number {
  return values.reduce((best, value) => Math.max(best, fieldScore(query, value)), 0);
}

function dedupeUsers(studios: Studio[], drops: Drop[], worlds: World[]): SearchUser[] {
  const byHandle = new Map<string, SearchUser>();

  for (const studio of studios) {
    byHandle.set(studio.handle, {
      handle: studio.handle,
      title: studio.title,
      synopsis: studio.synopsis
    });
  }

  for (const handle of [...drops.map((drop) => drop.studioHandle), ...worlds.map((world) => world.studioHandle)]) {
    if (byHandle.has(handle)) continue;
    byHandle.set(handle, {
      handle,
      title: handle,
      synopsis: "creator identity publishing drops and worlds."
    });
  }

  return [...byHandle.values()];
}

function sortByScore<T>(
  items: T[],
  query: string,
  fields: (item: T) => string[],
  getKey: (item: T) => string
): T[] {
  if (!query) {
    return [...items].sort((a, b) => getKey(a).localeCompare(getKey(b)));
  }

  return items
    .map((item) => ({
      item,
      score: scoreByFields(query, fields(item))
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || getKey(a.item).localeCompare(getKey(b.item)))
    .map((entry) => entry.item);
}

export function TownhallSearchScreen({ query, session, drops, worlds, studios }: TownhallSearchScreenProps) {
  const normalizedQuery = normalize(query);
  const users = dedupeUsers(studios, drops, worlds);

  const matchedUsers = sortByScore(
    users,
    normalizedQuery,
    (user) => [user.handle, user.title, user.synopsis],
    (user) => user.handle
  ).slice(0, 8);

  const matchedWorlds = sortByScore(
    worlds,
    normalizedQuery,
    (world) => [world.title, world.synopsis, world.studioHandle],
    (world) => world.id
  ).slice(0, 8);

  const matchedDrops = sortByScore(
    drops,
    normalizedQuery,
    (drop) => [drop.title, drop.synopsis, drop.worldLabel, drop.studioHandle],
    (drop) => drop.id
  ).slice(0, 8);

  const usersToRender = normalizedQuery ? matchedUsers : matchedUsers.slice(0, 4);
  const worldsToRender = normalizedQuery ? matchedWorlds : matchedWorlds.slice(0, 4);
  const dropsToRender = normalizedQuery ? matchedDrops : matchedDrops.slice(0, 4);
  const totalMatches = usersToRender.length + worldsToRender.length + dropsToRender.length;

  const summary = normalizedQuery
    ? `${totalMatches} result${totalMatches === 1 ? "" : "s"} across users, worlds, and drops.`
    : "discover users, worlds, and drops from the townhall catalog.";

  const title = normalizedQuery ? `results for "${query}"` : "search users, worlds, and drops";

  return (
    <main className="townhall-page">
      <section className="townhall-phone-shell" aria-label="townhall search surface">
        <header className="townhall-header townhall-header-search">
          <Link href={routes.townhall()} className="townhall-icon-link" aria-label="back to townhall">
            <ArrowLeftIcon className="townhall-ui-icon" />
          </Link>
          <p className="townhall-brand">oneofakinde</p>
          <form
            action={routes.townhallSearch()}
            method="get"
            className="townhall-search-form"
            role="search"
            aria-label="search oneofakinde"
          >
            <SearchIcon className="townhall-search-inline-icon" />
            <input
              type="search"
              name="q"
              className="townhall-search-input"
              placeholder="search users, worlds, and drops"
              aria-label="search users, worlds, and drops"
              defaultValue={query}
              autoFocus
            />
          </form>
        </header>

        <section className="townhall-search-results" aria-label="townhall search results">
          <div className="townhall-search-head">
            <p className="townhall-kicker">townhall search</p>
            <h1 className="townhall-search-title">{title}</h1>
            <p className="townhall-meta">{summary}</p>
          </div>

          <section className="townhall-search-section" aria-label="user search results">
            <div className="townhall-search-section-head">
              <h2>users</h2>
              <span>{usersToRender.length}</span>
            </div>
            {usersToRender.length === 0 ? (
              <p className="townhall-search-empty">no matching users.</p>
            ) : (
              <ul className="townhall-search-grid">
                {usersToRender.map((user) => (
                  <li key={user.handle} className="townhall-search-card">
                    <p className="townhall-search-card-kicker">creator identity</p>
                    <h3>@{user.handle}</h3>
                    <p>{user.synopsis}</p>
                    <Link href={routes.studio(user.handle)} className="townhall-search-card-link">
                      open studio
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="townhall-search-section" aria-label="world search results">
            <div className="townhall-search-section-head">
              <h2>worlds</h2>
              <span>{worldsToRender.length}</span>
            </div>
            {worldsToRender.length === 0 ? (
              <p className="townhall-search-empty">no matching worlds.</p>
            ) : (
              <ul className="townhall-search-grid">
                {worldsToRender.map((world) => (
                  <li key={world.id} className="townhall-search-card">
                    <p className="townhall-search-card-kicker">@{world.studioHandle}</p>
                    <h3>{world.title}</h3>
                    <p>{world.synopsis}</p>
                    <div className="townhall-search-card-actions">
                      <Link href={routes.world(world.id)} className="townhall-search-card-link">
                        open world
                      </Link>
                      <Link href={routes.worldDrops(world.id)} className="townhall-search-card-link ghost">
                        world drops
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="townhall-search-section" aria-label="drop search results">
            <div className="townhall-search-section-head">
              <h2>drops</h2>
              <span>{dropsToRender.length}</span>
            </div>
            {dropsToRender.length === 0 ? (
              <p className="townhall-search-empty">no matching drops.</p>
            ) : (
              <ul className="townhall-search-grid">
                {dropsToRender.map((drop) => {
                  const collectHref = session
                    ? routes.collectDrop(drop.id)
                    : routes.signIn(routes.collectDrop(drop.id));

                  return (
                    <li key={drop.id} className="townhall-search-card">
                      <p className="townhall-search-card-kicker">
                        {drop.worldLabel} · @{drop.studioHandle}
                      </p>
                      <h3>{drop.title}</h3>
                      <p>{drop.synopsis}</p>
                      <div className="townhall-search-card-actions">
                        <Link href={routes.drop(drop.id)} className="townhall-search-card-link">
                          open drop
                        </Link>
                        <Link href={collectHref} className="townhall-search-card-link ghost">
                          collect {formatUsd(drop.priceUsd)}
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </section>

        <TownhallBottomNav activeMode="townhall" />
      </section>

      <aside className="townhall-side-notes" aria-label="townhall search notes">
        <h2>townhall search</h2>
        <p>dedicated discovery surface for users, worlds, and drops with a single query.</p>
        <p>this keeps townhall as the primary shell while enabling direct deep-link search workflows.</p>
      </aside>
    </main>
  );
}
