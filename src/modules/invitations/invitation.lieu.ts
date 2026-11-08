/**
 * Module : Gestion des Invitations. Links to the venue, pure: Google Maps (also encoded in the QR
 * code), Apple Maps and Waze. Coordinates win when they exist, then the address, then the venue name.
 */
import type { DetailsInvitation } from "./invitation.schema";

type Lieu = Pick<DetailsInvitation, "lieu" | "adresse" | "coordonnees">;

/** Six decimals ≈ 10 cm: more would only lengthen the QR code. */
const coord = (v: number) => String(Math.round(v * 1e6) / 1e6);

/** What the map should search for, or null when nothing is known yet. */
export function requeteLieu(details: Lieu): { type: "coordonnees"; valeur: string } | { type: "texte"; valeur: string } | null {
  if (details.coordonnees) return { type: "coordonnees", valeur: `${coord(details.coordonnees.lat)},${coord(details.coordonnees.lng)}` };
  const texte = details.adresse?.trim() || details.lieu.trim();
  return texte ? { type: "texte", valeur: texte } : null;
}

/** https://www.google.com/maps/search/?api=1&query=<lat,lng or the encoded address> (Google Maps URLs API). */
export function lienGoogleMaps(details: Lieu): string | null {
  const requete = requeteLieu(details);
  if (!requete) return null;
  const query = requete.type === "coordonnees" ? requete.valeur : encodeURIComponent(requete.valeur);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function lienAppleMaps(details: Lieu): string | null {
  const requete = requeteLieu(details);
  if (!requete) return null;
  if (requete.type === "texte") return `https://maps.apple.com/?q=${encodeURIComponent(requete.valeur)}`;
  const nom = details.lieu.trim();
  return `https://maps.apple.com/?ll=${requete.valeur}${nom ? `&q=${encodeURIComponent(nom)}` : ""}`;
}

/**
 * What the map search tries, in order. Nominatim finds nothing as soon as one word is unknown
 * ("Salle Le Pacha, Ennasr" → nothing, "Ennasr" → found), so the text is tried whole, then without
 * its postcode and country, then by dropping the first part (the venue name, rarely mapped) one
 * part at a time. Duplicates and empty texts are removed.
 */
export function variantesRecherche(texte: string): string[] {
  const propre = texte.replace(/\s+/g, " ").trim();
  if (!propre) return [];
  const parties = propre.split(",").map((p) => p.trim()).filter(Boolean);
  const sansBruit = parties.filter((p) => !/^\d{4,5}$/.test(p) && !/^(tunisie|tunisia|تونس)$/i.test(p)).map((p) => p.replace(/\b\d{4}\b/g, "").trim()).filter(Boolean);
  const variantes = [propre, sansBruit.join(", ")];
  for (let i = 1; i < sansBruit.length; i += 1) variantes.push(sansBruit.slice(i).join(", "));
  return [...new Set(variantes.filter((v) => v.length >= 2))].slice(0, 5);
}

export type ResultatLieu = { nom: string; detail: string; lat: number; lng: number };

/** Nominatim answer (format=jsonv2) → results; bad rows are skipped. */
export function lireNominatim(brut: unknown): ResultatLieu[] {
  if (!Array.isArray(brut)) return [];
  return brut.flatMap((r: { lat?: string; lon?: string; name?: string; display_name?: string }) => {
    const lat = Number(r.lat);
    const lng = Number(r.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    const parties = (r.display_name ?? "").split(",").map((p) => p.trim());
    const nom = r.name?.trim() || parties[0] || "Place";
    return [{ nom, detail: parties.filter((p) => p !== nom).slice(0, 4).join(", "), lat, lng }];
  });
}

/** Photon answer (GeoJSON) → results. Photon forgives typos, Nominatim does not. */
export function lirePhoton(brut: unknown): ResultatLieu[] {
  const features = (brut as { features?: unknown[] } | null)?.features;
  if (!Array.isArray(features)) return [];
  return features.flatMap((f) => {
    const { geometry, properties: p = {} } = f as { geometry?: { coordinates?: number[] }; properties?: Record<string, string | undefined> };
    const [lng, lat] = geometry?.coordinates ?? [];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    const nom = p.name || [p.street, p.housenumber].filter(Boolean).join(" ") || p.city || "Place";
    const detail = [p.street && p.name ? p.street : undefined, p.district ?? p.locality, p.city, p.state, p.country].filter((x, i, t) => x && x !== nom && t.indexOf(x) === i).join(", ");
    return [{ nom, detail, lat: lat as number, lng: lng as number }];
  });
}

export function lienWaze(details: Lieu): string | null {
  const requete = requeteLieu(details);
  if (!requete) return null;
  return requete.type === "coordonnees"
    ? `https://waze.com/ul?ll=${requete.valeur}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(requete.valeur)}&navigate=yes`;
}
