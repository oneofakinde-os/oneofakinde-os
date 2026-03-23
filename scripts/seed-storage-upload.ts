/**
 * Seed Storage Upload Script
 *
 * Downloads all seed media assets from their external CDN fallback URLs
 * and uploads them to Supabase Storage buckets.
 *
 * Usage:
 *   npx tsx scripts/seed-storage-upload.ts
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL  — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Service role key (bypasses RLS)
 *
 * Options:
 *   --dry-run    List assets without uploading
 *   --force      Overwrite existing files (upsert)
 *   --skip-video Skip large video files (for faster testing)
 */

import { SEED_ASSETS, type AssetEntry } from "../lib/media/asset-manifest";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const FORCE = args.has("--force");
const SKIP_VIDEO = args.has("--skip-video");

// ─── Helpers ────────────────────────────────────────────────────────

function isAbsoluteUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

function inferContentType(path: string): string {
  if (path.endsWith(".mp4")) return "video/mp4";
  if (path.endsWith(".webm")) return "video/webm";
  if (path.endsWith(".mp3")) return "audio/mpeg";
  if (path.endsWith(".ogg")) return "audio/ogg";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".avif")) return "image/avif";
  return "application/octet-stream";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function downloadAsset(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  // Follow redirects (picsum.photos redirects to the actual image).
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`download failed: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") ?? inferContentType(url);

  return { buffer, contentType };
}

async function uploadToStorage(
  bucket: string,
  path: string,
  buffer: Buffer,
  contentType: string,
  upsert: boolean
): Promise<{ status: number; error?: string }> {
  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": contentType,
      ...(upsert ? { "x-upsert": "true" } : {})
    },
    body: buffer
  });

  if (!response.ok) {
    const body = await response.text();
    // 409 = already exists (skip unless --force).
    if (response.status === 409 && !upsert) {
      return { status: 409, error: "already exists" };
    }
    return { status: response.status, error: body };
  }

  return { status: response.status };
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
    console.error("       set them in your environment or .env.local file.");
    process.exit(1);
  }

  const entries = Object.entries(SEED_ASSETS) as [string, AssetEntry][];

  // Filter to downloadable assets.
  const downloadable = entries.filter(([, entry]) => isAbsoluteUrl(entry.fallbackUrl));
  const skippedLocal = entries.length - downloadable.length;

  // Optionally skip videos.
  const assets = SKIP_VIDEO
    ? downloadable.filter(([, entry]) => !entry.storagePath.endsWith(".mp4"))
    : downloadable;

  const skippedVideo = downloadable.length - assets.length;

  console.log(`\nseed storage upload`);
  console.log(`───────────────────────────────────────`);
  console.log(`total assets in manifest:  ${entries.length}`);
  console.log(`downloadable (http URLs):  ${downloadable.length}`);
  if (skippedLocal > 0) console.log(`skipped (local paths):     ${skippedLocal}`);
  if (skippedVideo > 0) console.log(`skipped (--skip-video):    ${skippedVideo}`);
  console.log(`to upload:                 ${assets.length}`);
  console.log(`mode:                      ${DRY_RUN ? "DRY RUN" : FORCE ? "FORCE (upsert)" : "normal"}`);
  console.log(`target:                    ${SUPABASE_URL}`);
  console.log(`───────────────────────────────────────\n`);

  if (DRY_RUN) {
    for (const [key, entry] of assets) {
      console.log(`  [dry-run] ${entry.bucket}/${entry.storagePath}`);
      console.log(`            ← ${entry.fallbackUrl}\n`);
    }
    console.log(`\ndry run complete. ${assets.length} assets would be uploaded.`);
    return;
  }

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;
  let totalBytes = 0;

  for (const [key, entry] of assets) {
    const label = `${entry.bucket}/${entry.storagePath}`;
    process.stdout.write(`  [${uploaded + skipped + failed + 1}/${assets.length}] ${label} ... `);

    try {
      const { buffer, contentType } = await downloadAsset(entry.fallbackUrl);
      const result = await uploadToStorage(
        entry.bucket,
        entry.storagePath,
        buffer,
        contentType,
        FORCE
      );

      if (result.status === 409) {
        console.log(`skipped (exists)`);
        skipped++;
      } else if (result.error) {
        console.log(`FAILED (${result.status}: ${result.error})`);
        failed++;
      } else {
        totalBytes += buffer.length;
        console.log(`ok (${formatBytes(buffer.length)})`);
        uploaded++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      console.log(`FAILED (${msg})`);
      failed++;
    }
  }

  console.log(`\n───────────────────────────────────────`);
  console.log(`uploaded:  ${uploaded} (${formatBytes(totalBytes)})`);
  if (skipped > 0) console.log(`skipped:   ${skipped} (already exist)`);
  if (failed > 0) console.log(`failed:    ${failed}`);
  console.log(`───────────────────────────────────────`);

  if (uploaded > 0) {
    console.log(`\nnext steps:`);
    console.log(`  1. set NEXT_PUBLIC_MEDIA_STORAGE_BASE=${SUPABASE_URL} on Vercel`);
    console.log(`  2. redeploy — all seed media now serves from Supabase Storage`);
  }

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
