import { connectDB } from "@/lib/db";
import {
  ensurePortfolioIndex,
  syncAllPortfoliosToElasticsearch,
  getElasticsearchClient,
} from "@/modules/portfolio/portfolio.elasticsearch";

async function main() {
  console.log("Connecting to MongoDB and Elasticsearch...");
  await connectDB();

  const client = getElasticsearchClient();
  if (!client) {
    console.error("Elasticsearch client is not configured (check ELASTICSEARCH_URL).");
    process.exit(1);
  }

  console.log("Ensuring Elasticsearch index exists...");
  await ensurePortfolioIndex();

  console.log("Synchronizing all published public portfolios...");
  const result = await syncAllPortfoliosToElasticsearch();

  console.log(
    `Done! Successfully indexed ${result.success} portfolios. (${result.failed} failed)`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Elasticsearch reindexing failed:", err);
  process.exit(1);
});
