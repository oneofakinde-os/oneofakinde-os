import type { Drop, World } from "@/lib/domain/contracts";

/**
 * Resolves the best available poster image source from a drop's preview media.
 * Prefers watch poster, then photos poster, then raw src.
 */
export function resolveDropPoster(drop: Drop): string | undefined {
  const preview = drop.previewMedia?.watch ?? drop.previewMedia?.photos;
  return preview?.posterSrc ?? preview?.src ?? undefined;
}

/**
 * Resolves the cover image source from a world's visual identity.
 */
export function resolveWorldCover(world: World): string | undefined {
  return world.visualIdentity?.coverImageSrc ?? undefined;
}
