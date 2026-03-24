import type { Metadata } from "next";
import "./globals.css";
import "@/features/notifications/notifications.css";
import { CommandSearch } from "@/features/shell/command-search";
import { ToastProvider } from "@/features/shared/toast-context";
import { ToastContainer } from "@/features/shared/toast-container";

export const metadata: Metadata = {
  title: "oneofakinde",
  description: "oneofakinde os scaffold"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          {children}
          <ToastContainer />
          <CommandSearch />
        </ToastProvider>
      </body>
    </html>
  );
}
