import { z } from "zod";
import type { CategorieMateriel, KitSuggereDTO } from "./materiel.types";

export const MAX_KIT_ITEMS = 10;

export type KitDisponible = {
  id: string;
  nom: string;
  categorie: CategorieMateriel;
};

export const reponseKitSchema = z.object({
  items: z
    .array(
      z.object({
        materielId: z.string(),
        raison: z.string().trim().min(1).max(300),
      }),
    )
    .max(30),
  confiance: z.number().min(0).max(1),
});

export function filtrerKitIA(
  brut: unknown,
  disponibles: KitDisponible[],
): { items: KitSuggereDTO["items"]; confiance: number } | null {
  const parsed = reponseKitSchema.safeParse(brut);
  if (!parsed.success) return null;

  const byId = new Map(disponibles.map((item) => [item.id, item]));
  const vus = new Set<string>();
  const items: KitSuggereDTO["items"] = [];
  for (const { materielId, raison } of parsed.data.items) {
    const materiel = byId.get(materielId);
    if (!materiel || vus.has(materielId)) continue;
    vus.add(materielId);
    items.push({ materielId, nom: materiel.nom, categorie: materiel.categorie, raison });
    if (items.length === MAX_KIT_ITEMS) break;
  }
  return items.length > 0 ? { items, confiance: parsed.data.confiance } : null;
}

export function kitDepuisHistorique(
  disponibles: KitDisponible[],
  usages: Map<string, number>,
  typeEvenement: string,
): KitSuggereDTO["items"] {
  return disponibles
    .map((materiel) => ({ materiel, usages: usages.get(materiel.id) ?? 0 }))
    .filter(({ usages }) => usages > 0)
    .sort((a, b) => b.usages - a.usages || a.materiel.nom.localeCompare(b.materiel.nom))
    .slice(0, MAX_KIT_ITEMS)
    .map(({ materiel, usages }) => ({
      materielId: materiel.id,
      nom: materiel.nom,
      categorie: materiel.categorie,
      raison: `Used in ${usages} past ${typeEvenement} session${usages > 1 ? "s" : ""}.`,
    }));
}
