"use server";

import { gateway } from "@/lib/gateway";
import { requireSessionRoles } from "@/lib/server/session";
import { redirect } from "next/navigation";

export type CreateWorldResult = {
  ok: boolean;
  worldId?: string;
  error?: string;
};

export async function createWorldAction(formData: FormData): Promise<CreateWorldResult> {
  const session = await requireSessionRoles("/create/world", ["creator"]);

  const title = String(formData.get("title") ?? "").trim();
  const synopsis = String(formData.get("synopsis") ?? "").trim();
  const entryRule = String(formData.get("entryRule") ?? "open").trim();
  const lore = String(formData.get("lore") ?? "").trim() || undefined;
  const colorPrimary = String(formData.get("colorPrimary") ?? "#0b132b").trim();
  const releaseMode = String(formData.get("releaseMode") ?? "continuous").trim();

  if (!title) return { ok: false, error: "title is required" };
  if (title.length > 200) return { ok: false, error: "title must be under 200 characters" };
  if (!synopsis) return { ok: false, error: "synopsis is required" };
  if (synopsis.length > 2000) return { ok: false, error: "synopsis must be under 2000 characters" };

  const validEntryRules = ["open", "membership", "patron"] as const;
  const validatedEntryRule = validEntryRules.includes(entryRule as typeof validEntryRules[number])
    ? (entryRule as typeof validEntryRules[number])
    : "open";

  const validReleaseModes = ["continuous", "seasons", "chapters"] as const;
  const validatedReleaseMode = validReleaseModes.includes(releaseMode as typeof validReleaseModes[number])
    ? (releaseMode as typeof validReleaseModes[number])
    : "continuous";

  const world = await gateway.createWorld(session.accountId, {
    title,
    synopsis,
    entryRule: validatedEntryRule,
    lore,
    visualIdentity: {
      coverImageSrc: "",
      colorPrimary
    },
    releaseStructure: {
      mode: validatedReleaseMode
    }
  });

  if (!world) {
    return { ok: false, error: "failed to create world. a world with this name may already exist." };
  }

  redirect(`/worlds/${encodeURIComponent(world.id)}`);
}
