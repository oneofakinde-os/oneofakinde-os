import { getScoreFormulaSnapshot } from "@/lib/ranking/score-formula";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(getScoreFormulaSnapshot(), {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
