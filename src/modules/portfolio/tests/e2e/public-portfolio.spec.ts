import { expect, test } from "@playwright/test";

const publishedSlug = process.env.PORTFOLIO_E2E_PUBLISHED_SLUG;

test.describe("published portfolio", () => {
  test.skip(!publishedSlug, "Set PORTFOLIO_E2E_PUBLISHED_SLUG to a published test portfolio.");

  test("is reachable from the directory", async ({ page }) => {
    await page.goto("/portfolio");
    const portfolioLink = page.locator(`a[href="/portfolio/${publishedSlug}"]`);
    await expect(portfolioLink).toBeVisible();
    await portfolioLink.click();
    await expect(page).toHaveURL(new RegExp(`/portfolio/${publishedSlug}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

const draftSlug = process.env.PORTFOLIO_E2E_DRAFT_SLUG;

test.describe("unpublished portfolio", () => {
  test.skip(!draftSlug, "Set PORTFOLIO_E2E_DRAFT_SLUG to a draft or unpublished portfolio.");

  test("is unavailable publicly", async ({ page }) => {
    const response = await page.goto(`/portfolio/${draftSlug}`);
    expect(response?.status()).toBe(404);
  });
});
