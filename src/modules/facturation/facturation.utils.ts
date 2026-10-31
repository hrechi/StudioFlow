import type { LignePrestation } from "./facturation.types";

export type MoneyLine = {
  designation: string;
  quantite: number;
  prixUnitaireHT: number;
};

export type TotauxMillimes = {
  brut: number;
  montantRemise: number;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
};

function unitPrice(line: MoneyLine | LignePrestation): number {
  if ("prixUnitaireHT" in line) return line.prixUnitaireHT;
  return toMillimes(line.prixUnitaire);
}

export function toMillimes(tnd: number): number {
  if (!Number.isFinite(tnd)) throw new Error("Money must be finite.");
  return Math.round(tnd * 1000);
}

export function fromMillimes(millimes: number): number {
  if (!Number.isInteger(millimes)) throw new Error("Money must be an integer number of millimes.");
  return millimes / 1000;
}

/**
 * Unit price excl. VAT (TND) whose total incl. VAT lands exactly on `ttc` with the same
 * millime rounding as calculerTotaux (closest value when no exact match exists).
 */
export function prixHTDepuisTTC(ttc: number, tva: number): number {
  const cible = toMillimes(ttc);
  const estimate = Math.round(cible / (1 + tva / 100));
  const total = (ht: number) => ht + Math.round((ht * tva) / 100);
  const best = [estimate - 1, estimate, estimate + 1]
    .filter((ht) => ht >= 0)
    .reduce((a, b) => (Math.abs(total(b) - cible) < Math.abs(total(a) - cible) ? b : a));
  return fromMillimes(best);
}

export function formatTND(millimes: number): string {
  return `${new Intl.NumberFormat("fr-TN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(fromMillimes(millimes))} TND`;
}

export function calculerTotaux(
  lignes: readonly (MoneyLine | LignePrestation)[],
  remise: number,
  tva: number,
): TotauxMillimes {
  const brut = lignes.reduce(
    (sum, line) => sum + Math.round(line.quantite * unitPrice(line)),
    0,
  );
  const montantRemise = Math.round((brut * remise) / 100);
  const montantHT = brut - montantRemise;
  const montantTVA = Math.round((montantHT * tva) / 100);
  return { brut, montantRemise, montantHT, montantTVA, montantTTC: montantHT + montantTVA };
}
