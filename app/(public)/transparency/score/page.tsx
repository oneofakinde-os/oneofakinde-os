import { ScoreFormulaScreen } from "@/features/transparency/score-formula-screen";
import { getScoreFormulaSnapshot } from "@/lib/ranking/score-formula";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "consumption score formula",
  description: "the exact weights and math behind every drop's consumption score on oneofakinde.",
};

export default function ScoreFormulaPage() {
  const formula = getScoreFormulaSnapshot();
  return <ScoreFormulaScreen formula={formula} />;
}
