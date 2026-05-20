import type {
  NotificationChannel,
  NotificationEntry,
  NotificationType,
} from "@/lib/domain/contracts";
import {
  isTransactional,
  type ChannelDeliveryResult,
  type DeliveryReceipt,
  type SuppressReason,
} from "@/lib/notifications/channels";
import {
  isChannelEnabled,
  isInQuietHours,
  isTypeMuted,
  type FullNotificationPreferences,
} from "@/lib/notifications/preferences";

export type DeliveryContext = {
  preferences: FullNotificationPreferences;
  recentDeliveryCount: number;
  pendingBatchKey: string | null;
  now: Date;
};

export type DeliveryPlan = {
  channels: NotificationChannel[];
  suppressed: boolean;
  suppressReason?: SuppressReason;
  batchedInto?: string;
};

export function planDelivery(
  type: NotificationType,
  ctx: DeliveryContext
): DeliveryPlan {
  const transactional = isTransactional(type);

  if (!transactional && isTypeMuted(ctx.preferences, type)) {
    return { channels: [], suppressed: true, suppressReason: "muted_type" };
  }

  if (
    !transactional &&
    ctx.preferences.digestMode !== "none"
  ) {
    return {
      channels: ["in_app"],
      suppressed: false,
      batchedInto: `digest_${ctx.preferences.digestMode}`,
    };
  }

  if (!transactional && ctx.pendingBatchKey) {
    return {
      channels: ["in_app"],
      suppressed: false,
      batchedInto: ctx.pendingBatchKey,
    };
  }

  if (
    !transactional &&
    ctx.recentDeliveryCount >= ctx.preferences.frequencyCap
  ) {
    return { channels: ["in_app"], suppressed: false, suppressReason: "frequency_cap" };
  }

  const channels: NotificationChannel[] = ["in_app"];

  if (isChannelEnabled(ctx.preferences, "email")) {
    const quietBlocked =
      !transactional && isInQuietHours(ctx.preferences, ctx.now);
    if (!quietBlocked) {
      channels.push("email");
    }
  }

  if (isChannelEnabled(ctx.preferences, "push")) {
    const quietBlocked =
      !transactional && isInQuietHours(ctx.preferences, ctx.now);
    if (!quietBlocked) {
      channels.push("push");
    }
  }

  return { channels, suppressed: false };
}

export type EmailPayload = {
  to: string;
  subject: string;
  body: string;
  category: string;
};

export type PushPayload = {
  accountId: string;
  title: string;
  body: string;
  href: string | null;
};

export function buildEmailPayload(
  entry: NotificationEntry,
  email: string
): EmailPayload {
  return {
    to: email,
    subject: entry.title,
    body: entry.body,
    category: isTransactional(entry.type) ? "transactional" : "notification",
  };
}

export function buildPushPayload(entry: NotificationEntry): PushPayload {
  return {
    accountId: entry.accountId,
    title: entry.title,
    body: entry.body,
    href: entry.href,
  };
}

export function buildDeliveryReceipt(
  entry: NotificationEntry,
  plan: DeliveryPlan,
  results: ChannelDeliveryResult[]
): DeliveryReceipt {
  return {
    notificationId: entry.id,
    accountId: entry.accountId,
    type: entry.type,
    channels: results,
    suppressedBy: plan.suppressReason,
    batchedInto: plan.batchedInto,
    timestamp: new Date().toISOString(),
  };
}
