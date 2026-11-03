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
  /** Offline payments the client declared with a proof, waiting for / checked by the studio. */
  declarations?: DeclarationPaiement[];
};

/** Proposé: status of a payment the client declared (transfer, cheque, cash) with its proof. */
export const STATUTS_DECLARATION = ["EN_ATTENTE", "VALIDEE", "REJETEE"] as const;
export type StatutDeclaration = (typeof STATUTS_DECLARATION)[number];

export type DeclarationPaiement = {
  id: string;
  montant: number;
  date: string;
  modePaiement: ModePaiement;
  reference?: string;
  commentaire?: string;
  statut: StatutDeclaration;
  motifRejet?: string;
  preuve?: { id: string; nom: string; contentType: string };
  createdAt: string;
  analyseIA?: AnalysePreuve;
};

/**
 * AI check of a payment proof: Gemini only reads the document (extrait); the comparison with the
 * declaration and the invoice (verifications, verdict) is computed by code, never by the model.
 */
export const VERDICTS_ANALYSE = ["EN_COURS", "CONCORDE", "ECART", "ILLISIBLE", "INDISPONIBLE"] as const;
export type VerdictAnalyse = (typeof VERDICTS_ANALYSE)[number];

export type VerificationPreuve = {
  code: string;
  statut: "ok" | "attention" | "ecart";
  label: string;
  detail?: string;
};

export type AnalysePreuve = {
  verdict: VerdictAnalyse;
  resume: string;
  confiance?: number; // 0–1, how readable the document was
  extrait?: {
    typeDocument?: string;
    montant?: number | null; // TND
    devise?: string | null;
    date?: string | null; // YYYY-MM-DD
    reference?: string | null;
    beneficiaire?: string | null;
    emetteur?: string | null;
    banque?: string | null;
  };
  verifications: VerificationPreuve[];
  analyseLe?: string;
};

export const verdictAnalyseConfig: StatusConfig<VerdictAnalyse> = {
  EN_COURS: { label: "AI is reading the proof…", tone: "neutral" },
  CONCORDE: { label: "AI: matches", tone: "success" },
  ECART: { label: "AI: mismatch found", tone: "danger" },
  ILLISIBLE: { label: "AI: unreadable proof", tone: "warning" },
  INDISPONIBLE: { label: "AI check unavailable", tone: "neutral" },
};

export const statutDeclarationConfig: StatusConfig<StatutDeclaration> = {
  EN_ATTENTE: { label: "Proof under review", tone: "warning" },
  VALIDEE: { label: "Confirmed", tone: "success" },
  REJETEE: { label: "Rejected", tone: "danger" },
};

/** Online payments go through the gateway; the others are declared with a proof. */
export const MODES_HORS_LIGNE = ["VIREMENT", "CHEQUE", "ESPECES"] as const satisfies readonly ModePaiement[];
/** A proof document is mandatory for these methods (cash can be confirmed at the studio desk). */
export const MODES_PREUVE_OBLIGATOIRE: readonly ModePaiement[] = ["VIREMENT", "CHEQUE"];
export const PREUVE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export const PREUVE_TAILLE_MAX = 5 * 1024 * 1024;

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
  CARTE: "Online (card / e-Dinar)",
  VIREMENT: "Bank transfer",
  CHEQUE: "Cheque",
};
