import { LiveSessionScreen } from "@/features/live/live-session-screen";
import type { LiveSessionConversationThread, LiveSessionEligibility } from "@/lib/domain/contracts";
import { gateway } from "@/lib/gateway";
import { getOptionalSession } from "@/lib/server/session";
import { notFound } from "next/navigation";

type LiveSessionPageProps = {
  params: Promise<{ session_id: string }>;
};

export default async function LiveSessionPage({ params }: LiveSessionPageProps) {
  const { session_id } = await params;

  const [session, liveSession] = await Promise.all([
    getOptionalSession(),
    gateway.getLiveSessionById(session_id)
  ]);

  if (!liveSession) {
    notFound();
  }

  let eligibility: LiveSessionEligibility | null = null;
  let conversation: LiveSessionConversationThread | null = null;

  if (session) {
    const [eligibilityResult, conversationResult] = await Promise.all([
      gateway.getCollectLiveSessionEligibility(session.accountId, liveSession.id),
      gateway.getLiveSessionConversationThread(session.accountId, liveSession.id)
    ]);

    eligibility = eligibilityResult;
    conversation = conversationResult.ok ? conversationResult.thread : null;
  }

  return (
    <LiveSessionScreen
      liveSession={liveSession}
      viewer={session}
      conversation={conversation}
      eligibility={eligibility}
    />
  );
}
