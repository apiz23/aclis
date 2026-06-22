import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ACLIS — Pejabat Daerah Pontian",
    short_name: "ACLIS",
    description: "Sistem AI Pengurusan Data Ketua Kampung & Penghulu",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#eae4d8",
    theme_color: "#4d4640",
    icons: [
      {
        src: "/icons/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
