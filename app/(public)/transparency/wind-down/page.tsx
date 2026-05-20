import { WindDownScreen } from "@/features/transparency/wind-down-screen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "wind-down protocol",
  description: "what happens if oneofakinde shuts down — protection for your work, your money, and your ownership.",
};

export default function WindDownPage() {
  return <WindDownScreen />;
}
