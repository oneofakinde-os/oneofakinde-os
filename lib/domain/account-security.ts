export type ActiveSession = {
  id: string;
  accountId: string;
  deviceLabel: string;
  ipAddress: string;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
};

export type LoginActivityEntry = {
  id: string;
  accountId: string;
  ipAddress: string;
  deviceLabel: string;
  success: boolean;
  suspicious: boolean;
  timestamp: string;
};

export type HandleChangeRequest = {
  accountId: string;
  oldHandle: string;
  newHandle: string;
  redirectExpiresAt: string;
  requestedAt: string;
  status: "pending" | "completed" | "rejected";
};

export const HANDLE_REDIRECT_DURATION_DAYS = 180;

export type EmailChangeRequest = {
  accountId: string;
  currentEmail: string;
  newEmail: string;
  verificationToken: string;
  status: "pending_verification" | "verified" | "expired";
  requestedAt: string;
};

export type AccountSuspension = {
  id: string;
  accountId: string;
  reason: string;
  suspendedBy: string;
  suspendedAt: string;
  appealId: string | null;
  status: "suspended" | "appealing" | "reinstated";
};

export type AccountDeactivation = {
  accountId: string;
  deactivatedAt: string;
  reason: string;
};

export type TrustedDevice = {
  id: string;
  accountId: string;
  deviceFingerprint: string;
  label: string;
  trustedAt: string;
};

export type HandleReservation = {
  handle: string;
  reservedBy: string;
  reservedAt: string;
  expiresAt: string;
  reason: "anti_squatting" | "pending_rename" | "notable_creator";
};

export function isSuspiciousLogin(
  knownDevices: TrustedDevice[],
  deviceFingerprint: string,
  ipAddress: string,
  recentLogins: LoginActivityEntry[]
): boolean {
  const isKnownDevice = knownDevices.some(
    (d) => d.deviceFingerprint === deviceFingerprint
  );
  if (isKnownDevice) return false;

  const recentIps = new Set(recentLogins.map((l) => l.ipAddress));
  if (recentIps.has(ipAddress)) return false;

  return true;
}

export function isNewDeviceLogin(
  knownDevices: TrustedDevice[],
  deviceFingerprint: string
): boolean {
  return !knownDevices.some((d) => d.deviceFingerprint === deviceFingerprint);
}

export type SuccessorDesignation = {
  studioHandle: string;
  successorAccountId: string;
  designatedAt: string;
  updatedAt: string;
};
