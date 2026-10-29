/**
 * Module : Gestion des Séances · Responsable : Yosser Rafrafi
 * Lieux de prise de vue (cahier §3.12): studios, spots extérieurs, séances sur site.
 * Serializable enums and DTOs shared by server and client code.
 */

export const TYPES_LIEU = ["STUDIO", "EXTERIEUR", "DOMICILE"] as const;
export type TypeLieu = (typeof TYPES_LIEU)[number];

export const typeLieuLabels: Record<TypeLieu, string> = {
  STUDIO: "Studio",
  EXTERIEUR: "Outdoor",
  DOMICILE: "On site",
};

/** Alternative locations offered when the weather (or anything else) rules a place out. */
export const LIEUX_ALTERNATIFS_MAX = 5;

export type LieuRef = {
  id: string;
  nom: string;
  /** Outdoors: the weather applies to sessions held here. */
  exterieur: boolean;
  disponible: boolean;
};

export type LieuDTO = LieuRef & {
  adresse: string;
  description?: string;
  type: TypeLieu;
  /** Number of people; 0 = not specified. */
  capacite: number;
  /** GPS position, needed for the weather forecast of outdoor locations. */
  coordonnees: { latitude: number; longitude: number } | null;
  /** Extra cost (TND) when a session is held here instead of the usual place. */
  coutSupplementaire: number;
  lieuxAlternatifs: LieuRef[];
  /** Sessions linked to this location (any status). */
  nombreSeances: number;
  createdAt: string;
  updatedAt: string;
};
