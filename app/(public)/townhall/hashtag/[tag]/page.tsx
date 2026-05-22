import { HashtagBrowseScreen } from "@/features/townhall/hashtag-browse-screen";
import { commerceBffService } from "@/lib/bff/service";
import { normalizeHashtag } from "@/lib/social/hashtags";
import { getOptionalSession } from "@/lib/server/session";
import type { Metadata } from "next";

type HashtagPageProps = {
  params: Promise<{ tag: string }>;
};

export async function generateMetadata({ params }: HashtagPageProps): Promise<Metadata> {
  const { tag } = await params;
  const normalized = normalizeHashtag(decodeURIComponent(tag));
  return { title: `#${normalized} · townhall` };
}

export default async function HashtagPage({ params }: HashtagPageProps) {
  const { tag } = await params;
  const normalized = normalizeHashtag(decodeURIComponent(tag));

  const [session, posts, trends] = await Promise.all([
    getOptionalSession(),
    commerceBffService.listTownhallPostsByHashtag(null, normalized),
    commerceBffService.getTrendingHashtags()
  ]);

  return <HashtagBrowseScreen tag={normalized} posts={posts} trends={trends} session={session} />;
}
