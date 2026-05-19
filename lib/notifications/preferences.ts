import type {
  NotificationChannel,
  NotificationPreferences,
  NotificationType,
} from "@/lib/domain/contracts";

export type QuietHoursConfig = {
  enabled: boolean;
  fromHour: number;
  fromMinute: number;
  toHour: number;
  toMinute: number;
  timezone: string;
};

export type DigestMode = "none" | "daily" | "weekly";

export type FullNotificationPreferences = NotificationPreferences & {
  quietHours: QuietHoursConfig;
  digestMode: DigestMode;
  frequencyCap: number;
  emailCategories: Record<string, boolean>;
};

export const DEFAULT_PREFERENCES: FullNotificationPreferences = {
  accountId: "",
  channels: { in_app: true, email: true, push: false },
  mutedTypes: [],
  digestEnabled: false,
  quietHours: {
    enabled: false,
    fromHour: 22,
    fromMinute: 0,
    toHour: 8,
    toMinute: 0,
    timezone: "UTC",
  },
  digestMode: "none",
  frequencyCap: 20,
  emailCategories: {
    transactional: true,
    social: true,
    creator_updates: true,
    marketing: false,
  },
};

export function isChannelEnabled(
  prefs: FullNotificationPreferences,
  channel: NotificationChannel
): boolean {
  return prefs.channels[channel] ?? false;
}

export function isTypeMuted(
  prefs: FullNotificationPreferences,
  type: NotificationType
): boolean {
  return prefs.mutedTypes.includes(type);
}

export function isInQuietHours(
  prefs: FullNotificationPreferences,
  now: Date
): boolean {
  if (!prefs.quietHours.enabled) return false;

  const hours = now.getUTCHours();
  const minutes = now.getUTCMinutes();
  const currentMinutes = hours * 60 + minutes;
  const fromMinutes = prefs.quietHours.fromHour * 60 + prefs.quietHours.fromMinute;
  const toMinutes = prefs.quietHours.toHour * 60 + prefs.quietHours.toMinute;

  if (fromMinutes <= toMinutes) {
    return currentMinutes >= fromMinutes && currentMinutes < toMinutes;
  }
  return currentMinutes >= fromMinutes || currentMinutes < toMinutes;
}
