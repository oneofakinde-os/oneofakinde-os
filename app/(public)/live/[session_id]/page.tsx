import { LiveSessionScreen } from "@/features/live/live-session-screen";
import { commerceBffService } from "@/lib/bff/service";
import type { LiveSessionConversationThread, LiveSessionEligibility } from "@/lib/domain/contracts";
import { getOptionalSession } from "@/lib/server/session";
import { notFound } from "next/navigation";

type LiveSessionPageProps = {
  params: Promise<{ session_id: string }>;
};

export default async function LiveSessionPage({ params }: LiveSessionPageProps) {
  const { session_id } = await params;

  const [session, liveSession] = await Promise.all([
    getOptionalSession(),
    commerceBffService.getLiveSessionById(session_id)
  ]);

  if (!liveSession) {
    notFound();
  }

  let eligibility: LiveSessionEligibility | null = null;
  let conversation: LiveSessionConversationThread | null = null;

  if (session) {
    const [eligibilityResult, conversationResult] = await Promise.all([
      commerceBffService.getCollectLiveSessionEligibility(session.accountId, liveSession.id),
      commerceBffService.getLiveSessionConversationThread(session.accountId, liveSession.id)
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
