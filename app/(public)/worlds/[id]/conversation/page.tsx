import { WorldConversationScreen } from "@/features/world/world-conversation-screen";
import { gateway } from "@/lib/gateway";
import { requireSession } from "@/lib/server/session";
import { notFound, redirect } from "next/navigation";
import { routes } from "@/lib/routes";

type WorldConversationPageProps = {
  params: Promise<{ id: string }>;
};

export default async function WorldConversationPage({ params }: WorldConversationPageProps) {
  const { id } = await params;

  const session = await requireSession(routes.signIn(routes.worldConversation(id)));
  const world = await gateway.getWorldById(id);

  if (!world) {
    notFound();
  }

  const threadResult = await gateway.getWorldConversationThread(
    session.accountId,
    id
  );

  if (!threadResult.ok) {
    if (threadResult.reason === "forbidden") {
      redirect(routes.world(id));
    }
    notFound();
  }

  return (
    <WorldConversationScreen
      world={world}
      session={session}
      initialThread={threadResult.thread}
    />
  );
}
