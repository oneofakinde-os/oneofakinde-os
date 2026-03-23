/**
 * Supabase Storage image transform URL builder.
 *
 * Supabase supports on-the-fly image transforms via the render endpoint:
 *   `{base}/storage/v1/render/image/public/{bucket}/{path}?width=200&resize=cover`
 *
 * This module provides a typed helper to build those URLs, with
 * automatic fallback to the original URL when transforms aren't available
 * (e.g. external CDN URLs or when the storage base isn't configured).
 *
 * @see https://supabase.com/docs/guides/storage/serving/image-transformations
 */

export type ImageTransformOptions = {
  /** Target width in pixels. */
  width?: number;
  /** Target height in pixels. */
  height?: number;
  /** Resize mode. "cover" fills the area, "contain" fits within, "fill" stretches. */
  resize?: "cover" | "contain" | "fill";
  /** Quality 1–100. Defaults to 80 for a good size/quality trade-off. */
  quality?: number;
  /** Output format override. Omit to let Supabase auto-negotiate (webp when supported). */
  format?: "origin" | "avif" | "webp";
};

const SUPABASE_URL = (
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ""
    : ""
);

const STORAGE_BASE = (
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_MEDIA_STORAGE_BASE?.trim() || ""
    : ""
);

/**
 * The base URL used for Storage operations (either the explicit storage base
 * or the Supabase project URL).
 */
const effectiveBase = STORAGE_BASE || SUPABASE_URL;

/**
 * Returns true when the given URL is a Supabase Storage public object URL
 * that can be transformed via the render endpoint.
 */
function isStorageObjectUrl(url: string): boolean {
  if (!effectiveBase) return false;
  return url.startsWith(`${effectiveBase}/storage/v1/object/public/`);
}

/**
 * Build an optimized image URL.
 *
 * If the source URL points to a Supabase Storage public object, returns
 * the render endpoint URL with the requested transforms applied.
 *
 * For external URLs (or when no Supabase base is configured), returns
 * the original URL unchanged — no breakage, just no optimization.
 */
export function imageTransformUrl(
  src: string,
  options: ImageTransformOptions = {}
): string {
  if (!src) return src;
  if (!isStorageObjectUrl(src)) return src;

  // Replace /object/public/ with /render/image/public/
  const renderUrl = src.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/"
  );

  const params = new URLSearchParams();

  if (options.width) params.set("width", String(options.width));
  if (options.height) params.set("height", String(options.height));
  if (options.resize) params.set("resize", options.resize);
  if (options.quality) params.set("quality", String(options.quality));
  if (options.format) params.set("format", options.format);

  // Default quality when transforms are applied.
  if (!options.quality && (options.width || options.height)) {
    params.set("quality", "80");
  }

  const qs = params.toString();
  return qs ? `${renderUrl}?${qs}` : renderUrl;
}

/**
 * Convenience presets for common image sizes used across the app.
 */
export const IMAGE_PRESETS = {
  /** Navigation bar avatar — 28×28. */
  avatarNav: { width: 56, height: 56, resize: "cover" } as const,
  /** Presence card avatar — 40×40. */
  avatarCard: { width: 80, height: 80, resize: "cover" } as const,
  /** Settings panel avatar — 56×56. */
  avatarSettings: { width: 112, height: 112, resize: "cover" } as const,
  /** Avatar upload preview — 64×64. */
  avatarUpload: { width: 128, height: 128, resize: "cover" } as const,
  /** Drop poster in showroom featured rail. */
  dropPosterCard: { width: 480, height: 800, resize: "cover" } as const,
  /** Drop poster in townhall feed (full-screen). */
  dropPosterFull: { width: 960, height: 1600, resize: "cover" } as const,
  /** Thumbnail for lazy previews. */
  thumbnail: { width: 200, height: 200, resize: "cover" } as const,
} satisfies Record<string, ImageTransformOptions>;
