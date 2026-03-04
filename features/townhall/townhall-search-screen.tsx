import { formatUsd } from "@/features/shared/format";
import type { CatalogSearchResult } from "@/lib/catalog/search";
import type { Session } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";
import { TownhallBottomNav } from "./townhall-bottom-nav";
import { ArrowLeftIcon, SearchIcon } from "./townhall-icons";

type TownhallSearchScreenProps = {
  session: Session | null;
  search: CatalogSearchResult;
};

function formatOfferState(value: string): string {
  return value.replaceAll("_", " ");
}

export function TownhallSearchScreen({ session, search }: TownhallSearchScreenProps) {
  const normalizedQuery = search.query.trim().toLowerCase();
  const totalMatches = search.users.length + search.worlds.length + search.drops.length;
  const scopeFilters: string[] = [];
  if (search.lane !== "all") {
    scopeFilters.push(`lane ${search.lane}`);
  }
  if (search.offerState) {
    scopeFilters.push(`state ${formatOfferState(search.offerState)}`);
  }

  const scopeSuffix = scopeFilters.length > 0 ? ` filters: ${scopeFilters.join(" · ")}.` : "";
  const summary = normalizedQuery
    ? `${totalMatches} result${totalMatches === 1 ? "" : "s"} across users, worlds, and drops.${scopeSuffix}`
    : `discover users, worlds, and drops from the townhall catalog.${scopeSuffix}`;

  const title = normalizedQuery ? `results for "${search.query}"` : "search users, worlds, and drops";

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
              defaultValue={search.query}
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
              <span>{search.users.length}</span>
            </div>
            {search.users.length === 0 ? (
              <p className="townhall-search-empty">no matching users.</p>
            ) : (
              <ul className="townhall-search-grid">
                {search.users.map((user) => (
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
              <span>{search.worlds.length}</span>
            </div>
            {search.worlds.length === 0 ? (
              <p className="townhall-search-empty">no matching worlds.</p>
            ) : (
              <ul className="townhall-search-grid">
                {search.worlds.map((world) => (
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
              <span>{search.drops.length}</span>
            </div>
            {search.drops.length === 0 ? (
              <p className="townhall-search-empty">no matching drops.</p>
            ) : (
              <ul className="townhall-search-grid">
                {search.drops.map((drop) => {
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
                      {drop.collect ? (
                        <p className="townhall-search-card-kicker">
                          lane {drop.collect.lane} · state {formatOfferState(drop.collect.latestOfferState)} · offers{" "}
                          {drop.collect.offerCount}
                        </p>
                      ) : null}
                      <div className="townhall-search-card-actions">
                        <Link href={routes.drop(drop.id)} className="townhall-search-card-link">
                          open drop
                        </Link>
                        <Link href={collectHref} className="townhall-search-card-link ghost">
                          collect {formatUsd(drop.collect?.listingPriceUsd ?? drop.priceUsd)}
                        </Link>
                        <Link href={routes.dropOffers(drop.id)} className="townhall-search-card-link ghost">
                          offers
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
        <p>drop search now includes collect lane and offer-state context for agora commerce discovery.</p>
      </aside>
    </main>
  );
}
