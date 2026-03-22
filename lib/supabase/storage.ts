import { createClient } from "@/lib/supabase/server";

export type StorageBucket = "drop-media" | "world-media" | "avatars" | "certificates";

type UploadResult = {
  path: string;
  publicUrl: string;
};

type SignedUrlResult = {
  signedUrl: string;
  path: string;
};

/**
 * Resolves the public URL for a file in a public bucket.
 * Does not make a network request — constructs the URL from the project config.
 */
export function getPublicUrl(bucket: StorageBucket, path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!base) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required for storage");
  }
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

/**
 * Uploads a file to a Supabase Storage bucket.
 *
 * The file path is scoped by `ownerAccountId` so RLS policies are satisfied.
 * Returns the storage path and public URL (for public buckets).
 */
export async function uploadFile(
  bucket: StorageBucket,
  ownerAccountId: string,
  fileName: string,
  file: File | Blob | Buffer,
  options?: {
    contentType?: string;
    upsert?: boolean;
  }
): Promise<UploadResult> {
  const supabase = await createClient();

  const storagePath = `${ownerAccountId}/${fileName}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, file, {
      contentType: options?.contentType,
      upsert: options?.upsert ?? false
    });

  if (error) {
    throw new Error(`storage upload failed (${bucket}/${storagePath}): ${error.message}`);
  }

  return {
    path: storagePath,
    publicUrl: getPublicUrl(bucket, storagePath)
  };
}

/**
 * Deletes one or more files from a bucket.
 */
export async function deleteFiles(
  bucket: StorageBucket,
  paths: string[]
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.storage
    .from(bucket)
    .remove(paths);

  if (error) {
    throw new Error(`storage delete failed (${bucket}): ${error.message}`);
  }
}

/**
 * Creates a short-lived signed URL for a file in a private bucket.
 * Useful for certificates and other access-controlled assets.
 */
export async function createSignedUrl(
  bucket: StorageBucket,
  path: string,
  expiresInSeconds = 3600
): Promise<SignedUrlResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`signed url creation failed (${bucket}/${path}): ${error?.message ?? "no url returned"}`);
  }

  return {
    signedUrl: data.signedUrl,
    path
  };
}

/**
 * Lists files in a bucket folder.
 */
export async function listFiles(
  bucket: StorageBucket,
  folder: string,
  options?: { limit?: number; offset?: number }
): Promise<{ name: string; size: number; createdAt: string }[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder, {
      limit: options?.limit ?? 100,
      offset: options?.offset ?? 0,
      sortBy: { column: "created_at", order: "desc" }
    });

  if (error) {
    throw new Error(`storage list failed (${bucket}/${folder}): ${error.message}`);
  }

  return (data ?? []).map((item) => ({
    name: item.name,
    size: (item.metadata as Record<string, unknown>)?.size as number ?? 0,
    createdAt: item.created_at ?? ""
  }));
}
