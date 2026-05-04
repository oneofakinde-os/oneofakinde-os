import { MessagesInboxScreen } from "@/features/messages/messages-inbox-screen";
import { commerceBffService } from "@/lib/bff/service";
import { routes } from "@/lib/routes";
import { requireSession } from "@/lib/server/session";
import type { Metadata } from "next";
import { createMessageThreadAction } from "./actions";

export const metadata: Metadata = {
  title: "messages",
  description: "direct and group messages on oneofakinde."
};

const MESSAGE_STATUS: Record<string, string> = {
  invalid: "message could not be sent. check the handles and message body.",
  blocked: "message blocked by safety settings.",
  forbidden: "message thread is not available.",
  not_found: "message thread not found."
};

type MessagesPageProps = {
  searchParams: Promise<{ message_status?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const session = await requireSession(routes.messages());
  const inbox = await commerceBffService.getMessageInbox(session.accountId);
  const params = await searchParams;
  const status = firstParam(params.message_status);

  return (
    <MessagesInboxScreen
      session={session}
      inbox={inbox ?? { threads: [], unreadCount: 0, requestCount: 0 }}
      createAction={createMessageThreadAction}
      statusMessage={status ? MESSAGE_STATUS[status] ?? null : null}
    />
  );
}
