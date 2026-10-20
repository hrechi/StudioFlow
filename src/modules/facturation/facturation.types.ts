/**
 * Module : Gestion de la Facturation · Responsable : Aya Flah
 * Types from the class diagram (cahier §4.3) — Devis, Facture (Facture embedded in Devis, §4.4).
 * Items marked "proposé" are not in the cahier: confirm them before creating the models.
 */
import type { StatusConfig } from "@/components/shared/status-badge";
import type { UtilisateurRef } from "@/modules/utilisateurs/utilisateur.types";

export const STATUTS_DEVIS = ["BROUILLON", "ENVOYE", "ACCEPTE", "REFUSE", "EXPIRE"] as const;
export type StatutDevis = (typeof STATUTS_DEVIS)[number];

export const TYPES_FACTURE = ["ACOMPTE", "SOLDE"] as const;
export type TypeFacture = (typeof TYPES_FACTURE)[number];

export const STATUTS_FACTURE = ["EN_ATTENTE", "PARTIELLEMENT_PAYEE", "PAYEE", "EN_RETARD"] as const;
export type StatutFacture = (typeof STATUTS_FACTURE)[number];

/** Proposé. */
export const MODES_PAIEMENT = ["ESPECES", "CARTE", "VIREMENT", "CHEQUE"] as const;
export type ModePaiement = (typeof MODES_PAIEMENT)[number];

/** Proposé: the diagram has `prestations: List<String>`; lines with prices are needed for HT/TVA/TTC. */
export type LignePrestation = {
  designation: string;
  quantite: number;
  prixUnitaire: number; // HT
};

/** Embedded in Devis. */
export type Facture = {
  id: string;
  numero: string;
  type: TypeFacture;
  dateEmission: string;
  dateEcheance: string;
  montantTTC: number;
  montantPaye: number;
  modePaiement?: ModePaiement;
  statut: StatutFacture;
  datePaiement?: string;
  risqueRetardIA?: number; // proposé: 0–1, AI late-payment risk
};

export type FactureAvecContexte = Facture & {
  devis: Pick<Devis, "id" | "numero" | "client" | "seance">;
};

/** Collection `devis`. */
export type Devis = {
  id: string;
  numero: string;
  dateEmission: string;
  dateValidite: string;
  prestations: LignePrestation[];
  montantHT: number;
  tva: number; // rate in %
  montantTTC: number;
  remise: number; // rate in %
  statut: StatutDevis;
  genereParIA: boolean;
  client: UtilisateurRef;
  seance: { id: string; titre: string };
  factures: Facture[];
};

export const TVA_PAR_DEFAUT = 19; // Tunisia standard VAT rate

/** HT/TVA/TTC totals (cahier: calculerMontantTTC). */
export function calculerTotaux(lignes: LignePrestation[], remise: number, tva: number) {
  const brut = lignes.reduce((sum, l) => sum + l.quantite * l.prixUnitaire, 0);
  const montantRemise = (brut * remise) / 100;
  const montantHT = brut - montantRemise;
  const montantTVA = (montantHT * tva) / 100;
  return { brut, montantRemise, montantHT, montantTVA, montantTTC: montantHT + montantTVA };
}

export const statutDevisConfig: StatusConfig<StatutDevis> = {
  BROUILLON: { label: "Draft", tone: "neutral" },
  ENVOYE: { label: "Sent", tone: "info" },
  ACCEPTE: { label: "Accepted", tone: "success" },
  REFUSE: { label: "Declined", tone: "danger" },
  EXPIRE: { label: "Expired", tone: "warning" },
};

export const statutFactureConfig: StatusConfig<StatutFacture> = {
  EN_ATTENTE: { label: "Pending", tone: "info" },
  PARTIELLEMENT_PAYEE: { label: "Partially paid", tone: "warning" },
  PAYEE: { label: "Paid", tone: "success" },
  EN_RETARD: { label: "Overdue", tone: "danger" },
};

export const typeFactureConfig: StatusConfig<TypeFacture> = {
  ACOMPTE: { label: "Deposit", tone: "outline" },
  SOLDE: { label: "Balance", tone: "dark" },
};

export const modePaiementLabels: Record<ModePaiement, string> = {
  ESPECES: "Cash",
  CARTE: "Card",
  VIREMENT: "Bank transfer",
  CHEQUE: "Cheque",
};
