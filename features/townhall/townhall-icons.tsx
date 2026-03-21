import type { SVGProps } from "react";

type TownhallIconProps = SVGProps<SVGSVGElement> & {
  filled?: boolean;
};

function BaseIcon({ children, filled = false, ...props }: TownhallIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ArrowLeftIcon(props: TownhallIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M15 6 9 12l6 6" />
    </BaseIcon>
  );
}

export function PlusIcon(props: TownhallIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </BaseIcon>
  );
}

export function SearchIcon(props: TownhallIconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx={11} cy={11} r={6.5} />
      <path d="m16 16 4 4" />
    </BaseIcon>
  );
}

export function TownhallIcon(props: TownhallIconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx={12} cy={12} r={8.5} />
      <path d="M8.5 15v-4.5l3.5-2 3.5 2V15" />
      <path d="M10.5 15v-2h3v2" />
    </BaseIcon>
  );
}

export function HeartIcon(props: TownhallIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 20s-6.5-4.4-8.4-7.5C1.7 9.4 3 6.1 6.1 5.4c2-.4 3.4.4 4.4 1.8 1-1.4 2.4-2.2 4.4-1.8 3.1.7 4.4 4 2.5 7.1C18.5 15.6 12 20 12 20Z" />
    </BaseIcon>
  );
}

export function CommentIcon(props: TownhallIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5.5 5.5h13v9h-6l-3.2 3.2V14.5H5.5z" />
    </BaseIcon>
  );
}

export function DiamondIcon(props: TownhallIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 9.5 8.2 5h7.6L20 9.5 12 19.5z" />
      <path d="M8.2 5 12 9.5 15.8 5" />
      <path d="M4 9.5h16" />
    </BaseIcon>
  );
}

export function SendIcon(props: TownhallIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="m4 12 15-7-4.5 14-3.2-5-7.3-2Z" />
    </BaseIcon>
  );
}

export function BookmarkIcon(props: TownhallIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M7 4.5h10v15l-5-3.2-5 3.2z" />
    </BaseIcon>
  );
}

export function HeadphonesIcon(props: TownhallIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M5 13.5V12a7 7 0 0 1 14 0v1.5" />
      <rect x={4} y={12.5} width={3.5} height={6} rx={1.4} />
      <rect x={16.5} y={12.5} width={3.5} height={6} rx={1.4} />
    </BaseIcon>
  );
}

export function BookIcon(props: TownhallIconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4.5 6.5h6.8a2.2 2.2 0 0 1 2.2 2.2v8.8H6.7a2.2 2.2 0 0 0-2.2 2.2z" />
      <path d="M19.5 6.5h-6.8a2.2 2.2 0 0 0-2.2 2.2v8.8h6.8a2.2 2.2 0 0 1 2.2 2.2z" />
    </BaseIcon>
  );
}

export function FilmIcon(props: TownhallIconProps) {
  return (
    <BaseIcon {...props}>
      <rect x={4} y={5} width={16} height={14} rx={1} />
      {/* top sprocket holes */}
      <path d="M6.5 5v1.8" />
      <path d="M9.5 5v1.8" />
      <path d="M12 5v1.8" />
      <path d="M14.5 5v1.8" />
      <path d="M17.5 5v1.8" />
      {/* bottom sprocket holes */}
      <path d="M6.5 17.2v1.8" />
      <path d="M9.5 17.2v1.8" />
      <path d="M12 17.2v1.8" />
      <path d="M14.5 17.2v1.8" />
      <path d="M17.5 17.2v1.8" />
      {/* frame lines */}
      <path d="M4 6.8h16" />
      <path d="M4 17.2h16" />
    </BaseIcon>
  );
}

export function CameraIcon(props: TownhallIconProps) {
  return (
    <BaseIcon {...props}>
      <rect x={4.5} y={5} width={15} height={14} rx={1} />
      <rect x={6.5} y={7} width={11} height={10} rx={0.6} />
    </BaseIcon>
  );
}

export function RadioIcon(props: TownhallIconProps) {
  return (
    <BaseIcon {...props}>
      {/* tower body */}
      <path d="M10 20 12 10 14 20" />
      <path d="M10.5 16h3" />
      {/* antenna mast */}
      <path d="M12 10V6" />
      {/* signal rings */}
      <path d="M9.2 7.8a4 4 0 0 1 5.6 0" />
      <path d="M7.2 5.8a7 7 0 0 1 9.6 0" />
      <circle cx={12} cy={10} r={1} />
    </BaseIcon>
  );
}

export function AgoraIcon(props: TownhallIconProps) {
  return (
    <BaseIcon {...props}>
      {/* nucleus */}
      <circle cx={12} cy={12} r={1.8} />
      {/* orbital 1 — horizontal ellipse */}
      <ellipse cx={12} cy={12} rx={8.5} ry={3.5} />
      {/* orbital 2 — tilted 60° */}
      <ellipse cx={12} cy={12} rx={8.5} ry={3.5} transform="rotate(60 12 12)" />
      {/* orbital 3 — tilted -60° */}
      <ellipse cx={12} cy={12} rx={8.5} ry={3.5} transform="rotate(-60 12 12)" />
    </BaseIcon>
  );
}

export function ShowroomIcon(props: TownhallIconProps) {
  return (
    <BaseIcon {...props}>
      <rect x={4} y={4} width={7} height={7} rx={1.2} />
      <rect x={13} y={4} width={7} height={7} rx={1.2} />
      <rect x={4} y={13} width={7} height={7} rx={1.2} />
      <rect x={13} y={13} width={7} height={7} rx={1.2} />
    </BaseIcon>
  );
}
