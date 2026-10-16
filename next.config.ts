import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is intentionally off: every page here reads the session or
  // MongoDB, so the classic dynamic rendering model is simpler for every developer.
  // See README > "Next.js notes" before turning it on.
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
