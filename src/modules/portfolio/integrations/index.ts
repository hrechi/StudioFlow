import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Avis } from "@/modules/avis-reclamations/avis.model";
import { Photo } from "@/modules/photos-galeries/photo.model";
import { Seance } from "@/modules/seances/seance.model";
import { createNotification } from "@/modules/utilisateurs/notification.service";
import {
  findUtilisateurById,
  findUtilisateurRefs,
  listUtilisateurs,
} from "@/modules/utilisateurs/utilisateur.service";
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

async function getPhotographerSessionIds(photographeId: string): Promise<Types.ObjectId[]> {
  await connectDB();
  if (!Types.ObjectId.isValid(photographeId)) return [];
  const sessions = await Seance.find({
    "equipe.employe": new Types.ObjectId(photographeId),
  })
    .select("_id")
    .lean();
  return sessions.map((session) => session._id);
}

async function loadPublishedReviews(photographeId: string) {
  const sessionIds = await getPhotographerSessionIds(photographeId);
  if (sessionIds.length === 0) return { items: [], total: 0, moyenne: 0 };

  const [reviews, total, [summary]] = await Promise.all([
    Avis.find({ seance: { $in: sessionIds }, statut: "PUBLIE" })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean(),
    Avis.countDocuments({ seance: { $in: sessionIds }, statut: "PUBLIE" }),
    Avis.aggregate<{ moyenne: number }>([
      { $match: { seance: { $in: sessionIds }, statut: "PUBLIE" } },
      { $group: { _id: null, moyenne: { $avg: "$note" } } },
    ]),
  ]);
  const authors = await findUtilisateurRefs(reviews.map((review) => review.auteur.toString()));

  return {
    items: reviews.map((review) => {
      const author = authors.get(review.auteur.toString());
      return {
        id: review._id.toString(),
        auteur: author ? `${author.prenom} ${author.nom}`.trim() : "Client",
        texte: review.commentaire,
        note: review.note,
        seanceTitre: review.seanceTitre,
        seanceType: review.seanceType,
        date: review.createdAt.toISOString(),
      };
    }),
    total,
    moyenne: Number((summary?.moyenne ?? 0).toFixed(1)),
  };
}

const realIntegrations: PortfolioIntegrations = {
  utilisateursService: {
    async getUtilisateur(id) {
      const user = await findUtilisateurById(id);
      return user?.statut === "ACTIF"
        ? {
            id: user.id,
            nom: user.nom,
            prenom: user.prenom,
            photoProfil: user.photoProfil,
            role: user.role,
            statut: user.statut,
          }
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
  avisService: {
    async obtenirAvisPublics(photographeId) {
      await connectDB();
      return loadPublishedReviews(photographeId);
    },
    async listerAvisPublies(photographeId) {
      return (await realIntegrations.avisService.obtenirAvisPublics(photographeId)).items;
    },
    async calculerNoteMoyenne(photographeId) {
      return (await realIntegrations.avisService.obtenirAvisPublics(photographeId)).moyenne;
    },
  },
  seancesService: {
    ...mocks.seancesService,
    async compterSeancesTerminees(photographeId) {
      await connectDB();
      if (!Types.ObjectId.isValid(photographeId)) return 0;
      return Seance.countDocuments({
        "equipe.employe": new Types.ObjectId(photographeId),
        statut: "TERMINEE",
      });
    },
  },
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
