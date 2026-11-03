import type { MetadataRoute } from "next";

/**
 * Web App Manifest (served at /manifest.webmanifest): makes ReFrame installable as an app
 * (home screen on mobile, "Install" button in the desktop browser bar).
 * Offline support comes from the service worker in public/sw.js.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ReFrame — Photography studio",
    short_name: "ReFrame",
    description:
      "Book your photo session, follow your reservations and view your private galleries.",
    lang: "en",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    categories: ["photo", "lifestyle", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // Long-press the app icon (Android) / right-click the dock icon (desktop).
    shortcuts: [
      { name: "Portfolio", url: "/portfolio", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My space", url: "/espace-client", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Dashboard", url: "/dashboard", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
