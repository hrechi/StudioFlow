import "server-only";
import { Types } from "mongoose";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
import { Galerie } from "@/modules/photos-galeries/galerie.model";
import { Photo } from "@/modules/photos-galeries/photo.model";
import { openFile } from "@/modules/photos-galeries/photo.storage";
import "@/modules/utilisateurs/utilisateur.model";
import { Utilisateur } from "@/modules/utilisateurs/utilisateur.model";
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
  type PublicPortfolioSearchInput,
  type ContactPortfolioInput,
  type PortfolioCreateInput,
  type PortfolioUpdateInput,
} from "./portfolio.schemas";
import {
  CATEGORIES_PORTFOLIO,
  MAX_AUTOMATIC_PORTFOLIO_PHOTOS,
  type BlocPortfolio,
  type BlocPortfolioPublic,
  type CategoriePortfolio,
  type ElementBlocPortfolio,
  type PlancheContactData,
  type StatutDemande,
  type ServicePhotographique,
  type StylePhotographique,
} from "./portfolio.types";
import { portfolioIntegrations } from "./integrations";
import { analyserPhotoAvecGemini, type GeminiPhotoAnalysis } from "./ia.service";
import { photoLibraryFilter } from "./photo-library";
import { INITIAL_DEMO_BLOCKS } from "./components/editor/demoData";
import {
  searchPortfoliosWithElasticsearch,
  syncPortfolioById,
  removePortfolioFromElasticsearch,
} from "./portfolio.elasticsearch";

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

/**
 * Returns true if a gallery element is a valid publishable photo.
 *
 * A gallery element is valid when it has a usable media URL that points to
 * one of the three supported storage back-ends:
 *
 *  1. MongoDB library photo  – url is `/api/portfolio/media/<ObjectId>`
 *     (added via PhotoPicker from the photographer's library).
 *  2. GridFS direct upload   – same URL pattern, no `photoId` set because
 *     the file was uploaded directly through /api/portfolio/upload without
 *     going through the Photos module (e.g. drag-and-drop in the editor).
 *  3. Cloudinary upload      – url is an https://res.cloudinary.com/… URL
 *     returned by /api/portfolio/upload when Cloudinary is configured.
 *
 * Previously only case 1 was accepted, which caused every directly-uploaded
 * photo (cases 2 & 3) to be silently stripped at publish time, leaving the
 * gallery empty on the public portfolio.
 */
function isPublishableGalleryPhoto(element: ElementBlocPortfolio): boolean {
  const url = element.media?.url;
  if (!url) return false;

  // Case 1 & 2 — served by our own media proxy (library or GridFS direct upload)
  if (url.startsWith("/api/portfolio/media/")) return true;

  // Case 3 — Cloudinary URL (https://res.cloudinary.com/…)
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol === "https:" &&
      parsed.hostname === "res.cloudinary.com"
    ) {
      return true;
    }
  } catch {
    // not a URL — fall through to false
  }

  return false;
}

function filterNonDatabaseGalleryPhotos(blocks: BlocPortfolio[]): BlocPortfolio[] {
  return blocks.map((block) => ({
    ...block,
    elements:
      block.type === "GALERIE" || block.type === "COLLECTION"
        ? block.elements.filter(isPublishableGalleryPhoto).slice(0, 12)
        : block.elements,
  }));
}

function toPublicMediaUrl(url: string | undefined): string {
  if (!url) return "";
  return url.replace(
    /\/api\/photos\/([^/]+)\/(file|miniature)/,
    (_match, id: string, variant: string) =>
      variant === "miniature"
        ? `/api/portfolio/media/${id}?variant=miniature`
        : `/api/portfolio/media/${id}`,
  );
}

const CONFIGURATION_MEDIA_KEYS = [
  "photoCouverture",
  "photoPortrait",
  "photoAvant",
  "photoApres",
  "photo",
  "affiche",
] as const;

function serializePublicBlocks(blocks: BlocPortfolio[], filigrane: boolean): BlocPortfolioPublic[] {
  return filterNonDatabaseGalleryPhotos(serializeBlocks(blocks, filigrane))
    .filter((block) => block.type !== "VIDEO")
    .map((block) => {
      const configuration = { ...block.configuration };
      for (const key of CONFIGURATION_MEDIA_KEYS) {
        if (typeof configuration[key] === "string") {
          configuration[key] = toPublicMediaUrl(configuration[key]);
        }
      }

      return {
        idBloc: block.idBloc,
        type: block.type,
        ordre: block.ordre,
        visible: block.visible,
        miseEnPage: block.miseEnPage,
        configuration,
        elements: block.elements.map((element) => ({
          idElement: element.idElement,
          media: {
            url: toPublicMediaUrl(element.media.url),
            urlMiniature: toPublicMediaUrl(element.media.urlMiniature),
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
      };
    });
}

export type PortfolioPublic = {
  id: string;
  proprietaire: string;
  photographe: { nom: string; prenom: string; photoProfil?: string };
  slug: string;
  titre: string;
  slogan?: string;
  bio?: string;
  photoCouverture: string;
  specialites: PortfolioDocument["specialites"];
  styles: StylePhotographique[];
  services: ServicePhotographique[];
  disponible: boolean;
  ville?: string;
  region?: string;
  pays?: string;
  theme: PortfolioDocument["theme"];
  couleurAccent: string;
  filigrane: boolean;
  seo: PortfolioDocument["seo"];
  liensSociaux: PortfolioDocument["liensSociaux"];
  blocsPublies: BlocPortfolioPublic[];
  plancheContact?: PlancheContactData;
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
  photographe: { nom: string; prenom: string; photoProfil?: string },
): PortfolioPublic {
  // If hero block has a custom cover photo, use it as the primary cover
  const heroBlock = (doc.blocsPublies || doc.blocs || []).find(
    (b: { type?: string }) => b.type === "HERO",
  );
  const heroCover = (heroBlock?.configuration as Record<string, unknown> | undefined)
    ?.photoCouverture;
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
    photoCouverture: doc.filigrane
      ? applyWatermark(toPublicMediaUrl(cover))
      : toPublicMediaUrl(cover),
    specialites: doc.specialites,
    styles: doc.styles ?? [],
    services: doc.services ?? [],
    disponible: doc.disponible ?? false,
    ville: doc.ville,
    region: doc.region,
    pays: doc.pays,
    theme: doc.theme,
    couleurAccent: doc.couleurAccent,
    filigrane: doc.filigrane,
    seo: doc.seo,
    liensSociaux: doc.liensSociaux,
    blocsPublies: serializePublicBlocks(doc.blocsPublies, doc.filigrane),
    plancheContact: doc.plancheContact
      ? {
          active: Boolean(doc.plancheContact.active),
          videoUrl: toPublicMediaUrl(doc.plancheContact.videoUrl ?? ""),
          trimStart: doc.plancheContact.trimStart ?? 0,
          trimEnd: doc.plancheContact.trimEnd ?? 0,
          frames: (doc.plancheContact.frames || []).map((f) => ({
            id: f.id,
            imageUrl: toPublicMediaUrl(f.imageUrl),
            timestamp: f.timestamp,
            caption: f.caption,
            order: f.order,
          })),
        }
      : undefined,
    nombreVues: doc.nombreVues,
    noteMoyenne: doc.noteMoyenne ?? 5,
    nombreAvis: doc.nombreAvis ?? 0,
    datePublication: doc.datePublication?.toISOString(),
  };
}

function id(value: string, label: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) {
    const labels: Record<string, string> = {
      Portfolio: "Portfolio",
      User: "utilisateur",
      Owner: "propriétaire",
      Element: "élément",
      "Contact request": "demande de contact",
      Session: "séance",
      Client: "client",
    };
    throw new ServiceError(`${labels[label] ?? label} introuvable.`);
  }
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
    console.error("Échec de l’envoi d’une notification de portfolio", error);
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
  if (!portfolio) throw new ServiceError("Portfolio introuvable.");
  if (portfolio.proprietaire.equals(userObjectId)) return portfolioObjectId;
  if (allowAdmin) return portfolioObjectId;
  throw new ServiceError("Vous n’êtes pas autorisé à modifier ce portfolio.");
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
          element.photoId && Types.ObjectId.isValid(element.photoId) ? element.photoId : undefined;

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
            source === "UPLOAD_PERSONNEL" ? "NON_REQUIS" : element.statutConsentement || "ACCORDE",
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
  const consentFiltered = blocks.map((block) => ({
    ...block,
    elements: block.elements.filter((element) => {
      const allowed =
        element.source !== "GALERIE_CLIENT" || element.statutConsentement === "ACCORDE";
      if (!allowed) removed.push(element.idElement.toString());
      return allowed;
    }),
  }));
  const filtered = filterNonDatabaseGalleryPhotos(consentFiltered);
  return { blocks: normalizeBlocks(filtered), removed };
}

function validatePublication(
  blocs: BlocPortfolio[],
  titre: string,
  _photoCouverture: string,
): void {
  if (!titre.trim()) throw new ServiceError("Le titre du portfolio est obligatoire.", "titre");
  if (blocs.filter((block) => block.type === "HERO").length !== 1) {
    throw new ServiceError("Le portfolio doit contenir exactement un bloc Hero.", "blocs");
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
        "Chaque comparaison doit contenir une image Avant et une image Après.",
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
    throw new ServiceError("Seuls les photographes et retoucheurs peuvent créer un portfolio.");
  }
  await connectDB();
  if (await Portfolio.exists({ proprietaire: owner }))
    throw new ServiceError("Cet utilisateur possède déjà un portfolio.");
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
              sousTitre: input.slogan || "Authentic images for life's precious moments.",
              texteBouton: "Contact Me",
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
                input.bio ||
                "Describe your approach, the people you photograph, and what they can expect from a session with you.",
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
              texteIntro: "Tell me about the session you have in mind.",
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
    blocs: filterNonDatabaseGalleryPhotos(serializeBlocks(doc.blocs)).filter(
      (b) => b.type !== "VIDEO",
    ),
    blocsPublies: serializeBlocks(doc.blocsPublies).filter((b) => b.type !== "VIDEO"),
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
              : input.ville
                ? input.ville.toUpperCase()
                : "PORTFOLIO",
          photoCouverture: cover,
          liensSociaux: [],
        },
        elements: [],
      },
    ];
  }

  const existing = await Portfolio.findOne({ proprietaire: ownerId })
    .select("_id")
    .lean<{ _id: Types.ObjectId }>();
  if (existing) await deletePortfolio(existing._id.toString(), userId);

  await Portfolio.create({
    proprietaire: ownerId,
    slug,
    titre: input.titre,
    slogan: input.slogan || "Professional photographer",
    bio: "I photograph precious and spontaneous moments with a natural approach.",
    photoCouverture: cover,
    specialites: (input.specialites && input.specialites.length > 0
      ? input.specialites
          .map((s) => s.toUpperCase())
          .filter((s): s is (typeof CATEGORIES_PORTFOLIO)[number] =>
            (CATEGORIES_PORTFOLIO as readonly string[]).includes(s),
          )
      : ["MARIAGE", "PORTRAIT"]) as (typeof CATEGORIES_PORTFOLIO)[number][],
    ville: input.ville || "Paris",
    theme: "MINIMAL",
    couleurAccent: "#E8A34A",
    filigrane: false,
    seo: { metaTitre: input.titre, metaDescription: input.slogan || `Portfolio of ${input.titre}` },
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
  const photographe =
    realUser || (await portfolioIntegrations.utilisateursService.getUtilisateur(userId));
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
      slogan: "Wedding photographer and intimate portraits",
      bio: "For more than ten years, I have photographed delicate and spontaneous moments with a natural approach. Based in the Southwest, I travel wherever stories deserve to be told.",
      photoCouverture:
        "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80",
      specialites: ["MARIAGE", "PORTRAIT"],
      ville: "Paris",
      theme: "MINIMAL",
      couleurAccent: "#E8A34A",
      filigrane: false,
      seo: { metaTitre: photographerName, metaDescription: `Photography portfolio of ${photographerName}` },
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
          if (
            !block.configuration.titre ||
            block.configuration.titre === "Aurélie & Marc" ||
            block.configuration.titre === "titlep"
          ) {
            block.configuration.titre = photographerName;
            needsUpdate = true;
          }
        }
        if (block.type === "A_PROPOS") {
          if (
            !block.configuration.titre ||
            block.configuration.titre === "Aurélie Morales" ||
            block.configuration.titre === "titlep"
          ) {
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
    visibilite: "PUBLIC",
  }).lean<PortfolioLean>();
  if (!doc) return null;
  // Always query real user from MongoDB first!
  const realUser = await findUtilisateurById(doc.proprietaire.toString());
  const photographe = realUser
    ? {
        id: realUser.id,
        nom: realUser.nom,
        prenom: realUser.prenom,
        photoProfil: realUser.photoProfil,
        role: realUser.role as "PHOTOGRAPHE" | "RETOUCHEUR" | "ADMIN",
        statut: (realUser.statut === "ACTIF" ? "ACTIF" : "BLOQUE") as "ACTIF" | "BLOQUE",
      }
    : await portfolioIntegrations.utilisateursService.getUtilisateur(doc.proprietaire.toString());

  const photoName = photographe
    ? {
        nom: photographe.nom,
        prenom: photographe.prenom,
        photoProfil: photographe.photoProfil,
      }
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

  if (doc.visibilite !== "PUBLIC") {
    return { status: "NOT_FOUND", slug };
  }

  // Always query real user from MongoDB first!
  const realUser = await findUtilisateurById(doc.proprietaire.toString());
  const photographe = realUser
    ? {
        id: realUser.id,
        nom: realUser.nom,
        prenom: realUser.prenom,
        photoProfil: realUser.photoProfil,
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
      ? {
          nom: photographe.nom,
          prenom: photographe.prenom,
          photoProfil: photographe.photoProfil,
        }
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

export async function getPortfolioDraftPreview(userId: string): Promise<PortfolioPublic | null> {
  await connectDB();
  const ownerId = id(userId, "Owner");
  const doc = await Portfolio.findOne({ proprietaire: ownerId }).lean<PortfolioLean>();
  if (!doc) return null;

  const photographer = await findUtilisateurById(userId);
  const previewBlocks = publishedBlocks(
    filterNonDatabaseGalleryPhotos(normalizeBlocks(doc.blocs as BlocPortfolio[])),
  ).blocks;
  const previewDoc: PortfolioLean = {
    ...doc,
    statut: "PUBLIE",
    blocsPublies: previewBlocks,
  };

  return toPublic(previewDoc, {
    nom: photographer?.nom ?? "",
    prenom: photographer?.prenom ?? doc.titre,
    photoProfil: photographer?.photoProfil,
  });
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
  query: PublicPortfolioSearchInput = {
    categories: [],
    styles: [],
    services: [],
    disponible: false,
    page: 1,
  },
): Promise<{ items: PortfolioPublic[]; total: number; page: number; pageCount: number }> {
  await connectDB();
  const page = Math.max(1, query.page ?? 1);

  // 1. Try search & filtering through Elasticsearch if available
  const esResult = await searchPortfoliosWithElasticsearch(query);
  if (esResult) {
    const { ids, total, page: esPage, pageCount } = esResult;
    if (ids.length === 0) {
      return { items: [], total: 0, page: esPage, pageCount: 1 };
    }

    const docs = await Portfolio.find({
      _id: { $in: ids },
      statut: "PUBLIE",
      visibilite: "PUBLIC",
    }).lean<PortfolioLean[]>();

    const docMap = new Map(docs.map((doc) => [doc._id.toString(), doc]));
    const orderedDocs = ids
      .map((id) => docMap.get(id))
      .filter((doc): doc is PortfolioLean => Boolean(doc));

    const items = await Promise.all(
      orderedDocs.map(async (doc) => {
        const realUser = await findUtilisateurById(doc.proprietaire.toString());
        const photographe = realUser
          ? {
              id: realUser.id,
              nom: realUser.nom,
              prenom: realUser.prenom,
              photoProfil: realUser.photoProfil,
              role: realUser.role as "PHOTOGRAPHE" | "RETOUCHEUR" | "ADMIN",
              statut: (realUser.statut === "ACTIF" ? "ACTIF" : "BLOQUE") as "ACTIF" | "BLOQUE",
            }
          : await portfolioIntegrations.utilisateursService.getUtilisateur(
              doc.proprietaire.toString(),
            );

        const photoName = photographe
          ? {
              nom: photographe.nom,
              prenom: photographe.prenom,
              photoProfil: photographe.photoProfil,
            }
          : { nom: "", prenom: doc.titre };
        return toPublic(doc, photoName);
      }),
    );

    return {
      items: items.filter((item): item is PortfolioPublic => item !== null),
      total,
      page: esPage,
      pageCount,
    };
  }

  // 2. Fallback to MongoDB query when Elasticsearch is not running or unreachable
  const filter: Record<string, unknown> = { statut: "PUBLIE", visibilite: "PUBLIC" };
  if (query.categories.length) filter.specialites = { $all: query.categories };
  if (query.styles.length) filter.styles = { $all: query.styles };
  if (query.services.length) filter.services = { $all: query.services };
  if (query.disponible) filter.disponible = true;
  if (query.ville) {
    const locationRegex = new RegExp(escapeRegex(query.ville), "i");
    filter.$or = [{ ville: locationRegex }, { region: locationRegex }, { pays: locationRegex }];
  }
  if (query.recherche) {
    const searchTerms = query.recherche.split(/\s+/).filter(Boolean);
    const photographerIds = await Utilisateur.find({
      $and: searchTerms.map((term) => {
        const searchRegex = new RegExp(escapeRegex(term), "i");
        return {
          $or: [{ prenom: searchRegex }, { nom: searchRegex }, { entreprise: searchRegex }],
        };
      }),
    })
      .select("_id")
      .lean<{ _id: Types.ObjectId }[]>();
    filter.$and = searchTerms.map((term) => {
      const searchRegex = new RegExp(escapeRegex(term), "i");
      return {
        $or: [
          { titre: searchRegex },
          { slogan: searchRegex },
          { bio: searchRegex },
          { ville: searchRegex },
          { region: searchRegex },
          { pays: searchRegex },
          { styles: searchRegex },
          { services: searchRegex },
          { specialites: searchRegex },
          ...(photographerIds.length
            ? [{ proprietaire: { $in: photographerIds.map(({ _id }) => _id) } }]
            : []),
        ],
      };
    });
  }
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
            photoProfil: realUser.photoProfil,
            role: realUser.role as "PHOTOGRAPHE" | "RETOUCHEUR" | "ADMIN",
            statut: (realUser.statut === "ACTIF" ? "ACTIF" : "BLOQUE") as "ACTIF" | "BLOQUE",
          }
        : await portfolioIntegrations.utilisateursService.getUtilisateur(
            doc.proprietaire.toString(),
          );

      const photoName = photographe
        ? {
            nom: photographe.nom,
            prenom: photographe.prenom,
            photoProfil: photographe.photoProfil,
          }
        : { nom: "", prenom: doc.titre };
      return toPublic(doc, photoName);
    }),
  );
  return {
    items: items.filter((item): item is PortfolioPublic => item !== null),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / 12)),
  };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  if (!result.matchedCount) throw new ServiceError("Portfolio introuvable.");
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
  if (!result.matchedCount) throw new ServiceError("Portfolio introuvable.");
}

export async function savePortfolioBlocks(
  portfolioId: string,
  userId: string,
  blocs: BlocPortfolio[],
): Promise<void> {
  const normalized = normalizeBlocks(blocs);
  const parsed = portfolioBlocksSchema.safeParse(normalized);
  if (!parsed.success)
    throw new ServiceError(
      "Les blocs du portfolio sont invalides.",
      parsed.error.issues[0]?.path.join("."),
    );
  const galleryElements = parsed.data
    .filter((block) => block.type === "GALERIE" || block.type === "COLLECTION")
    .flatMap((block) => block.elements);
  // Reject elements whose URL doesn't point to a known safe storage backend.
  // Library photos (/api/portfolio/media/…), direct GridFS uploads (same pattern),
  // and Cloudinary uploads (https://res.cloudinary.com/…) are all accepted.
  // Any other URL (e.g. a stale /api/photos/… internal route) is rejected.
  const invalidGalleryElements = galleryElements.filter(
    (element) => !isPublishableGalleryPhoto(element),
  );
  if (invalidGalleryElements.length > 0) {
    throw new ServiceError(
      "Les galeries acceptent uniquement des photos issues de votre bibliothèque ou téléversées directement.",
      "blocs",
    );
  }
  // Verify library photos (those with a photoId) still exist in the DB.
  const libraryPhotoIds = [
    ...new Set(
      galleryElements
        .map((element) => element.photoId)
        .filter((pid): pid is string => !!pid && Types.ObjectId.isValid(pid)),
    ),
  ];
  if (libraryPhotoIds.length > 0) {
    const library = await photoLibraryFilter(userId);
    if (!library) throw new ServiceError("Bibliothèque photo inaccessible.");
    const storedPhotos = await Photo.find({
      ...library,
      _id: { $in: libraryPhotoIds.map((photoId) => new Types.ObjectId(photoId)) },
    })
      .select("_id")
      .lean();
    if (storedPhotos.length !== libraryPhotoIds.length) {
      throw new ServiceError(
        "Une ou plusieurs photos ne sont plus disponibles dans votre bibliothèque.",
        "blocs",
      );
    }
  }
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
  if (!result.matchedCount) throw new ServiceError("Portfolio introuvable.");
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
          "Un photographe souhaite afficher l’une de vos photos de galerie dans son portfolio. Consultez la demande pour autoriser ou refuser son utilisation.",
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
  if (!doc) throw new ServiceError("Portfolio introuvable.");
  const blocs = normalizeBlocks(doc.blocs as BlocPortfolio[]);
  validatePublication(blocs, doc.titre, doc.photoCouverture);
  const { blocks, removed } = publishedBlocks(blocs);
  const slug = doc.slug ?? (await uniqueSlug(doc.titre));
  const publishedAt = new Date();
  const heroBlock = blocs.find((b) => b.type === "HERO");
  const heroCover = (heroBlock?.configuration as Record<string, unknown> | undefined)
    ?.photoCouverture;
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
  if (!updated.matchedCount) throw new ServiceError("Portfolio introuvable.");
  const adminIds = await portfolioIntegrations.utilisateursService.listerAdmins();
  await Promise.all([
    notifyPortfolio({
      type: "PORTFOLIO_PUBLIE",
      destinataireId: doc.proprietaire.toString(),
      cible: `/portfolio/${slug}`,
      message: `Votre portfolio « ${doc.titre} » est maintenant publié.`,
    }),
    ...adminIds.map((destinataireId) =>
      notifyPortfolio({
        type: "PORTFOLIO_PUBLIE",
        destinataireId,
        cible: `/portfolio/${slug}`,
        message: `Le portfolio « ${doc.titre} » a été publié par ${doc.proprietaire.toString()}.`,
      }),
    ),
  ]);
  // Sync published portfolio into Elasticsearch in the background
  void syncPortfolioById(String(_id)).catch((err) =>
    console.warn("Elasticsearch sync error on publish:", err),
  );

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
  if (!result.matchedCount) throw new ServiceError("Portfolio introuvable.");

  // Remove from Elasticsearch
  void removePortfolioFromElasticsearch(portfolioObjectId.toString()).catch((err) =>
    console.warn("Elasticsearch remove error on unpublish:", err),
  );
}

export async function deletePortfolio(
  portfolioId: string,
  userId: string,
  allowAdmin = false,
): Promise<void> {
  const portfolioObjectId = await assertPortfolioAccess(portfolioId, userId, allowAdmin);
  await connectDB();
  const result = await Portfolio.deleteOne({ _id: portfolioObjectId });
  if (!result.deletedCount) throw new ServiceError("Portfolio introuvable.");
  await Promise.all([
    PortfolioStats.deleteMany({ portfolioId: portfolioObjectId }),
    DemandeContact.deleteMany({ portfolioId: portfolioObjectId }),
  ]);

  // Remove from Elasticsearch
  void removePortfolioFromElasticsearch(portfolioObjectId.toString()).catch((err) =>
    console.warn("Elasticsearch remove error on delete:", err),
  );
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
  if (!result.matchedCount) throw new ServiceError("Photo du portfolio introuvable.");
}

export async function createContactRequest(input: ContactPortfolioInput): Promise<{ id: string }> {
  if (input.honeypot) throw new ServiceError("Demande de contact invalide.");
  await connectDB();
  const portfolio = await Portfolio.findOne({
    _id: id(input.portfolioId, "Portfolio"),
    statut: "PUBLIE",
  }).lean<PortfolioLean>();
  if (!portfolio) throw new ServiceError("Ce portfolio n’est pas disponible.");
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
    message: `Nouvelle demande de contact portfolio de la part de ${input.nomVisiteur}.`,
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
  if (!result.matchedCount) throw new ServiceError("Demande de contact introuvable.");
}

export type PortfolioContactRequest = {
  id: string;
  nomVisiteur: string;
  email: string;
  telephone?: string;
  typeSeance: string;
  dateSouhaitee?: string;
  lieu?: string;
  budget?: string;
  forfaitDemande?: string;
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
    lieu: request.lieu,
    budget: request.budget,
    forfaitDemande: request.forfaitDemande,
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
  if (!request)
    throw new ServiceError("Demande de contact introuvable ou déjà convertie en séance.");

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
    throw new ServiceError("Cette demande de contact est déjà en cours de traitement.");
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
  if (!result.matchedCount) throw new ServiceError("Élément du portfolio introuvable.");
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
        message: `Un client a retiré son consentement pour une photo du portfolio « ${portfolio.titre} ». La photo a été retirée de la version publiée.`,
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
        photographe: photographer ? `${photographer.prenom} ${photographer.nom}` : "Photographe",
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
  galerie?: string;
  dateAjout?: string;
  scoreQualite: number;
};

export type PhotoQualityCheck = GeminiPhotoAnalysis & { photoId: string };

type GeminiSupportedImageMime = "image/jpeg" | "image/png" | "image/webp";

function geminiSupportedMime(mimeType: string): GeminiSupportedImageMime {
  const normalized = mimeType.toLowerCase().split(";")[0]?.trim();
  if (normalized === "image/jpeg" || normalized === "image/png" || normalized === "image/webp") {
    return normalized;
  }
  throw new ServiceError("Gemini accepte uniquement les images JPEG, PNG ou WebP.");
}

export async function chargerImagePhotoPourGemini(
  userId: string,
  element: ElementBlocPortfolio,
): Promise<{ data: Buffer; mimeType: GeminiSupportedImageMime }> {
  const maxBytes = 20 * 1024 * 1024;
  if (element.photoId && Types.ObjectId.isValid(element.photoId)) {
    const library = await photoLibraryFilter(userId);
    await connectDB();
    const photo = library
      ? await Photo.findOne({ ...library, _id: new Types.ObjectId(element.photoId) }).select(
          "fichier format taille",
        )
      : null;
    if (!photo) throw new ServiceError("Cette photo n’appartient pas à votre bibliothèque.");
    if (photo.taille > maxBytes)
      throw new ServiceError("La photo dépasse la taille maximale de 20 Mo.");
    const file = await openFile(photo.fichier);
    if (!file) throw new ServiceError("Le fichier de la photo est introuvable.");
    return {
      data: Buffer.from(await new Response(file.stream).arrayBuffer()),
      mimeType: geminiSupportedMime(photo.format || file.contentType),
    };
  }

  let url: URL;
  try {
    url = new URL(element.media.url);
  } catch {
    throw new ServiceError("L’image de ce bloc ne peut pas être lue pour l’analyse.");
  }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (
    url.protocol !== "https:" ||
    url.hostname !== "res.cloudinary.com" ||
    !url.pathname.startsWith(`/${cloudName}/image/upload/`)
  ) {
    throw new ServiceError(
      "L’analyse visuelle est disponible pour les photos de la bibliothèque ou Cloudinary.",
    );
  }
  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      redirect: "error",
      cache: "no-store",
    });
  } catch {
    throw new ServiceError("Impossible de récupérer la photo Cloudinary pour l’analyse.");
  }
  if (!response.ok) throw new ServiceError("Cloudinary n’a pas fourni le fichier de la photo.");
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes)
    throw new ServiceError("La photo dépasse la taille maximale de 20 Mo.");
  const data = Buffer.from(await response.arrayBuffer());
  if (!data.length || data.length > maxBytes)
    throw new ServiceError("Le fichier de la photo est vide ou trop volumineux.");
  return {
    data,
    mimeType: geminiSupportedMime(response.headers.get("content-type") ?? ""),
  };
}

/** Analyse jusqu’aux six photos les plus récentes appartenant au photographe connecté. */
export async function analyserQualitePhotosPhotographe(
  userId: string,
  categorie?: CategoriePortfolio,
): Promise<PhotoQualityCheck[]> {
  await connectDB();
  if (!Types.ObjectId.isValid(userId)) throw new ServiceError("Photographe invalide.");
  const galleryIds = categorie ? await Galerie.find({ categorie }).distinct("_id") : undefined;
  if (categorie && !galleryIds?.length) return [];
  const library = await photoLibraryFilter(userId);
  if (!library) return [];
  const query: Record<string, unknown> = galleryIds
    ? { $and: [library, { galerie: { $in: galleryIds } }] }
    : library;
  const photos = await Photo.find(query)
    .select("_id fichier format taille")
    .sort({ createdAt: -1 })
    .limit(MAX_AUTOMATIC_PORTFOLIO_PHOTOS)
    .lean();

  const checks: PhotoQualityCheck[] = [];
  for (let index = 0; index < photos.length; index += 3) {
    const batch = photos.slice(index, index + 3);
    const batchResults = await Promise.all(
      batch.map(async (photo) => {
        if (photo.taille > 20 * 1024 * 1024) {
          throw new ServiceError(`La photo ${photo._id} dépasse la taille analysable de 20 Mo.`);
        }
        const file = await openFile(photo.fichier);
        if (!file) throw new ServiceError(`Fichier introuvable pour la photo ${photo._id}.`);
        const buffer = Buffer.from(await new Response(file.stream).arrayBuffer());
        const analysis = await analyserPhotoAvecGemini(buffer, photo.format || file.contentType);
        await Photo.updateOne(
          { _id: photo._id },
          {
            $set: {
              scoreQualite: analysis.score,
              estFloue: analysis.nettete < 40,
              tagsIA: analysis.defauts.slice(0, 8),
            },
          },
        );
        return { photoId: photo._id.toString(), ...analysis };
      }),
    );
    checks.push(...batchResults);
  }
  return checks;
}

/**
 * Photos offered in the portfolio editor's picker: the user's library from the Photos &
 * Galleries module (see photo-library.ts: every photo for an ADMIN; for a PHOTOGRAPHE the
 * photos they uploaded and those of the galleries of their sessions).
 */
export async function listerPhotosPhotographePourPortfolio(
  userId: string,
): Promise<PhotoPourSelecteur[]> {
  const library = await photoLibraryFilter(userId);
  if (!library) return [];
  await connectDB();

  const photos = await Photo.find(library)
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
      url: `/api/portfolio/media/${id}`,
      urlMiniature: `/api/portfolio/media/${id}?variant=miniature`,
      titre: (p.nomFichier || "Photo").replace(/\.[^/.]+$/, ""),
      client: clientNom || "Galerie client",
      clientId,
      galerie: galerie?.titre,
      dateAjout: p.createdAt ? new Date(p.createdAt).toISOString() : undefined,
      scoreQualite: p.scoreQualite ?? 0,
    };
  });
}
