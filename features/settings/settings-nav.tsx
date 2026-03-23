"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SETTINGS_LINKS = [
  { href: "/settings/account", label: "account" },
  { href: "/settings/security", label: "security" },
  { href: "/settings/notifications", label: "notifications" },
  { href: "/settings/apps", label: "connected apps" },
] as const;

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
