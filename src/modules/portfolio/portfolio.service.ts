import "server-only";
import { Types } from "mongoose";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
import { Photo } from "@/modules/photos-galeries/photo.model";
import "@/modules/photos-galeries/galerie.model";
import "@/modules/utilisateurs/utilisateur.model";
import { findUtilisateurById } from "@/modules/utilisateurs/utilisateur.service";
import {
  DemandeContact,
  Portfolio,
  PortfolioStats,
  type DemandeContactDocument,
  type PortfolioDocument,
  type PortfolioStatsDocument,
} from "./portfolio.model";
import {
  portfolioBlocksSchema,
  type ContactPortfolioInput,
  type PortfolioCreateInput,
  type PortfolioUpdateInput,
} from "./portfolio.schemas";
import {
  CATEGORIES_PORTFOLIO,
  type BlocPortfolio,
  type BlocPortfolioPublic,
  type StatutDemande,
} from "./portfolio.types";
import { portfolioIntegrations } from "./integrations";
import { INITIAL_DEMO_BLOCKS } from "./components/editor/demoData";

type PortfolioLean = PortfolioDocument & { _id: Types.ObjectId };

function applyWatermark(url: string): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  return url.replace("/upload/", "/upload/l_text:Arial_28_bold:StudioFlow,o_35,g_south_east/");
}

function serializeBlocks(blocks: BlocPortfolio[], filigrane = false): BlocPortfolio[] {
  const serialized = JSON.parse(JSON.stringify(blocks)) as BlocPortfolio[];
  if (!filigrane) return serialized;
  return serialized.map((block) => ({
    ...block,
    elements: block.elements.map((element) => ({
      ...element,
      media: {
        ...element.media,
        url: applyWatermark(element.media.url),
        urlMiniature: applyWatermark(element.media.urlMiniature),
      },
    })),
  }));
}

function serializePublicBlocks(blocks: BlocPortfolio[], filigrane: boolean): BlocPortfolioPublic[] {
  return serializeBlocks(blocks, filigrane).map((block) => ({
    idBloc: block.idBloc,
    type: block.type,
    ordre: block.ordre,
    visible: block.visible,
    miseEnPage: block.miseEnPage,
    configuration: { ...block.configuration },
    elements: block.elements.map((element) => ({
      idElement: element.idElement,
      media: {
        url: element.media.url,
        urlMiniature: element.media.urlMiniature,
        largeur: element.media.largeur,
        hauteur: element.media.hauteur,
      },
      titre: element.titre,
      legende: element.legende,
      texteAlt: element.texteAlt,
      ordreAffichage: element.ordreAffichage,
      estMisEnAvant: element.estMisEnAvant,
      role: element.role,
      paire: element.paire,
      nombreLikes: element.nombreLikes,
    })),
  }));
}

export type PortfolioPublic = {
  id: string;
  proprietaire: string;
  photographe: { nom: string; prenom: string };
  slug: string;
  titre: string;
  slogan?: string;
  bio?: string;
  photoCouverture: string;
  specialites: PortfolioDocument["specialites"];
  ville?: string;
  theme: PortfolioDocument["theme"];
  couleurAccent: string;
  filigrane: boolean;
  seo: PortfolioDocument["seo"];
  liensSociaux: PortfolioDocument["liensSociaux"];
  blocsPublies: BlocPortfolioPublic[];
  nombreVues: number;
  noteMoyenne?: number;
  nombreAvis?: number;
  datePublication?: string;
};

export type PortfolioEditorData = Omit<PortfolioPublic, "blocsPublies"> & {
  statut: PortfolioDocument["statut"];
  visibilite: PortfolioDocument["visibilite"];
  dateCreation: string;
  dateModification: string;
  blocs: BlocPortfolio[];
  blocsPublies: BlocPortfolio[];
};

export type PortfolioListItem = {
  id: string;
  titre: string;
  slug: string | undefined;
  statut: PortfolioDocument["statut"];
  visibilite: PortfolioDocument["visibilite"];
  photoCouverture: string;
  nombreVues: number;
  nombrePhotos: number;
  datePublication: string | undefined;
  dateModification: string;
  proprietaire: string;
  photographe: { nom: string; prenom: string };
};

function toPublic(
  doc: PortfolioLean,
  photographe: { nom: string; prenom: string },
): PortfolioPublic {
  // If hero block has a custom cover photo, use it as the primary cover
  const heroBlock = (doc.blocsPublies || doc.blocs || []).find((b: { type?: string }) => b.type === "HERO");
  const heroCover = (heroBlock?.configuration as Record<string, unknown> | undefined)?.photoCouverture;
  const cover =
    typeof heroCover === "string" && heroCover.trim().length > 0
      ? heroCover.trim()
      : doc.photoCouverture;

  return {
    id: doc._id.toString(),
    proprietaire: doc.proprietaire.toString(),
    photographe,
    slug: doc.slug ?? "",
    titre: doc.titre,
    slogan: doc.slogan,
    bio: doc.bio,
    photoCouverture: doc.filigrane ? applyWatermark(cover) : cover,
    specialites: doc.specialites,
    ville: doc.ville,
    theme: doc.theme,
    couleurAccent: doc.couleurAccent,
    filigrane: doc.filigrane,
    seo: doc.seo,
    liensSociaux: doc.liensSociaux,
    blocsPublies: serializePublicBlocks(doc.blocsPublies, doc.filigrane),
    nombreVues: doc.nombreVues,
    noteMoyenne: doc.noteMoyenne ?? 5,
    nombreAvis: doc.nombreAvis ?? 0,
    datePublication: doc.datePublication?.toISOString(),
  };
}

function id(value: string, label: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) throw new ServiceError(`${label} not found.`);
  return new Types.ObjectId(value);
}

async function notifyPortfolio(input: {
  type: string;
  destinataireId: string;
  cible: string;
  message: string;
}): Promise<void> {
  try {
    await portfolioIntegrations.notificationsService.envoyer(input);
  } catch (error) {
    console.error("Portfolio notification failed", error);
  }
}

async function assertPortfolioAccess(
  portfolioId: string,
  userId: string,
  allowAdmin: boolean,
): Promise<Types.ObjectId> {
  const portfolioObjectId = id(portfolioId, "Portfolio");
  const userObjectId = id(userId, "User");
  await connectDB();
  const portfolio = await Portfolio.findById(portfolioObjectId)
    .select("proprietaire")
    .lean<Pick<PortfolioLean, "proprietaire">>();
  if (!portfolio) throw new ServiceError("Portfolio not found.");
  if (portfolio.proprietaire.equals(userObjectId)) return portfolioObjectId;
  if (allowAdmin) return portfolioObjectId;
  throw new ServiceError("You are not allowed to edit this portfolio.");
}

function slugify(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "portfolio"
  );
}

async function uniqueSlug(titre: string): Promise<string> {
  const base = slugify(titre);
  let slug = base;
  let suffix = 2;
  while (await Portfolio.exists({ slug })) slug = `${base}-${suffix++}`;
  return slug;
}

function normalizeBlocks(blocks: BlocPortfolio[]): BlocPortfolio[] {
  return blocks.map((block, blockIndex) => {
    const validBlockId =
      block.idBloc && Types.ObjectId.isValid(block.idBloc)
        ? block.idBloc
        : new Types.ObjectId().toString();

    return {
      ...block,
      idBloc: validBlockId,
      ordre: blockIndex,
      elements: (block.elements || []).map((element, elementIndex) => {
        const validElementId =
          element.idElement && Types.ObjectId.isValid(element.idElement)
            ? element.idElement
            : new Types.ObjectId().toString();

        const validPhotoId =
          element.photoId && Types.ObjectId.isValid(element.photoId)
            ? element.photoId
            : undefined;

        const validClientId =
          element.clientConcerne && Types.ObjectId.isValid(element.clientConcerne)
            ? element.clientConcerne
            : undefined;

        const source =
          element.source === "GALERIE_CLIENT" && !validClientId
            ? "UPLOAD_PERSONNEL"
            : element.source || "UPLOAD_PERSONNEL";

        return {
          ...element,
          idElement: validElementId,
          photoId: validPhotoId,
          clientConcerne: validClientId,
          source,
          ordreAffichage: elementIndex,
          // UPLOAD_PERSONNEL ne peut pas avoir de consentement client
          statutConsentement:
            source === "UPLOAD_PERSONNEL"
              ? "NON_REQUIS"
              : (element.statutConsentement || "ACCORDE"),
          dateAjout: element.dateAjout
            ? new Date(element.dateAjout).toISOString()
            : new Date().toISOString(),
        };
      }),
    };
  });
}

function publishedBlocks(blocks: BlocPortfolio[]): { blocks: BlocPortfolio[]; removed: string[] } {
  const removed: string[] = [];
  const filtered = blocks.map((block) => ({
    ...block,
    elements: block.elements.filter((element) => {
      const allowed =
        element.source !== "GALERIE_CLIENT" || element.statutConsentement === "ACCORDE";
      if (!allowed) removed.push(element.idElement.toString());
      return allowed;
    }),
  }));
  return { blocks: normalizeBlocks(filtered), removed };
}

function validatePublication(blocs: BlocPortfolio[], titre: string, photoCouverture: string): void {
  if (!titre.trim()) throw new ServiceError("A title is required.", "titre");
  if (blocs.filter((block) => block.type === "HERO").length !== 1) {
    throw new ServiceError("A portfolio must contain exactly one HERO block.", "blocs");
  }
  // Accept publication if: doc has a cover photo, any block has photos, OR the HERO bloc config has a cover photo
  const heroBlock = blocs.find((b) => b.type === "HERO");
  const heroHasCover =
    (heroBlock?.configuration?.photoCouverture && String(heroBlock.configuration.photoCouverture).trim().length > 0) ||
    (photoCouverture && photoCouverture.trim().length > 0);
  const anyBlockHasPhotos = blocs.some((block) => block.elements.length > 0);
  if (!heroHasCover && !anyBlockHasPhotos) {
    throw new ServiceError("Ajoutez au moins une photo de couverture dans le bloc Hero pour publier.", "blocs");
  }
  for (const block of blocs) {
    if (block.type !== "AVANT_APRES") continue;
    const pairs = new Map<number, Set<string>>();
    for (const element of block.elements) {
      if (element.paire === undefined || element.role === "NORMAL") continue;
      const roles = pairs.get(element.paire) ?? new Set<string>();
      roles.add(element.role);
      pairs.set(element.paire, roles);
    }
    if ([...pairs.values()].some((roles) => !roles.has("AVANT") || !roles.has("APRES"))) {
      throw new ServiceError(
        "Each before/after pair requires an AVANT and an APRES image.",
        "blocs",
      );
    }
  }
}

export async function createPortfolio(
  proprietaire: string,
  input: PortfolioCreateInput,
): Promise<{ id: string }> {
  const owner = id(proprietaire, "Owner");
  if (
    !(await portfolioIntegrations.utilisateursService.verifierRole(proprietaire, [
      "PHOTOGRAPHE",
      "RETOUCHEUR",
    ]))
  ) {
    throw new ServiceError("Only a photographer or retoucher can create a portfolio.");
  }
  await connectDB();
  if (await Portfolio.exists({ proprietaire: owner }))
    throw new ServiceError("This user already has a portfolio.");
  const { structureInitiale, ...portfolioInput } = input;
  const blocs: BlocPortfolio[] =
    structureInitiale === "VIDE"
      ? []
      : [
          {
            idBloc: new Types.ObjectId().toString(),
            type: "HERO",
            ordre: 0,
            visible: true,
            miseEnPage: "PLEIN_ECRAN",
            configuration: {
              titre: input.titre,
              sousTitre: input.slogan || "Photography for the moments that matter.",
              texteBouton: "Get in touch",
              lienBouton: "#contact",
            },
            elements: [],
          },
          {
            idBloc: new Types.ObjectId().toString(),
            type: "A_PROPOS",
            ordre: 1,
            visible: true,
            miseEnPage: "GRILLE",
            configuration: {
              texte:
                "Tell visitors about your approach, the people you photograph and what they can expect.",
              anneesExperience: 0,
            },
            elements: [],
          },
          {
            idBloc: new Types.ObjectId().toString(),
            type: "GALERIE",
            ordre: 2,
            visible: true,
            miseEnPage: "GRILLE",
            configuration: {
              colonnes: 3,
              espacement: 16,
              ...(input.specialites[0] ? { categorie: input.specialites[0] } : {}),
            },
            elements: [],
          },
          {
            idBloc: new Types.ObjectId().toString(),
            type: "CONTACT",
            ordre: 3,
            visible: true,
            miseEnPage: "GRILLE",
            configuration: {
              texteIntro: "Tell me a little about the session you have in mind.",
              typesSeanceProposes: input.specialites,
            },
            elements: [],
          },
        ];
  const doc = await Portfolio.create({
    ...portfolioInput,
    proprietaire: owner,
    blocs,
    blocsPublies: [],
    seo: { metaTitre: input.titre, metaDescription: input.slogan ?? "" },
  });
  return { id: doc._id.toString() };
}

export async function getPortfolioById(portfolioId: string): Promise<PortfolioLean | null> {
  const _id = id(portfolioId, "Portfolio");
  await connectDB();
  return Portfolio.findById(_id).lean<PortfolioLean>();
}

export async function getPortfolioForEditor(
  portfolioId: string,
  userId: string,
  allowAdmin = false,
): Promise<PortfolioEditorData | null> {
  const _id = await assertPortfolioAccess(portfolioId, userId, allowAdmin);
  const doc = await Portfolio.findById(_id).lean<PortfolioLean>();
  if (!doc) return null;
  const photographe = await portfolioIntegrations.utilisateursService.getUtilisateur(
    doc.proprietaire.toString(),
  );
  if (!photographe) return null;
  return {
    ...toPublic(doc, photographe),
    statut: doc.statut,
    visibilite: doc.visibilite,
    dateCreation: doc.dateCreation.toISOString(),
    dateModification: doc.dateModification.toISOString(),
    blocs: serializeBlocks(doc.blocs),
    blocsPublies: serializeBlocks(doc.blocsPublies),
  };
}

export async function creerOuReinitialiserPortfolio(
  userId: string,
  input: {
    titre: string;
    slogan?: string;
    ville?: string;
    specialites?: string[];
    structureInitiale: "MODELE" | "VIDE";
    photoCouverture?: string;
  },
): Promise<PortfolioEditorData> {
  await connectDB();
  const ownerId = id(userId, "Owner");
  const slug = await uniqueSlug(input.titre);

  const cover =
    input.photoCouverture ||
    "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80";

  let initialBlocks: BlocPortfolio[] = [];

  if (input.structureInitiale === "MODELE") {
    initialBlocks = INITIAL_DEMO_BLOCKS.map((block) => {
      const cloned = structuredClone(block);
      if (cloned.type === "HERO") {
        cloned.configuration.titre = input.titre;
        if (input.slogan) cloned.configuration.sousTitre = input.slogan;
      }
      if (cloned.type === "A_PROPOS") {
        cloned.configuration.titre = input.titre;
      }
      return cloned;
    });
  } else {
    // Blank page mode: clean starting block
    initialBlocks = [
      {
        idBloc: crypto.randomUUID().replaceAll("-", "").slice(0, 24),
        type: "HERO",
        ordre: 0,
        visible: true,
        miseEnPage: "PLEIN_ECRAN",
        configuration: {
          titre: input.titre,
          sousTitre: input.slogan || "Photographie & direction artistique",
          texteBouton: "Me contacter",
          lienBouton: "#contact",
          tagline:
            input.specialites && input.specialites.length > 0
              ? input.specialites.join(" · ").toUpperCase()
              : (input.ville ? input.ville.toUpperCase() : "PORTFOLIO"),
          photoCouverture: cover,
          liensSociaux: [],
        },
        elements: [],
      },
    ];
  }

  // Delete existing portfolio if any
  await Portfolio.deleteOne({ proprietaire: ownerId });

  await Portfolio.create({
    proprietaire: ownerId,
    slug,
    titre: input.titre,
    slogan: input.slogan || "Photographe professionnel",
    bio: "Capturing delicate, candid memories in natural light for more than a decade.",
    photoCouverture: cover,
    specialites: (input.specialites && input.specialites.length > 0
      ? input.specialites
          .map((s) => s.toUpperCase())
          .filter((s): s is (typeof CATEGORIES_PORTFOLIO)[number] =>
            (CATEGORIES_PORTFOLIO as readonly string[]).includes(s)
          )
      : ["MARIAGE", "PORTRAIT"]) as (typeof CATEGORIES_PORTFOLIO)[number][],
    ville: input.ville || "Paris",
    theme: "MINIMAL",
    couleurAccent: "#E8A34A",
    filigrane: false,
    seo: { metaTitre: input.titre, metaDescription: input.slogan || `Portfolio de ${input.titre}` },
    liensSociaux: [
      { reseau: "INSTAGRAM", url: "https://instagram.com" },
      { reseau: "SITE_WEB", url: "https://studioflow.app" },
    ],
    blocs: initialBlocks,
    blocsPublies: [],
    statut: "BROUILLON",
    visibilite: "PUBLIC",
    nombreVues: 0,
    dateCreation: new Date(),
    dateModification: new Date(),
  });

  return getOrCreatePortfolioForUser(userId, input.titre);
}

export async function resetPortfolioForUser(
  userId: string,
  explicitFullName?: string,
): Promise<PortfolioEditorData> {
  await connectDB();
  const ownerId = id(userId, "Owner");
  await Portfolio.deleteOne({ proprietaire: ownerId });
  return getOrCreatePortfolioForUser(userId, explicitFullName);
}

export async function getOrCreatePortfolioForUser(
  userId: string,
  explicitFullName?: string,
): Promise<PortfolioEditorData> {
  await connectDB();
  const ownerId = id(userId, "Owner");

  // 1. Get real photographer name dynamically from MongoDB
  const realUser = await findUtilisateurById(userId);
  const photographe = realUser || (await portfolioIntegrations.utilisateursService.getUtilisateur(userId));
  let photographerName = explicitFullName?.trim();
  if (!photographerName && photographe) {
    photographerName = `${photographe.prenom} ${photographe.nom}`.trim();
  }
  if (!photographerName) {
    photographerName = "Photographe";
  }

  let doc = await Portfolio.findOne({ proprietaire: ownerId }).lean<PortfolioLean>();

  if (!doc) {
    const slug = await uniqueSlug(photographerName);

    const initialBlocks = INITIAL_DEMO_BLOCKS.map((block) => {
      const cloned = structuredClone(block);
      if (cloned.type === "HERO") {
        cloned.configuration.titre = photographerName;
      }
      if (cloned.type === "A_PROPOS") {
        cloned.configuration.titre = photographerName;
      }
      return cloned;
    });

    const created = await Portfolio.create({
      proprietaire: ownerId,
      slug,
      titre: photographerName,
      slogan: "Photographe de mariage & portraits intimes",
      bio: "Capturing delicate, candid memories in natural light for more than a decade. Based in south-west France, traveling worldwide for destinations that speak of love and grace.",
      photoCouverture: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80",
      specialites: ["MARIAGE", "PORTRAIT"],
      ville: "Paris",
      theme: "MINIMAL",
      couleurAccent: "#E8A34A",
      filigrane: false,
      seo: { metaTitre: photographerName, metaDescription: `Portfolio de ${photographerName}` },
      liensSociaux: [
        { reseau: "INSTAGRAM", url: "https://instagram.com" },
        { reseau: "SITE_WEB", url: "https://studioflow.app" },
      ],
      blocs: initialBlocks,
      blocsPublies: [],
      statut: "BROUILLON",
      visibilite: "PUBLIC",
      nombreVues: 0,
      dateCreation: new Date(),
      dateModification: new Date(),
    });
    doc = (await Portfolio.findById(created._id).lean<PortfolioLean>())!;
  } else {
    // If doc was previously seeded with placeholder titles, or Hero still has demo names,
    // sync dynamically with the real connected photographer's name from MongoDB!
    let needsUpdate = false;
    const updates: Record<string, unknown> = {};

    if (photographerName && photographerName !== "Photographe") {
      if (!doc.titre || doc.titre === "Aurélie Morales" || doc.titre === "titlep") {
        updates.titre = photographerName;
        updates["seo.metaTitre"] = photographerName;
        doc.titre = photographerName;
        needsUpdate = true;
      }

      if (!doc.slug || doc.slug === "aurelie-morales" || doc.slug === "titlep") {
        const newSlug = await uniqueSlug(photographerName);
        updates.slug = newSlug;
        doc.slug = newSlug;
        needsUpdate = true;
      }

      doc.blocs = doc.blocs.map((block) => {
        if (block.type === "HERO") {
          if (!block.configuration.titre || block.configuration.titre === "Aurélie & Marc" || block.configuration.titre === "titlep") {
            block.configuration.titre = photographerName;
            needsUpdate = true;
          }
        }
        if (block.type === "A_PROPOS") {
          if (!block.configuration.titre || block.configuration.titre === "Aurélie Morales" || block.configuration.titre === "titlep") {
            block.configuration.titre = photographerName;
            needsUpdate = true;
          }
        }
        return block;
      });
    }

    if (needsUpdate) {
      await Portfolio.updateOne(
        { _id: doc._id },
        {
          $set: {
            ...updates,
            blocs: doc.blocs,
          },
        },
      );
      doc = (await Portfolio.findById(doc._id).lean<PortfolioLean>())!;
    }
  }

  const photographeInfo = photographe || {
    nom: doc.titre.split(" ").slice(1).join(" ") || "Photographe",
    prenom: doc.titre.split(" ")[0] || "Mon",
  };

  return {
    ...toPublic(doc, photographeInfo),
    statut: doc.statut,
    visibilite: doc.visibilite,
    dateCreation: doc.dateCreation.toISOString(),
    dateModification: doc.dateModification.toISOString(),
    blocs: serializeBlocks(doc.blocs),
    blocsPublies: serializeBlocks(doc.blocsPublies),
  };
}

export async function listPortfoliosForOwner(
  userId: string,
  includeAll = false,
): Promise<PortfolioListItem[]> {
  await connectDB();
  const filter = includeAll ? {} : { proprietaire: id(userId, "Owner") };
  const docs = await Portfolio.find(filter).sort({ dateModification: -1 }).lean<PortfolioLean[]>();
  const items = await Promise.all(
    docs.map(async (doc) => {
      const photographe = await portfolioIntegrations.utilisateursService.getUtilisateur(
        doc.proprietaire.toString(),
      );
      if (!photographe) return null;
      return {
        id: doc._id.toString(),
        titre: doc.titre,
        slug: doc.slug,
        statut: doc.statut,
        visibilite: doc.visibilite,
        photoCouverture: doc.photoCouverture,
        nombreVues: doc.nombreVues,
        nombrePhotos: doc.blocs.reduce((total, block) => total + block.elements.length, 0),
        datePublication: doc.datePublication?.toISOString(),
        dateModification: doc.dateModification.toISOString(),
        proprietaire: doc.proprietaire.toString(),
        photographe: { nom: photographe.nom, prenom: photographe.prenom },
      };
    }),
  );
  return items.filter((item): item is NonNullable<typeof item> => item !== null);
}

export async function getPublicPortfolio(slug: string): Promise<PortfolioPublic | null> {
  await connectDB();
  const doc = await Portfolio.findOne({
    slug: slug.toLowerCase(),
    statut: "PUBLIE",
  }).lean<PortfolioLean>();
  if (!doc) return null;
  // Always query real user from MongoDB first!
  const realUser = await findUtilisateurById(doc.proprietaire.toString());
  const photographe = realUser
    ? {
        id: realUser.id,
        nom: realUser.nom,
        prenom: realUser.prenom,
        role: realUser.role as "PHOTOGRAPHE" | "RETOUCHEUR" | "ADMIN",
        statut: (realUser.statut === "ACTIF" ? "ACTIF" : "BLOQUE") as "ACTIF" | "BLOQUE",
      }
    : await portfolioIntegrations.utilisateursService.getUtilisateur(doc.proprietaire.toString());

  const photoName = photographe
    ? { nom: photographe.nom, prenom: photographe.prenom }
    : { nom: "", prenom: doc.titre };
  return toPublic(doc, photoName);
}

export type PortfolioRouteResult =
  | {
      status: "PUBLISHED";
      portfolio: PortfolioPublic;
    }
  | {
      status: "UNPUBLISHED";
      slug: string;
      photographeNom: string;
      titre: string;
    }
  | {
      status: "NOT_FOUND";
      slug: string;
    };

export async function getPortfolioForPublicRoute(slug: string): Promise<PortfolioRouteResult> {
  await connectDB();
  const doc = await Portfolio.findOne({
    slug: slug.toLowerCase(),
  }).lean<PortfolioLean>();

  if (!doc) {
    return { status: "NOT_FOUND", slug };
  }

  // Always query real user from MongoDB first!
  const realUser = await findUtilisateurById(doc.proprietaire.toString());
  const photographe = realUser
    ? {
        id: realUser.id,
        nom: realUser.nom,
        prenom: realUser.prenom,
        role: realUser.role as "PHOTOGRAPHE" | "RETOUCHEUR" | "ADMIN",
        statut: (realUser.statut === "ACTIF" ? "ACTIF" : "BLOQUE") as "ACTIF" | "BLOQUE",
      }
    : await portfolioIntegrations.utilisateursService.getUtilisateur(doc.proprietaire.toString());

  const photographeNom = photographe
    ? `${photographe.prenom} ${photographe.nom}`.trim()
    : doc.titre;

  // Check if published with blocks
  if (doc.statut === "PUBLIE" && doc.blocsPublies && doc.blocsPublies.length > 0) {
    const photoName = photographe
      ? { nom: photographe.nom, prenom: photographe.prenom }
      : { nom: "", prenom: doc.titre };
    const publicPort = toPublic(doc, photoName);
    return { status: "PUBLISHED", portfolio: publicPort };
  }

  return {
    status: "UNPUBLISHED",
    slug,
    photographeNom,
    titre: doc.titre,
  };
}

export async function noterPortfolio(
  slug: string,
  note: number,
  auteur?: string,
  commentaire?: string,
): Promise<{ noteMoyenne: number; nombreAvis: number }> {
  await connectDB();
  if (note < 1 || note > 5) {
    throw new ServiceError("La note doit être comprise entre 1 et 5 étoiles.");
  }
  const doc = await Portfolio.findOne({ slug: slug.toLowerCase() });
  if (!doc) {
    throw new ServiceError("Portfolio introuvable.");
  }

  const avisVisiteurs = doc.avisVisiteurs ?? [];
  avisVisiteurs.push({
    note,
    auteur: auteur?.trim() || "Visiteur",
    commentaire: commentaire?.trim() || "",
    date: new Date(),
  });

  const total = avisVisiteurs.reduce((sum, a) => sum + a.note, 0);
  const count = avisVisiteurs.length;
  const noteMoyenne = Number((total / count).toFixed(1));

  doc.avisVisiteurs = avisVisiteurs;
  doc.nombreAvis = count;
  doc.noteMoyenne = noteMoyenne;

  await doc.save();
  return { noteMoyenne, nombreAvis: count };
}

export async function listPublicPortfolios(
  query: {
    categorie?: PortfolioDocument["specialites"][number];
    ville?: string;
    page?: number;
  } = {},
): Promise<{ items: PortfolioPublic[]; page: number; pageCount: number }> {
  await connectDB();
  const page = Math.max(1, query.page ?? 1);
  const filter: Record<string, unknown> = { statut: "PUBLIE", visibilite: "PUBLIC" };
  if (query.categorie) filter.specialites = query.categorie;
  if (query.ville) filter.ville = query.ville;
  const [docs, total] = await Promise.all([
    Portfolio.find(filter)
      .sort({ datePublication: -1 })
      .skip((page - 1) * 12)
      .limit(12)
      .lean<PortfolioLean[]>(),
    Portfolio.countDocuments(filter),
  ]);
  const items = await Promise.all(
    docs.map(async (doc) => {
      const realUser = await findUtilisateurById(doc.proprietaire.toString());
      const photographe = realUser
        ? {
            id: realUser.id,
            nom: realUser.nom,
            prenom: realUser.prenom,
            role: realUser.role as "PHOTOGRAPHE" | "RETOUCHEUR" | "ADMIN",
            statut: (realUser.statut === "ACTIF" ? "ACTIF" : "BLOQUE") as "ACTIF" | "BLOQUE",
          }
        : await portfolioIntegrations.utilisateursService.getUtilisateur(doc.proprietaire.toString());

      const photoName = photographe
        ? { nom: photographe.nom, prenom: photographe.prenom }
        : { nom: "", prenom: doc.titre };
      return toPublic(doc, photoName);
    }),
  );
  return {
    items: items.filter((item): item is PortfolioPublic => item !== null),
    page,
    pageCount: Math.max(1, Math.ceil(total / 12)),
  };
}

export async function updatePortfolio(
  portfolioId: string,
  userId: string,
  input: PortfolioUpdateInput,
): Promise<void> {
  const portfolioObjectId = await assertPortfolioAccess(portfolioId, userId, false);
  const result = await Portfolio.updateOne(
    { _id: portfolioObjectId },
    {
      $set: {
        ...input,
        ...(input.bio !== undefined ? { bioGenereeIA: false } : {}),
        dateModification: new Date(),
      },
    },
  );
  if (!result.matchedCount) throw new ServiceError("Portfolio not found.");
}

export async function saveGeneratedBio(
  portfolioId: string,
  userId: string,
  bio: string,
): Promise<void> {
  const portfolioObjectId = await assertPortfolioAccess(portfolioId, userId, false);
  const result = await Portfolio.updateOne(
    { _id: portfolioObjectId },
    { $set: { bio, bioGenereeIA: true, dateModification: new Date() } },
  );
  if (!result.matchedCount) throw new ServiceError("Portfolio not found.");
}

export async function savePortfolioBlocks(
  portfolioId: string,
  userId: string,
  blocs: BlocPortfolio[],
): Promise<void> {
  const normalized = normalizeBlocks(blocs);
  const parsed = portfolioBlocksSchema.safeParse(normalized);
  if (!parsed.success)
    throw new ServiceError("Portfolio blocks are invalid.", parsed.error.issues[0]?.path.join("."));
  const portfolioObjectId = await assertPortfolioAccess(portfolioId, userId, false);
  const previous = await Portfolio.findById(portfolioObjectId)
    .select("blocs")
    .lean<Pick<PortfolioDocument, "blocs">>();
  const oldElementIds = new Set(
    previous?.blocs.flatMap((block) =>
      block.elements.map((element) => element.idElement.toString()),
    ) ?? [],
  );
  const result = await Portfolio.updateOne(
    { _id: portfolioObjectId },
    { $set: { blocs: parsed.data, dateModification: new Date() } },
  );
  if (!result.matchedCount) throw new ServiceError("Portfolio not found.");
  const pendingConsents = parsed.data
    .flatMap((block) => block.elements)
    .filter(
      (element) =>
        !oldElementIds.has(element.idElement) &&
        element.source === "GALERIE_CLIENT" &&
        element.clientConcerne &&
        element.statutConsentement === "EN_ATTENTE",
    );
  await Promise.all(
    pendingConsents.map(async (element) => {
      const destinataireId = element.clientConcerne;
      if (!destinataireId) return;
      await notifyPortfolio({
        type: "CONSENTEMENT_PORTFOLIO_REQUIS",
        destinataireId,
        cible: "/espace-client/portfolio-consentements",
        message:
          "A photographer would like to display one of your gallery photos in their portfolio. Review the request to choose whether to allow it.",
      });
    }),
  );
}

export async function publishPortfolio(
  portfolioId: string,
  userId: string,
  allowAdmin = false,
): Promise<{ slug: string; url: string; removedElements: string[] }> {
  const _id = await assertPortfolioAccess(portfolioId, userId, allowAdmin);
  const doc = await Portfolio.findById(_id).lean<PortfolioLean>();
  if (!doc) throw new ServiceError("Portfolio not found.");
  const blocs = normalizeBlocks(doc.blocs as BlocPortfolio[]);
  validatePublication(blocs, doc.titre, doc.photoCouverture);
  const { blocks, removed } = publishedBlocks(blocs);
  const slug = doc.slug ?? (await uniqueSlug(doc.titre));
  const publishedAt = new Date();
  const heroBlock = blocs.find((b) => b.type === "HERO");
  const heroCover = (heroBlock?.configuration as Record<string, unknown> | undefined)?.photoCouverture;
  const newCover =
    typeof heroCover === "string" && heroCover.trim().length > 0
      ? heroCover.trim()
      : doc.photoCouverture;

  const updated = await Portfolio.updateOne(
    { _id },
    {
      $set: {
        slug,
        blocs,
        blocsPublies: blocks,
        photoCouverture: newCover,
        statut: "PUBLIE",
        datePublication: publishedAt,
      },
    },
    { timestamps: false },
  );
  if (!updated.matchedCount) throw new ServiceError("Portfolio not found.");
  const adminIds = await portfolioIntegrations.utilisateursService.listerAdmins();
  await Promise.all([
    notifyPortfolio({
      type: "PORTFOLIO_PUBLIE",
      destinataireId: doc.proprietaire.toString(),
      cible: `/portfolio/${slug}`,
      message: `Your portfolio “${doc.titre}” is now public.`,
    }),
    ...adminIds.map((destinataireId) =>
      notifyPortfolio({
        type: "PORTFOLIO_PUBLIE",
        destinataireId,
        cible: `/portfolio/${slug}`,
        message: `Portfolio “${doc.titre}” was published by ${doc.proprietaire.toString()}.`,
      }),
    ),
  ]);
  return {
    slug,
    url: `${process.env.PORTFOLIO_BASE_URL ?? "http://localhost:3000"}/portfolio/${slug}`,
    removedElements: removed,
  };
}

export async function unpublishPortfolio(
  portfolioId: string,
  userId: string,
  allowAdmin = false,
): Promise<void> {
  const portfolioObjectId = await assertPortfolioAccess(portfolioId, userId, allowAdmin);
  const result = await Portfolio.updateOne(
    { _id: portfolioObjectId },
    { $set: { statut: "DEPUBLIE" } },
    { timestamps: false },
  );
  if (!result.matchedCount) throw new ServiceError("Portfolio not found.");
}

export async function deletePortfolio(
  portfolioId: string,
  userId: string,
  allowAdmin = false,
): Promise<void> {
  const portfolioObjectId = await assertPortfolioAccess(portfolioId, userId, allowAdmin);
  await connectDB();
  const result = await Portfolio.deleteOne({ _id: portfolioObjectId });
  if (!result.deletedCount) throw new ServiceError("Portfolio not found.");
  await Promise.all([
    PortfolioStats.deleteMany({ portfolioId: portfolioObjectId }),
    DemandeContact.deleteMany({ portfolioId: portfolioObjectId }),
  ]);
}

function dayStart(): Date {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

async function incrementDailyStats(
  portfolioId: Types.ObjectId,
  increment: Partial<Pick<PortfolioStatsDocument, "vues" | "visiteursUniques" | "clicsContact">>,
): Promise<void> {
  const filter = { portfolioId, date: dayStart() };
  try {
    await PortfolioStats.updateOne(filter, { $inc: increment }, { upsert: true });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      await PortfolioStats.updateOne(filter, { $inc: increment });
      return;
    }
    throw error;
  }
}

export async function incrementPortfolioView(
  portfolioId: string,
  uniqueVisitor = false,
): Promise<void> {
  const _id = id(portfolioId, "Portfolio");
  await connectDB();
  await Promise.all([
    Portfolio.updateOne({ _id }, { $inc: { nombreVues: 1 } }, { timestamps: false }),
    incrementDailyStats(_id, { vues: 1, visiteursUniques: uniqueVisitor ? 1 : 0 }),
  ]);
}

export async function incrementElementLike(portfolioId: string, elementId: string): Promise<void> {
  await connectDB();
  const result = await Portfolio.updateOne(
    {
      _id: id(portfolioId, "Portfolio"),
      "blocsPublies.elements.idElement": id(elementId, "Element"),
    },
    { $inc: { "blocsPublies.$[].elements.$[element].nombreLikes": 1 } },
    { arrayFilters: [{ "element.idElement": id(elementId, "Element") }], timestamps: false },
  );
  if (!result.matchedCount) throw new ServiceError("Portfolio image not found.");
}

export async function createContactRequest(input: ContactPortfolioInput): Promise<{ id: string }> {
  if (input.honeypot) throw new ServiceError("Invalid contact request.");
  await connectDB();
  const portfolio = await Portfolio.findOne({
    _id: id(input.portfolioId, "Portfolio"),
    statut: "PUBLIE",
  }).lean<PortfolioLean>();
  if (!portfolio) throw new ServiceError("Portfolio unavailable.");
  const doc = await DemandeContact.create({
    ...input,
    portfolioId: portfolio._id,
    photographeId: portfolio.proprietaire,
    dateSouhaitee: input.dateSouhaitee ? new Date(input.dateSouhaitee) : undefined,
  });
  await incrementDailyStats(portfolio._id, { clicsContact: 1 });
  await notifyPortfolio({
    type: "NOUVELLE_DEMANDE_PORTFOLIO",
    destinataireId: portfolio.proprietaire.toString(),
    cible: `/dashboard/portfolio/demandes/${doc._id.toString()}`,
    message: `New portfolio contact request from ${input.nomVisiteur}.`,
  });
  return { id: doc._id.toString() };
}

export async function updateContactStatus(
  idValue: string,
  photographeId: string,
  statut: StatutDemande,
): Promise<void> {
  await connectDB();
  const result = await DemandeContact.updateOne(
    { _id: id(idValue, "Contact request"), photographeId: id(photographeId, "Owner") },
    { $set: { statut } },
  );
  if (!result.matchedCount) throw new ServiceError("Contact request not found.");
}

export type PortfolioContactRequest = {
  id: string;
  nomVisiteur: string;
  email: string;
  telephone?: string;
  typeSeance: string;
  dateSouhaitee?: string;
  message: string;
  statut: StatutDemande;
  dateCreation: string;
};

export async function listContactRequests(
  photographeId: string,
): Promise<PortfolioContactRequest[]> {
  await connectDB();
  const requests = await DemandeContact.find({ photographeId: id(photographeId, "Owner") })
    .sort({ dateCreation: -1 })
    .lean<(DemandeContactDocument & { _id: Types.ObjectId })[]>();
  return requests.map((request) => ({
    id: request._id.toString(),
    nomVisiteur: request.nomVisiteur,
    email: request.email,
    telephone: request.telephone,
    typeSeance: request.typeSeance,
    dateSouhaitee: request.dateSouhaitee?.toISOString(),
    message: request.message,
    statut: request.statut,
    dateCreation: request.dateCreation.toISOString(),
  }));
}

export type PortfolioStatsSummary = {
  totalVues: number;
  visiteursUniques: number;
  clicsContact: number;
  jours: { date: string; vues: number; visiteursUniques: number; clicsContact: number }[];
};

export async function getPortfolioStats(
  portfolioId: string,
  userId: string,
): Promise<PortfolioStatsSummary> {
  const _id = await assertPortfolioAccess(portfolioId, userId, false);
  const start = dayStart();
  start.setUTCDate(start.getUTCDate() - 29);
  const [rows, portfolio] = await Promise.all([
    PortfolioStats.find({ portfolioId: _id, date: { $gte: start } })
      .sort({ date: 1 })
      .lean<PortfolioStatsDocument[]>(),
    Portfolio.findById(_id).select("nombreVues").lean<Pick<PortfolioDocument, "nombreVues">>(),
  ]);
  const days = new Map(rows.map((row) => [row.date.toISOString().slice(0, 10), row]));
  const jours = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    const row = days.get(key);
    return {
      date: key,
      vues: row?.vues ?? 0,
      visiteursUniques: row?.visiteursUniques ?? 0,
      clicsContact: row?.clicsContact ?? 0,
    };
  });
  return {
    totalVues: portfolio?.nombreVues ?? 0,
    visiteursUniques: jours.reduce((total, day) => total + day.visiteursUniques, 0),
    clicsContact: jours.reduce((total, day) => total + day.clicsContact, 0),
    jours,
  };
}

export async function convertContactRequest(
  requestId: string,
  photographeId: string,
): Promise<{ seanceId: string }> {
  const owner = id(photographeId, "Owner");
  const conversionClaim = new Types.ObjectId().toString();
  await connectDB();
  const request = await DemandeContact.findOne({
    _id: id(requestId, "Contact request"),
    photographeId: owner,
    statut: { $in: ["NOUVELLE", "EN_COURS"] },
    conversionClaim: { $exists: false },
  }).lean<DemandeContactDocument & { _id: Types.ObjectId }>();
  if (!request) throw new ServiceError("Contact request not found or already converted.");

  const claimed = await DemandeContact.updateOne(
    {
      _id: request._id,
      photographeId: owner,
      statut: { $in: ["NOUVELLE", "EN_COURS"] },
      conversionClaim: { $exists: false },
    },
    { $set: { conversionClaim } },
  );
  if (!claimed.modifiedCount)
    throw new ServiceError("This contact request is already being processed.");
  let seance: { id: string };
  try {
    seance = await portfolioIntegrations.seancesService.creerDepuisDemande({
      portfolioId: request.portfolioId.toString(),
      photographeId,
      nomVisiteur: request.nomVisiteur,
      email: request.email,
      telephone: request.telephone,
      typeSeance: request.typeSeance,
      dateSouhaitee: request.dateSouhaitee?.toISOString(),
      message: request.message,
    });
  } catch (error) {
    await DemandeContact.updateOne(
      { _id: request._id, conversionClaim },
      { $unset: { conversionClaim: "" } },
    );
    throw error;
  }
  await DemandeContact.updateOne(
    { _id: request._id, photographeId: owner, conversionClaim },
    {
      $set: { statut: "CONVERTIE", seanceId: id(seance.id, "Session") },
      $unset: { conversionClaim: "" },
    },
  );
  return { seanceId: seance.id };
}

export async function answerConsent(
  elementId: string,
  clientId: string,
  accord: boolean,
): Promise<void> {
  const clientObjectId = id(clientId, "Client");
  const elementObjectId = id(elementId, "Element");
  await connectDB();
  const result = await Portfolio.updateOne(
    {
      blocs: {
        $elemMatch: {
          elements: {
            $elemMatch: {
              idElement: elementObjectId,
              clientConcerne: clientObjectId,
              source: "GALERIE_CLIENT",
            },
          },
        },
      },
    },
    {
      $set: {
        "blocs.$[].elements.$[element].statutConsentement": accord ? "ACCORDE" : "REFUSE",
        "blocs.$[].elements.$[element].dateConsentement": accord ? new Date() : null,
      },
    },
    {
      arrayFilters: [
        {
          "element.idElement": elementObjectId,
          "element.clientConcerne": clientObjectId,
          "element.source": "GALERIE_CLIENT",
        },
      ],
    },
  );
  if (!result.matchedCount) throw new ServiceError("Portfolio element not found.");
  if (!accord) {
    const portfolio = await Portfolio.findOneAndUpdate(
      { "blocsPublies.elements.idElement": elementObjectId },
      { $pull: { "blocsPublies.$[].elements": { idElement: elementObjectId } } },
      { returnDocument: "before" },
    )
      .select("proprietaire titre slug")
      .lean<{ proprietaire: Types.ObjectId; titre: string; slug?: string }>();
    if (portfolio) {
      await notifyPortfolio({
        type: "CONSENTEMENT_RETIRE",
        destinataireId: portfolio.proprietaire.toString(),
        cible: portfolio.slug ? `/portfolio/${portfolio.slug}` : "/dashboard/portfolio",
        message: `A client withdrew consent for a photo in “${portfolio.titre}”. The photo was removed from the published portfolio.`,
      });
    }
  }
}

export type PendingPortfolioConsent = {
  portfolioId: string;
  titrePortfolio: string;
  photographe: string;
  elementId: string;
  miniature: string;
  legende: string;
  dateAjout: string;
  statut: "EN_ATTENTE" | "ACCORDE";
};

export async function listPendingConsents(clientId: string): Promise<PendingPortfolioConsent[]> {
  const owner = id(clientId, "Client");
  await connectDB();
  const docs = await Portfolio.find({
    blocs: {
      $elemMatch: {
        elements: {
          $elemMatch: {
            clientConcerne: owner,
            source: "GALERIE_CLIENT",
            statutConsentement: { $in: ["EN_ATTENTE", "ACCORDE"] },
          },
        },
      },
    },
  })
    .select("proprietaire titre blocs")
    .lean<PortfolioLean[]>();
  const requests = await Promise.all(
    docs.map(async (doc) => {
      const photographer = await portfolioIntegrations.utilisateursService.getUtilisateur(
        doc.proprietaire.toString(),
      );
      const pending = doc.blocs
        .flatMap((block) => block.elements)
        .filter(
          (element) =>
            element.clientConcerne?.toString() === clientId &&
            element.source === "GALERIE_CLIENT" &&
            (element.statutConsentement === "EN_ATTENTE" ||
              element.statutConsentement === "ACCORDE"),
        );
      return pending.map((element) => ({
        portfolioId: doc._id.toString(),
        titrePortfolio: doc.titre,
        photographe: photographer ? `${photographer.prenom} ${photographer.nom}` : "Photographer",
        elementId: element.idElement.toString(),
        miniature: element.media.urlMiniature,
        legende: element.legende ?? "",
        dateAjout: new Date(element.dateAjout).toISOString(),
        statut: element.statutConsentement as "EN_ATTENTE" | "ACCORDE",
      }));
    }),
  );
  return requests.flat();
}

export type PhotoPourSelecteur = {
  id: string;
  url: string;
  urlMiniature: string;
  titre: string;
  client?: string;
  clientId?: string;
  dateAjout?: string;
  scoreQualite: number;
};

/**
 * Charge uniquement les photos appartenant au photographe connecté
 * depuis la base de données MongoDB (collection `photos`, uploadePar = userId).
 */
export async function listerPhotosPhotographePourPortfolio(userId: string): Promise<PhotoPourSelecteur[]> {
  await connectDB();
  if (!Types.ObjectId.isValid(userId)) return [];
  const userObjectId = new Types.ObjectId(userId);

  try {
    const photos = await Photo.find({
      $or: [{ uploadePar: userObjectId }, { uploadePar: userId }],
    })
      .sort({ createdAt: -1 })
      .populate({
        path: "galerie",
        select: "titre client",
        populate: { path: "client", select: "nom prenom" },
      })
      .lean();

    return photos.map((p) => {
      const id = p._id.toString();
      const galerie = p.galerie as
        | { titre?: string; client?: { nom?: string; prenom?: string; _id?: Types.ObjectId } }
        | undefined;

      let clientNom: string | undefined;
      let clientId: string | undefined;

      if (galerie?.client && typeof galerie.client === "object") {
        clientNom = `${galerie.client.prenom ?? ""} ${galerie.client.nom ?? ""}`.trim();
        clientId = galerie.client._id?.toString();
      }
      if (!clientNom && galerie?.titre) {
        clientNom = galerie.titre;
      }

      return {
        id,
        url: `/api/photos/${id}/file`,
        urlMiniature: `/api/photos/${id}/miniature`,
        titre: (p.nomFichier || "Photo").replace(/\.[^/.]+$/, ""),
        client: clientNom || "Galerie client",
        clientId,
        dateAjout: p.createdAt ? new Date(p.createdAt).toISOString() : undefined,
        scoreQualite: p.scoreQualite ?? 0,
      };
    });
  } catch (err) {
    console.error("Erreur lors de la récupération des photos du photographe:", err);
    return [];
  }
}

