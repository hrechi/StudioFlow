/**
 * Module : Gestion des Invitations. Editing tools on several elements at once: align, distribute,
 * duplicate, group, layer order, flip. Pure (no canvas), so the editor only applies the result
 * through its history and every tool can be undone.
 */
import type { ElementInvitation, ElementTexte } from "./invitation.schema";

export type Alignement = "gauche" | "centreH" | "droite" | "haut" | "centreV" | "bas";
type Carte = { width: number; height: number };
type Boite = { x: number; y: number; width: number; height: number };

const boiteDe = (elements: ElementInvitation[]): Boite => {
  const x = Math.min(...elements.map((e) => e.x));
  const y = Math.min(...elements.map((e) => e.y));
  const droite = Math.max(...elements.map((e) => e.x + e.width));
  const bas = Math.max(...elements.map((e) => e.y + e.height));
  return { x, y, width: droite - x, height: bas - y };
};

const arrondi = (v: number) => Math.round(v * 100) / 100;

/** Selecting one member of a group selects the whole group. */
export function avecGroupes(elements: ElementInvitation[], ids: string[]): string[] {
  const groupes = new Set(elements.filter((e) => ids.includes(e.id) && e.groupe).map((e) => e.groupe));
  return elements.filter((e) => ids.includes(e.id) || (e.groupe && groupes.has(e.groupe))).map((e) => e.id);
}

/**
 * One element aligns to the card; several align to the box around them. Locked elements stay put.
 */
export function aligner(elements: ElementInvitation[], ids: string[], mode: Alignement, carte: Carte): ElementInvitation[] {
  const cibles = elements.filter((e) => ids.includes(e.id) && !e.verrouille);
  if (cibles.length === 0) return elements;
  const ref: Boite = cibles.length === 1 ? { x: 0, y: 0, ...carte } : boiteDe(cibles);
  const position = (e: ElementInvitation): Partial<ElementInvitation> => {
    switch (mode) {
      case "gauche": return { x: ref.x };
      case "centreH": return { x: arrondi(ref.x + (ref.width - e.width) / 2) };
      case "droite": return { x: arrondi(ref.x + ref.width - e.width) };
      case "haut": return { y: ref.y };
      case "centreV": return { y: arrondi(ref.y + (ref.height - e.height) / 2) };
      case "bas": return { y: arrondi(ref.y + ref.height - e.height) };
    }
  };
  const touches = new Set(cibles.map((e) => e.id));
  return elements.map((e) => (touches.has(e.id) ? ({ ...e, ...position(e) } as ElementInvitation) : e));
}

/** Equal gaps between three or more elements; the first and the last do not move. */
export function distribuer(elements: ElementInvitation[], ids: string[], axe: "horizontal" | "vertical"): ElementInvitation[] {
  const cibles = elements.filter((e) => ids.includes(e.id) && !e.verrouille);
  if (cibles.length < 3) return elements;
  const [pos, taille] = axe === "horizontal" ? (["x", "width"] as const) : (["y", "height"] as const);
  const tries = [...cibles].sort((a, b) => a[pos] - b[pos]);
  const debut = tries[0][pos];
  const fin = tries.at(-1)![pos] + tries.at(-1)![taille];
  const occupe = tries.reduce((somme, e) => somme + e[taille], 0);
  const ecart = (fin - debut - occupe) / (tries.length - 1);
  const positions = new Map<string, number>();
  let curseur = debut;
  for (const e of tries) {
    positions.set(e.id, arrondi(curseur));
    curseur += e[taille] + ecart;
  }
  return elements.map((e) => (positions.has(e.id) ? ({ ...e, [pos]: positions.get(e.id) } as ElementInvitation) : e));
}

const coucheMax = (elements: ElementInvitation[]) => elements.reduce((max, e) => Math.max(max, e.layer), 0);

/**
 * Copies land on top, shifted a little. A copied group becomes a new group, so the copy and the
 * original can be moved apart.
 */
export function dupliquer(
  elements: ElementInvitation[],
  sources: ElementInvitation[],
  nouvelId: () => string,
  decalage = 16,
): { elements: ElementInvitation[]; ids: string[] } {
  const nouveauxGroupes = new Map<string, string>();
  let couche = coucheMax(elements);
  const copies = [...sources]
    .sort((a, b) => a.layer - b.layer)
    .map((source): ElementInvitation => {
      const groupe = source.groupe
        ? (nouveauxGroupes.get(source.groupe) ?? nouveauxGroupes.set(source.groupe, nouvelId()).get(source.groupe))
        : undefined;
      couche += 1;
      return { ...source, id: nouvelId(), layer: couche, x: source.x + decalage, y: source.y + decalage, groupe, verrouille: undefined };
    });
  return { elements: [...elements, ...copies], ids: copies.map((c) => c.id) };
}

export function grouper(elements: ElementInvitation[], ids: string[], idGroupe: string): ElementInvitation[] {
  if (ids.length < 2) return elements;
  return elements.map((e) => (ids.includes(e.id) ? { ...e, groupe: idGroupe } : e));
}

export function degrouper(elements: ElementInvitation[], ids: string[]): ElementInvitation[] {
  const groupes = new Set(elements.filter((e) => ids.includes(e.id)).map((e) => e.groupe).filter(Boolean));
  return elements.map((e) => (e.groupe && groupes.has(e.groupe) ? { ...e, groupe: undefined } : e));
}

export type DeplacementCouche = "devant" | "avant" | "arriere" | "fond";

/**
 * Moves the selection in the stacking order. Layers are renumbered 1…n on each move, so they stay
 * small and two elements never tie. Selected elements keep their order among themselves.
 */
export function deplacerCouches(elements: ElementInvitation[], ids: string[], vers: DeplacementCouche): ElementInvitation[] {
  const ordre = [...elements].sort((a, b) => a.layer - b.layer);
  const choisis = ordre.filter((e) => ids.includes(e.id));
  if (choisis.length === 0) return elements;
  let resultat: ElementInvitation[];
  if (vers === "devant" || vers === "fond") {
    const autres = ordre.filter((e) => !ids.includes(e.id));
    resultat = vers === "devant" ? [...autres, ...choisis] : [...choisis, ...autres];
  } else {
    resultat = [...ordre];
    const pas = vers === "avant" ? 1 : -1;
    const indices = choisis.map((e) => resultat.indexOf(e));
    const parcours = pas === 1 ? [...indices].reverse() : indices;
    for (const i of parcours) {
      const j = i + pas;
      if (j < 0 || j >= resultat.length || ids.includes(resultat[j].id)) continue;
      [resultat[i], resultat[j]] = [resultat[j], resultat[i]];
    }
  }
  const couches = new Map(resultat.map((e, i) => [e.id, i + 1]));
  return elements.map((e) => ({ ...e, layer: couches.get(e.id) ?? e.layer }));
}

export function retourner(elements: ElementInvitation[], ids: string[], axe: "horizontal" | "vertical"): ElementInvitation[] {
  const cle = axe === "horizontal" ? "flipX" : "flipY";
  return elements.map((e) => (ids.includes(e.id) && !e.verrouille ? { ...e, [cle]: !e[cle] || undefined } : e));
}

/** Snaps a value to the grid of the editor. */
export const surGrille = (valeur: number, pas: number) => Math.round(valeur / pas) * pas;

/** Height a curved text needs: its letters, plus the depth of the curve. */
export const hauteurCourbe = (element: Pick<ElementTexte, "width" | "style">) =>
  Math.ceil(element.style.fontSize * 1.4 + (Math.abs(element.style.courbe ?? 0) / 100) * element.width * 0.35);
