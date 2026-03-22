"use client";

import { useCallback, useRef, useState } from "react";
import type { StorageBucket } from "@/lib/supabase/storage";

export type UploadedFile = {
  path: string;
  publicUrl: string;
  name: string;
  size: number;
  type: string;
};

type UploadState = {
  /** Files that have been successfully uploaded. */
  files: UploadedFile[];
  /** True while an upload is in flight. */
  uploading: boolean;
  /** Last error message, cleared on next successful upload. */
  error: string | null;
  /** 0–100 progress (per-file, resets between files). */
  progress: number;
};

type UseMediaUploadOptions = {
  bucket?: StorageBucket;
  maxFiles?: number;
  onUploadComplete?: (file: UploadedFile) => void;
};

type UseMediaUploadReturn = UploadState & {
  /** Upload one or more files via the workshop media API. */
  upload: (files: FileList | File[]) => Promise<void>;
  /** Remove an uploaded file from the list (does NOT delete from storage). */
  removeFile: (path: string) => void;
  /** Clear all files and errors. */
  reset: () => void;
  /** Ref to attach to a hidden file input for click-to-upload. */
  inputRef: React.RefObject<HTMLInputElement>;
  /** Open the native file picker. */
  openPicker: () => void;
};

export function useMediaUpload(options: UseMediaUploadOptions = {}): UseMediaUploadReturn {
  const { bucket = "drop-media", maxFiles = 10, onUploadComplete } = options;
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [state, setState] = useState<UploadState>({
    files: [],
    uploading: false,
    error: null,
    progress: 0
  });

  const upload = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;

      setState((prev) => ({ ...prev, uploading: true, error: null, progress: 0 }));

      const uploaded: UploadedFile[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        const progress = Math.round(((i) / files.length) * 100);
        setState((prev) => ({ ...prev, progress }));

        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("bucket", bucket);
          formData.append("upsert", "true");

          const response = await fetch("/api/v1/workshop/media", {
            method: "POST",
            body: formData
          });

          if (!response.ok) {
            const body = await response.json().catch(() => ({ error: "upload failed" }));
            throw new Error(body.error ?? `upload failed (${response.status})`);
          }

          const { upload: result } = await response.json();
          const uploadedFile: UploadedFile = {
            path: result.path,
            publicUrl: result.publicUrl,
            name: file.name,
            size: file.size,
            type: file.type
          };

          uploaded.push(uploadedFile);
          onUploadComplete?.(uploadedFile);
        } catch (err) {
          setState((prev) => ({
            ...prev,
            uploading: false,
            error: err instanceof Error ? err.message : "upload failed",
            progress: 0
          }));
          return;
        }
      }

      setState((prev) => ({
        files: [...prev.files, ...uploaded].slice(-maxFiles),
        uploading: false,
        error: null,
        progress: 100
      }));
    },
    [bucket, maxFiles, onUploadComplete]
  );

  const removeFile = useCallback((path: string) => {
    setState((prev) => ({
      ...prev,
      files: prev.files.filter((f) => f.path !== path)
    }));
  }, []);

  const reset = useCallback(() => {
    setState({ files: [], uploading: false, error: null, progress: 0 });
  }, []);

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return {
    ...state,
    upload,
    removeFile,
    reset,
    inputRef,
    openPicker
  };
}
