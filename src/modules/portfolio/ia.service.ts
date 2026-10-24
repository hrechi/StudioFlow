import "server-only";
import type { BlocPortfolio, ElementBlocPortfolio } from "./portfolio.types";
import { portfolioIntegrations } from "./integrations";

export type TacheIA<T> = { statut: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"; resultat?: T; erreur?: string };

export async function selectionnerMeilleuresPhotosIA(photographeId: string, categorie?: Parameters<typeof portfolioIntegrations.photosService.listerMeilleuresPhotos>[1]): Promise<TacheIA<{ photoIds: string[] }>> {
  try {
    const photos = await portfolioIntegrations.photosService.listerMeilleuresPhotos(photographeId, categorie, 12);
    return { statut: "COMPLETED", resultat: { photoIds: photos.map((photo) => photo.id) } };
  } catch (error) {
    return { statut: "FAILED", erreur: error instanceof Error ? error.message : "AI selection failed." };
  }
}

export async function genererLegendeIA(element: ElementBlocPortfolio): Promise<TacheIA<{ legende: string }>> {
  if (process.env.USE_MOCKS !== "true") return { statut: "FAILED", erreur: "The shared AI service is not configured." };
  if (!element.media.url) return { statut: "FAILED", erreur: "An image is required." };
  return { statut: "COMPLETED", resultat: { legende: "A carefully composed image from the photographer's portfolio." } };
}

export async function genererTexteAltIA(element: ElementBlocPortfolio): Promise<TacheIA<{ texteAlt: string }>> {
  if (process.env.USE_MOCKS !== "true") return { statut: "FAILED", erreur: "The shared AI service is not configured." };
  if (!element.media.url) return { statut: "FAILED", erreur: "An image is required." };
  return { statut: "COMPLETED", resultat: { texteAlt: element.titre ?? "Portfolio photograph" } };
}

export async function suggererMiseEnPageIA(blocs: BlocPortfolio[]): Promise<TacheIA<{ blocs: BlocPortfolio[] }>> {
  if (process.env.USE_MOCKS !== "true") return { statut: "FAILED", erreur: "The shared AI service is not configured." };
  return { statut: "COMPLETED", resultat: { blocs: [...blocs].sort((a, b) => a.ordre - b.ordre) } };
}

export async function genererBioIA(profil: { nom: string; specialites: string[]; ville?: string; anneesExperience?: number }): Promise<TacheIA<{ bio: string }>> {
  if (process.env.USE_MOCKS !== "true") return { statut: "FAILED", erreur: "The shared AI service is not configured." };
  const specialties = profil.specialites.length ? profil.specialites.join(", ").toLowerCase() : "photography";
  const location = profil.ville ? ` Based in ${profil.ville},` : "";
  const experience = profil.anneesExperience ? ` With ${profil.anneesExperience} years of experience,` : "";
  return { statut: "COMPLETED", resultat: { bio: `${profil.nom} is a photographer specializing in ${specialties}.${location}${experience} each session is shaped around authentic moments and thoughtful imagery.` } };
}
