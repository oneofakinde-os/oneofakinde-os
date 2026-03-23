import type { Metadata } from "next";
import "./globals.css";
import "@/features/notifications/notifications.css";
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
        </ToastProvider>
      </body>
    </html>
  );
}
