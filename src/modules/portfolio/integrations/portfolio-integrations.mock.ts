import type {
  AvisPortfolio,
  NotificationsPortfolioService,
  PhotosPortfolioService,
  SeancesPortfolioService,
  UtilisateursPortfolioService,
} from "./portfolio-integrations.types";

const photos = [
  { id: "000000000000000000000101", url: "https://res.cloudinary.com/demo/image/upload/sample.jpg", urlMiniature: "https://res.cloudinary.com/demo/image/upload/c_fill,w_800/sample.jpg", scoreQualite: 92 },
  { id: "000000000000000000000102", url: "https://res.cloudinary.com/demo/image/upload/sample.jpg", urlMiniature: "https://res.cloudinary.com/demo/image/upload/c_fill,w_800/sample.jpg", scoreQualite: 86 },
];

export const mockUtilisateursService: UtilisateursPortfolioService = {
  async getUtilisateur(id) {
    return { id, nom: "Demo", prenom: "Photographer", role: "PHOTOGRAPHE" };
  },
  async verifierRole(_userId, roles) {
    return roles.includes("PHOTOGRAPHE");
  },
  async listerAdmins() {
    return [];
  },
};

export const mockPhotosService: PhotosPortfolioService = {
  async getPhotoPourPortfolio(photoId) {
    return photos.find((photo) => photo.id === photoId) ?? null;
  },
  async listerPhotosDuPhotographe() {
    return photos;
  },
  async listerMeilleuresPhotos(_photographeId, _categorie, limite = 10) {
    return photos.slice(0, limite);
  },
};

export const mockAvisService = {
  async listerAvisPublies(): Promise<AvisPortfolio[]> {
    return [];
  },
  async calculerNoteMoyenne(): Promise<number> {
    return 0;
  },
};

export const mockSeancesService: SeancesPortfolioService = {
  async getSeance(id) {
    return { id, titre: "Demo session" };
  },
  async compterSeancesTerminees() {
    return 0;
  },
  async creerDepuisDemande() {
    return { id: "000000000000000000000001" };
  },
};

export const mockNotificationsService: NotificationsPortfolioService = {
  async envoyer(_notification) {},
};
