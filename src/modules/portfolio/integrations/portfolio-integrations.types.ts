import type { Role } from "@/modules/utilisateurs/utilisateur.types";
import type { CategoriePortfolio, ElementBlocPortfolio } from "../portfolio.types";

export type UtilisateurPortfolio = {
  id: string;
  nom: string;
  prenom: string;
  role: Role | "RETOUCHEUR";
  statut?: "ACTIF" | "BLOQUE";
};

export interface UtilisateursPortfolioService {
  getUtilisateur(id: string): Promise<UtilisateurPortfolio | null>;
  verifierRole(userId: string, roles: readonly ("PHOTOGRAPHE" | "RETOUCHEUR" | "ADMIN")[]): Promise<boolean>;
  listerAdmins(): Promise<string[]>;
}

export type PhotoPortfolio = {
  id: string;
  url: string;
  urlMiniature: string;
  scoreQualite: number;
  clientId?: string;
};

export interface PhotosPortfolioService {
  getPhotoPourPortfolio(photoId: string): Promise<PhotoPortfolio | null>;
  listerPhotosDuPhotographe(photographeId: string, filtres?: { categorie?: CategoriePortfolio }): Promise<PhotoPortfolio[]>;
  listerMeilleuresPhotos(
    photographeId: string,
    categorie?: CategoriePortfolio,
    limite?: number,
  ): Promise<PhotoPortfolio[]>;
}

export type AvisPortfolio = { id: string; auteur: string; texte: string; note: number };

export interface AvisPortfolioService {
  listerAvisPublies(photographeId: string): Promise<AvisPortfolio[]>;
  calculerNoteMoyenne(photographeId: string): Promise<number>;
}

export interface SeancesPortfolioService {
  getSeance(id: string): Promise<{ id: string; titre: string } | null>;
  compterSeancesTerminees(photographeId: string): Promise<number>;
  creerDepuisDemande(demande: {
    portfolioId: string;
    photographeId: string;
    nomVisiteur: string;
    email: string;
    telephone?: string;
    typeSeance: string;
    dateSouhaitee?: string;
    message: string;
  }): Promise<{ id: string }>;
}

export type NotificationPortfolio = {
  type: string;
  destinataireId: string;
  cible: string;
  message: string;
};

export interface NotificationsPortfolioService {
  envoyer(notification: NotificationPortfolio): Promise<void>;
}

export type PortfolioIntegrations = {
  utilisateursService: UtilisateursPortfolioService;
  photosService: PhotosPortfolioService;
  avisService: AvisPortfolioService;
  seancesService: SeancesPortfolioService;
  notificationsService: NotificationsPortfolioService;
};

export type PortfolioElementForConsent = Pick<ElementBlocPortfolio, "idElement" | "source" | "statutConsentement">;
