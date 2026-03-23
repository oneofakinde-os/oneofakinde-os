/**
 * Seed asset manifest.
 *
 * Maps logical asset keys to:
 *   - `storagePath`: the path inside a Supabase Storage bucket
 *   - `fallbackUrl`: the external CDN URL used when MEDIA_STORAGE_BASE is not set
 *
 * In production, set `NEXT_PUBLIC_MEDIA_STORAGE_BASE` to the Supabase project URL
 * (e.g. "https://ikcfshaonadcnlgcnecx.supabase.co") and the asset resolver
 * rewrites all paths to Supabase Storage public URLs.
 *
 * In development, leave it unset and the fallback external URLs are used.
 */

export type AssetEntry = {
  bucket: "drop-media" | "world-media";
  storagePath: string;
  fallbackUrl: string;
};

// ─── Drop preview media ─────────────────────────────────────────────

const dropVideo = (dropId: string, mode: string, fileName: string, fallback: string): AssetEntry => ({
  bucket: "drop-media",
  storagePath: `seed/${dropId}/${mode}/${fileName}`,
  fallbackUrl: fallback
});

const dropPoster = (dropId: string, mode: string, seed: string): AssetEntry => ({
  bucket: "drop-media",
  storagePath: `seed/${dropId}/${mode}/poster.jpg`,
  fallbackUrl: `https://picsum.photos/seed/${seed}/960/1600`
});

const dropPhoto = (dropId: string, seed: string): AssetEntry => ({
  bucket: "drop-media",
  storagePath: `seed/${dropId}/photos/main.jpg`,
  fallbackUrl: `https://picsum.photos/seed/${seed}/1200/2000`
});

const dropAudio = (dropId: string, songNum: number): AssetEntry => ({
  bucket: "drop-media",
  storagePath: `seed/${dropId}/listen/track.mp3`,
  fallbackUrl: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${songNum}.mp3`
});

const dropListenPoster = (dropId: string, seed: string): AssetEntry => ({
  bucket: "drop-media",
  storagePath: `seed/${dropId}/listen/poster.jpg`,
  fallbackUrl: `https://picsum.photos/seed/${seed}/960/1600`
});

export const SEED_ASSETS = {
  // ─── stardust ───────────────────────────────────────────────────
  "stardust:watch:video": dropVideo("stardust", "watch", "main.mp4", "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"),
  "stardust:watch:poster": dropPoster("stardust", "watch", "ook-stardust"),
  "stardust:listen:audio": dropAudio("stardust", 1),
  "stardust:listen:poster": dropListenPoster("stardust", "ook-stardust-listen"),
  "stardust:photos:image": dropPhoto("stardust", "ook-stardust-photos"),
  "stardust:live:video": dropVideo("stardust", "live", "main.mp4", "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4"),
  "stardust:live:poster": dropPoster("stardust", "live", "ook-stardust-live"),

  // ─── twilight-whispers ──────────────────────────────────────────
  "twilight-whispers:watch:video": dropVideo("twilight-whispers", "watch", "main.mp4", "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"),
  "twilight-whispers:watch:poster": dropPoster("twilight-whispers", "watch", "ook-twilight-watch"),
  "twilight-whispers:listen:audio": dropAudio("twilight-whispers", 2),
  "twilight-whispers:listen:poster": dropListenPoster("twilight-whispers", "ook-twilight-listen"),
  "twilight-whispers:photos:image": dropPhoto("twilight-whispers", "ook-twilight-photos"),
  "twilight-whispers:live:video": dropVideo("twilight-whispers", "live", "main.mp4", "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"),
  "twilight-whispers:live:poster": dropPoster("twilight-whispers", "live", "ook-twilight-live"),

  // ─── voidrunner ─────────────────────────────────────────────────
  "voidrunner:watch:video": dropVideo("voidrunner", "watch", "main.mp4", "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"),
  "voidrunner:watch:poster": dropPoster("voidrunner", "watch", "ook-voidrunner-watch"),
  "voidrunner:listen:audio": dropAudio("voidrunner", 3),
  "voidrunner:listen:poster": dropListenPoster("voidrunner", "ook-voidrunner-listen"),
  "voidrunner:photos:image": dropPhoto("voidrunner", "ook-voidrunner-photos"),
  "voidrunner:live:video": dropVideo("voidrunner", "live", "main.mp4", "https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"),
  "voidrunner:live:poster": dropPoster("voidrunner", "live", "ook-voidrunner-live"),

  // ─── through-the-lens ───────────────────────────────────────────
  "through-the-lens:watch:video": dropVideo("through-the-lens", "watch", "main.mp4", "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4"),
  "through-the-lens:watch:poster": dropPoster("through-the-lens", "watch", "ook-through-lens-watch"),
  "through-the-lens:listen:audio": dropAudio("through-the-lens", 4),
  "through-the-lens:listen:poster": dropListenPoster("through-the-lens", "ook-through-lens-listen"),
  "through-the-lens:photos:image": dropPhoto("through-the-lens", "ook-through-lens-photos"),
  "through-the-lens:live:video": dropVideo("through-the-lens", "live", "main.mp4", "https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"),
  "through-the-lens:live:poster": dropPoster("through-the-lens", "live", "ook-through-lens-live"),

  // ─── world media ────────────────────────────────────────────────
  "world:dark-matter:cover": {
    bucket: "world-media" as const,
    storagePath: "seed/dark-matter/cover.jpg",
    fallbackUrl: "/images/worlds/dark-matter-cover.jpg"
  },
  "world:dark-matter:ambient": {
    bucket: "world-media" as const,
    storagePath: "seed/dark-matter/ambient.mp3",
    fallbackUrl: "https://cdn.oneofakinde.dev/worlds/dark-matter/ambient.mp3"
  },
  "world:through-the-lens:cover": {
    bucket: "world-media" as const,
    storagePath: "seed/through-the-lens/cover.jpg",
    fallbackUrl: "/images/worlds/through-the-lens-cover.jpg"
  },
  "world:through-the-lens:ambient": {
    bucket: "world-media" as const,
    storagePath: "seed/through-the-lens/ambient.mp3",
    fallbackUrl: "https://cdn.oneofakinde.dev/worlds/through-the-lens/ambient.mp3"
  }
} as const satisfies Record<string, AssetEntry>;

export type SeedAssetKey = keyof typeof SEED_ASSETS;
