"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { routes } from "@/lib/routes";

const SETTINGS_LINKS = [
  { href: routes.settingsAccount(), label: "account" },
  { href: routes.settingsPrivacy(), label: "privacy" },
  { href: routes.settingsSecurity(), label: "security" },
  { href: routes.settingsNotifications(), label: "notifications" },
  { href: routes.settingsApps(), label: "connected apps" },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="settings-nav" aria-label="settings navigation">
      {SETTINGS_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`settings-nav-link ${pathname === link.href ? "settings-nav-link-active" : ""}`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
