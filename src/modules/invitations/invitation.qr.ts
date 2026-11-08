/**
 * Module : Gestion des Invitations. QR code of the card, built with `qrcode` (QRCode.create is
 * synchronous): the stage draws the modules as squares, so the code stays sharp in the 300 dpi export.
 */
import QRCode from "qrcode";
import { controlerQr, type ControleQr } from "./invitation.couleurs";
import { lienGoogleMaps } from "./invitation.lieu";
import {
  QR_CONTRASTE_CONSEILLE,
  QR_CONTRASTE_MIN,
  QR_TAILLE_CONSEILLEE,
  QR_TAILLE_MIN,
  type DetailsInvitation,
  type ElementQr,
} from "./invitation.schema";

export type MatriceQr = { taille: number; noir: (ligne: number, colonne: number) => boolean };

const cache = new Map<string, MatriceQr>();

/** Error correction "M" (15 %): a good balance between size and resistance to a smudge on print. */
export function matriceQr(texte: string): MatriceQr {
  const connue = cache.get(texte);
  if (connue) return connue;
  const { modules } = QRCode.create(texte, { errorCorrectionLevel: "M" });
  const matrice: MatriceQr = { taille: modules.size, noir: (l, c) => !!modules.get(l, c) };
  if (cache.size > 50) cache.clear();
  cache.set(texte, matrice);
  return matrice;
}

/** What the code opens. Null while the venue is unknown: the stage then draws a placeholder. */
export function texteQr(element: Pick<ElementQr, "cible">, details: DetailsInvitation): string | null {
  return element.cible === "CARTE" ? lienGoogleMaps(details) : null;
}

export function controleElementQr(element: ElementQr): ControleQr {
  return controlerQr(
    { couleur: element.style.couleur, fond: element.style.fond, marge: element.style.marge, taille: Math.min(element.width, element.height) },
    { contrasteMin: QR_CONTRASTE_MIN, contrasteConseille: QR_CONTRASTE_CONSEILLE, tailleMin: QR_TAILLE_MIN, tailleConseillee: QR_TAILLE_CONSEILLEE },
  );
}
