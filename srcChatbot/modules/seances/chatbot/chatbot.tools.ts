/**
 * Chatbot tools — PURE functions over the public catalogue (no DB, no LLM, no side effect).
 * This is the only place where prices, services and comparisons are computed: the model
 * can read their result but can never invent it, and nothing here writes anything.
 */
import type { CatalogueCategorie, PackPublic } from "../seance.types";

export type ToolPack = PackPublic & { typeEvenement: string; typeSlug: string };

export function flattenCatalogue(catalogue: CatalogueCategorie[]): ToolPack[] {
  return catalogue.flatMap((c) =>
    c.packs.map((p) => ({ ...p, typeEvenement: c.nom, typeSlug: c.slug })),
  );
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/** Finds an event type from free text ("mariage", "wedding", slug…). */
export function findType(catalogue: CatalogueCategorie[], query: string): CatalogueCategorie | null {
  const q = norm(query);
  if (!q) return null;
  return (
    catalogue.find((c) => norm(c.nom) === q || c.slug === q) ??
    catalogue.find((c) => norm(c.nom).includes(q) || q.includes(norm(c.nom))) ??
    null
  );
}

function view(p: ToolPack) {
  return {
    id: p.id,
    nom: p.nom,
    type_evenement: p.typeEvenement,
    description: p.description,
    prix_tnd: p.prix, // null = the studio does not display this price
    prix_affiche: p.prix !== null,
    duree_minutes: p.dureeMinutes ?? null,
    prestations: p.prestations.map((s) => ({
      nom: s.nom,
      quantite: s.quantite,
      conditions: s.conditions || null,
    })),
    options: p.options.map((o) => ({ nom: o.nom, prix_tnd: o.prix, description: o.description })),
    populaire: p.miseEnAvant,
  };
}

export function listTypes(catalogue: CatalogueCategorie[]) {
  return {
    types_evenement: catalogue.map((c) => ({ nom: c.nom, slug: c.slug, nombre_packs: c.packs.length })),
  };
}

export function listPacks(catalogue: CatalogueCategorie[], args: { type_evenement?: string }) {
  if (args.type_evenement) {
    const type = findType(catalogue, args.type_evenement);
    if (!type) {
      return {
        erreur: "type_inconnu",
        message: `Aucun type d'événement publié ne correspond à « ${args.type_evenement} ».`,
        types_disponibles: catalogue.map((c) => c.nom),
      };
    }
    return { type_evenement: type.nom, packs: flattenCatalogue([type]).map(view) };
  }
  return { packs: flattenCatalogue(catalogue).map(view) };
}

export function comparePacks(catalogue: CatalogueCategorie[], args: { pack_ids?: string[] }) {
  const all = flattenCatalogue(catalogue);
  const ids = [...new Set(args.pack_ids ?? [])];
  const packs = ids.map((id) => all.find((p) => p.id === id)).filter((p): p is ToolPack => !!p);
  if (packs.length < 2) {
    return { erreur: "comparaison_impossible", message: "Il faut au moins deux packs publiés existants." };
  }
  const services = [...new Set(packs.flatMap((p) => p.prestations.map((s) => s.nom)))];
  const tableau = services.map((nom) => ({
    prestation: nom,
    par_pack: Object.fromEntries(
      packs.map((p) => {
        const line = p.prestations.find((s) => s.nom === nom);
        return [p.nom, line ? `${line.quantite}${line.conditions ? ` (${line.conditions})` : ""}` : "non inclus"];
      }),
    ),
  }));
  const prices = packs.map((p) => p.prix).filter((x): x is number => x !== null);
  return {
    packs: packs.map(view),
    tableau_prestations: tableau,
    ecart_prix_tnd: prices.length === packs.length ? Math.max(...prices) - Math.min(...prices) : null,
    meme_type_evenement: new Set(packs.map((p) => p.typeSlug)).size === 1,
  };
}

/** Deterministic ranking: budget first, then requested services, then "popular". */
export function recommendPacks(
  catalogue: CatalogueCategorie[],
  args: { type_evenement?: string; budget_max_tnd?: number; prestations_souhaitees?: string[] },
) {
  let pool = flattenCatalogue(catalogue);
  if (args.type_evenement) {
    const type = findType(catalogue, args.type_evenement);
    if (!type) {
      return {
        erreur: "type_inconnu",
        message: `Aucun type d'événement publié ne correspond à « ${args.type_evenement} ».`,
        types_disponibles: catalogue.map((c) => c.nom),
      };
    }
    pool = flattenCatalogue([type]);
  }
  const wanted = (args.prestations_souhaitees ?? []).map(norm).filter(Boolean);
  const budget = typeof args.budget_max_tnd === "number" ? args.budget_max_tnd : null;

  const scored = pool.map((p) => {
    const names = p.prestations.map((s) => norm(s.nom));
    const matched = wanted.filter((w) => names.some((n) => n.includes(w) || w.includes(n)));
    const priceKnown = p.prix !== null;
    const withinBudget = budget === null ? null : priceKnown ? p.prix! <= budget : null;
    return { p, matched, missing: wanted.filter((w) => !matched.includes(w)), withinBudget, priceKnown };
  });

  const ranked = scored
    .filter((s) => s.withinBudget !== false) // over budget → excluded; unknown price → kept, flagged
    .sort(
      (a, b) =>
        b.matched.length - a.matched.length ||
        Number(b.p.miseEnAvant) - Number(a.p.miseEnAvant) ||
        (b.p.prix ?? 0) - (a.p.prix ?? 0), // best value inside the budget = the fullest pack
    )
    .slice(0, 3);

  if (ranked.length === 0) {
    const cheapest = scored.filter((s) => s.priceKnown).sort((a, b) => a.p.prix! - b.p.prix!)[0];
    return {
      recommandations: [],
      message: "Aucun pack publié ne correspond à ces critères.",
      pack_le_moins_cher: cheapest ? { nom: cheapest.p.nom, prix_tnd: cheapest.p.prix } : null,
    };
  }
  return {
    recommandations: ranked.map((s) => ({
      ...view(s.p),
      correspond_au_budget: s.withinBudget,
      prestations_souhaitees_incluses: s.matched,
      prestations_souhaitees_manquantes: s.missing,
    })),
  };
}

/** Pack ids a tool result talks about — used to render "request this pack" buttons. */
export function packIdsOf(result: unknown): string[] {
  const out: string[] = [];
  const visit = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (typeof o.id === "string" && typeof o.nom === "string" && "prestations" in o) out.push(o.id);
      Object.values(o).forEach(visit);
    }
  };
  visit(result);
  return out;
}

export function studioContact() {
  const email = process.env.STUDIO_CONTACT_EMAIL;
  const telephone = process.env.STUDIO_CONTACT_PHONE;
  if (!email && !telephone) {
    return { disponible: false, message: "Les coordonnées du studio ne sont pas configurées." };
  }
  return { disponible: true, email: email ?? null, telephone: telephone ?? null };
}
