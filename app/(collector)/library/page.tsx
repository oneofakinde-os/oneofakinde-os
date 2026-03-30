import { LibraryScreen } from "@/features/library/library-screen";
import { gateway } from "@/lib/gateway";
import { requireSession } from "@/lib/server/session";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "library",
  description: "your reading queue, listen queue, and saved drops on oneofakinde.",
};

export default async function LibraryPage() {
  const session = await requireSession("/library");
  const library = await gateway.getLibrary(session.accountId);

  if (!library) {
    notFound();
  }

  return <LibraryScreen session={session} library={library} />;
}
