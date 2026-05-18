import { CurationPostureScreen } from "@/features/transparency/curation-posture-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "curation posture",
  description: "how creators get on oneofakinde and how the curation model evolves over time.",
};

export default function CurationPosturePage() {
  return <CurationPostureScreen />;
}
