import { OptimizedImage } from "@/features/media/optimized-image";
import { formatUsd } from "@/features/shared/format";
import { resolveDropPoster, resolveWorldCover } from "@/features/shared/resolve-poster";
import type { Drop, Session, World } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import { buildDefaultEntryFlow } from "@/lib/system-flow";
import Link from "next/link";

type EntryScreenProps = {
  session: Session | null;
  featuredDrops?: Drop[];
  worlds?: World[];
};

export function EntryScreen({ session, featuredDrops = [], worlds = [] }: EntryScreenProps) {
  const flow = buildDefaultEntryFlow();
  const signInHref = flow.signInHref;
  const signUpHref = flow.signUpHref;
  const walletConnectHref = flow.walletConnectHref;

  return (
    <main className="entry-page">
      {/* ── hero ── */}
      <section className="entry-phone-shell" aria-label="open app">
        <header className="entry-head">
          <p className="entry-kicker">welcome to</p>
          <h1 className="entry-logo">one of a kinde</h1>
          <p className="entry-tagline">be independent</p>
        </header>

        {session ? (
          <div className="entry-actions">
            <p className="entry-session">signed in as @{session.handle}</p>
            <Link href={routes.townhall()} className="entry-primary-cta">
              open townhall
            </Link>
            <Link href={routes.explore()} className="entry-secondary-cta">
              explore drops + worlds
            </Link>
            {session.roles.includes("creator") ? (
              <Link href={routes.workshop()} className="entry-secondary-cta">
                open workshop
              </Link>
            ) : (
              <Link href={routes.collect()} className="entry-secondary-cta">
                open collect
              </Link>
            )}
          </div>
        ) : (
          <div className="entry-actions">
            <Link href={signInHref} className="entry-primary-cta">
              sign in
            </Link>
            <Link href={signUpHref} className="entry-secondary-cta">
              create account
            </Link>
            <Link href={walletConnectHref} className="entry-secondary-cta">
              connect wallet
            </Link>
          </div>
        )}
      </section>

      {/* ── value proposition ── */}
      <section className="entry-value-section" aria-label="about oneofakinde">
        <div className="entry-value-grid">
          <div className="entry-value-card">
            <h3>collect</h3>
            <p>
              own the drops you love. every purchase comes with a certificate of authenticity and
              permanent access to watch, listen, read, or view photos.
            </p>
          </div>
          <div className="entry-value-card">
            <h3>create</h3>
            <p>
              build your studio, publish drops to worlds, run live sessions, and earn directly
              from your audience — no middleman.
            </p>
          </div>
          <div className="entry-value-card">
            <h3>connect</h3>
            <p>
              join the townhall, follow studios, become a patron, and participate in a community
              built around independent creation.
            </p>
          </div>
        </div>
      </section>

      {/* ── featured drops ── */}
      {featuredDrops.length > 0 ? (
        <section className="entry-featured-section" aria-label="featured drops">
          <div className="entry-section-header">
            <h2>featured drops</h2>
            <Link href={routes.showroom()} className="entry-section-link">
              view all in showroom
            </Link>
          </div>
          <div className="entry-featured-grid">
            {featuredDrops.map((drop) => {
              const posterSrc = resolveDropPoster(drop);
              return (
                <Link
                  key={drop.id}
                  href={routes.drop(drop.id)}
                  className="entry-featured-card"
                >
                  {posterSrc ? (
                    <OptimizedImage
                      src={posterSrc}
                      alt={drop.title}
                      preset="dropPosterCard"
                      style={{
                        width: "100%",
                        height: 180,
                        objectFit: "cover",
                        borderRadius: "0.5rem 0.5rem 0 0"
                      }}
                    />
                  ) : (
                    <div className="entry-featured-poster-placeholder">
                      {drop.title.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="entry-featured-card-body">
                    <h3>{drop.title}</h3>
                    <p className="entry-featured-meta">
                      {formatUsd(drop.priceUsd)} · @{drop.studioHandle}
                    </p>
                    <p className="entry-featured-synopsis">{drop.synopsis}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ── worlds ── */}
      {worlds.length > 0 ? (
        <section className="entry-featured-section" aria-label="worlds">
          <div className="entry-section-header">
            <h2>explore worlds</h2>
            <Link href={routes.worlds()} className="entry-section-link">
              all worlds
            </Link>
          </div>
          <div className="entry-featured-grid">
            {worlds.slice(0, 3).map((world) => {
              const coverSrc = resolveWorldCover(world);
              return (
                <Link
                  key={world.id}
                  href={routes.world(world.id)}
                  className="entry-featured-card"
                >
                  {coverSrc ? (
                    <OptimizedImage
                      src={coverSrc}
                      alt={`${world.title} cover`}
                      preset="dropPosterCard"
                      style={{
                        width: "100%",
                        height: 160,
                        objectFit: "cover",
                        borderRadius: "0.5rem 0.5rem 0 0"
                      }}
                    />
                  ) : (
                    <div className="entry-featured-poster-placeholder">
                      {world.title.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="entry-featured-card-body">
                    <h3>{world.title}</h3>
                    <p className="entry-featured-meta">
                      @{world.studioHandle}
                      {world.entryRule && world.entryRule !== "open"
                        ? ` · ${world.entryRule}`
                        : " · open"}
                    </p>
                    <p className="entry-featured-synopsis">{world.synopsis}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ── footer CTA ── */}
      <section className="entry-footer-cta">
        {session ? (
          <div className="entry-actions">
            <Link href={routes.explore()} className="entry-primary-cta">
              start exploring
            </Link>
          </div>
        ) : (
          <div className="entry-actions">
            <p className="entry-tagline">ready to join?</p>
            <Link href={signUpHref} className="entry-primary-cta">
              create your account
            </Link>
            <Link href={routes.explore()} className="entry-secondary-cta">
              browse as guest
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
