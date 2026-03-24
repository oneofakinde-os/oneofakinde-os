import type { Metadata } from "next";
import "./globals.css";
import { CommandSearch } from "@/features/shell/command-search";
import { ToastProvider } from "@/features/shared/toast-context";
import { ToastContainer } from "@/features/shared/toast-container";
import { resolveMetadataBase } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: {
    default: "oneofakinde",
    template: "%s · oneofakinde",
  },
  description: "discover, collect, and own one-of-a-kind digital media — drops, worlds, and live sessions from independent studios.",
  openGraph: {
    type: "website",
    siteName: "oneofakinde",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
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
