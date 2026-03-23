"use client";

/**
 * OptimizedImage — drop-in replacement for raw <img> tags.
 *
 * When the image source is a Supabase Storage URL, applies on-the-fly
 * transforms (resize, quality, format negotiation) via the render endpoint.
 * For external URLs, renders a plain <img> with no changes.
 *
 * Usage:
 *   <OptimizedImage src={url} alt="..." width={40} height={40} preset="avatarCard" />
 *
 * The `preset` prop selects pre-configured transform options. You can also
 * pass explicit `transformWidth` / `transformHeight` to override.
 */

import {
  imageTransformUrl,
  IMAGE_PRESETS,
  type ImageTransformOptions,
} from "@/lib/media/image-transform";
import type { CSSProperties } from "react";

type PresetName = keyof typeof IMAGE_PRESETS;

type OptimizedImageProps = {
  src: string | undefined;
  alt: string | undefined;

  /** Rendered width (HTML attribute). */
  width?: number;
  /** Rendered height (HTML attribute). */
  height?: number;

  className?: string;
  style?: CSSProperties;
  loading?: "lazy" | "eager";

  /** Pre-configured transform preset. */
  preset?: PresetName;

  /** Override transform width (in device pixels). */
  transformWidth?: number;
  /** Override transform height (in device pixels). */
  transformHeight?: number;
  /** Override resize mode. */
  transformResize?: ImageTransformOptions["resize"];

  /** Error handler — useful for fallback logic. */
  onError?: () => void;
};

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  style,
  loading,
  preset,
  transformWidth,
  transformHeight,
  transformResize,
  onError,
}: OptimizedImageProps) {
  // Build transform options from preset + overrides.
  const presetOptions = preset ? IMAGE_PRESETS[preset] : {};
  const transformOptions: ImageTransformOptions = {
    ...presetOptions,
    ...(transformWidth ? { width: transformWidth } : {}),
    ...(transformHeight ? { height: transformHeight } : {}),
    ...(transformResize ? { resize: transformResize } : {}),
  };

  const optimizedSrc = src ? imageTransformUrl(src, transformOptions) : "";

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      loading={loading}
      onError={onError}
    />
  );
}
