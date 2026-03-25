import type { Metadata } from "next";
import "./globals.css";
import "@/features/notifications/notifications.css";
import { CommandSearch } from "@/features/shell/command-search";
import { ToastProvider } from "@/features/shared/toast-context";
import { ToastContainer } from "@/features/shared/toast-container";
import { resolveMetadataBase } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: "oneofakinde",
  description: "oneofakinde is a cinematic collector platform for drops, worlds, and studios.",
  openGraph: {
    title: "oneofakinde",
    description: "oneofakinde is a cinematic collector platform for drops, worlds, and studios.",
    siteName: "oneofakinde",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "oneofakinde",
    description: "oneofakinde is a cinematic collector platform for drops, worlds, and studios."
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-to-content">
          skip to content
        </a>
        <ToastProvider>
          {children}
          <ToastContainer />
          <CommandSearch />
        </ToastProvider>
      </body>
    </html>
  );
}
