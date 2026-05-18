import { AiUseScreen } from "@/features/transparency/ai-use-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "how oneofakinde uses ai",
  description: "what oneofakinde uses ai for — and what it never will.",
};

export default function AiUsePage() {
  return <AiUseScreen />;
}
