"use server";

import { commerceBffService } from "@/lib/bff/service";
import { isReportCategory } from "@/lib/domain/social-engagement";
import { routes } from "@/lib/routes";
import { requireSession } from "@/lib/server/session";
import type { Route } from "next";
import { redirect } from "next/navigation";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseRecipientHandles(value: string): string[] {
  return value.split(/[\s,]+/).filter(Boolean);
}

function messageStatusHref(status: string): Route {
  return `${routes.messages()}?message_status=${encodeURIComponent(status)}` as Route;
}

function threadStatusHref(threadId: string, status: string): Route {
  return `${routes.messageThread(threadId)}?message_status=${encodeURIComponent(status)}` as Route;
}

export async function createMessageThreadAction(formData: FormData): Promise<void> {
  const session = await requireSession(routes.messages());
  const recipients = formString(formData, "recipients");
  const body = formString(formData, "body");
  const title = formString(formData, "title");

  const result = await commerceBffService.createMessageThread(session.accountId, {
    recipientHandles: parseRecipientHandles(recipients),
    body,
    title: title || undefined
  });

  if (result.ok) {
    redirect(routes.messageThread(result.thread.id));
  }

  redirect(messageStatusHref(result.reason));
}

export async function sendMessageAction(formData: FormData): Promise<void> {
  const threadId = formString(formData, "threadId");
  if (!threadId) {
    redirect(messageStatusHref("invalid"));
  }

  const session = await requireSession(routes.messageThread(threadId));
  const body = formString(formData, "body");
  const result = await commerceBffService.sendMessage(session.accountId, threadId, body);

  if (result.ok) {
    redirect(routes.messageThread(result.thread.id));
  }

  redirect(threadStatusHref(threadId, result.reason));
}

export async function updateMessageThreadStateAction(formData: FormData): Promise<void> {
  const threadId = formString(formData, "threadId");
  const action = formString(formData, "action");
  if (!threadId || (action !== "accept" && action !== "decline" && action !== "mark_read")) {
    redirect(messageStatusHref("invalid"));
  }

  const session = await requireSession(routes.messageThread(threadId));
  const result = await commerceBffService.updateMessageThreadState(
    session.accountId,
    threadId,
    action
  );

  if (result.ok) {
    if (action === "decline") {
      redirect(routes.messages());
    }
    redirect(routes.messageThread(result.thread.id));
  }

  redirect(threadStatusHref(threadId, result.reason));
}

export async function reportMessageAction(formData: FormData): Promise<void> {
  const threadId = formString(formData, "threadId");
  const messageId = formString(formData, "messageId");
  if (!threadId || !messageId) {
    redirect(messageStatusHref("invalid"));
  }

  const categoryRaw = formString(formData, "category");
  const category = isReportCategory(categoryRaw) ? categoryRaw : undefined;

  const session = await requireSession(routes.messageThread(threadId));
  const result = await commerceBffService.reportMessage(
    session.accountId,
    threadId,
    messageId,
    category
  );

  if (result.ok) {
    redirect(`${routes.messageThread(result.thread.id)}?message_status=reported` as Route);
  }

  redirect(threadStatusHref(threadId, result.reason));
}
