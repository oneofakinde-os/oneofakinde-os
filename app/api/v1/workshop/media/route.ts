import { requireRequestSession } from "@/lib/bff/auth";
import { badRequest, forbidden, ok } from "@/lib/bff/http";
import { uploadFile, listFiles, deleteFiles, type StorageBucket } from "@/lib/supabase/storage";
import { emitOperationalEvent } from "@/lib/ops/observability";

const VALID_BUCKETS = new Set<StorageBucket>(["drop-media", "world-media", "avatars"]);

const MAX_FILE_SIZE: Record<StorageBucket, number> = {
  "drop-media": 52_428_800,  // 50 MB
  "world-media": 20_971_520, // 20 MB
  avatars: 5_242_880,        // 5 MB
  certificates: 10_485_760   // 10 MB (server-only)
};

/**
 * POST /api/v1/workshop/media
 *
 * Uploads a media file to Supabase Storage.
 * Expects multipart/form-data with:
 *   - file: the file to upload
 *   - bucket: "drop-media" | "world-media" | "avatars"
 *   - fileName: optional custom filename (auto-generated if omitted)
 */
export async function POST(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return badRequest("multipart/form-data body is required");
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return badRequest("file field is required and must be a file");
  }

  const bucketInput = String(formData.get("bucket") ?? "drop-media").trim();
  if (!VALID_BUCKETS.has(bucketInput as StorageBucket)) {
    return badRequest(`bucket must be one of: ${[...VALID_BUCKETS].join(", ")}`);
  }
  const bucket = bucketInput as StorageBucket;

  if (file.size > MAX_FILE_SIZE[bucket]) {
    return badRequest(`file exceeds maximum size of ${MAX_FILE_SIZE[bucket]} bytes for ${bucket}`);
  }

  const customName = formData.get("fileName");
  const timestamp = Date.now();
  const originalName = file instanceof File ? file.name : "upload";
  const extension = originalName.includes(".")
    ? originalName.slice(originalName.lastIndexOf("."))
    : "";
  const fileName = typeof customName === "string" && customName.trim()
    ? customName.trim()
    : `${timestamp}${extension}`;

  try {
    const result = await uploadFile(
      bucket,
      guard.session.accountId,
      fileName,
      file,
      {
        contentType: file.type || undefined,
        upsert: formData.get("upsert") === "true"
      }
    );

    emitOperationalEvent("workshop_media_uploaded", {
      accountId: guard.session.accountId,
      bucket,
      path: result.path,
      size: file.size
    });

    return ok({ upload: result }, 201);
  } catch (err) {
    emitOperationalEvent("workshop_media_upload_failed", {
      accountId: guard.session.accountId,
      bucket,
      error: err instanceof Error ? err.message : "unknown"
    });
    return badRequest(err instanceof Error ? err.message : "upload failed");
  }
}

/**
 * GET /api/v1/workshop/media?bucket=drop-media&folder=<accountId>
 *
 * Lists media files for the authenticated creator.
 */
export async function GET(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  const { searchParams } = new URL(request.url);
  const bucketInput = searchParams.get("bucket") ?? "drop-media";
  if (!VALID_BUCKETS.has(bucketInput as StorageBucket)) {
    return badRequest(`bucket must be one of: ${[...VALID_BUCKETS].join(", ")}`);
  }
  const bucket = bucketInput as StorageBucket;

  const files = await listFiles(bucket, guard.session.accountId, {
    limit: 50
  });

  return ok({ files, bucket });
}

/**
 * DELETE /api/v1/workshop/media
 *
 * Deletes media files. Body: { bucket, paths: string[] }
 */
export async function DELETE(request: Request) {
  const guard = await requireRequestSession(request);
  if (!guard.ok) {
    return guard.response;
  }

  if (!guard.session.roles.includes("creator")) {
    return forbidden("creator role is required");
  }

  let body: { bucket?: string; paths?: string[] };
  try {
    body = await request.json();
  } catch {
    return badRequest("JSON body is required");
  }

  const bucketInput = String(body.bucket ?? "drop-media").trim();
  if (!VALID_BUCKETS.has(bucketInput as StorageBucket)) {
    return badRequest(`bucket must be one of: ${[...VALID_BUCKETS].join(", ")}`);
  }
  const bucket = bucketInput as StorageBucket;

  const paths = body.paths;
  if (!Array.isArray(paths) || paths.length === 0) {
    return badRequest("paths array is required");
  }

  // Ensure creator can only delete their own files
  const prefix = `${guard.session.accountId}/`;
  const safePaths = paths.filter(
    (p) => typeof p === "string" && p.startsWith(prefix)
  );

  if (safePaths.length === 0) {
    return badRequest("no valid paths to delete");
  }

  await deleteFiles(bucket, safePaths);

  emitOperationalEvent("workshop_media_deleted", {
    accountId: guard.session.accountId,
    bucket,
    count: safePaths.length
  });

  return ok({ deleted: safePaths.length });
}
