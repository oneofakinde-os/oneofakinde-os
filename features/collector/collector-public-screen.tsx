import { OptimizedImage } from "@/features/media/optimized-image";
import { PatronBadge } from "@/features/patron/patron-badge";
import { AppShell } from "@/features/shell/app-shell";
import type { Session } from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type PatronWorldEntry = {
  worldId: string;
  worldTitle: string;
  status: string;
  recognitionTier?: "founding" | "active";
};

type OwnedDropEntry = {
  dropId: string;
  title: string;
  studioHandle: string;
  posterSrc: string | null;
  acquiredAt: string;
};

type CollectorPublicScreenProps = {
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  roles: string[];
  memberSince: string;
  collectionCount: number;
  badgeCount: number;
  patronWorlds: PatronWorldEntry[];
  ownedDrops: OwnedDropEntry[];
  session: Session | null;
};

function formatMemberSince(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

export function CollectorPublicScreen({
  handle,
  displayName,
  avatarUrl,
  bio,
  roles,
  memberSince,
  collectionCount,
  badgeCount,
  patronWorlds,
  ownedDrops,
  session
}: CollectorPublicScreenProps) {
  const isOwnProfile = session?.handle === handle;
  const activePatronWorlds = patronWorlds.filter((w) => w.status === "active");

  return (
    <AppShell
      title="collector"
      subtitle={`@${handle}`}
      session={session}
      activeNav="collect"
    >
      {/* ── Identity ─────────────────────────────────────────── */}
      <section className="slice-panel" data-testid="collector-identity">
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          {avatarUrl ? (
            <OptimizedImage
              src={avatarUrl}
              alt={`@${handle}`}
              className="slice-avatar slice-avatar-lg"
              width={64}
              height={64}
              preset="avatarUpload"
            />
          ) : (
            <span
              className="slice-avatar-placeholder slice-avatar-placeholder-lg"
              aria-hidden
            >
              {handle.charAt(0)}
            </span>
          )}
          <div>
            <h2 className="slice-title">{displayName}</h2>
            <p className="slice-meta">@{handle}</p>
            <p className="slice-meta">
              {roles.join(", ")}
              {memberSince ? ` · member since ${formatMemberSince(memberSince)}` : ""}
            </p>
          </div>
        </div>
        {bio ? <p className="slice-copy" style={{ marginTop: 12 }}>{bio}</p> : null}
      </section>

      {/* ── Stats ────────────────────────────────────────────── */}
      <section className="slice-panel" data-testid="collector-stats">
        <p className="slice-label">collection</p>
        <dl className="slice-metadata-grid">
          <div>
            <dt className="slice-meta">drops collected</dt>
            <dd className="slice-copy">{collectionCount}</dd>
          </div>
          <div>
            <dt className="slice-meta">badges earned</dt>
            <dd className="slice-copy">{badgeCount}</dd>
          </div>
          <div>
            <dt className="slice-meta">patron worlds</dt>
            <dd className="slice-copy">{activePatronWorlds.length}</dd>
          </div>
        </dl>
        {isOwnProfile ? (
          <div className="slice-button-row">
            <Link href={routes.myCollection()} className="slice-button ghost">
              view my collection
            </Link>
          </div>
        ) : null}
      </section>

      {/* ── Owned drops ──────────────────────────────────────── */}
      {ownedDrops.length > 0 ? (
        <section className="slice-panel" data-testid="collector-owned-drops">
          <p className="slice-label">collected drops</p>
          <ul className="slice-list" aria-label="collected drops">
            {ownedDrops.map((entry) => (
              <li key={entry.dropId} className="slice-list-row" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {entry.posterSrc ? (
                  <OptimizedImage
                    src={entry.posterSrc}
                    alt={entry.title}
                    width={40}
                    height={56}
                    preset="thumbnail"
                    style={{ borderRadius: 4, objectFit: "cover" }}
                  />
                ) : (
                  <span
                    className="slice-avatar-placeholder"
                    style={{ width: 40, height: 56, borderRadius: 4, fontSize: 14 }}
                    aria-hidden
                  >
                    {entry.title.charAt(0)}
                  </span>
                )}
                <div>
                  <Link href={routes.drop(entry.dropId)} className="slice-link">
                    {entry.title}
                  </Link>
                  <p className="slice-meta">
                    by{" "}
                    <Link href={routes.studio(entry.studioHandle)} className="slice-link">
                      @{entry.studioHandle}
                    </Link>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="slice-panel" data-testid="collector-owned-drops">
          <p className="slice-label">collected drops</p>
          <p className="slice-meta">no drops collected yet.</p>
        </section>
      )}

      {/* ── Patron worlds ────────────────────────────────────── */}
      <section className="slice-panel" data-testid="collector-patron-worlds">
        <p className="slice-label">patron worlds</p>
        {patronWorlds.length === 0 ? (
          <p className="slice-meta">not a patron of any world yet.</p>
        ) : (
          <ul className="slice-list" aria-label="patron worlds">
            {patronWorlds.map((entry) => (
              <li key={entry.worldId} className="slice-list-row">
                <PatronBadge
                  recognitionTier={entry.recognitionTier ?? "active"}
                  status={entry.status as "active" | "lapsed"}
                  size="compact"
                />
                <Link href={routes.world(entry.worldId)} className="slice-link">
                  {entry.worldTitle}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
