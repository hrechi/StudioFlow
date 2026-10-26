import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Photo } from "@/modules/photos-galeries/photo.model";
import { createNotification } from "@/modules/utilisateurs/notification.service";
import { findUtilisateurById, listUtilisateurs } from "@/modules/utilisateurs/utilisateur.service";
import {
  mockAvisService,
  mockNotificationsService,
  mockPhotosService,
  mockSeancesService,
  mockUtilisateursService,
} from "./portfolio-integrations.mock";
import type { PortfolioIntegrations } from "./portfolio-integrations.types";
import { photoLibraryFilter } from "../photo-library";

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
      return user?.statut === "ACTIF"
        ? { id: user.id, nom: user.nom, prenom: user.prenom, role: user.role, statut: user.statut }
        : null;
    },
    async verifierRole(userId, roles) {
      const user = await findUtilisateurById(userId);
      return (
        !!user &&
        user.statut === "ACTIF" &&
        roles.includes(user.role as "PHOTOGRAPHE" | "RETOUCHEUR" | "ADMIN")
      );
    },
    async listerAdmins() {
      const first = await listUtilisateurs({ q: "", role: "ADMIN", statut: "ACTIF", page: 1 });
      if (first.pageCount === 1) return first.items.map((admin) => admin.id);
      const remaining = await Promise.all(
        Array.from({ length: first.pageCount - 1 }, (_, index) =>
          listUtilisateurs({ q: "", role: "ADMIN", statut: "ACTIF", page: index + 2 }),
        ),
      );
      return [...first.items, ...remaining.flatMap((page) => page.items)].map((admin) => admin.id);
    },
  },
  photosService: {
    async getPhotoPourPortfolio(photoId) {
      await connectDB();
      if (!Types.ObjectId.isValid(photoId)) return null;
      const photo = await Photo.findById(photoId).lean();
      if (!photo) return null;
      return {
        id: photo._id.toString(),
        url: `/api/photos/${photo._id}/file`,
        urlMiniature: `/api/photos/${photo._id}/miniature`,
        scoreQualite: photo.scoreQualite ?? 0,
      };
    },
    async listerPhotosDuPhotographe(photographeId) {
      const library = await photoLibraryFilter(photographeId);
      if (!library) return [];
      await connectDB();
      const photos = await Photo.find(library).sort({ createdAt: -1 }).lean();
      return photos.map((p) => ({
        id: p._id.toString(),
        url: `/api/photos/${p._id}/file`,
        urlMiniature: `/api/photos/${p._id}/miniature`,
        scoreQualite: p.scoreQualite ?? 0,
      }));
    },
    async listerMeilleuresPhotos(photographeId, _categorie, limite = 12) {
      const library = await photoLibraryFilter(photographeId);
      if (!library) return [];
      await connectDB();
      const photos = await Photo.find(library)
        .sort({ scoreQualite: -1, createdAt: -1 })
        .limit(limite)
        .lean();
      return photos.map((p) => ({
        id: p._id.toString(),
        url: `/api/photos/${p._id}/file`,
        urlMiniature: `/api/photos/${p._id}/miniature`,
        scoreQualite: p.scoreQualite ?? 0,
      }));
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
