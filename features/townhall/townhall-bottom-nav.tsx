import { routes } from "@/lib/routes";
import Link from "next/link";
import {
  AgoraIcon,
  BookIcon,
  CameraIcon,
  DiamondIcon,
  FilmIcon,
  HeadphonesIcon,
  RadioIcon,
  ShowroomIcon
} from "./townhall-icons";

export type TownhallNavMode = "showroom" | "agora" | "watch" | "gallery" | "collect" | "listen" | "live" | "read";

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
      <Link href={routes.showroom()} className={navLinkClass(activeMode === "showroom")} aria-label="showroom">
        <ShowroomIcon className="townhall-bottom-icon-glyph" />
      </Link>
      <Link href={routes.townhall()} className={navLinkClass(activeMode === "agora")} aria-label="agora">
        <AgoraIcon className="townhall-bottom-icon-glyph" />
      </Link>
      <Link href={routes.townhallWatch()} className={navLinkClass(activeMode === "watch")} aria-label="watch">
        <FilmIcon className="townhall-bottom-icon-glyph" />
      </Link>
      <Link href={routes.townhallPhotos()} className={navLinkClass(activeMode === "gallery")} aria-label="gallery">
        <CameraIcon className="townhall-bottom-icon-glyph" />
      </Link>
      <Link href={routes.collect()} className={navLinkClass(activeMode === "collect")} aria-label="collect">
        <DiamondIcon className="townhall-bottom-icon-glyph" />
      </Link>
      <Link href={routes.townhallListen()} className={navLinkClass(activeMode === "listen")} aria-label="listen">
        <HeadphonesIcon className="townhall-bottom-icon-glyph" />
      </Link>
      <Link href={routes.townhallLive()} className={navLinkClass(activeMode === "live")} aria-label="live">
        <RadioIcon className="townhall-bottom-icon-glyph" />
      </Link>
      <Link href={routes.townhallRead()} className={navLinkClass(activeMode === "read")} aria-label="read">
        <BookIcon className="townhall-bottom-icon-glyph" />
      </Link>
    </nav>
  );
}
