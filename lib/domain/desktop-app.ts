export type DesktopPlatform = "macos" | "windows" | "linux";

export type DesktopAppVersion = {
  version: string;
  platform: DesktopPlatform;
  releaseDate: string;
  mandatory: boolean;
  changelog: string;
};

export type AutoUpdateConfig = {
  enabled: boolean;
  channel: "stable" | "beta";
  checkIntervalHours: number;
};

export const DEFAULT_AUTO_UPDATE_CONFIG: AutoUpdateConfig = {
  enabled: true,
  channel: "stable",
  checkIntervalHours: 24,
};

export function isUpdateAvailable(
  currentVersion: string,
  latestVersion: string
): boolean {
  return currentVersion !== latestVersion;
}

export function isUpdateMandatory(
  currentVersion: string,
  availableVersions: DesktopAppVersion[]
): boolean {
  return availableVersions.some(
    (v) => v.mandatory && v.version !== currentVersion
  );
}

export type DesktopNotificationPreference = {
  enabled: boolean;
  soundEnabled: boolean;
  badgeEnabled: boolean;
};

export type SystemTrayConfig = {
  showInTray: boolean;
  minimizeToTray: boolean;
  launchAtLogin: boolean;
};

export const DEFAULT_SYSTEM_TRAY_CONFIG: SystemTrayConfig = {
  showInTray: true,
  minimizeToTray: true,
  launchAtLogin: false,
};

export type DeepLinkScheme = "oneofakinde://";

export function buildDeepLink(path: string): string {
  return `oneofakinde://${path}`;
}
