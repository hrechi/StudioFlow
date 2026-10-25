"use server";

import { Types } from "mongoose";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  ServiceError,
  success,
  toFailure,
  validationFailure,
  type ActionResult,
} from "@/lib/action-result";
import { requireArea, requireRole } from "@/lib/guards";
import {
  answerConsent,
  chargerImagePhotoPourGemini,
  convertContactRequest,
  createPortfolio,
  creerOuReinitialiserPortfolio,
  deletePortfolio,
  getPortfolioById,
  getPortfolioForEditor,
  getPortfolioStats,
  analyserQualitePhotosPhotographe,
  listerPhotosPhotographePourPortfolio,
  noterPortfolio,
  publishPortfolio,
  saveGeneratedBio,
  savePortfolioBlocks,
  type PhotoPourSelecteur,
  unpublishPortfolio,
  updateContactStatus,
  updatePortfolio,
} from "./portfolio.service";
import {
  blocPortfolioSchema,
  consentSchema,
  contactStatusSchema,
  elementPortfolioSchema,
  portfolioCreateSchema,
  portfolioIdSchema,
  portfolioUpdateSchema,
  publishPortfolioSchema,
  savePortfolioSchema,
} from "./portfolio.schemas";
import { portfolioIntegrations } from "./integrations";
import {
  MAX_AUTOMATIC_PORTFOLIO_PHOTOS,
  PHOTO_QUALITY_SELECTION_THRESHOLD,
  type BlocPortfolio,
  type ElementBlocPortfolio,
} from "./portfolio.types";
import {
  analyserQualitePortfolio,
  enrichirAuditPortfolioAvecGemini,
  genererBioIA,
  genererHistoireProjetIA,
  genererLegendeIA,
  genererSEOIA,
  genererTexteAltIA,
  genererInsightsPortfolioIA,
  suggererMiseEnPageIA,
} from "./ia.service";

const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const blockIdInput = z.object({ portfolioId: objectId, blockId: objectId });
const reorderBlocksInput = z.object({
  portfolioId: objectId,
  blockIds: z.array(objectId).max(100),
});
const addBlockInput = z.object({ portfolioId: objectId, bloc: blocPortfolioSchema });
const addElementInput = z.object({
  portfolioId: objectId,
  blockId: objectId,
  element: elementPortfolioSchema,
});
const reorderElementsInput = z.object({
  portfolioId: objectId,
  blockId: objectId,
  elementIds: z.array(objectId).max(500),
});

async function readOwnedBlocks(portfolioId: string, userId: string) {
  const portfolio = await getPortfolioById(portfolioId);
  if (!portfolio) throw new Error("Portfolio not found.");
  if (!portfolio.proprietaire.equals(userId))
    throw new Error("You are not allowed to edit this portfolio.");
  return portfolio.blocs;
}

async function persistBlocks(
  portfolioId: string,
  userId: string,
  blocks: Awaited<ReturnType<typeof readOwnedBlocks>>,
) {
  await savePortfolioBlocks(portfolioId, userId, blocks);
  revalidatePath(`/dashboard/portfolio/${portfolioId}`);
}

export async function creerPortfolio(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireRole("PHOTOGRAPHE");
  const parsed = portfolioCreateSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const result = await createPortfolio(user.id, parsed.data);
    revalidatePath("/dashboard/portfolio");
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}

export async function savePortfolio(input: unknown): Promise<ActionResult> {
  const user = await requireArea("portfolio");
  const parsed = savePortfolioSchema.safeParse(input);
  if (!parsed.success) {
    console.error(
      "[savePortfolio] Validation errors:",
      JSON.stringify(parsed.error.issues, null, 2),
    );
    return validationFailure(parsed.error);
  }
  try {
    await savePortfolioBlocks(parsed.data.portfolioId, user.id, parsed.data.blocs);
    revalidatePath(`/dashboard/portfolio/${parsed.data.portfolioId}`);
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function ajouterBloc(input: unknown): Promise<ActionResult> {
  const user = await requireArea("portfolio");
  const parsed = addBlockInput.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const blocks = await readOwnedBlocks(parsed.data.portfolioId, user.id);
    await persistBlocks(parsed.data.portfolioId, user.id, [
      ...blocks,
      { ...parsed.data.bloc, ordre: blocks.length },
    ]);
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function supprimerBloc(input: unknown): Promise<ActionResult> {
  const user = await requireArea("portfolio");
  const parsed = blockIdInput.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const blocks = await readOwnedBlocks(parsed.data.portfolioId, user.id);
    const next = blocks.filter((block) => block.idBloc !== parsed.data.blockId);
    if (next.length === blocks.length) throw new Error("Block not found.");
    await persistBlocks(parsed.data.portfolioId, user.id, next);
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function dupliquerBloc(
  input: unknown,
): Promise<ActionResult<{ bloc: BlocPortfolio }>> {
  const user = await requireArea("portfolio");
  const parsed = blockIdInput.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const blocks = await readOwnedBlocks(parsed.data.portfolioId, user.id);
    const sourceIndex = blocks.findIndex((block) => block.idBloc === parsed.data.blockId);
    if (sourceIndex < 0) throw new Error("Block not found.");
    const copy = structuredClone(blocks[sourceIndex]);
    copy.idBloc = new Types.ObjectId().toString();
    copy.elements = copy.elements.map((element) => ({
      ...element,
      idElement: new Types.ObjectId().toString(),
    }));
    const next = [...blocks];
    next.splice(sourceIndex + 1, 0, copy);
    await persistBlocks(parsed.data.portfolioId, user.id, next);
    return success({ bloc: copy });
  } catch (error) {
    return toFailure(error);
  }
}

export async function reordonnerBlocs(input: unknown): Promise<ActionResult> {
  const user = await requireArea("portfolio");
  const parsed = reorderBlocksInput.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const blocks = await readOwnedBlocks(parsed.data.portfolioId, user.id);
    if (
      blocks.length !== parsed.data.blockIds.length ||
      new Set(parsed.data.blockIds).size !== blocks.length
    ) {
      throw new Error("The reordered block list does not match this portfolio.");
    }
    const byId = new Map(blocks.map((block) => [block.idBloc, block]));
    const next = parsed.data.blockIds.map((id) => {
      const block = byId.get(id);
      if (!block) throw new Error("Block not found.");
      return block;
    });
    await persistBlocks(parsed.data.portfolioId, user.id, next);
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function ajouterElement(input: unknown): Promise<ActionResult> {
  const user = await requireArea("portfolio");
  const parsed = addElementInput.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const blocks = await readOwnedBlocks(parsed.data.portfolioId, user.id);
    const block = blocks.find((candidate) => candidate.idBloc === parsed.data.blockId);
    if (!block) throw new Error("Block not found.");
    block.elements.push({ ...parsed.data.element, ordreAffichage: block.elements.length });
    await persistBlocks(parsed.data.portfolioId, user.id, blocks);
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function reordonnerElements(input: unknown): Promise<ActionResult> {
  const user = await requireArea("portfolio");
  const parsed = reorderElementsInput.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const blocks = await readOwnedBlocks(parsed.data.portfolioId, user.id);
    const block = blocks.find((candidate) => candidate.idBloc === parsed.data.blockId);
    if (!block) throw new Error("Block not found.");
    if (
      block.elements.length !== parsed.data.elementIds.length ||
      new Set(parsed.data.elementIds).size !== block.elements.length
    ) {
      throw new Error("The reordered photo list does not match this block.");
    }
    const byId = new Map(block.elements.map((element) => [element.idElement, element]));
    block.elements = parsed.data.elementIds.map((id) => {
      const element = byId.get(id);
      if (!element) throw new Error("Photo not found.");
      return element;
    });
    await persistBlocks(parsed.data.portfolioId, user.id, blocks);
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function mettreAJourPortfolio(
  portfolioId: string,
  input: unknown,
): Promise<ActionResult> {
  const user = await requireArea("portfolio");
  const idParsed = portfolioIdSchema.safeParse({ portfolioId });
  const parsed = portfolioUpdateSchema.safeParse(input);
  if (!idParsed.success) return validationFailure(idParsed.error);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await updatePortfolio(portfolioId, user.id, parsed.data);
    revalidatePath(`/dashboard/portfolio/${portfolioId}`);
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function publierPortfolio(
  input: unknown,
): Promise<ActionResult<{ slug: string; url: string; removedElements: string[] }>> {
  const user = await requireArea("portfolio");
  const parsed = publishPortfolioSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const result = await publishPortfolio(parsed.data.portfolioId, user.id, user.role === "ADMIN");
    revalidatePath("/");
    revalidatePath("/portfolio");
    revalidatePath(`/portfolio/${result.slug}`);
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}

export async function mettreAJourPublication(input: unknown) {
  return publierPortfolio(input);
}

export async function depublierPortfolio(input: unknown): Promise<ActionResult> {
  const user = await requireArea("portfolio");
  const parsed = publishPortfolioSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await unpublishPortfolio(parsed.data.portfolioId, user.id, user.role === "ADMIN");
    revalidatePath("/");
    revalidatePath("/portfolio");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function supprimerPortfolio(input: unknown): Promise<ActionResult> {
  const user = await requireArea("portfolio");
  const parsed = portfolioIdSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await deletePortfolio(parsed.data.portfolioId, user.id, user.role === "ADMIN");
    revalidatePath("/dashboard/portfolio");
    revalidatePath("/");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function changerStatutDemande(input: unknown): Promise<ActionResult> {
  const user = await requireArea("portfolio");
  const parsed = contactStatusSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await updateContactStatus(parsed.data.id, user.id, parsed.data.statut);
    revalidatePath("/dashboard/portfolio/demandes");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function convertirDemandeEnSeance(
  input: unknown,
): Promise<ActionResult<{ seanceId: string }>> {
  const user = await requireRole("PHOTOGRAPHE");
  const parsed = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }).safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const result = await convertContactRequest(parsed.data.id, user.id);
    revalidatePath("/dashboard/portfolio/demandes");
    revalidatePath("/dashboard/seances");
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}

export async function repondreConsentement(input: unknown): Promise<ActionResult> {
  const user = await requireRole("CLIENT");
  const parsed = consentSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    await answerConsent(parsed.data.elementId, user.id, parsed.data.accord);
    revalidatePath("/");
    revalidatePath("/portfolio");
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

export async function lancerSelectionIA(categorie?: string) {
  const user = await requireRole("PHOTOGRAPHE");
  const parsed = z
    .enum(["MARIAGE", "PORTRAIT", "PRODUIT", "EVENEMENT"])
    .optional()
    .safeParse(categorie);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const analyzed = await analyserQualitePhotosPhotographe(user.id, parsed.data);
    const photos = await listerPhotosPhotographePourPortfolio(user.id);
    const byId = new Map(photos.map((photo) => [photo.id, photo]));
    const seenUrls = new Set<string>();
    const recommended = analyzed
      .filter(
        (item) =>
          item.recommandee &&
          item.score >= PHOTO_QUALITY_SELECTION_THRESHOLD &&
          byId.has(item.photoId),
      )
      .filter((item) => {
        const url = byId.get(item.photoId)?.url;
        if (!url || seenUrls.has(url)) return false;
        seenUrls.add(url);
        return true;
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_AUTOMATIC_PORTFOLIO_PHOTOS);
    const seenPhotoUrls = new Set<string>();
    const similarPhotoIds = analyzed.flatMap((item) => {
      const url = byId.get(item.photoId)?.url;
      if (!url) return [];
      if (seenPhotoUrls.has(url)) return [item.photoId];
      seenPhotoUrls.add(url);
      return [];
    });
    return success({
      photoIds: recommended.map((item) => item.photoId),
      scores: Object.fromEntries(analyzed.map((item) => [item.photoId, item.score])),
      reports: Object.fromEntries(
        analyzed.map((item) => [
          item.photoId,
          {
            raison: item.raison,
            nettete: item.nettete,
            exposition: item.exposition,
            composition: item.composition,
            couleurs: item.couleurs,
            defauts: item.defauts,
          },
        ]),
      ),
      similarPhotoIds,
      lowQualityPhotoIds: analyzed
        .filter((item) => item.score < PHOTO_QUALITY_SELECTION_THRESHOLD || !item.recommandee)
        .map((item) => item.photoId),
      selectionValidated: true,
    });
  } catch (error) {
    return toFailure(error);
  }
}

export async function chargerPhotosPortfolio(): Promise<ActionResult<PhotoPourSelecteur[]>> {
  const user = await requireArea("portfolio");
  try {
    const photos = await listerPhotosPhotographePourPortfolio(user.id);
    return success(photos);
  } catch (error) {
    return toFailure(error);
  }
}

const aiElementInput = z.object({ portfolioId: objectId, elementId: objectId });

export async function genererLegendePortfolio(
  input: unknown,
): Promise<ActionResult<{ legende: string }>> {
  const user = await requireRole("PHOTOGRAPHE");
  const parsed = aiElementInput.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const portfolio = await getPortfolioForEditor(parsed.data.portfolioId, user.id);
    if (!portfolio) throw new Error("Portfolio not found.");
    let element: ElementBlocPortfolio | undefined;
    for (const block of portfolio.blocs)
      element ??= block.elements.find((item) => item.idElement === parsed.data.elementId);
    if (!element) throw new Error("Photo not found.");
    const image = await chargerImagePhotoPourGemini(user.id, element);
    const task = await genererLegendeIA(element, image);
    if (!task.resultat)
      throw new ServiceError(task.erreur ?? "Gemini n’a pas pu générer la légende.");
    const generated = task.resultat;
    const blocs = portfolio.blocs.map((block) => ({
      ...block,
      elements: block.elements.map((item) =>
        item.idElement === element?.idElement
          ? { ...item, legende: generated.legende, legendeGenereeIA: true }
          : item,
      ),
    }));
    await savePortfolioBlocks(portfolio.id, user.id, blocs);
    return success({ legende: generated.legende });
  } catch (error) {
    return toFailure(error);
  }
}

export async function genererTexteAltPortfolio(
  input: unknown,
): Promise<ActionResult<{ texteAlt: string }>> {
  const user = await requireRole("PHOTOGRAPHE");
  const parsed = aiElementInput.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const portfolio = await getPortfolioForEditor(parsed.data.portfolioId, user.id);
    if (!portfolio) throw new Error("Portfolio not found.");
    let element: ElementBlocPortfolio | undefined;
    for (const block of portfolio.blocs)
      element ??= block.elements.find((item) => item.idElement === parsed.data.elementId);
    if (!element) throw new Error("Photo not found.");
    const image = await chargerImagePhotoPourGemini(user.id, element);
    const task = await genererTexteAltIA(element, image);
    if (!task.resultat)
      throw new ServiceError(task.erreur ?? "Gemini n’a pas pu générer le texte alternatif.");
    const generated = task.resultat;
    const blocs = portfolio.blocs.map((block) => ({
      ...block,
      elements: block.elements.map((item) =>
        item.idElement === element?.idElement
          ? { ...item, texteAlt: generated.texteAlt, texteAltGenereeIA: true }
          : item,
      ),
    }));
    await savePortfolioBlocks(portfolio.id, user.id, blocs);
    return success({ texteAlt: generated.texteAlt });
  } catch (error) {
    return toFailure(error);
  }
}

export async function genererBioPortfolio(
  portfolioId: string,
): Promise<ActionResult<{ bio: string }>> {
  const user = await requireRole("PHOTOGRAPHE");
  const parsed = portfolioIdSchema.safeParse({ portfolioId });
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const portfolio = await getPortfolioForEditor(parsed.data.portfolioId, user.id);
    if (!portfolio) throw new Error("Portfolio not found.");
    const profile = await portfolioIntegrations.utilisateursService.getUtilisateur(user.id);
    if (!profile) throw new Error("Photographer profile not found.");
    const bioInput = {
      nom: `${profile.prenom} ${profile.nom}`,
      specialites: portfolio.specialites,
      ville: portfolio.ville,
    };
    const task = await genererBioIA(bioInput);
    if (!task.resultat)
      throw new ServiceError(task.erreur ?? "Gemini n’a pas pu générer la biographie.");
    const generated = task.resultat;
    await saveGeneratedBio(portfolio.id, user.id, generated.bio);
    return success(generated);
  } catch (error) {
    return toFailure(error);
  }
}

export async function genererSEOAction(
  portfolioId: string,
): Promise<ActionResult<{ metaTitre: string; metaDescription: string }>> {
  const user = await requireRole("PHOTOGRAPHE");
  const parsed = portfolioIdSchema.safeParse({ portfolioId });
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const portfolio = await getPortfolioForEditor(parsed.data.portfolioId, user.id);
    if (!portfolio) throw new Error("Portfolio not found.");
    const task = await genererSEOIA({
      titre: portfolio.titre,
      bio: portfolio.bio,
      specialites: portfolio.specialites,
      ville: portfolio.ville,
    });
    if (!task.resultat)
      throw new ServiceError(task.erreur ?? "Gemini n’a pas pu préparer les métadonnées SEO.");
    return success(task.resultat);
  } catch (error) {
    return toFailure(error);
  }
}

export async function genererHistoireProjetAction(
  input: unknown,
): Promise<ActionResult<{ titre: string; texte: string }>> {
  const user = await requireRole("PHOTOGRAPHE");
  const parsed = z
    .object({
      portfolioId: objectId,
      blockId: objectId,
      notes: z.string().trim().min(20).max(5000),
      titre: z.string().trim().max(160).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const portfolio = await getPortfolioForEditor(parsed.data.portfolioId, user.id);
    if (!portfolio) throw new Error("Portfolio not found.");
    const block = portfolio.blocs.find((item) => item.idBloc === parsed.data.blockId);
    if (!block || block.type !== "CASE_STUDY")
      throw new ServiceError("Le bloc Étude de cas est introuvable.");
    const config = block.configuration;
    const task = await genererHistoireProjetIA({
      ville: portfolio.ville,
      specialites: portfolio.specialites,
      titre: parsed.data.titre ?? (typeof config.titre === "string" ? config.titre : undefined),
      notes: parsed.data.notes,
    });
    if (!task.resultat)
      throw new ServiceError(task.erreur ?? "Gemini n’a pas pu rédiger cette étude de cas.");
    return success(task.resultat);
  } catch (error) {
    return toFailure(error);
  }
}

export async function genererInsightsStatsAction(portfolioId: string) {
  const user = await requireRole("PHOTOGRAPHE");
  const parsed = portfolioIdSchema.safeParse({ portfolioId });
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const stats = await getPortfolioStats(parsed.data.portfolioId, user.id);
    const task = await genererInsightsPortfolioIA({
      vues: stats.totalVues,
      visiteursUniques: stats.visiteursUniques,
      clicsContact: stats.clicsContact,
      vuesJournalieres: stats.jours.map((day) => day.vues),
      clicsJournaliers: stats.jours.map((day) => day.clicsContact),
    });
    if (!task.resultat)
      throw new ServiceError(task.erreur ?? "Gemini n’a pas pu analyser les statistiques.");
    return success(task.resultat);
  } catch (error) {
    return toFailure(error);
  }
}

export async function analyserQualitePortfolioAction(
  input: unknown,
): Promise<
  ActionResult<NonNullable<Awaited<ReturnType<typeof analyserQualitePortfolio>>["resultat"]>>
> {
  const user = await requireRole("PHOTOGRAPHE");
  const parsed = portfolioIdSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const portfolio = await getPortfolioForEditor(parsed.data.portfolioId, user.id);
    if (!portfolio) throw new Error("Portfolio not found.");
    const task = analyserQualitePortfolio({
      titre: portfolio.titre,
      slogan: portfolio.slogan,
      bio: portfolio.bio,
      photoCouverture: portfolio.photoCouverture,
      seo: portfolio.seo,
      blocs: portfolio.blocs,
    });
    if (!task.resultat) throw new Error(task.erreur ?? "Portfolio quality analysis failed.");
    const photos = await listerPhotosPhotographePourPortfolio(user.id);
    const photoScores = new Map(photos.map((photo) => [photo.id, photo.scoreQualite]));
    try {
      const aiAudit = await enrichirAuditPortfolioAvecGemini({
        titre: portfolio.titre,
        slogan: portfolio.slogan,
        bio: portfolio.bio,
        specialites: portfolio.specialites,
        ville: portfolio.ville,
        auditDeterministe: task.resultat,
        blocs: portfolio.blocs
          .map((block) => {
            const configTexts = Object.values(block.configuration).filter(
              (value): value is string =>
                typeof value === "string" && !/^https?:\/\//i.test(value) && value.length <= 600,
            );
            const elements = block.elements;
            return {
              type: block.type,
              visible: block.visible,
              titres: configTexts.slice(0, 5),
              textes: elements
                .flatMap((element) =>
                  [element.titre, element.legende].filter((v): v is string => Boolean(v)),
                )
                .slice(0, 10),
              nombrePhotos: elements.length,
              textesAlternatifsManquants: elements.filter((element) => !element.texteAlt?.trim())
                .length,
            };
          })
          .map((block) => ({
            ...block,
            photosQualite: portfolio.blocs
              .filter((candidate) => candidate.type === block.type)
              .flatMap((candidate) => candidate.elements)
              .map((element) => (element.photoId ? photoScores.get(element.photoId) : undefined))
              .filter((score): score is number => typeof score === "number")
              .slice(0, 20),
          })),
      });
      return success(aiAudit);
    } catch (error) {
      console.warn(
        "[portfolio-audit] Gemini advice unavailable; returning deterministic audit:",
        error instanceof Error ? error.message : error,
      );
      return success(task.resultat);
    }
  } catch (error) {
    return toFailure(error);
  }
}

export async function suggererBlocsPortfolio(
  portfolioId: string,
): Promise<ActionResult<{ blocs: BlocPortfolio[] }>> {
  const user = await requireRole("PHOTOGRAPHE");
  const parsed = portfolioIdSchema.safeParse({ portfolioId });
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const portfolio = await getPortfolioForEditor(parsed.data.portfolioId, user.id);
    if (!portfolio) throw new Error("Portfolio not found.");
    const task = await suggererMiseEnPageIA(portfolio.blocs);
    if (!task.resultat) throw new Error(task.erreur ?? "Layout suggestion failed.");
    return success(task.resultat);
  } catch (error) {
    return toFailure(error);
  }
}

export async function initialiserPortfolioAction(input: {
  titre: string;
  slogan?: string;
  ville?: string;
  specialites?: string[];
  structureInitiale: "MODELE" | "VIDE";
  photoCouverture?: string;
}): Promise<ActionResult<{ id: string }>> {
  const user = await requireArea("portfolio");
  try {
    const portfolio = await creerOuReinitialiserPortfolio(user.id, input);
    revalidatePath("/dashboard/portfolio");
    return success({ id: portfolio.id });
  } catch (error) {
    return toFailure(error);
  }
}

export async function noterPortfolioAction(input: {
  slug: string;
  note: number;
  auteur?: string;
  commentaire?: string;
}): Promise<ActionResult<{ noteMoyenne: number; nombreAvis: number }>> {
  const schema = z.object({
    slug: z.string().trim().min(1),
    note: z.number().min(1).max(5),
    auteur: z.string().trim().max(100).optional(),
    commentaire: z.string().trim().max(1000).optional(),
  });
  const parsed = schema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const result = await noterPortfolio(
      parsed.data.slug,
      parsed.data.note,
      parsed.data.auteur,
      parsed.data.commentaire,
    );
    revalidatePath(`/portfolio/${parsed.data.slug}`);
    return success(result);
  } catch (error) {
    return toFailure(error);
  }
}
