import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker build only (see Dockerfile): self-contained server in .next/standalone.
  // Off locally so `npm run start` keeps working as usual.
  output: process.env.NEXT_OUTPUT_STANDALONE === "1" ? "standalone" : undefined,
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
