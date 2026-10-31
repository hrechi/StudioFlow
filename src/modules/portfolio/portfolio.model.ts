import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  CATEGORIES_PORTFOLIO,
  MISES_EN_PAGE,
  RESEAUX_SOCIAUX,
  ROLES_ELEMENT,
  SOURCES_MEDIA,
  STATUTS_CONSENTEMENT,
  STATUTS_DEMANDE,
  STATUTS_PORTFOLIO,
  THEMES_PORTFOLIO,
  TYPES_BLOC,
  VISIBILITES,
} from "./portfolio.types";
import type { BlocPortfolio } from "./portfolio.types";

export type PortfolioDocument = {
  proprietaire: Types.ObjectId;
  slug?: string;
  titre: string;
  slogan?: string;
  bio?: string;
  bioGenereeIA: boolean;
  photoCouverture: string;
  specialites: (typeof CATEGORIES_PORTFOLIO)[number][];
  ville?: string;
  theme: (typeof THEMES_PORTFOLIO)[number];
  couleurAccent: string;
  filigrane: boolean;
  seo: { metaTitre: string; metaDescription: string; imageOG?: string };
  liensSociaux: { reseau: (typeof RESEAUX_SOCIAUX)[number]; url: string }[];
  blocs: BlocPortfolio[];
  blocsPublies: BlocPortfolio[];
  statut: (typeof STATUTS_PORTFOLIO)[number];
  visibilite: (typeof VISIBILITES)[number];
  nombreVues: number;
  noteMoyenne?: number;
  nombreAvis?: number;
  avisVisiteurs?: {
    note: number;
    auteur?: string;
    commentaire?: string;
    date: Date;
  }[];
  datePublication?: Date;
  dateCreation: Date;
  dateModification: Date;
};

const elementSchema = new Schema(
  {
    idElement: { type: Schema.Types.ObjectId, required: true },
    source: { type: String, enum: SOURCES_MEDIA, required: true },
    photoId: { type: Schema.Types.ObjectId },
    clientConcerne: { type: Schema.Types.ObjectId },
    media: {
      url: { type: String, required: true },
      urlMiniature: { type: String, required: true },
      largeur: { type: Number, required: true, min: 1 },
      hauteur: { type: Number, required: true, min: 1 },
      publicId: { type: String, required: true, trim: true },
    },
    titre: { type: String, trim: true, maxlength: 160 },
    legende: { type: String, trim: true, maxlength: 1000 },
    legendeGenereeIA: { type: Boolean, default: false },
    texteAlt: { type: String, trim: true, maxlength: 300 },
    texteAltGenereeIA: { type: Boolean, default: false },
    ordreAffichage: { type: Number, min: 0, required: true },
    estMisEnAvant: { type: Boolean, default: false },
    role: { type: String, enum: ROLES_ELEMENT, default: "NORMAL" },
    paire: { type: Number, min: 1 },
    statutConsentement: { type: String, enum: STATUTS_CONSENTEMENT, default: "NON_REQUIS" },
    dateConsentement: Date,
    nombreLikes: { type: Number, min: 0, default: 0 },
    dateAjout: { type: Date, required: true },
  },
  { _id: false },
);

const blocSchema = new Schema(
  {
    idBloc: { type: Schema.Types.ObjectId, required: true },
    type: { type: String, enum: TYPES_BLOC, required: true },
    ordre: { type: Number, min: 0, required: true },
    visible: { type: Boolean, default: true },
    miseEnPage: { type: String, enum: MISES_EN_PAGE, default: "GRILLE" },
    configuration: { type: Schema.Types.Mixed, required: true },
    elements: { type: [elementSchema], default: [] },
  },
  { _id: false },
);

const portfolioSchema = new Schema<PortfolioDocument>(
  {
    proprietaire: { type: Schema.Types.ObjectId, ref: "Utilisateur", unique: true, required: true },
    slug: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    titre: { type: String, required: true, trim: true, maxlength: 160 },
    slogan: { type: String, trim: true, maxlength: 300 },
    bio: { type: String, trim: true, maxlength: 5000 },
    bioGenereeIA: { type: Boolean, default: false },
    photoCouverture: { type: String, required: true },
    specialites: { type: [String], enum: CATEGORIES_PORTFOLIO, default: [] },
    ville: { type: String, trim: true, maxlength: 120 },
    theme: { type: String, enum: THEMES_PORTFOLIO, default: "MINIMAL" },
    couleurAccent: { type: String, match: /^#[\da-f]{6}$/i, default: "#146BFF" },
    filigrane: { type: Boolean, default: false },
    seo: {
      metaTitre: { type: String, trim: true, maxlength: 160 },
      metaDescription: { type: String, trim: true, maxlength: 320 },
      imageOG: { type: String, trim: true },
    },
    liensSociaux: { type: [{ reseau: { type: String, enum: RESEAUX_SOCIAUX }, url: String }], default: [] },
    blocs: { type: [blocSchema], default: [] },
    blocsPublies: { type: [blocSchema], default: [] },
    statut: { type: String, enum: STATUTS_PORTFOLIO, default: "BROUILLON" },
    visibilite: { type: String, enum: VISIBILITES, default: "PUBLIC" },
    nombreVues: { type: Number, min: 0, default: 0 },
    noteMoyenne: { type: Number, min: 1, max: 5, default: 5 },
    nombreAvis: { type: Number, min: 0, default: 0 },
    avisVisiteurs: {
      type: [
        {
          note: { type: Number, min: 1, max: 5, required: true },
          auteur: { type: String, trim: true, maxlength: 100 },
          commentaire: { type: String, trim: true, maxlength: 1000 },
          date: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    datePublication: Date,
  },
  { timestamps: { createdAt: "dateCreation", updatedAt: "dateModification" }, collection: "portfolios" },
);

portfolioSchema.index({ statut: 1, visibilite: 1, specialites: 1 });
portfolioSchema.index({ ville: 1 });

export const Portfolio: Model<PortfolioDocument> =
  (models.Portfolio as Model<PortfolioDocument> | undefined) ?? model<PortfolioDocument>("Portfolio", portfolioSchema);

export type PortfolioStatsDocument = {
  portfolioId: Types.ObjectId;
  date: Date;
  vues: number;
  visiteursUniques: number;
  clicsContact: number;
};

const statsSchema = new Schema<PortfolioStatsDocument>(
  { portfolioId: { type: Schema.Types.ObjectId, ref: "Portfolio", required: true }, date: { type: Date, required: true }, vues: { type: Number, default: 0 }, visiteursUniques: { type: Number, default: 0 }, clicsContact: { type: Number, default: 0 } },
  { collection: "portfolio_stats" },
);
statsSchema.index({ portfolioId: 1, date: 1 }, { unique: true });
export const PortfolioStats: Model<PortfolioStatsDocument> =
  (models.PortfolioStats as Model<PortfolioStatsDocument> | undefined) ?? model<PortfolioStatsDocument>("PortfolioStats", statsSchema);

export type DemandeContactDocument = {
  portfolioId: Types.ObjectId;
  photographeId: Types.ObjectId;
  nomVisiteur: string;
  email: string;
  telephone?: string;
  typeSeance: string;
  dateSouhaitee?: Date;
  message: string;
  statut: (typeof STATUTS_DEMANDE)[number];
  seanceId?: Types.ObjectId;
  conversionClaim?: string;
  dateCreation: Date;
};
const contactSchema = new Schema<DemandeContactDocument>(
  { portfolioId: { type: Schema.Types.ObjectId, ref: "Portfolio", required: true }, photographeId: { type: Schema.Types.ObjectId, ref: "Utilisateur", required: true }, nomVisiteur: { type: String, required: true, trim: true, maxlength: 120 }, email: { type: String, required: true, lowercase: true, trim: true, maxlength: 320 }, telephone: { type: String, trim: true, maxlength: 40 }, typeSeance: { type: String, enum: CATEGORIES_PORTFOLIO, required: true }, dateSouhaitee: Date, message: { type: String, required: true, trim: true, maxlength: 3000 }, statut: { type: String, enum: STATUTS_DEMANDE, default: "NOUVELLE" }, seanceId: Schema.Types.ObjectId, conversionClaim: { type: String, select: false } },
  { timestamps: { createdAt: "dateCreation", updatedAt: false }, collection: "demandes_contact" },
);
contactSchema.index({ photographeId: 1, statut: 1, dateCreation: -1 });
export const DemandeContact: Model<DemandeContactDocument> =
  (models.DemandeContact as Model<DemandeContactDocument> | undefined) ?? model<DemandeContactDocument>("DemandeContact", contactSchema);
