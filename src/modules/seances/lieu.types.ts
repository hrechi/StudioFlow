/**
 * Module : Gestion des Séances · Responsable : Yosser Rafrafi
 * Types and DTOs for shooting locations (cahier §3.12).
 */
export const TYPES_LIEU = ["STUDIO", "EXTERIEUR", "DOMICILE"] as const;
export type TypeLieu = (typeof TYPES_LIEU)[number];

export const typeLieuLabels: Record<TypeLieu, string> = {
  STUDIO: "Studio",
  EXTERIEUR: "Outdoor",
  DOMICILE: "On site",
};

export const LIEUX_ALTERNATIFS_MAX = 5;

export type LieuRef = {
  id: string;
  nom: string;
  exterieur: boolean;
  disponible: boolean;
};

export type LieuDTO = LieuRef & {
  adresse: string;
  description?: string;
  type: TypeLieu;
  capacite: number;
  coordonnees: { latitude: number; longitude: number } | null;
  coutSupplementaire: number;
  lieuxAlternatifs: LieuRef[];
  nombreSeances: number;
  createdAt: string;
  updatedAt: string;
};
