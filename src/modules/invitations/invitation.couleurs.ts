/**
 * Module : Gestion des Invitations. Color rules, pure so they can be tested and used on both sides:
 * WCAG contrast (QR code, AI palettes) and the ready-made swatches of the color pickers.
 */

const HEX = /^#([0-9a-f]{6})$/i;

export function versRgb(hex: string): [number, number, number] {
  const m = HEX.exec(hex);
  if (!m) return [0, 0, 0];
  const n = Number.parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function versHex([r, g, b]: [number, number, number]): string {
  const c = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** WCAG 2 relative luminance, from 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const [r, g, b] = versRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, from 1 (same color) to 21 (black on white). */
export function contraste(a: string, b: string): number {
  const [clair, fonce] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (clair + 0.05) / (fonce + 0.05);
}

/** Mixes a color toward black (t < 0) or white (t > 0), t in [-1, 1]. */
export function nuancer(hex: string, t: number): string {
  const cible = t < 0 ? 0 : 255;
  const k = Math.abs(t);
  return versHex(versRgb(hex).map((v) => v + (cible - v) * k) as [number, number, number]);
}

/**
 * Makes `texte` readable on `fond`: darkens it on a light background, lightens it on a dark one,
 * step by step, until the ratio is reached (or black / white).
 */
export function assurerContraste(texte: string, fond: string, minimum: number): string {
  if (contraste(texte, fond) >= minimum) return texte;
  const versFonce = luminance(fond) > 0.35;
  for (let i = 1; i <= 10; i++) {
    const essai = nuancer(texte, versFonce ? -i / 10 : i / 10);
    if (contraste(essai, fond) >= minimum) return essai;
  }
  return versFonce ? "#000000" : "#ffffff";
}

export type ControleQr = {
  /** Readable as it is. */
  ok: boolean;
  /** Refused by the schema: the colors must change. */
  bloquant: boolean;
  avertissements: string[];
};

/**
 * Rules for a printed or on-screen QR code: dark modules on a lighter background, a contrast of
 * at least 3 (4.5 advised), a quiet zone of at least 2 modules (4 advised) and a minimum size.
 */
export function controlerQr(
  qr: { couleur: string; fond: string; marge: number; taille: number },
  regles = { contrasteMin: 3, contrasteConseille: 4.5, tailleMin: 48, tailleConseillee: 72 },
): ControleQr {
  const avertissements: string[] = [];
  let bloquant = false;
  const ratio = contraste(qr.couleur, qr.fond);
  if (ratio < regles.contrasteMin) {
    bloquant = true;
    avertissements.push("The colors are too close: phones will not read this code.");
  } else if (ratio < regles.contrasteConseille) {
    avertissements.push("The code is rather pale: a darker color reads better.");
  }
  if (luminance(qr.couleur) > luminance(qr.fond)) {
    avertissements.push("Light modules on a dark background are not read by every phone.");
  }
  if (qr.taille < regles.tailleMin) {
    bloquant = true;
    avertissements.push("The code is too small to be scanned.");
  } else if (qr.taille < regles.tailleConseillee) {
    avertissements.push("The code is small: make it at least 2.5 cm wide on the printed card.");
  }
  if (qr.marge < 4) avertissements.push("Keep a white margin around the code: 4 squares is the standard.");
  return { ok: avertissements.length === 0, bloquant, avertissements };
}

/** Swatches offered next to every color picker of the editor. */
export const NUANCIERS: { nom: string; couleurs: string[] }[] = [
  { nom: "Gold", couleurs: ["#fbf7ef", "#e8c877", "#a8843f", "#7a6a4f", "#4a4032"] },
  { nom: "Blush", couleurs: ["#fdf1f0", "#e8c9c9", "#a1616a", "#8c3f4d", "#5e3f44"] },
  { nom: "Garden", couleurs: ["#f4f6ee", "#c9d6b8", "#8a9a5b", "#2f5d50", "#1f3b33"] },
  { nom: "Night", couleurs: ["#14213d", "#25385e", "#e9e5d8", "#e8c877", "#fca311"] },
  { nom: "Party", couleurs: ["#fff7e6", "#ffb703", "#fb8500", "#e63946", "#219ebc"] },
  { nom: "Baby", couleurs: ["#f6f9fc", "#cde4f5", "#f9d6e0", "#fff1c1", "#7a8ca5"] },
  { nom: "Corporate", couleurs: ["#ffffff", "#e9edf2", "#5b6b7f", "#1d3557", "#25282c"] },
];
