import { redirect } from "next/navigation";

type TownhallGalleryLegacyRedirectPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TownhallGalleryLegacyRedirectPage({
  searchParams
}: TownhallGalleryLegacyRedirectPageProps) {
  const params = (await searchParams) ?? {};
  const redirectParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry) {
          redirectParams.append(key, entry);
        }
      }
      continue;
    }

    if (value) {
      redirectParams.set(key, value);
    }
  }

  const query = redirectParams.toString();
  redirect(query ? `/showroom/photos?${query}` : "/showroom/photos");
}
