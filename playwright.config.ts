import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./src/modules/portfolio/tests/e2e",
  outputDir: "/tmp/studioflow-playwright-results",
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.PORTFOLIO_E2E_BASE_URL ?? "http://127.0.0.1:3000",
  },
});
