import { SEED_ASSETS, type SeedAssetKey } from "./asset-manifest";

/**
 * Resolves a seed asset key to a URL.
 *
 * When `NEXT_PUBLIC_MEDIA_STORAGE_BASE` is set (e.g. to the Supabase project URL),
 * the asset is served from Supabase Storage:
 *   `{base}/storage/v1/object/public/{bucket}/{storagePath}`
 *
 * When not set, the fallback URL (external CDN) is returned.
 *
 * This allows the entire seed catalog to switch from external CDNs to
 * self-hosted Supabase Storage with a single env var.
 */

const storageBase = typeof process !== "undefined"
  ? process.env.NEXT_PUBLIC_MEDIA_STORAGE_BASE?.trim() || ""
  : "";

export function resolveAssetUrl(key: SeedAssetKey): string {
  const entry = SEED_ASSETS[key];

  if (storageBase) {
    return `${storageBase}/storage/v1/object/public/${entry.bucket}/${entry.storagePath}`;
  }

  return entry.fallbackUrl;
}

/**
 * Resolves a raw URL that might be a Supabase Storage path or an external URL.
 * If the URL is already absolute, returns it as-is.
 * If it starts with "storage:", resolves it against the storage base.
 */
export function resolveMediaUrl(url: string): string {
  if (!url.startsWith("storage:")) {
    return url;
  }

  const path = url.slice("storage:".length);
  if (storageBase) {
    return `${storageBase}/storage/v1/object/public/${path}`;
  }

  // No storage base configured — return as a relative path for debugging
  return `/api/v1/media/${path}`;
}
