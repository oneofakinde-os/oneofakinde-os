import { GovernmentRequestsScreen } from "@/features/transparency/government-requests-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "government requests",
  description: "how oneofakinde handles government data requests — tiered compliance, creator notification, and refusal commitments.",
};

export default function GovernmentRequestsPage() {
  return <GovernmentRequestsScreen />;
}
