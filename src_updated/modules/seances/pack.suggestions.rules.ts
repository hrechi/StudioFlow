/**
 * Module : Gestion des Séances · Responsable : Yosser Rafrafi
 *
 * Pure rules for the AI pack-text suggestions (no database, no network → unit-testable).
 * The AI output is untrusted: everything it returns goes through these checks before the admin
 * can see it, and the admin still has to click "Use" — nothing is ever saved from here.
 *
 *  - names: trimmed, 2–80 characters, unique, never an existing pack name of the same event
 *    type (the DB enforces that uniqueness), never one already proposed;
 *  - descriptions: 10–1000 characters, never a price (prices come from the pack's price field
 *    and the Factures module, not from free text), never a number the admin did not provide
 *    (no invented "100 edited photos");
 *  - fallback: deterministic templates built only from the pack's own data.
 */

export const NOM_MIN = 2;
export const NOM_MAX = 80;
export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 1000;
export const MAX_NOMS = 4;
export const MAX_DESCRIPTIONS = 2;

export type SuggestionContext = {
  typeNom: string;
  services: { nom: string; unite?: string; quantite: number }[];
  dureeMinutes: number;
  options: string[];
};

/** Lowercase, accent-free, single-spaced: the comparison key for names ("Été" = "ete"). */
export function normaliser(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function nettoyerNom(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["'“”‘’«»*_`#\-–•\s]+|["'“”‘’«»*_`\s]+$/g, "")
    .replace(/[.:;,]+$/, "")
    .trim();
}

/** Keeps valid, unique names that do not collide with `exclus` (existing / already shown). */
export function filtrerNoms(
  brut: unknown,
  exclus: readonly string[],
  max: number = MAX_NOMS,
): string[] {
  if (!Array.isArray(brut)) return [];
  const vus = new Set(exclus.map(normaliser));
  const noms: string[] = [];
  for (const item of brut) {
    if (typeof item !== "string") continue;
    const nom = nettoyerNom(item);
    if (nom.length < NOM_MIN || nom.length > NOM_MAX) continue;
    const cle = normaliser(nom);
    if (vus.has(cle)) continue;
    vus.add(cle);
    noms.push(nom);
    if (noms.length === max) break;
  }
  return noms;
}

// ── Descriptions ────────────────────────────────────────────────────────────

const PRIX_RE = /(?:\d[\d\s.,]*\s?(?:tnd|dt|dinars?|eur|euros?|usd|dollars?)\b)|[€$£]|\b(?:tnd|dt)\s?\d/i;

/** Every number written in digits, "1,5" and "1.5" both read as 1.5. */
export function nombresDans(texte: string): number[] {
  return (texte.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => Number(n.replace(",", ".")));
}

/** The only numbers a description may contain: quantities and the duration given by the admin. */
export function nombresAutorises(ctx: Pick<SuggestionContext, "services" | "dureeMinutes">) {
  const autorises = new Set<number>();
  for (const s of ctx.services) autorises.add(s.quantite);
  if (ctx.dureeMinutes > 0) {
    const heures = Math.floor(ctx.dureeMinutes / 60);
    const reste = ctx.dureeMinutes % 60;
    autorises.add(ctx.dureeMinutes);
    autorises.add(ctx.dureeMinutes / 60);
    autorises.add(Math.round((ctx.dureeMinutes / 60) * 10) / 10);
    if (heures > 0) autorises.add(heures);
    if (reste > 0) autorises.add(reste);
  }
  return autorises;
}

export function descriptionValide(texte: string, autorises: ReadonlySet<number>): boolean {
  if (texte.length < DESCRIPTION_MIN || texte.length > DESCRIPTION_MAX) return false;
  if (PRIX_RE.test(texte)) return false;
  return nombresDans(texte).every((n) => autorises.has(n));
}

export function filtrerDescriptions(
  brut: unknown,
  autorises: ReadonlySet<number>,
  max: number = MAX_DESCRIPTIONS,
): string[] {
  if (!Array.isArray(brut)) return [];
  const vus = new Set<string>();
  const out: string[] = [];
  for (const item of brut) {
    if (typeof item !== "string") continue;
    const texte = item.replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
    if (!descriptionValide(texte, autorises)) continue;
    const cle = normaliser(texte);
    if (vus.has(cle)) continue;
    vus.add(cle);
    out.push(texte);
    if (out.length === max) break;
  }
  return out;
}

// ── Fallback templates ──────────────────────────────────────────────────────

export function formaterDuree(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function liste(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function ligneService(s: SuggestionContext["services"][number]): string {
  if (s.unite) return `${s.nom} (${s.quantite} ${s.unite})`;
  return s.quantite > 1 ? `${s.nom} ×${s.quantite}` : s.nom;
}

export function nomsParModele(typeNom: string): string[] {
  return [
    `${typeNom} Signature`,
    `${typeNom} Essentials`,
    `The ${typeNom} Experience`,
    `${typeNom} Classic`,
    `${typeNom} Premium`,
    `${typeNom} Story`,
    `${typeNom} Collection`,
  ];
}

export function descriptionsParModele(ctx: SuggestionContext): string[] {
  const type = ctx.typeNom.toLowerCase();
  const services = ctx.services.slice(0, 6).map(ligneService);
  const plus = ctx.services.length > 6 ? " and more" : "";
  const duree = ctx.dureeMinutes > 0 ? ` Estimated duration: ${formaterDuree(ctx.dureeMinutes)}.` : "";
  const options = ctx.options.length > 0 ? ` Optional add-ons: ${liste(ctx.options.slice(0, 5))}.` : "";

  if (services.length === 0) {
    return [
      `A ${type} session tailored to your needs.${duree} The details are agreed together before the shoot.${options}`,
    ];
  }
  return [
    `A complete ${type} package including ${liste(services)}${plus}.${duree}${options}`,
    `Everything you need for your ${type}: ${liste(services)}${plus}. We take care of the details so you can simply enjoy the moment.`,
  ];
}

/** Template suggestions, used when the AI is unavailable or returns nothing usable. */
export function suggestionsParModele(
  ctx: SuggestionContext,
  exclusNoms: readonly string[],
): { noms: string[]; descriptions: string[] } {
  return {
    noms: filtrerNoms(nomsParModele(ctx.typeNom), exclusNoms),
    descriptions: descriptionsParModele(ctx)
      .map((d) => d.trim())
      .filter((d) => d.length >= DESCRIPTION_MIN && d.length <= DESCRIPTION_MAX)
      .slice(0, MAX_DESCRIPTIONS),
  };
}
