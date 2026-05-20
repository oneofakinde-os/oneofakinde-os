import { ContentPolicyScreen } from "@/features/transparency/content-policy-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "content policy",
  description: "what stays, what goes, and why — oneofakinde's editorial identity and moderation commitments.",
};

export default function ContentPolicyPage() {
  return <ContentPolicyScreen />;
}
