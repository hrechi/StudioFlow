"use server";

import { Types } from "mongoose";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { success, toFailure, validationFailure, type ActionResult } from "@/lib/action-result";
import { requireArea, requireRole } from "@/lib/guards";
import {
  answerConsent,
  convertContactRequest,
  createPortfolio,
  deletePortfolio,
  getPortfolioById,
  getPortfolioForEditor,
  publishPortfolio,
  saveGeneratedBio,
  savePortfolioBlocks,
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
import type { BlocPortfolio, ElementBlocPortfolio } from "./portfolio.types";
import { genererBioIA, genererLegendeIA, genererTexteAltIA, selectionnerMeilleuresPhotosIA, suggererMiseEnPageIA } from "./ia.service";

const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const blockIdInput = z.object({ portfolioId: objectId, blockId: objectId });
const reorderBlocksInput = z.object({ portfolioId: objectId, blockIds: z.array(objectId).max(100) });
const addBlockInput = z.object({ portfolioId: objectId, bloc: blocPortfolioSchema });
const addElementInput = z.object({ portfolioId: objectId, blockId: objectId, element: elementPortfolioSchema });
const reorderElementsInput = z.object({ portfolioId: objectId, blockId: objectId, elementIds: z.array(objectId).max(500) });

async function readOwnedBlocks(portfolioId: string, userId: string) {
  const portfolio = await getPortfolioById(portfolioId);
  if (!portfolio) throw new Error("Portfolio not found.");
  if (!portfolio.proprietaire.equals(userId)) throw new Error("You are not allowed to edit this portfolio.");
  return portfolio.blocs;
}

async function persistBlocks(portfolioId: string, userId: string, blocks: Awaited<ReturnType<typeof readOwnedBlocks>>) {
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
  if (!parsed.success) return validationFailure(parsed.error);
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
    await persistBlocks(parsed.data.portfolioId, user.id, [...blocks, { ...parsed.data.bloc, ordre: blocks.length }]);
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

export async function dupliquerBloc(input: unknown): Promise<ActionResult<{ bloc: BlocPortfolio }>> {
  const user = await requireArea("portfolio");
  const parsed = blockIdInput.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const blocks = await readOwnedBlocks(parsed.data.portfolioId, user.id);
    const sourceIndex = blocks.findIndex((block) => block.idBloc === parsed.data.blockId);
    if (sourceIndex < 0) throw new Error("Block not found.");
    const copy = structuredClone(blocks[sourceIndex]);
    copy.idBloc = new Types.ObjectId().toString();
    copy.elements = copy.elements.map((element) => ({ ...element, idElement: new Types.ObjectId().toString() }));
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
    if (blocks.length !== parsed.data.blockIds.length || new Set(parsed.data.blockIds).size !== blocks.length) {
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
    if (block.elements.length !== parsed.data.elementIds.length || new Set(parsed.data.elementIds).size !== block.elements.length) {
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

export async function mettreAJourPortfolio(portfolioId: string, input: unknown): Promise<ActionResult> {
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

export async function publierPortfolio(input: unknown): Promise<ActionResult<{ slug: string; url: string; removedElements: string[] }>> {
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

export async function convertirDemandeEnSeance(input: unknown): Promise<ActionResult<{ seanceId: string }>> {
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
  const parsed = z.enum(["MARIAGE", "PORTRAIT", "PRODUIT", "EVENEMENT"]).optional().safeParse(categorie);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const task = await selectionnerMeilleuresPhotosIA(user.id, parsed.data);
    if (!task.resultat) throw new Error(task.erreur ?? "Photo selection failed.");
    return success(task.resultat);
  } catch (error) {
    return toFailure(error);
  }
}

export async function chargerPhotosPortfolio() {
  const user = await requireRole("PHOTOGRAPHE");
  try {
    const photos = await portfolioIntegrations.photosService.listerPhotosDuPhotographe(user.id);
    return success(photos);
  } catch (error) {
    return toFailure(error);
  }
}

const aiElementInput = z.object({ portfolioId: objectId, elementId: objectId });

export async function genererLegendePortfolio(input: unknown): Promise<ActionResult<{ legende: string }>> {
  const user = await requireRole("PHOTOGRAPHE");
  const parsed = aiElementInput.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const portfolio = await getPortfolioForEditor(parsed.data.portfolioId, user.id);
    if (!portfolio) throw new Error("Portfolio not found.");
    let element: ElementBlocPortfolio | undefined;
    for (const block of portfolio.blocs) element ??= block.elements.find((item) => item.idElement === parsed.data.elementId);
    if (!element) throw new Error("Photo not found.");
    const task = await genererLegendeIA(element);
    if (!task.resultat) throw new Error(task.erreur ?? "Caption generation failed.");
    const generated = task.resultat;
    const blocs = portfolio.blocs.map((block) => ({ ...block, elements: block.elements.map((item) => item.idElement === element?.idElement ? { ...item, legende: generated.legende, legendeGenereeIA: true } : item) }));
    await savePortfolioBlocks(portfolio.id, user.id, blocs);
    return success({ legende: task.resultat.legende });
  } catch (error) {
    return toFailure(error);
  }
}

export async function genererTexteAltPortfolio(input: unknown): Promise<ActionResult<{ texteAlt: string }>> {
  const user = await requireRole("PHOTOGRAPHE");
  const parsed = aiElementInput.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const portfolio = await getPortfolioForEditor(parsed.data.portfolioId, user.id);
    if (!portfolio) throw new Error("Portfolio not found.");
    let element: ElementBlocPortfolio | undefined;
    for (const block of portfolio.blocs) element ??= block.elements.find((item) => item.idElement === parsed.data.elementId);
    if (!element) throw new Error("Photo not found.");
    const task = await genererTexteAltIA(element);
    if (!task.resultat) throw new Error(task.erreur ?? "Alt text generation failed.");
    const generated = task.resultat;
    const blocs = portfolio.blocs.map((block) => ({ ...block, elements: block.elements.map((item) => item.idElement === element?.idElement ? { ...item, texteAlt: generated.texteAlt, texteAltGenereeIA: true } : item) }));
    await savePortfolioBlocks(portfolio.id, user.id, blocs);
    return success({ texteAlt: task.resultat.texteAlt });
  } catch (error) {
    return toFailure(error);
  }
}

export async function genererBioPortfolio(portfolioId: string): Promise<ActionResult<{ bio: string }>> {
  const user = await requireRole("PHOTOGRAPHE");
  const parsed = portfolioIdSchema.safeParse({ portfolioId });
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const portfolio = await getPortfolioForEditor(parsed.data.portfolioId, user.id);
    if (!portfolio) throw new Error("Portfolio not found.");
    const profile = await portfolioIntegrations.utilisateursService.getUtilisateur(user.id);
    if (!profile) throw new Error("Photographer profile not found.");
    const task = await genererBioIA({ nom: `${profile.prenom} ${profile.nom}`, specialites: portfolio.specialites, ville: portfolio.ville });
    if (!task.resultat) throw new Error(task.erreur ?? "Bio generation failed.");
    await saveGeneratedBio(portfolio.id, user.id, task.resultat.bio);
    return success(task.resultat);
  } catch (error) {
    return toFailure(error);
  }
}

export async function suggererBlocsPortfolio(portfolioId: string): Promise<ActionResult<{ blocs: BlocPortfolio[] }>> {
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
