import type { Metadata } from "next";
import "./globals.css";
import "@/features/notifications/notifications.css";

export const metadata: Metadata = {
  title: "oneofakinde",
  description: "oneofakinde os scaffold"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
