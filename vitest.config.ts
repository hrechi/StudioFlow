import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: [
      "src/modules/portfolio/tests/**/*.test.ts",
      "src/modules/facturation/tests/**/*.test.ts",
      "src/modules/invitations/tests/**/*.test.ts",
      "src/modules/materiel/tests/**/*.test.ts",
    ],
  },
});
