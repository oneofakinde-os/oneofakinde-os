import Link from "next/link";
import type { Session, TownhallPost } from "@/lib/domain/contracts";
import type { HashtagTrend } from "@/lib/social/hashtags";
import { routes } from "@/lib/routes";

type HashtagBrowseScreenProps = {
  tag: string;
  posts: TownhallPost[];
  trends: HashtagTrend[];
  session: Session | null;
};

function formatTimestamp(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

export function HashtagBrowseScreen({ tag, posts, trends, session }: HashtagBrowseScreenProps) {
  void session;

  return (
    <main className="townhall-search-screen">
      <section className="townhall-search-shell">
        <p className="townhall-search-label">hashtag</p>
        <h1 className="townhall-search-title">#{tag}</h1>
        <p className="townhall-search-copy">
          {posts.length} post{posts.length !== 1 ? "s" : ""}
        </p>

        <div className="townhall-search-actions">
          <Link href={routes.townhall()} className="townhall-search-link">
            townhall
          </Link>
          <Link href={routes.townhallSearch()} className="townhall-search-link">
            search
          </Link>
        </div>

        {trends.length > 0 ? (
          <section className="slice-panel" data-testid="trending-hashtags" style={{ marginTop: "1rem" }}>
            <p className="slice-label">trending hashtags</p>
            <div className="hashtag-trend-list">
              {trends.map((trend) => (
                <Link
                  key={trend.hashtag}
                  href={routes.townhallHashtag(trend.hashtag)}
                  className={`hashtag-chip${trend.hashtag === tag ? " hashtag-chip-active" : ""}`}
                >
                  #{trend.hashtag}
                  <span className="hashtag-chip-count">{trend.count}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="slice-panel" data-testid="hashtag-posts" style={{ marginTop: "1rem" }}>
          <p className="slice-label">posts</p>
          {posts.length === 0 ? (
            <p className="slice-copy">no posts with #{tag} yet.</p>
          ) : (
            <ul className="slice-list" aria-label={`posts tagged ${tag}`}>
              {posts.map((post) => (
                <li key={post.id} className="slice-drop-card" data-testid="hashtag-post">
                  <div className="slice-row">
                    <p className="slice-label">@{post.authorHandle}</p>
                    <p className="slice-meta">{formatTimestamp(post.createdAt)}</p>
                  </div>
                  <p className="slice-copy">{post.body}</p>
                  {post.hashtags && post.hashtags.length > 0 ? (
                    <div className="hashtag-trend-list">
                      {post.hashtags.map((h) => (
                        <Link key={h} href={routes.townhallHashtag(h)} className="hashtag-chip sm">
                          #{h}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </main>
  );
}
