import { TransparencyIndexScreen } from "@/features/transparency/transparency-index-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "transparency",
  description: "how oneofakinde works — published rules, formulas, and commitments.",
};

export default function TransparencyPage() {
  return <TransparencyIndexScreen />;
}
