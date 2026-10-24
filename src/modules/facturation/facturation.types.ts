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

/**
 * Proposé: chosen by the client when accepting the quote. COMPLET = one invoice for the whole
 * amount; ACOMPTE_SOLDE = deposit invoice now, balance invoice due on the session date.
 */
export const PLANS_PAIEMENT = ["COMPLET", "ACOMPTE_SOLDE"] as const;
export type PlanPaiement = (typeof PLANS_PAIEMENT)[number];

/** Proposé: the diagram has `prestations: List<String>`; lines with prices are needed for HT/TVA/TTC. */
export type LignePrestation = {
  designation: string;
  quantite: number;
  prixUnitaire: number; // HT
  /** Set when the line comes from a price that already includes VAT (the session price). */
  prixTTC?: number;
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
  paiements?: Paiement[];
  /** True when this single invoice covers the whole quote (plan COMPLET). */
  paiementUnique?: boolean;
};

/** Proposé: one entry per full or partial payment (cahier: enregistrerPaiement). */
export type Paiement = {
  montant: number;
  date: string;
  modePaiement: ModePaiement;
  reference?: string;
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
  seance: { id: string; titre: string; type?: string; date?: string };
  factures: Facture[];
  sousTotal?: number;
  montantTVA?: number;
  tauxAcompte?: number;
  commentaire?: string;
  dateEnvoi?: string;
  dateReponse?: string;
  historique?: { action: string; statutApres: string; date: string }[];
  planPaiement?: PlanPaiement;
  modePaiementPrefere?: ModePaiement;
};

export const TVA_PAR_DEFAUT = 19; // Tunisia standard VAT rate
export const TAUX_ACOMPTE_PAR_DEFAUT = 30; // % of the total incl. VAT
export const VALIDITE_DEVIS_JOURS = 30;

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

export const planPaiementLabels: Record<PlanPaiement, string> = {
  COMPLET: "Pay in full",
  ACOMPTE_SOLDE: "Deposit now, balance later",
};

/** Invoice label: a balance invoice that covers the whole quote is shown as "Full payment". */
export function factureTypeLabel(f: Pick<Facture, "type" | "paiementUnique">): string {
  if (f.paiementUnique) return "Full payment";
  return f.type === "ACOMPTE" ? "Deposit" : "Balance";
}

/** Branded PDF of a quote, or of one of its invoices (app/api/facturation/devis/[id]/pdf). */
export const pdfHref = (devisId: string, factureId?: string) =>
  `/api/facturation/devis/${devisId}/pdf${factureId ? `?facture=${factureId}` : ""}`;

export const modePaiementLabels: Record<ModePaiement, string> = {
  ESPECES: "Cash",
  CARTE: "Card",
  VIREMENT: "Bank transfer",
  CHEQUE: "Cheque",
};
