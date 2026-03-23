"use client";

import { useState } from "react";
import { useToast } from "@/features/shared/toast-context";

type FollowStudioButtonProps = {
  studioHandle: string;
  initialFollowing: boolean;
  initialFollowerCount: number;
};

export function FollowStudioButton({
  studioHandle,
  initialFollowing,
  initialFollowerCount
}: FollowStudioButtonProps) {
  const [following, setFollowing] = useState(initialFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [busy, setBusy] = useState(false);
  const { addToast } = useToast();

  async function toggle() {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/v1/studios/${encodeURIComponent(studioHandle)}/follow`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: following ? "unfollow" : "follow" })
        }
      );

      if (response.ok) {
        const body = (await response.json()) as {
          ok: boolean;
          following: boolean;
          followerCount: number;
        };
        setFollowing(body.following);
        setFollowerCount(body.followerCount);
        addToast({
          message: body.following
            ? `now following @${studioHandle}`
            : `unfollowed @${studioHandle}`,
          variant: body.following ? "success" : "info"
        });
      } else {
        addToast({ message: "could not update follow status", variant: "error" });
      }
    } catch {
      addToast({ message: "network error — please try again", variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`slice-button ${following ? "ghost" : "alt"}`}
      onClick={toggle}
      disabled={busy}
      data-testid="follow-studio-button"
    >
      {busy ? "updating..." : following ? "following" : "follow"}
      <span className="slice-meta" style={{ marginLeft: "0.5rem" }}>
        {followerCount}
      </span>
    </button>
  );
}
