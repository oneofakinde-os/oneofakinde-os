import type { NotificationChannel, NotificationType } from "@/lib/domain/contracts";

export type DeliveryChannel = NotificationChannel;

export type ChannelDeliveryResult = {
  channel: DeliveryChannel;
  delivered: boolean;
  reason?: string;
};

export type DeliveryReceipt = {
  notificationId: string;
  accountId: string;
  type: NotificationType;
  channels: ChannelDeliveryResult[];
  suppressedBy?: SuppressReason;
  batchedInto?: string;
  timestamp: string;
};

export type SuppressReason =
  | "quiet_hours"
  | "frequency_cap"
  | "channel_disabled"
  | "muted_type"
  | "batched"
  | "digest_mode";

export const TRANSACTIONAL_TYPES: readonly NotificationType[] = [
  "drop_collected",
  "receipt_confirmed",
  "resale_completed",
  "resale_royalty_earned",
] as const;

export function isTransactional(type: NotificationType): boolean {
  return (TRANSACTIONAL_TYPES as readonly string[]).includes(type);
}
