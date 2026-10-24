/**
 * Module : Chatbot IA · Responsable : Yosser Rafrafi
 * Chatbot tools — fonctions PURES sur le catalogue public (pas de DB, pas de LLM, aucun effet de bord).
 * C'est ici que les prix, prestations et comparaisons sont calculés : le modèle lit ces résultats
 * mais ne peut jamais en inventer. Rien ici n'écrit quoi que ce soit.
 */
import type { CataloguePublicDTO, PackPublicDTO } from "../catalogue.types";

/** Un pack enrichi de son type d'événement pour les outils. */
export type ToolPack = PackPublicDTO & { typeEvenement: string; typeSlug: string };

/** Aplatit le catalogue imbriqué en une liste de packs enrichis. */
export function flattenCatalogue(catalogue: CataloguePublicDTO): ToolPack[] {
  return catalogue.flatMap((c) =>
    c.packs.map((p) => ({ ...p, typeEvenement: c.type.nom, typeSlug: c.type.slug })),
  );
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/** Trouve un type d'événement à partir d'un texte libre ("mariage", "wedding", slug…). */
export function findType(
  catalogue: CataloguePublicDTO,
  query: string,
): CataloguePublicDTO[number] | null {
  const q = norm(query);
  if (!q) return null;
  return (
    catalogue.find((c) => norm(c.type.nom) === q || c.type.slug === q) ??
    catalogue.find(
      (c) => norm(c.type.nom).includes(q) || q.includes(norm(c.type.nom)),
    ) ??
    null
  );
}

function view(p: ToolPack) {
  return {
    id: p.id,
    nom: p.nom,
    type_evenement: p.typeEvenement,
    description: p.description,
    prix_tnd: p.prix, // null = le studio ne l'affiche pas
    prix_affiche: p.prix !== null,
    duree_minutes: p.dureeEstimeeMinutes > 0 ? p.dureeEstimeeMinutes : null,
    prestations: p.prestations.map((s) => ({
      nom: s.nom,
      quantite: s.quantite,
      conditions: s.conditions || null,
    })),
    options: p.options.map((o) => ({ nom: o.nom, prix_tnd: o.prix, description: o.description })),
    populaire: p.miseEnAvant,
  };
}

export function listTypes(catalogue: CataloguePublicDTO) {
  return {
    types_evenement: catalogue.map((c) => ({
      nom: c.type.nom,
      slug: c.type.slug,
      nombre_packs: c.packs.length,
    })),
  };
}

export function listPacks(catalogue: CataloguePublicDTO, args: { type_evenement?: string }) {
  if (args.type_evenement) {
    const type = findType(catalogue, args.type_evenement);
    if (!type) {
      return {
        erreur: "type_inconnu",
        message: `Aucun type d'événement publié ne correspond à « ${args.type_evenement} ».`,
        types_disponibles: catalogue.map((c) => c.type.nom),
      };
    }
    return { type_evenement: type.type.nom, packs: flattenCatalogue([type]).map(view) };
  }
  return { packs: flattenCatalogue(catalogue).map(view) };
}

export function comparePacks(catalogue: CataloguePublicDTO, args: { pack_ids?: string[] }) {
  const all = flattenCatalogue(catalogue);
  const ids = [...new Set(args.pack_ids ?? [])];
  const packs = ids.map((id) => all.find((p) => p.id === id)).filter((p): p is ToolPack => !!p);
  if (packs.length < 2) {
    return {
      erreur: "comparaison_impossible",
      message: "Il faut au moins deux packs publiés existants.",
    };
  }
  const services = [...new Set(packs.flatMap((p) => p.prestations.map((s) => s.nom)))];
  const tableau = services.map((nom) => ({
    prestation: nom,
    par_pack: Object.fromEntries(
      packs.map((p) => {
        const line = p.prestations.find((s) => s.nom === nom);
        return [
          p.nom,
          line
            ? `${line.quantite}${line.conditions ? ` (${line.conditions})` : ""}`
            : "non inclus",
        ];
      }),
    ),
  }));
  const prices = packs.map((p) => p.prix).filter((x): x is number => x !== null);
  return {
    packs: packs.map(view),
    tableau_prestations: tableau,
    ecart_prix_tnd:
      prices.length === packs.length ? Math.max(...prices) - Math.min(...prices) : null,
    meme_type_evenement: new Set(packs.map((p) => p.typeSlug)).size === 1,
  };
}

/** Classement déterministe : budget → prestations souhaitées → popularité. */
export function recommendPacks(
  catalogue: CataloguePublicDTO,
  args: {
    type_evenement?: string;
    budget_max_tnd?: number;
    prestations_souhaitees?: string[];
  },
) {
  let pool = flattenCatalogue(catalogue);
  if (args.type_evenement) {
    const type = findType(catalogue, args.type_evenement);
    if (!type) {
      return {
        erreur: "type_inconnu",
        message: `Aucun type d'événement publié ne correspond à « ${args.type_evenement} ».`,
        types_disponibles: catalogue.map((c) => c.type.nom),
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
    return {
      p,
      matched,
      missing: wanted.filter((w) => !matched.includes(w)),
      withinBudget,
      priceKnown,
    };
  });

  const ranked = scored
    .filter((s) => s.withinBudget !== false) // hors budget → exclu ; prix inconnu → gardé, signalé
    .sort(
      (a, b) =>
        b.matched.length - a.matched.length ||
        Number(b.p.miseEnAvant) - Number(a.p.miseEnAvant) ||
        (b.p.prix ?? 0) - (a.p.prix ?? 0),
    )
    .slice(0, 3);

  if (ranked.length === 0) {
    const cheapest = scored
      .filter((s) => s.priceKnown)
      .sort((a, b) => a.p.prix! - b.p.prix!)[0];
    return {
      recommandations: [],
      message: "Aucun pack publié ne correspond à ces critères.",
      pack_le_moins_cher: cheapest
        ? { nom: cheapest.p.nom, prix_tnd: cheapest.p.prix }
        : null,
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

/** Extrait les IDs de packs mentionnés dans un résultat d'outil (pour les boutons CTA). */
export function packIdsOf(result: unknown): string[] {
  const out: string[] = [];
  const visit = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (typeof o.id === "string" && typeof o.nom === "string" && "prestations" in o)
        out.push(o.id);
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
    return {
      disponible: false,
      message: "Les coordonnées du studio ne sont pas configurées.",
    };
  }
  return { disponible: true, email: email ?? null, telephone: telephone ?? null };
}
