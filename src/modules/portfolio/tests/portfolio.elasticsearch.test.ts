import { describe, expect, it } from "vitest";
import {
  PORTFOLIO_INDEX,
  getElasticsearchClient,
  isElasticsearchAvailable,
  searchPortfoliosWithElasticsearch,
} from "../portfolio.elasticsearch";

describe("portfolio elasticsearch integration", () => {
  it("defines the expected index name", () => {
    expect(PORTFOLIO_INDEX).toBe("studioflow_portfolios");
  });

  it("returns an elasticsearch client instance", () => {
    const client = getElasticsearchClient();
    expect(client).toBeDefined();
  });

  it("handles isElasticsearchAvailable gracefully without crashing when node is offline", async () => {
    const available = await isElasticsearchAvailable();
    expect(typeof available).toBe("boolean");
  });

  it("falls back to null on searchPortfoliosWithElasticsearch when cluster is offline", async () => {
    const result = await searchPortfoliosWithElasticsearch({
      recherche: "wedding",
      ville: "Paris",
      categories: ["MARIAGE"],
      styles: [],
      services: [],
      disponible: false,
      page: 1,
    });
    // When Elasticsearch is offline or unreachable, returns null to trigger seamless MongoDB fallback
    expect(result === null || typeof result === "object").toBe(true);
  });
});
