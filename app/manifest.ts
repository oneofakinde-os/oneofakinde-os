import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "oneofakinde",
    short_name: "oneofakinde",
    description:
      "discover, collect, and own one-of-a-kind digital media — drops, worlds, and live sessions from independent studios.",
    start_url: "/showroom",
    display: "standalone",
    background_color: "#0f151a",
    theme_color: "#0f151a",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
