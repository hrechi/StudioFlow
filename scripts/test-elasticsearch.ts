import { getElasticsearchClient, PORTFOLIO_INDEX } from "@/modules/portfolio/portfolio.elasticsearch";

async function runElasticsearchDiagnostic() {
  console.log("\n==================================================");
  console.log("       STUDIOFLOW — ELASTICSEARCH DIAGNOSTIC      ");
  console.log("==================================================\n");

  const esUrl =
    process.env.ELASTICSEARCH_URL ||
    process.env.ELASTICSEARCH_NODE ||
    "http://localhost:9200";

  console.log(`[1/5] Target Elasticsearch URL : ${esUrl}`);

  const client = getElasticsearchClient();
  if (!client) {
    console.error("❌ Impossible d'initialiser le client Elasticsearch.");
    process.exit(1);
  }

  // 1. Ping
  try {
    const pingOk = await client.ping();
    if (pingOk) {
      console.log("✅ [1/5] Ping Elasticsearch : RÉUSSI");
    } else {
      console.error("❌ [1/5] Ping Elasticsearch : ÉCHEC (nœud inaccessible)");
      process.exit(1);
    }
  } catch (err: any) {
    console.error("❌ [1/5] Impossible de joindre Elasticsearch :", err?.message || err);
    console.log("\n👉 Vérifiez que le conteneur tourne avec : docker compose up -d elasticsearch");
    process.exit(1);
  }

  // 2. Info & Cluster Health
  try {
    const info = await client.info();
    console.log(`✅ [2/5] Version Elasticsearch : ${info.version.number} (${info.cluster_name})`);

    const health = await client.cluster.health();
    const statusColor =
      health.status === "green" ? "\x1b[32mGREEN\x1b[0m" : health.status === "yellow" ? "\x1b[33mYELLOW\x1b[0m" : "\x1b[31mRED\x1b[0m";
    console.log(`✅ [2/5] Santé du cluster       : ${statusColor} (Nœuds : ${health.number_of_nodes}, Shards : ${health.active_shards})`);
  } catch (err: any) {
    console.error("⚠️ [2/5] Erreur lors de la récupération de la santé :", err?.message || err);
  }

  // 3. Index check
  try {
    const indexExists = await client.indices.exists({ index: PORTFOLIO_INDEX });
    if (indexExists) {
      const countRes = await client.count({ index: PORTFOLIO_INDEX });
      console.log(`✅ [3/5] Index "${PORTFOLIO_INDEX}" : EXISTE (${countRes.count} portfolio(s) indexé(s))`);
    } else {
      console.log(`⚠️ [3/5] Index "${PORTFOLIO_INDEX}" : N'existe pas encore.`);
      console.log("   👉 Exécutez : npm run index:elasticsearch pour créer l'index et synchroniser.");
    }
  } catch (err: any) {
    console.error("❌ [3/5] Erreur vérification index :", err?.message || err);
  }

  // 4. Test d'écriture et de lecture (CRUD)
  const testId = `diag_test_${Date.now()}`;
  console.log(`\n[4/5] Test réel de lecture / écriture (ID : ${testId})...`);
  try {
    // Write
    await client.index({
      index: "studioflow_diagnostic_test",
      id: testId,
      document: {
        message: "StudioFlow Elasticsearch connection test",
        timestamp: new Date().toISOString(),
      },
      refresh: "wait_for",
    });
    console.log("✅ [4/5] Écriture dans Elasticsearch : RÉUSSIE");

    // Search
    const searchRes = await client.search({
      index: "studioflow_diagnostic_test",
      query: { term: { _id: testId } },
    });
    const totalHits =
      typeof searchRes.hits.total === "number"
        ? searchRes.hits.total
        : searchRes.hits.total?.value ?? 0;

    if (totalHits > 0) {
      console.log("✅ [4/5] Recherche dans Elasticsearch : RÉUSSIE");
    } else {
      console.warn("⚠️ [4/5] Document écrit mais non retrouvé dans la recherche immédiate.");
    }

    // Cleanup
    await client.indices.delete({ index: "studioflow_diagnostic_test" });
    console.log("✅ [4/5] Nettoyage de l'index de test : FAIT");
  } catch (err: any) {
    console.error("❌ [4/5] Échec du test d'écriture/lecture :", err?.message || err);
    if (err?.message?.includes("media_type_header_exception")) {
      console.error("👉 Incompatibilité de version d'en-tête résolue avec le client v8.");
    }
    process.exit(1);
  }

  // 5. Conclusion
  console.log("\n==================================================");
  console.log("  🎉 ELASTICSEARCH EST 100% OPÉRATIONNEL !        ");
  console.log("==================================================\n");
  process.exit(0);
}

runElasticsearchDiagnostic().catch((err) => {
  console.error("Diagnostic failed with fatal error:", err);
  process.exit(1);
});
