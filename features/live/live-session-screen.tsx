import { AppShell } from "@/features/shell/app-shell";
import { LiveSessionConversation } from "@/features/live/live-session-conversation";
import type {
  LiveSession,
  LiveSessionConversationThread,
  LiveSessionEligibility,
  Session
} from "@/lib/domain/contracts";
import { routes } from "@/lib/routes";
import Link from "next/link";

type LiveSessionScreenProps = {
  liveSession: LiveSession;
  viewer: Session | null;
  conversation: LiveSessionConversationThread | null;
  eligibility: LiveSessionEligibility | null;
};

const ELIGIBILITY_REASON_COPY: Record<string, string> = {
  eligible_public: "public access",
  eligible_membership_active: "membership verified",
  eligible_drop_owner: "drop ownership verified",
  session_required: "sign in required",
  membership_required: "membership or world collect required",
  patron_required: "active patron or world collect required",
  ownership_required: "drop ownership required"
};

function formatTimestamp(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return value;
  }
  return `${new Date(parsed).toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

export function LiveSessionScreen({
  liveSession,
  viewer,
  conversation,
  eligibility
}: LiveSessionScreenProps) {
  const joinHref = `/api/v1/live-sessions/${encodeURIComponent(liveSession.id)}/join`;
  const isEligible = eligibility?.eligible === true;
  const eligibilityLabel = eligibility
    ? ELIGIBILITY_REASON_COPY[eligibility.reason] ?? eligibility.reason
    : "sign in to check eligibility";
  const hasExclusiveDropWindow =
    !!liveSession.exclusiveDropWindowDropId && typeof liveSession.exclusiveDropWindowDelay === "number";

  return (
    <AppShell
      title="live session"
      subtitle={liveSession.title}
      session={viewer}
    >
      <section className="slice-panel">
        <p className="slice-label">studio @{liveSession.studioHandle}</p>
        <h2 className="slice-title">{liveSession.title}</h2>
        <p className="slice-copy">{liveSession.synopsis}</p>

        <div className="slice-meta" data-testid="live-session-meta">
          <p className="slice-label">
            starts: {formatTimestamp(liveSession.startsAt)}
          </p>
          {liveSession.endsAt && (
            <p className="slice-label">
              ends: {formatTimestamp(liveSession.endsAt)}
            </p>
          )}
          {typeof liveSession.capacity === "number" && (
            <p className="slice-label" data-testid="live-session-viewer-count">
              capacity: {liveSession.capacity} viewers
            </p>
          )}
          {liveSession.type && (
            <p className="slice-label">type: {liveSession.type}</p>
          )}
        </div>
      </section>

      <section className="slice-panel">
        <h3 className="slice-heading">stream</h3>
        <div
          data-testid="live-stream-embed"
          style={{
            width: "100%",
            aspectRatio: "16 / 9",
            backgroundColor: "#111",
            borderRadius: "0.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#666",
            fontSize: "0.875rem"
          }}
        >
          stream embed placeholder
        </div>
      </section>

      <section className="slice-panel">
        <h3 className="slice-heading">eligibility</h3>
        <p
          className="slice-label"
          data-testid="live-session-eligibility-badge"
          style={{
            display: "inline-block",
            padding: "0.25rem 0.75rem",
            borderRadius: "999px",
            backgroundColor: isEligible ? "#166534" : "#7f1d1d",
            color: "#fff",
            fontSize: "0.75rem"
          }}
        >
          {isEligible ? "eligible" : "not eligible"} &mdash; {eligibilityLabel}
        </p>

        {isEligible && (
          <div className="slice-button-row" style={{ marginTop: "0.75rem" }}>
            <a
              href={joinHref}
              className="slice-button"
              data-testid="live-session-join-button"
            >
              join session
            </a>
          </div>
        )}
      </section>

      {hasExclusiveDropWindow && (
        <section className="slice-panel" data-testid="live-session-exclusive-drop-window">
          <h3 className="slice-heading">exclusive drop window</h3>
          <p className="slice-copy">
            drop: {liveSession.exclusiveDropWindowDropId}
          </p>
          {typeof liveSession.exclusiveDropWindowDelay === "number" && (
            <p className="slice-label">
              window delay: {liveSession.exclusiveDropWindowDelay}ms after session start
            </p>
          )}
        </section>
      )}

      <LiveSessionConversation
        liveSessionId={liveSession.id}
        initialThread={conversation}
        canPost={Boolean(viewer)}
      />

      <div className="slice-button-row" style={{ marginTop: "1rem" }}>
        <Link href={routes.liveHub()} className="slice-button">
          back to live
        </Link>
      </div>
    </AppShell>
  );
}
