import { NextResponse } from "next/server";
import { getFeatureFlagSnapshot, resolveFeatureFlagRuntime } from "@/lib/ops/feature-flags";

export const dynamic = "force-dynamic";

export async function GET() {
  const runtime = resolveFeatureFlagRuntime();
  const flags = getFeatureFlagSnapshot({ runtime });
  const flagCount = Object.keys(flags).length;
  const enabledCount = Object.values(flags).filter(Boolean).length;

  return NextResponse.json({
    status: "ok",
    version: process.env.npm_package_version ?? "0.1.0",
    runtime,
    timestamp: new Date().toISOString(),
    flags: {
      total: flagCount,
      enabled: enabledCount,
    },
  });
}
