import { routes } from "@/lib/routes";
import Link from "next/link";
import {
  BookIcon,
  CameraIcon,
  DiamondIcon,
  FilmIcon,
  HeadphonesIcon,
  RadioIcon,
  TownhallIcon
} from "./townhall-icons";

export type TownhallNavMode = "townhall" | "listen" | "read" | "watch" | "photos" | "collect" | "live";

function navLinkClass(active: boolean): string {
  return `townhall-bottom-icon ${active ? "active" : ""}`;
}

type TownhallBottomNavProps = {
  activeMode: TownhallNavMode;
  className?: string;
  noImmersiveToggle?: boolean;
};

export function TownhallBottomNav({
  activeMode,
  className = "townhall-bottom-nav townhall-bottom-nav-icons",
  noImmersiveToggle = false
}: TownhallBottomNavProps) {
  const noImmersiveProps = noImmersiveToggle ? { "data-no-immersive-toggle": "true" as const } : {};

  return (
    <nav className={className} aria-label="townhall bottom nav" {...noImmersiveProps}>
      <Link href={routes.townhall()} className={navLinkClass(activeMode === "townhall")} aria-label="townhall feed">
        <TownhallIcon className="townhall-bottom-icon-glyph" />
      </Link>
      <Link href={routes.townhallListen()} className={navLinkClass(activeMode === "listen")} aria-label="listen mode">
        <HeadphonesIcon className="townhall-bottom-icon-glyph" />
      </Link>
      <Link href={routes.townhallRead()} className={navLinkClass(activeMode === "read")} aria-label="read mode">
        <BookIcon className="townhall-bottom-icon-glyph" />
      </Link>
      <Link href={routes.townhallWatch()} className={navLinkClass(activeMode === "watch")} aria-label="watch mode">
        <FilmIcon className="townhall-bottom-icon-glyph" />
      </Link>
      <Link href={routes.townhallPhotos()} className={navLinkClass(activeMode === "photos")} aria-label="photos mode">
        <CameraIcon className="townhall-bottom-icon-glyph" />
      </Link>
      <Link href={routes.collect()} className={navLinkClass(activeMode === "collect")} aria-label="collect marketplace">
        <DiamondIcon className="townhall-bottom-icon-glyph" />
      </Link>
      <Link href={routes.townhallLive()} className={navLinkClass(activeMode === "live")} aria-label="live mode">
        <RadioIcon className="townhall-bottom-icon-glyph" />
      </Link>
    </nav>
  );
}
