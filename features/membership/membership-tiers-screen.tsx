"use client";

import { AppShell } from "@/features/shell/app-shell";
import { formatUsd } from "@/features/shared/format";
import type {
  PatronTierConfig,
  Session,
  World
} from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";
import { useCallback, useState } from "react";

type MembershipTiersScreenProps = {
  world: World;
  session: Session;
  isMember: boolean;
  isPatron: boolean;
  patronTierConfigs: PatronTierConfig[];
};

const CADENCE_LABEL: Record<string, string> = {
  weekly: "per week",
  monthly: "per month",
  quarterly: "per quarter"
};

function formatPeriodDays(days: number): string {
  if (days <= 7) return "weekly";
  if (days <= 31) return "monthly";
  if (days <= 92) return "quarterly";
  return `${days} days`;
}

export function MembershipTiersScreen({
  world,
  session,
  isMember,
  isPatron,
  patronTierConfigs
}: MembershipTiersScreenProps) {
  const [joining, setJoining] = useState(false);
  const [memberState, setMemberState] = useState(isMember);
  const [committing, setCommitting] = useState(false);
  const [patronState, setPatronState] = useState(isPatron);
  const [commitSuccess, setCommitSuccess] = useState<string | null>(null);

  const activeTiers = patronTierConfigs.filter((t) => t.status === "active");

  const handleJoin = useCallback(async () => {
    if (joining) return;
    setJoining(true);
    try {
      const res = await fetch(
        `/api/v1/worlds/${encodeURIComponent(world.id)}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: memberState ? "leave" : "join" })
        }
      );
      if (res.ok) {
        setMemberState(!memberState);
      }
    } finally {
      setJoining(false);
    }
  }, [joining, memberState, world.id]);

  const handlePatronCommit = useCallback(
    async (tierTitle: string) => {
      if (committing) return;
      setCommitting(true);
      setCommitSuccess(null);
      try {
        const res = await fetch("/api/v1/patron/commit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studioHandle: world.studioHandle,
            worldId: world.id
          })
        });
        if (res.ok) {
          setPatronState(true);
          setCommitSuccess(tierTitle);
        }
      } finally {
        setCommitting(false);
      }
    },
    [committing, world.id, world.studioHandle]
  );

  return (
    <AppShell
      title="membership"
      subtitle={`membership and patron tiers for ${world.title}`}
      session={session}
      activeNav="worlds"
    >
      <section className="slice-panel">
        <p className="slice-label">
          <Link href={routes.world(world.id)} className="slice-link">
            ← {world.title}
          </Link>
        </p>
        <h2 className="slice-title">membership &amp; patron tiers</h2>
        <p className="slice-copy">
          join this world to access gated content, conversations, and live sessions.
          patron tiers unlock additional recognition and benefits.
        </p>
      </section>

      <section className="slice-panel" data-testid="membership-join-section">
        <p className="slice-label">world membership</p>
        <p className="slice-copy">
          {memberState
            ? "you are a member of this world."
            : "join this world to access member-gated content."}
        </p>
        <p className="slice-meta">
          entry rule: {world.entryRule ?? "open"} · status:{" "}
          {memberState ? "active member" : "not a member"}
        </p>
        <div className="slice-button-row">
          <button
            className={`slice-button ${memberState ? "ghost" : ""}`}
            onClick={handleJoin}
            disabled={joining}
            type="button"
            data-testid="membership-join-button"
          >
            {joining
              ? "processing..."
              : memberState
                ? "leave world"
                : "join world"}
          </button>
        </div>
      </section>

      <section className="slice-panel" data-testid="patron-tiers-section">
        <p className="slice-label">patron tiers</p>
        {activeTiers.length === 0 ? (
          <p className="slice-meta">
            no patron tiers are currently configured for this world.
          </p>
        ) : (
          <>
            <p className="slice-copy">
              support this world&apos;s creator with a patron commitment.
              {patronState ? " you are already a patron." : ""}
            </p>
            {commitSuccess ? (
              <p className="slice-meta" data-testid="patron-commit-success">
                patron commitment confirmed for tier: {commitSuccess}
              </p>
            ) : null}
            <ul className="slice-grid" aria-label="patron tier options">
              {activeTiers.map((tier) => (
                <li
                  key={tier.id}
                  className="slice-drop-card"
                  data-testid="patron-tier-card"
                >
                  <p className="slice-label">patron tier</p>
                  <h2 className="slice-title">{tier.title}</h2>
                  <p className="slice-copy">{tier.benefitsSummary}</p>
                  <p className="slice-meta">
                    {formatUsd(tier.amountCents / 100)}{" "}
                    {tier.commitmentCadence
                      ? CADENCE_LABEL[tier.commitmentCadence] ?? tier.commitmentCadence
                      : formatPeriodDays(tier.periodDays)}
                  </p>
                  {tier.earlyAccessWindowHours ? (
                    <p className="slice-meta">
                      early access: {tier.earlyAccessWindowHours}h before public
                    </p>
                  ) : null}
                  <div className="slice-button-row">
                    {patronState ? (
                      <span className="slice-meta">patron active</span>
                    ) : (
                      <button
                        className="slice-button"
                        onClick={() => handlePatronCommit(tier.title)}
                        disabled={committing}
                        type="button"
                        data-testid="patron-commit-button"
                      >
                        {committing ? "committing..." : "become patron"}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="slice-panel">
        <p className="slice-label">access summary</p>
        <p className="slice-meta">
          membership: {memberState ? "✓ active" : "✗ none"} · patron:{" "}
          {patronState ? "✓ active" : "✗ none"}
        </p>
        <div className="slice-button-row">
          <Link href={routes.world(world.id)} className="slice-button alt">
            back to world
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
