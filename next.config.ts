import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker build only (see Dockerfile): self-contained server in .next/standalone.
  // Off locally so `npm run start` keeps working as usual.
  output: process.env.NEXT_OUTPUT_STANDALONE === "1" ? "standalone" : undefined,
  // Cache Components is intentionally off: every page here reads the session or
  // MongoDB, so the classic dynamic rendering model is simpler for every developer.
  // See README > "Next.js notes" before turning it on.
  // PWA offline mode: navigations and Server Actions started without a connection wait and
  // retry once it is back; useOffline() (components/pwa/offline-banner.tsx) shows the state.
  experimental: {
    useOffline: true,
  },
  async headers() {
    return [
      {
        // The service worker must never be cached, so new versions reach users right away.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
