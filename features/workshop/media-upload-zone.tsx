"use client";

import { useMediaUpload, type UploadedFile } from "@/lib/hooks/use-media-upload";
import type { StorageBucket } from "@/lib/supabase/storage";
import { useCallback, useState, type DragEvent } from "react";

type MediaUploadZoneProps = {
  bucket?: StorageBucket;
  accept?: string;
  maxFiles?: number;
  label?: string;
  hint?: string;
  onUploadComplete?: (file: UploadedFile) => void;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function mediaTypeIcon(type: string): string {
  if (type.startsWith("image/")) return "img";
  if (type.startsWith("video/")) return "vid";
  if (type.startsWith("audio/")) return "aud";
  return "file";
}

export function MediaUploadZone({
  bucket = "drop-media",
  accept = "image/*,video/*,audio/*",
  maxFiles = 10,
  label = "drop media here or click to upload",
  hint,
  onUploadComplete
}: MediaUploadZoneProps) {
  const {
    files,
    uploading,
    error,
    progress,
    upload,
    removeFile,
    inputRef,
    openPicker
  } = useMediaUpload({ bucket, maxFiles, onUploadComplete });

  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);

      if (e.dataTransfer.files.length > 0) {
        upload(e.dataTransfer.files);
      }
    },
    [upload]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        upload(e.target.files);
        e.target.value = "";
      }
    },
    [upload]
  );

  return (
    <div className="slice-upload-zone-wrapper">
      <div
        className={`slice-upload-zone${dragOver ? " drag-over" : ""}${uploading ? " uploading" : ""}`}
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={handleInputChange}
          style={{ display: "none" }}
          aria-hidden
        />

        {uploading ? (
          <div className="slice-upload-progress">
            <div className="slice-upload-progress-bar" style={{ width: `${progress}%` }} />
            <span className="slice-meta">uploading... {progress}%</span>
          </div>
        ) : (
          <>
            <span className="slice-upload-icon" aria-hidden>+</span>
            <span className="slice-upload-label">{label}</span>
            {hint ? <span className="slice-meta">{hint}</span> : null}
          </>
        )}
      </div>

      {error ? (
        <p className="slice-upload-error" role="alert">{error}</p>
      ) : null}

      {files.length > 0 ? (
        <ul className="slice-upload-file-list" aria-label="uploaded files">
          {files.map((file) => (
            <li key={file.path} className="slice-upload-file-item">
              <span className="slice-upload-file-badge">{mediaTypeIcon(file.type)}</span>
              <span className="slice-upload-file-name" title={file.name}>
                {file.name}
              </span>
              <span className="slice-meta">{formatFileSize(file.size)}</span>
              <button
                type="button"
                className="slice-button ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(file.path);
                }}
                aria-label={`remove ${file.name}`}
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
