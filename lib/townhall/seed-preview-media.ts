import type { DropPreviewMap, DropPreviewMode } from "@/lib/domain/contracts";
import { resolveAssetUrl } from "@/lib/media/resolve-asset-url";

const SEED_PREVIEW_MEDIA_BY_DROP_ID: Record<string, () => DropPreviewMap> = {
  stardust: () => ({
    watch: {
      type: "video",
      src: resolveAssetUrl("stardust:watch:video"),
      posterSrc: resolveAssetUrl("stardust:watch:poster"),
      alt: "stardust watch preview"
    },
    listen: {
      type: "audio",
      src: resolveAssetUrl("stardust:listen:audio"),
      posterSrc: resolveAssetUrl("stardust:listen:poster"),
      alt: "stardust listen preview"
    },
    read: {
      type: "text",
      text: "episode one opens with stardust drifting through memory and identity."
    },
    photos: {
      type: "image",
      src: resolveAssetUrl("stardust:photos:image"),
      alt: "stardust photos preview"
    },
    live: {
      type: "video",
      src: resolveAssetUrl("stardust:live:video"),
      posterSrc: resolveAssetUrl("stardust:live:poster"),
      alt: "stardust live preview"
    }
  }),
  "twilight-whispers": () => ({
    watch: {
      type: "video",
      src: resolveAssetUrl("twilight-whispers:watch:video"),
      posterSrc: resolveAssetUrl("twilight-whispers:watch:poster"),
      alt: "twilight whispers watch preview"
    },
    listen: {
      type: "audio",
      src: resolveAssetUrl("twilight-whispers:listen:audio"),
      posterSrc: resolveAssetUrl("twilight-whispers:listen:poster"),
      alt: "twilight whispers listen preview"
    },
    read: {
      type: "text",
      text: "lights in the night traces water, memory, and a late-hour horizon."
    },
    photos: {
      type: "image",
      src: resolveAssetUrl("twilight-whispers:photos:image"),
      alt: "twilight whispers photos preview"
    },
    live: {
      type: "video",
      src: resolveAssetUrl("twilight-whispers:live:video"),
      posterSrc: resolveAssetUrl("twilight-whispers:live:poster"),
      alt: "twilight whispers live preview"
    }
  }),
  voidrunner: () => ({
    watch: {
      type: "video",
      src: resolveAssetUrl("voidrunner:watch:video"),
      posterSrc: resolveAssetUrl("voidrunner:watch:poster"),
      alt: "voidrunner watch preview"
    },
    listen: {
      type: "audio",
      src: resolveAssetUrl("voidrunner:listen:audio"),
      posterSrc: resolveAssetUrl("voidrunner:listen:poster"),
      alt: "voidrunner listen preview"
    },
    read: {
      type: "text",
      text: "a lone signal crosses worlds and leaves a trace in the feed."
    },
    photos: {
      type: "image",
      src: resolveAssetUrl("voidrunner:photos:image"),
      alt: "voidrunner photos preview"
    },
    live: {
      type: "video",
      src: resolveAssetUrl("voidrunner:live:video"),
      posterSrc: resolveAssetUrl("voidrunner:live:poster"),
      alt: "voidrunner live preview"
    }
  }),
  "through-the-lens": () => ({
    watch: {
      type: "video",
      src: resolveAssetUrl("through-the-lens:watch:video"),
      posterSrc: resolveAssetUrl("through-the-lens:watch:poster"),
      alt: "through the lens watch preview"
    },
    listen: {
      type: "audio",
      src: resolveAssetUrl("through-the-lens:listen:audio"),
      posterSrc: resolveAssetUrl("through-the-lens:listen:poster"),
      alt: "through the lens listen preview"
    },
    read: {
      type: "text",
      text: "coffee table captures layered city voices from one shared moment."
    },
    photos: {
      type: "image",
      src: resolveAssetUrl("through-the-lens:photos:image"),
      alt: "through the lens photos preview"
    },
    live: {
      type: "video",
      src: resolveAssetUrl("through-the-lens:live:video"),
      posterSrc: resolveAssetUrl("through-the-lens:live:poster"),
      alt: "through the lens live preview"
    }
  })
};

export function seedPreviewMediaForDrop(dropId: string): DropPreviewMap | undefined {
  const factory = SEED_PREVIEW_MEDIA_BY_DROP_ID[dropId];
  if (!factory) {
    return undefined;
  }

  const previewMedia = factory();
  const cloned: DropPreviewMap = {};
  for (const mode of Object.keys(previewMedia) as DropPreviewMode[]) {
    const asset = previewMedia[mode];
    if (asset) {
      cloned[mode] = { ...asset };
    }
  }

  return cloned;
}
