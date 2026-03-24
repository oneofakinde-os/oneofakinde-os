"use server";

import { gateway } from "@/lib/gateway";
import { requireSession } from "@/lib/server/session";
import { redirect } from "next/navigation";

export async function setupCreatorStudioAction(formData: FormData): Promise<void> {
  const session = await requireSession("/become-creator");

  if (session.roles.includes("creator")) {
    redirect("/workshop");
  }

  const studioTitle = String(formData.get("studioTitle") ?? "").trim();
  const studioSynopsis = String(formData.get("studioSynopsis") ?? "").trim();

  if (!studioTitle || studioTitle.length > 80) {
    redirect("/become-creator?error=invalid_title");
  }

  if (studioSynopsis.length > 500) {
    redirect("/become-creator?error=invalid_synopsis");
  }

  const result = await gateway.setupCreatorStudio(session.accountId, {
    studioTitle,
    studioSynopsis
  });

  if (!result) {
    redirect("/become-creator?error=setup_failed");
  }

  redirect("/workshop");
}
