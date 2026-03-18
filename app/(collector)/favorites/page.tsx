import { routes } from "@/lib/routes";
import { requireSession } from "@/lib/server/session";
import { redirect } from "next/navigation";

export default async function FavoritesPage() {
  await requireSession("/favorites");
  redirect(routes.library());
}
