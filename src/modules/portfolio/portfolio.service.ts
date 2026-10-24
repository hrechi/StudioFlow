import "server-only";
import { Types } from "mongoose";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
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
import type {
  BlocPortfolio,
  BlocPortfolioPublic,
  StatutDemande,
  TypeBloc,
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
  const configKeys: Record<TypeBloc, string[]> = {
    HERO: ["titre", "sousTitre", "texteBouton", "lienBouton"],
    A_PROPOS: ["texte", "anneesExperience"],
    GALERIE: ["titre", "colonnes", "espacement", "categorie"],
    COLLECTION: ["titre", "colonnes", "espacement", "categorie"],
    CASE_STUDY: ["titre", "texte", "date", "lieu"],
    AVANT_APRES: [],
    TEMOIGNAGES: [],
    SERVICES: ["forfaits"],
    STATISTIQUES: ["afficher"],
    VIDEO: ["urlVideo", "titre"],
    CONTACT: ["texteIntro", "typesSeanceProposes"],
  };
  return serializeBlocks(blocks, filigrane).map((block) => ({
    idBloc: block.idBloc,
    type: block.type,
    ordre: block.ordre,
    visible: block.visible,
    miseEnPage: block.miseEnPage,
    configuration: Object.fromEntries(
      configKeys[block.type]
        .filter((key) => key in block.configuration)
        .map((key) => [key, block.configuration[key]]),
    ),
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
  return {
    id: doc._id.toString(),
    proprietaire: doc.proprietaire.toString(),
    photographe,
    slug: doc.slug ?? "",
    titre: doc.titre,
    slogan: doc.slogan,
    bio: doc.bio,
    photoCouverture: doc.filigrane ? applyWatermark(doc.photoCouverture) : doc.photoCouverture,
    specialites: doc.specialites,
    ville: doc.ville,
    theme: doc.theme,
    couleurAccent: doc.couleurAccent,
    filigrane: doc.filigrane,
    seo: doc.seo,
    liensSociaux: doc.liensSociaux,
    blocsPublies: serializePublicBlocks(doc.blocsPublies, doc.filigrane),
    nombreVues: doc.nombreVues,
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
  return blocks.map((block, blockIndex) => ({
    ...block,
    ordre: blockIndex,
    elements: block.elements.map((element, elementIndex) => ({
      ...element,
      ordreAffichage: elementIndex,
    })),
  }));
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
  if (!photoCouverture) throw new ServiceError("A cover image is required.", "photoCouverture");
  if (blocs.filter((block) => block.type === "HERO").length !== 1) {
    throw new ServiceError("A portfolio must contain exactly one HERO block.", "blocs");
  }
  if (!blocs.some((block) => block.elements.length > 0)) {
    throw new ServiceError("At least one block must contain a photo.", "blocs");
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

export async function getOrCreatePortfolioForUser(
  userId: string,
): Promise<PortfolioEditorData> {
  await connectDB();
  const ownerId = id(userId, "Owner");
  let doc = await Portfolio.findOne({ proprietaire: ownerId }).lean<PortfolioLean>();

  if (!doc) {
    const photographe = await portfolioIntegrations.utilisateursService.getUtilisateur(userId);
    const titre = photographe ? `${photographe.prenom} ${photographe.nom}` : "Aurélie Morales";
    const slug = await uniqueSlug(titre);

    const created = await Portfolio.create({
      proprietaire: ownerId,
      slug,
      titre,
      slogan: "Photographe de mariage & portraits intimes",
      bio: "Capturing delicate, candid memories in natural light for more than a decade. Based in south-west France, traveling worldwide for destinations that speak of love and grace.",
      photoCouverture: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80",
      specialites: ["MARIAGE", "PORTRAIT"],
      ville: "Bordeaux",
      theme: "MINIMAL",
      couleurAccent: "#E8A34A",
      filigrane: false,
      seo: { metaTitre: titre, metaDescription: "Photographe de mariage & portraits intimes" },
      liensSociaux: [
        { reseau: "INSTAGRAM", url: "https://instagram.com/aurelie_morales" },
        { reseau: "FACEBOOK", url: "https://facebook.com/aurelie.morales.photo" },
        { reseau: "SITE_WEB", url: "https://studioflow.app" },
      ],
      blocs: INITIAL_DEMO_BLOCKS,
      blocsPublies: [],
      statut: "BROUILLON",
      visibilite: "PUBLIC",
      nombreVues: 0,
      dateCreation: new Date(),
      dateModification: new Date(),
    });
    doc = (await Portfolio.findById(created._id).lean<PortfolioLean>())!;
  }

  const photographe = (await portfolioIntegrations.utilisateursService.getUtilisateur(userId)) || {
    nom: "Morales",
    prenom: "Aurélie",
  };

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
  const photographe = await portfolioIntegrations.utilisateursService.getUtilisateur(
    doc.proprietaire.toString(),
  );
  if (!photographe) return null;
  return toPublic(doc, photographe);
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
      const photographe = await portfolioIntegrations.utilisateursService.getUtilisateur(
        doc.proprietaire.toString(),
      );
      return photographe ? toPublic(doc, photographe) : null;
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
  const updated = await Portfolio.updateOne(
    { _id },
    { $set: { slug, blocs, blocsPublies: blocks, statut: "PUBLIE", datePublication: publishedAt } },
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
