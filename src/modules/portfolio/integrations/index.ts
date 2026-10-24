import "server-only";
import { createNotification } from "@/modules/utilisateurs/notification.service";
import { findUtilisateurById, listUtilisateurs } from "@/modules/utilisateurs/utilisateur.service";
import { mockAvisService, mockNotificationsService, mockPhotosService, mockSeancesService, mockUtilisateursService } from "./portfolio-integrations.mock";
import type { PortfolioIntegrations } from "./portfolio-integrations.types";

const mocks: PortfolioIntegrations = {
  utilisateursService: mockUtilisateursService,
  photosService: mockPhotosService,
  avisService: mockAvisService,
  seancesService: mockSeancesService,
  notificationsService: mockNotificationsService,
};

const realIntegrations: PortfolioIntegrations = {
  utilisateursService: {
    async getUtilisateur(id) {
      const user = await findUtilisateurById(id);
      return user?.statut === "ACTIF" ? { id: user.id, nom: user.nom, prenom: user.prenom, role: user.role, statut: user.statut } : null;
    },
    async verifierRole(userId, roles) {
      const user = await findUtilisateurById(userId);
      return !!user && user.statut === "ACTIF" && roles.includes(user.role as "PHOTOGRAPHE" | "RETOUCHEUR" | "ADMIN");
    },
    async listerAdmins() {
      const first = await listUtilisateurs({ q: "", role: "ADMIN", statut: "ACTIF", page: 1 });
      if (first.pageCount === 1) return first.items.map((admin) => admin.id);
      const remaining = await Promise.all(Array.from({ length: first.pageCount - 1 }, (_, index) =>
        listUtilisateurs({ q: "", role: "ADMIN", statut: "ACTIF", page: index + 2 }),
      ));
      return [...first.items, ...remaining.flatMap((page) => page.items)].map((admin) => admin.id);
    },
  },
  photosService: {
    // The gallery service does not yet expose photographer ownership and client-consent metadata.
    // Fail closed until that contract is implemented instead of leaking arbitrary library photos.
    async getPhotoPourPortfolio() {
      return null;
    },
    async listerPhotosDuPhotographe() {
      return [];
    },
    async listerMeilleuresPhotos() {
      return [];
    },
  },
  avisService: mocks.avisService,
  seancesService: mocks.seancesService,
  notificationsService: {
    async envoyer(notification) {
      await createNotification({
        utilisateurId: notification.destinataireId,
        titre: notification.type,
        message: notification.message,
        type: "SYSTEME",
        lienCible: notification.cible,
      });
    },
  },
};

export const portfolioIntegrations: PortfolioIntegrations =
  process.env.USE_MOCKS === "true" ? mocks : realIntegrations;
