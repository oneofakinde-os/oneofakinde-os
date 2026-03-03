import { redirect } from "next/navigation";

type LegacyPayBuyPageProps = {
  params: Promise<{ drop_id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? value[0] ?? "" : value;
}

export default async function LegacyPayBuyPage({ params, searchParams }: LegacyPayBuyPageProps) {
  const [{ drop_id: dropId }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const status = firstParam(resolvedSearchParams.status);
  const search = status ? `?status=${encodeURIComponent(status)}` : "";
  redirect(`/collect/${encodeURIComponent(dropId)}${search}`);
}
