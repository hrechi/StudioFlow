/**
 * Module : Allocation Blockchain · Responsable : Mohamed Yessine Nehdi
 * Own vitest config so the shared one stays untouched:
 *   npx vitest run --config src/modules/allocation/tests/vitest.config.ts
 */
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("../../..", import.meta.url)),
      // `server-only` throws outside a React Server environment; the tests run in Node.
      "server-only": fileURLToPath(new URL("./server-only.stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    root: fileURLToPath(new URL("../../../..", import.meta.url)),
    include: ["src/modules/allocation/tests/**/*.test.ts"],
    testTimeout: 20_000,
  },
});
