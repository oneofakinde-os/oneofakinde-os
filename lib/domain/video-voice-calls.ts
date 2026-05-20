export type CallType = "video" | "voice" | "screen_share";

export type CallStatus =
  | "ringing"
  | "in_progress"
  | "ended"
  | "missed"
  | "declined"
  | "failed";

export type Call = {
  id: string;
  callerAccountId: string;
  calleeAccountIds: string[];
  type: CallType;
  status: CallStatus;
  startedAt: string | null;
  endedAt: string | null;
  durationMs: number | null;
  recordingUrl: string | null;
  encrypted: boolean;
};

export type CallParticipant = {
  callId: string;
  accountId: string;
  role: "caller" | "callee";
  joinedAt: string | null;
  leftAt: string | null;
  muted: boolean;
  videoOff: boolean;
};

export const MAX_CALL_PARTICIPANTS = 8;
export const MAX_CALL_DURATION_MS = 4 * 3_600_000;

export function canJoinCall(currentParticipants: number): boolean {
  return currentParticipants < MAX_CALL_PARTICIPANTS;
}

export function isCallDurationExceeded(durationMs: number): boolean {
  return durationMs >= MAX_CALL_DURATION_MS;
}

export type CallQuality = {
  callId: string;
  participantId: string;
  bitrate: number;
  latencyMs: number;
  packetLoss: number;
  resolution: string;
};

export type CallRecording = {
  callId: string;
  url: string;
  durationMs: number;
  sizeBytes: number;
  retentionDays: number;
  createdAt: string;
};

export const CALL_E2E_ENCRYPTION_DEFAULT = true;

export function isCallEncrypted(call: Call): boolean {
  return call.encrypted;
}
