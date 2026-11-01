import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DOBRA 2048 — Arcade Edition",
    short_name: "DOBRA 2048",
    description:
      "Junte os números, dobre os blocos e alcance o 2048. Jogue com temas visuais e dispute os rankings Local e Global.",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8ef",
    theme_color: "#edc22e",
    orientation: "portrait",
    categories: ["games", "entertainment", "puzzle"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
