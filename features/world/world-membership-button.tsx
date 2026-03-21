"use client";

import { useState } from "react";

type WorldMembershipButtonProps = {
  worldId: string;
  initialIsMember: boolean;
};

export function WorldMembershipButton({
  worldId,
  initialIsMember
}: WorldMembershipButtonProps) {
  const [isMember, setIsMember] = useState(initialIsMember);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/worlds/${encodeURIComponent(worldId)}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: isMember ? "leave" : "join" })
        }
      );

      if (response.ok) {
        setIsMember(!isMember);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="slice-button alt"
      onClick={handleClick}
      disabled={loading}
      data-testid="world-membership-button"
    >
      {loading
        ? "updating..."
        : isMember
          ? "leave world"
          : "join world"}
    </button>
  );
}
