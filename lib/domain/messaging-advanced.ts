export type MessageReaction = {
  messageId: string;
  threadId: string;
  accountId: string;
  emoji: string;
  reactedAt: string;
};

export type InlineReply = {
  messageId: string;
  threadId: string;
  replyToMessageId: string;
  body: string;
  sentAt: string;
};

export type PinnedMessage = {
  messageId: string;
  threadId: string;
  pinnedBy: string;
  pinnedAt: string;
};

export type ForwardedMessage = {
  originalMessageId: string;
  originalThreadId: string;
  forwardedToThreadId: string;
  forwardedBy: string;
  forwardedAt: string;
};

export type MessageEdit = {
  messageId: string;
  previousBody: string;
  newBody: string;
  editedAt: string;
};

export type MessageDeletion = {
  messageId: string;
  deletedBy: string;
  deletedAt: string;
  withinTimeout: boolean;
};

export const MESSAGE_DELETE_TIMEOUT_MINUTES = 15;
export const MESSAGE_EDIT_INDICATOR = true;

export function canDeleteMessage(sentAtIso: string, nowMs: number): boolean {
  const ageMs = nowMs - Date.parse(sentAtIso);
  return ageMs < MESSAGE_DELETE_TIMEOUT_MINUTES * 60_000;
}

export function canEditMessage(sentAtIso: string, nowMs: number): boolean {
  return canDeleteMessage(sentAtIso, nowMs);
}

export type TypingIndicator = {
  threadId: string;
  accountId: string;
  startedAt: string;
  expiresAt: string;
};

export const TYPING_INDICATOR_TIMEOUT_MS = 5_000;

export function isTypingActive(indicator: TypingIndicator, nowMs: number): boolean {
  return nowMs < Date.parse(indicator.expiresAt);
}

export type VoiceMessage = {
  messageId: string;
  threadId: string;
  durationMs: number;
  url: string;
  transcription: string | null;
};

export type MessageAttachment = {
  messageId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
};

export const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024;
export const MAX_VOICE_DURATION_MS = 300_000;

export function isAttachmentAllowed(sizeBytes: number): boolean {
  return sizeBytes <= MAX_ATTACHMENT_SIZE_BYTES;
}

export function isVoiceDurationAllowed(durationMs: number): boolean {
  return durationMs <= MAX_VOICE_DURATION_MS;
}
