/**
 * Module : Contrats & Blockchain · Responsable : Yosser Rafrafi
 * Types partagés entre le service, les actions, les composants et la couche blockchain.
 */

// ── Constantes ───────────────────────────────────────────────────────────────

export const MODES_CREATION = ["CHAMPS", "LIBRE", "UPLOAD"] as const;
export type ModeCreation = (typeof MODES_CREATION)[number];

export const STATUTS_CONTRAT = [
  "BROUILLON",
  "ENVOYE",
  "ACCEPTE",
  "REFUSE",
  "REVOQUE",
] as const;
export type StatutContrat = (typeof STATUTS_CONTRAT)[number];

export const STATUTS_ANCRAGE = ["EN_ATTENTE", "ANCRE", "ECHEC"] as const;
export type StatutAncrage = (typeof STATUTS_ANCRAGE)[number];

export const STATUTS_ON_CHAIN = ["INCONNU", "ACTIF", "REVOQUE", "REMPLACE"] as const;
export type StatutOnChain = (typeof STATUTS_ON_CHAIN)[number];

// ── Status config (badges) ────────────────────────────────────────────────────

import type { StatusTone } from "@/components/shared/status-badge";

export type StatusConfig<T extends string> = Record<T, { label: string; tone: StatusTone }>;

export const statutContratConfig: StatusConfig<StatutContrat> = {
  BROUILLON: { label: "Draft", tone: "neutral" },
  ENVOYE: { label: "Sent", tone: "info" },
  ACCEPTE: { label: "Accepted", tone: "success" },
  REFUSE: { label: "Declined", tone: "danger" },
  REVOQUE: { label: "Revoked", tone: "warning" },
};

export const statutAncrageConfig: StatusConfig<StatutAncrage> = {
  EN_ATTENTE: { label: "Pending anchor", tone: "warning" },
  ANCRE: { label: "Anchored", tone: "success" },
  ECHEC: { label: "Anchor failed", tone: "danger" },
};

// ── DTO / Vues ────────────────────────────────────────────────────────────────

export type ContratClientRef = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
};

export type ContratBlockchainInfo = {
  sha256: string;
  statut: StatutAncrage;
  txHash?: string;
  blockNumber?: number;
  contractAddress?: string;
  chainId?: number;
  ancreLe?: string;
  erreur?: string;
};

export type ContratDTO = {
  id: string;
  reference: string;
  titre: string;
  statut: StatutContrat;
  modeCreation: ModeCreation;
  client: ContratClientRef;
  /** Contenu textuel (modes CHAMPS et LIBRE). */
  contenu?: ContratContenu;
  blockchain?: ContratBlockchainInfo;
  /** Wallet Ethereum du client, si fourni (co-signature MetaMask). */
  clientWallet?: string;
  clientSignedAt?: string;
  dateEnvoi?: string;
  dateReponse?: string;
  motifRefus?: string;
  historique?: {
    action: string;
    statutAvant?: string;
    statutApres: string;
    date?: string;
  }[];
  createdAt: string;
  updatedAt: string;
};

/** Contenu structuré (mode CHAMPS). */
export type ContratContenu = {
  /** Mode LIBRE : texte brut multi-lignes. Mode CHAMPS : non utilisé. */
  texteLibre?: string;
  /** Mode CHAMPS : champs structurés. */
  champs?: ContratChamps;
};

export type ContratChamps = {
  nomClient: string;
  emailClient: string;
  dateSeance?: string;
  lieuSeance?: string;
  prestations: string;
  montantTTC?: number; // TND
  conditionsAnnulation?: string;
  delaiLivraison?: string;
  clausesSupplementaires?: string;
};

export type ContratListItem = Pick<
  ContratDTO,
  "id" | "reference" | "titre" | "statut" | "modeCreation" | "client" | "blockchain" | "createdAt"
>;

/** Résultat de vérification on-chain (lecture publique). */
export type VerificationResult = {
  found: boolean;
  statut: StatutOnChain;
  reference?: string;
  enregistreLe?: string;
  coSigneLe?: string;
  remplacePar?: string;
};
