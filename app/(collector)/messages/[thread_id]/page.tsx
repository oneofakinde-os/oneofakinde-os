import { MessageThreadScreen } from "@/features/messages/message-thread-screen";
import { commerceBffService } from "@/lib/bff/service";
import { routes } from "@/lib/routes";
import { requireSession } from "@/lib/server/session";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { reportMessageAction, sendMessageAction, updateMessageThreadStateAction } from "../actions";

export const metadata: Metadata = {
  title: "message thread"
};

const MESSAGE_STATUS: Record<string, string> = {
  invalid: "message action is invalid.",
  blocked: "message blocked by safety settings.",
  forbidden: "message thread is not available.",
  not_found: "message thread not found.",
  reported: "message reported for moderation."
};

type MessageThreadPageProps = {
  params: Promise<{ thread_id: string }>;
  searchParams: Promise<{ message_status?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function MessageThreadPage({
  params,
  searchParams
}: MessageThreadPageProps) {
  const { thread_id } = await params;
  const session = await requireSession(routes.messageThread(thread_id));
  const thread = await commerceBffService.getMessageThread(session.accountId, thread_id);

  if (!thread) {
    notFound();
  }

  const resolvedSearchParams = await searchParams;
  const status = firstParam(resolvedSearchParams.message_status);

  return (
    <MessageThreadScreen
      session={session}
      thread={thread}
      sendAction={sendMessageAction}
      stateAction={updateMessageThreadStateAction}
      reportAction={reportMessageAction}
      statusMessage={status ? MESSAGE_STATUS[status] ?? null : null}
    />
  );
}
