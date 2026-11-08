import { Client } from "@elastic/elasticsearch";
import type { PublicPortfolioSearchInput } from "./portfolio.schemas";
import { connectDB } from "@/lib/db";
import { Portfolio, type PortfolioDocument } from "./portfolio.model";
import { Utilisateur } from "@/modules/utilisateurs/utilisateur.model";

export const PORTFOLIO_INDEX = "studioflow_portfolios";

let esClientInstance: Client | null = null;
let indexEnsured = false;

type QueryClause = Record<string, unknown>;

/**
 * Returns the Elasticsearch client instance or null if not configured / unavailable.
 */
export function getElasticsearchClient(): Client | null {
  const node =
    process.env.ELASTICSEARCH_URL ||
    process.env.ELASTICSEARCH_NODE ||
    "http://localhost:9200";

  if (!node) return null;

  if (!esClientInstance) {
    let authConfig: { apiKey?: string; username?: string; password?: string } | undefined;
    if (process.env.ELASTICSEARCH_API_KEY) {
      authConfig = { apiKey: process.env.ELASTICSEARCH_API_KEY };
    } else if (process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD) {
      authConfig = {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD,
      };
    }

    esClientInstance = new Client({
      node,
      auth: authConfig as NonNullable<ConstructorParameters<typeof Client>[0]>["auth"],
      maxRetries: 2,
      requestTimeout: 2000,
    });
  }

  return esClientInstance;
}

/**
 * Fast ping check to verify if Elasticsearch is reachable.
 */
export async function isElasticsearchAvailable(): Promise<boolean> {
  const client = getElasticsearchClient();
  if (!client) return false;
  try {
    const pingResult = await Promise.race([
      client.ping(),
      new Promise<boolean>((_, reject) =>
        setTimeout(() => reject(new Error("ES ping timeout")), 1200),
      ),
    ]);
    return Boolean(pingResult);
  } catch {
    return false;
  }
}

/**
 * Document representation stored in Elasticsearch for search and faceting.
 */
export type ElasticsearchPortfolioDoc = {
  id: string;
  slug: string;
  titre: string;
  slogan?: string;
  bio?: string;
  specialites: string[];
  styles: string[];
  services: string[];
  disponible: boolean;
  statut: string;
  visibilite: string;
  ville?: string;
  region?: string;
  pays?: string;
  datePublication?: string;
  photoCouverture?: string;
  theme?: string;
  couleurAccent?: string;
  photographe: {
    id: string;
    prenom?: string;
    nom?: string;
    entreprise?: string;
    photoProfil?: string;
    ville?: string;
  };
};

/**
 * Ensures the portfolio index exists with appropriate search and filtering mappings.
 */
export async function ensurePortfolioIndex(): Promise<boolean> {
  if (indexEnsured) return true;
  const client = getElasticsearchClient();
  if (!client) return false;

  try {
    const exists = await client.indices.exists({ index: PORTFOLIO_INDEX });
    if (!exists) {
      await client.indices.create({
        index: PORTFOLIO_INDEX,
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          analysis: {
            analyzer: {
              portfolio_text_analyzer: {
                type: "custom",
                tokenizer: "standard",
                filter: ["lowercase", "asciifolding"],
              },
            },
          },
        },
        mappings: {
          properties: {
            id: { type: "keyword" },
            slug: { type: "keyword" },
            titre: {
              type: "text",
              analyzer: "portfolio_text_analyzer",
              fields: { keyword: { type: "keyword" } },
            },
            slogan: { type: "text", analyzer: "portfolio_text_analyzer" },
            bio: { type: "text", analyzer: "portfolio_text_analyzer" },
            specialites: { type: "keyword" },
            styles: { type: "keyword" },
            services: { type: "keyword" },
            disponible: { type: "boolean" },
            statut: { type: "keyword" },
            visibilite: { type: "keyword" },
            ville: {
              type: "text",
              analyzer: "portfolio_text_analyzer",
              fields: { keyword: { type: "keyword" } },
            },
            region: {
              type: "text",
              analyzer: "portfolio_text_analyzer",
              fields: { keyword: { type: "keyword" } },
            },
            pays: {
              type: "text",
              analyzer: "portfolio_text_analyzer",
              fields: { keyword: { type: "keyword" } },
            },
            datePublication: { type: "date" },
            photoCouverture: { type: "keyword", index: false },
            theme: { type: "keyword" },
            couleurAccent: { type: "keyword" },
            photographe: {
              properties: {
                id: { type: "keyword" },
                prenom: {
                  type: "text",
                  analyzer: "portfolio_text_analyzer",
                  fields: { keyword: { type: "keyword" } },
                },
                nom: {
                  type: "text",
                  analyzer: "portfolio_text_analyzer",
                  fields: { keyword: { type: "keyword" } },
                },
                entreprise: {
                  type: "text",
                  analyzer: "portfolio_text_analyzer",
                  fields: { keyword: { type: "keyword" } },
                },
                photoProfil: { type: "keyword", index: false },
                ville: { type: "keyword" },
              },
            },
          },
        },
      });
    }
    indexEnsured = true;
    return true;
  } catch (error) {
    console.warn("Elasticsearch ensurePortfolioIndex warning:", error);
    return false;
  }
}

/**
 * Formats a Mongo Portfolio document into the Elasticsearch document schema.
 */
export async function buildElasticsearchDoc(
  portfolio: PortfolioDocument & { _id?: unknown },
): Promise<ElasticsearchPortfolioDoc | null> {
  const photographer = await Utilisateur.findById(portfolio.proprietaire)
    .select("prenom nom entreprise photoProfil ville")
    .lean<{
      _id: unknown;
      prenom?: string;
      nom?: string;
      entreprise?: string;
      photoProfil?: string;
      ville?: string;
    }>();

  const id = String(portfolio._id || "");
  const slug = portfolio.slug || id;
  const rawPortfolio = portfolio as unknown as Record<string, unknown>;

  const statut = typeof rawPortfolio.statut === "string" ? rawPortfolio.statut : "PUBLIE";
  const visibilite = typeof rawPortfolio.visibilite === "string" ? rawPortfolio.visibilite : "PUBLIC";
  const datePublication =
    rawPortfolio.datePublication instanceof Date
      ? rawPortfolio.datePublication.toISOString()
      : typeof rawPortfolio.datePublication === "string"
        ? rawPortfolio.datePublication
        : undefined;

  return {
    id,
    slug,
    titre: portfolio.titre,
    slogan: portfolio.slogan,
    bio: portfolio.bio,
    specialites: portfolio.specialites || [],
    styles: portfolio.styles || [],
    services: portfolio.services || [],
    disponible: Boolean(portfolio.disponible),
    statut,
    visibilite,
    ville: portfolio.ville,
    region: portfolio.region,
    pays: portfolio.pays,
    datePublication,
    photoCouverture: portfolio.photoCouverture,
    theme: portfolio.theme,
    couleurAccent: portfolio.couleurAccent,
    photographe: {
      id: String(portfolio.proprietaire),
      prenom: photographer?.prenom,
      nom: photographer?.nom,
      entreprise: photographer?.entreprise,
      photoProfil: photographer?.photoProfil,
      ville: photographer?.ville,
    },
  };
}

/**
 * Indexes or updates a portfolio in Elasticsearch.
 */
export async function indexPortfolioInElasticsearch(
  portfolio: PortfolioDocument & { _id?: unknown },
): Promise<boolean> {
  const client = getElasticsearchClient();
  if (!client) return false;

  const id = String(portfolio._id || "");
  if (!id) return false;

  try {
    const isReady = await ensurePortfolioIndex();
    if (!isReady) return false;

    // Only index published and public portfolios
    const rawPortfolio = portfolio as unknown as Record<string, unknown>;
    const statut = rawPortfolio.statut;
    const visibilite = rawPortfolio.visibilite;
    if (statut !== "PUBLIE" || visibilite !== "PUBLIC") {
      await removePortfolioFromElasticsearch(id);
      return true;
    }

    const doc = await buildElasticsearchDoc(portfolio);
    if (!doc) return false;

    await client.index({
      index: PORTFOLIO_INDEX,
      id: doc.id,
      document: doc,
      refresh: "wait_for",
    });
    return true;
  } catch (error) {
    console.warn("Elasticsearch index error for portfolio:", id, error);
    return false;
  }
}

/**
 * Removes a portfolio from the Elasticsearch index.
 */
export async function removePortfolioFromElasticsearch(
  portfolioId: string,
): Promise<boolean> {
  const client = getElasticsearchClient();
  if (!client) return false;

  try {
    const exists = await client.indices.exists({ index: PORTFOLIO_INDEX });
    if (!exists) return true;

    await client.delete({
      index: PORTFOLIO_INDEX,
      id: portfolioId,
      refresh: "wait_for",
    });
    return true;
  } catch {
    // If document didn't exist in ES, ignore
    return true;
  }
}

/**
 * Syncs a single portfolio from MongoDB by ID into Elasticsearch.
 */
export async function syncPortfolioById(portfolioId: string): Promise<boolean> {
  await connectDB();
  const portfolio = await Portfolio.findById(portfolioId);
  if (!portfolio) {
    return removePortfolioFromElasticsearch(portfolioId);
  }
  return indexPortfolioInElasticsearch(portfolio);
}

/**
 * Syncs all published public portfolios from MongoDB to Elasticsearch.
 */
export async function syncAllPortfoliosToElasticsearch(): Promise<{
  success: number;
  failed: number;
}> {
  await connectDB();
  const client = getElasticsearchClient();
  if (!client) {
    throw new Error("Elasticsearch client is not available or not configured.");
  }

  await ensurePortfolioIndex();

  const portfolios = await Portfolio.find({
    statut: "PUBLIE",
    visibilite: "PUBLIC",
  });

  let success = 0;
  let failed = 0;

  for (const portfolio of portfolios) {
    try {
      const ok = await indexPortfolioInElasticsearch(portfolio);
      if (ok) success++;
      else failed++;
    } catch {
      failed++;
    }
  }

  return { success, failed };
}

let initialSync: Promise<boolean> | null = null;

/**
 * Makes sure the index exists before searching. A fresh Elasticsearch (e.g. a new Docker
 * volume) has no index yet, so it is built once from MongoDB; concurrent requests share that sync.
 */
async function ensureSearchableIndex(client: Client): Promise<boolean> {
  if (indexEnsured) return true;
  if (await client.indices.exists({ index: PORTFOLIO_INDEX })) {
    indexEnsured = true;
    return true;
  }
  initialSync ??= syncAllPortfoliosToElasticsearch()
    .then(({ success, failed }) => {
      console.info(`Elasticsearch: built "${PORTFOLIO_INDEX}" from MongoDB (${success} indexed, ${failed} failed).`);
      return true;
    })
    .catch((error: unknown) => {
      console.warn("Elasticsearch: could not build the portfolio index:", errorMessage(error));
      return false;
    })
    .finally(() => {
      initialSync = null;
    });
  return initialSync;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Executes full-text search and facet filtering on portfolios via Elasticsearch.
 */
export async function searchPortfoliosWithElasticsearch(
  query: PublicPortfolioSearchInput,
): Promise<{
  ids: string[];
  total: number;
  page: number;
  pageCount: number;
} | null> {
  const client = getElasticsearchClient();
  if (!client) return null;

  try {
    const isReady = await isElasticsearchAvailable();
    if (!isReady) return null;
    if (!(await ensureSearchableIndex(client))) return null;

    const page = Math.max(1, query.page ?? 1);
    const pageSize = 12;

    const filterClauses: QueryClause[] = [
      { term: { statut: "PUBLIE" } },
      { term: { visibilite: "PUBLIC" } },
    ];

    if (query.disponible) {
      filterClauses.push({ term: { disponible: true } });
    }

    if (query.categories && query.categories.length > 0) {
      for (const cat of query.categories) {
        filterClauses.push({ term: { specialites: cat } });
      }
    }

    if (query.styles && query.styles.length > 0) {
      for (const st of query.styles) {
        filterClauses.push({ term: { styles: st } });
      }
    }

    if (query.services && query.services.length > 0) {
      for (const srv of query.services) {
        filterClauses.push({ term: { services: srv } });
      }
    }

    const mustClauses: QueryClause[] = [];

    if (query.ville && query.ville.trim()) {
      mustClauses.push({
        multi_match: {
          query: query.ville.trim(),
          fields: ["ville^3", "region^2", "pays", "photographe.ville^2"],
          fuzziness: "AUTO",
        },
      });
    }

    if (query.recherche && query.recherche.trim()) {
      mustClauses.push({
        multi_match: {
          query: query.recherche.trim(),
          fields: [
            "titre^4",
            "slogan^2.5",
            "bio^1.5",
            "photographe.prenom^3",
            "photographe.nom^3",
            "photographe.entreprise^3",
            "ville^2",
            "region",
            "specialites^2",
            "styles",
            "services",
          ],
          fuzziness: "AUTO",
          operator: "and",
        },
      });
    }

    const esQuery: { bool: { filter: QueryClause[]; must?: QueryClause[] } } = {
      bool: {
        filter: filterClauses,
      },
    };

    if (mustClauses.length > 0) {
      esQuery.bool.must = mustClauses;
    }

    const searchResponse = await client.search<ElasticsearchPortfolioDoc>({
      index: PORTFOLIO_INDEX,
      from: (page - 1) * pageSize,
      size: pageSize,
      query: esQuery,
      sort: [{ datePublication: { order: "desc", unmapped_type: "date" } }],
    });

    const hits = searchResponse.hits.hits;
    const totalRaw = searchResponse.hits.total;
    const total = typeof totalRaw === "number" ? totalRaw : totalRaw?.value ?? 0;

    const ids = hits
      .map((hit) => hit._id || (hit._source ? hit._source.id : undefined))
      .filter((id): id is string => Boolean(id));
    const pageCount = Math.max(1, Math.ceil(total / pageSize));

    return {
      ids,
      total,
      page,
      pageCount,
    };
  } catch (error) {
    // The index was deleted while the app was running: rebuild it on the next search.
    if (errorMessage(error).includes("index_not_found_exception")) indexEnsured = false;
    console.warn("Elasticsearch query error, falling back to MongoDB:", errorMessage(error));
    return null;
  }
}
