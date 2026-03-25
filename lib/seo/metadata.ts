import type { Metadata } from "next";
import type { Drop, Studio, World } from "@/lib/domain/contracts";

const DEFAULT_SITE_ORIGIN = "https://oneofakinde-os.vercel.app";
const DEFAULT_DESCRIPTION =
  "oneofakinde is a cinematic collector platform for drops, worlds, and studios.";

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

function resolveConfiguredOrigin(): string {
  const configured =
    process.env.OOK_APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return trimTrailingSlashes(configured);
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return trimTrailingSlashes(`https://${vercelUrl}`);
  }

  return DEFAULT_SITE_ORIGIN;
}

export function resolveMetadataBase(): URL {
  try {
    return new URL(resolveConfiguredOrigin());
  } catch {
    return new URL(DEFAULT_SITE_ORIGIN);
  }
}

function truncate(value: string, maxLength: number): string {
  const normalized = value.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function dropImage(drop: Drop): string | undefined {
  const src =
    drop.previewMedia?.watch?.posterSrc ??
    drop.previewMedia?.photos?.src ??
    drop.previewMedia?.listen?.posterSrc ??
    undefined;

  if (!src) {
    return undefined;
  }

  const normalized = src.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function worldImage(world: World): string | undefined {
  const src = world.visualIdentity?.coverImageSrc;
  if (!src) {
    return undefined;
  }

  const normalized = src.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function studioImage(worlds: World[]): string | undefined {
  for (const world of worlds) {
    const cover = worldImage(world);
    if (cover) {
      return cover;
    }
  }

  return undefined;
}

type EntityMetadataInput = {
  canonicalPath: string;
  title: string;
  description: string;
  imageUrl?: string;
};

function buildEntityMetadata(input: EntityMetadataInput): Metadata {
  const description = truncate(input.description || DEFAULT_DESCRIPTION, 180);
  const image = input.imageUrl?.trim() || undefined;
  const openGraphImages = image ? [{ url: image, alt: input.title }] : undefined;
  const twitterImages = image ? [image] : undefined;

  return {
    title: input.title,
    description,
    alternates: {
      canonical: input.canonicalPath
    },
    openGraph: {
      type: "website",
      title: input.title,
      description,
      url: input.canonicalPath,
      siteName: "oneofakinde",
      images: openGraphImages
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: input.title,
      description,
      images: twitterImages
    }
  };
}

export function buildDropMetadata(drop: Drop): Metadata {
  return buildEntityMetadata({
    canonicalPath: `/drops/${encodeURIComponent(drop.id)}`,
    title: `${drop.title} · ${drop.studioHandle}`,
    description: drop.synopsis || DEFAULT_DESCRIPTION,
    imageUrl: dropImage(drop)
  });
}

export function buildWorldMetadata(world: World): Metadata {
  return buildEntityMetadata({
    canonicalPath: `/worlds/${encodeURIComponent(world.id)}`,
    title: `${world.title} · world`,
    description: world.synopsis || world.lore || DEFAULT_DESCRIPTION,
    imageUrl: worldImage(world)
  });
}

export function buildStudioMetadata(studio: Studio, worlds: World[]): Metadata {
  return buildEntityMetadata({
    canonicalPath: `/studio/${encodeURIComponent(studio.handle)}`,
    title: `${studio.title} · studio`,
    description: studio.synopsis || DEFAULT_DESCRIPTION,
    imageUrl: studioImage(worlds)
  });
}
