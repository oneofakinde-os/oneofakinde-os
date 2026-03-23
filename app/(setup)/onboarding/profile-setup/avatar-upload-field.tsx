"use client";

import { OptimizedImage } from "@/features/media/optimized-image";
import { useMediaUpload } from "@/lib/hooks/use-media-upload";
import { useCallback, useState } from "react";

type AvatarUploadFieldProps = {
  currentAvatarUrl?: string;
  handle: string;
};

export function AvatarUploadField({ currentAvatarUrl, handle }: AvatarUploadFieldProps) {
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl ?? "");

  const onUploadComplete = useCallback(
    async (file: { publicUrl: string }) => {
      setAvatarUrl(file.publicUrl);

      // Persist the avatar URL to the account profile
      await fetch("/api/v1/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: file.publicUrl })
      });
    },
    []
  );

  const { uploading, error, inputRef, openPicker, upload } = useMediaUpload({
    bucket: "avatars",
    maxFiles: 1,
    onUploadComplete
  });

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        upload(e.target.files);
        e.target.value = "";
      }
    },
    [upload]
  );

  return (
    <div className="identity-avatar-upload">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        style={{ display: "none" }}
        aria-hidden
      />

      <div className="identity-avatar-preview">
        {avatarUrl ? (
          <OptimizedImage
            src={avatarUrl}
            alt={`@${handle}`}
            className="slice-avatar slice-avatar-lg"
            width={64}
            height={64}
            preset="avatarUpload"
          />
        ) : (
          <span className="slice-avatar-placeholder slice-avatar-placeholder-lg" aria-hidden>
            {handle.charAt(0)}
          </span>
        )}
      </div>

      <div className="identity-upload-row">
        <button
          type="button"
          className="identity-chip"
          onClick={openPicker}
          disabled={uploading}
        >
          {uploading ? "uploading..." : avatarUrl ? "change image" : "upload image"}
        </button>
        <span className="identity-upload-note">png, jpg, or webp — max 5 MB</span>
      </div>

      {error ? <p className="slice-upload-error">{error}</p> : null}
    </div>
  );
}
