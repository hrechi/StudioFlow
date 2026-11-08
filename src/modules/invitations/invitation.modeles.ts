/**
 * Module : Gestion des Invitations. The designs of the non-wedding cards.
 *
 * Eleven layouts (medallion, arch, color band, ticket, side column, confetti, starry night, instant
 * photo, double frame, clouds, laurel crown), each drawn for a few event types only, so every type
 * gets three cards that do not look alike, and two types never share the same card. Every card has
 * a QR code to the venue (Google Maps) and the linked fields of its type.
 *
 * Pure data: the templates (invitation.templates.ts) add the details, the animations and the ids.
 */
import { contraste } from "./invitation.couleurs";
import type { ConfigEvenement } from "./invitation.evenements";
import type {
  ChampLie,
  ElementCompte,
  ElementForme,
  ElementImage,
  ElementInvitation,
  ElementQr,
  ElementTexte,
  Langue,
  Palette,
  Police,
  TypeAmbiance,
  TypeEvenement,
  TypeOuverture,
  UnitesCompte,
} from "./invitation.schema";

export const A5 = { width: 420, height: 595 };
const DECO = "/invitations/decorations";

// ── Fixed words printed on the cards, in the three languages ─────────────────

/**
 * A text element whose id is `txt-<key>` (or `txt-<key>-<n>`) holds one of these words: switching
 * the language of the card switches it too (see adapterLangue).
 */
export const TEXTES_FIXES = {
  scan: { fr: "Scannez pour l'itinéraire", en: "Scan for directions", ar: "امسحوا الرمز للوصول" },
  admis: { fr: "INVITATION PERSONNELLE", en: "ADMIT ONE", ar: "دعوة شخصية" },
  date: { fr: "SAVE THE DATE", en: "SAVE THE DATE", ar: "احفظوا التاريخ" },
  compte: { fr: "Plus que", en: "Only", ar: "باقي" },
} as const satisfies Record<string, Record<Langue, string>>;
export type CleTexteFixe = keyof typeof TEXTES_FIXES;

export function cleTexteFixe(id: string): CleTexteFixe | null {
  const cle = /^txt-([a-z]+)/.exec(id)?.[1];
  return cle && cle in TEXTES_FIXES ? (cle as CleTexteFixe) : null;
}

// ── Element builders ─────────────────────────────────────────────────────────

type OptionsTexte = {
  y: number;
  font: Police;
  size: number;
  color: string;
  height?: number;
  x?: number;
  width?: number;
  linkedTo?: ChampLie;
  text?: string;
  bold?: boolean;
  italic?: boolean;
  spacing?: number;
  majuscules?: boolean;
  align?: "left" | "center" | "right";
  rotation?: number;
  ombre?: ElementTexte["style"]["ombre"];
  lineHeight?: number;
};

export function texte(id: string, layer: number, o: OptionsTexte): ElementTexte {
  return {
    id,
    type: "text",
    x: o.x ?? 40,
    y: o.y,
    width: o.width ?? 340,
    height: o.height ?? Math.ceil(o.size * 1.4),
    rotation: o.rotation ?? 0,
    layer,
    text: o.text ?? "",
    linkedTo: o.linkedTo,
    style: {
      fontFamily: o.font,
      fontSize: o.size,
      color: o.color,
      align: o.align ?? "center",
      opacity: 1,
      bold: o.bold ?? false,
      italic: o.italic ?? false,
      letterSpacing: o.spacing ?? 0,
      ...(o.majuscules ? { majuscules: true } : {}),
      ...(o.ombre ? { ombre: o.ombre } : {}),
      ...(o.lineHeight ? { lineHeight: o.lineHeight } : {}),
    },
  };
}

export function image(id: string, layer: number, fichier: string, x: number, y: number, width: number, height: number, rotation = 0, opacity = 1): ElementImage {
  return { id, type: "image", x, y, width, height, rotation, layer, src: `${DECO}/${fichier}.svg`, style: { opacity } };
}

export function forme(
  id: string,
  layer: number,
  shape: ElementForme["shape"],
  boite: { x: number; y: number; w: number; h: number; rotation?: number },
  style: Partial<ElementForme["style"]>,
): ElementForme {
  return {
    id,
    type: "shape",
    shape,
    x: boite.x,
    y: boite.y,
    width: boite.w,
    height: boite.h,
    rotation: boite.rotation ?? 0,
    layer,
    style: { fill: null, stroke: null, strokeWidth: 0, opacity: 1, ...style },
  };
}

/** Dark ink on white: the darkest color of the card when it reads well enough, else near-black. */
export function encreQr(palette: Palette): string {
  const sombre = [palette.secondaire, palette.principale, palette.fond].sort((a, b) => contraste(b, "#ffffff") - contraste(a, "#ffffff"))[0];
  return contraste(sombre, "#ffffff") >= 7 ? sombre : "#1c1c1c";
}

export function qrLieu(id: string, layer: number, x: number, y: number, taille: number, encre: string): ElementQr {
  return {
    id,
    type: "qrcode",
    cible: "CARTE",
    x,
    y,
    width: taille,
    height: taille,
    rotation: 0,
    layer,
    style: { couleur: encre, fond: "#ffffff", marge: 3, opacity: 1 },
  };
}

function compte(id: string, layer: number, boite: { x: number; y: number; w: number; h: number }, font: Police, color: string, fond: string | null, unites: UnitesCompte = "JOURS_HEURES"): ElementCompte {
  return {
    id,
    type: "countdown",
    x: boite.x,
    y: boite.y,
    width: boite.w,
    height: boite.h,
    rotation: 0,
    layer,
    style: { fontFamily: font, fontSize: 18, color, fond, opacity: 1, unites },
  };
}

/** Position of a point given in the frame of an element rotated around its top-left corner. */
function dansRepere(ox: number, oy: number, angle: number, dx: number, dy: number) {
  const r = (angle * Math.PI) / 180;
  return { x: ox + dx * Math.cos(r) - dy * Math.sin(r), y: oy + dx * Math.sin(r) + dy * Math.cos(r) };
}

/** Same scatter on every build (no randomness: the tests and the thumbnails stay stable). */
function semis(n: number, graine: number, zone: (i: number) => { x: number; y: number }, taille: (i: number) => number) {
  return Array.from({ length: n }, (_, i) => {
    const p = zone(i);
    const t = taille(i);
    return { x: Math.round(p.x), y: Math.round(p.y), t: Math.round(t), angle: Math.round(((i * 47 + graine * 13) % 90) - 45) };
  });
}

// ── What a layout receives ───────────────────────────────────────────────────

type Contexte = {
  config: ConfigEvenement;
  palette: Palette;
  langue: Langue;
  icone: string;
  autres: string[];
  /** Third color for confetti and stars. */
  accent: string;
  /** Corner decoration (double frame) or hanging decoration (arch, night). */
  ornement?: string;
};

type Mise = (c: Contexte) => ElementInvitation[];

/** Which linked field is the headline: the title for talks and celebrations, the names otherwise. */
function titres(config: ConfigEvenement): { grand: ChampLie; petit?: ChampLie; long: boolean } {
  const titreRequis = config.requis.includes("titre") && !!config.champs.titre;
  if (titreRequis) return { grand: "titre", petit: config.champs.nomA ? "nomA" : undefined, long: true };
  return { grand: "noms", petit: config.champs.titre ? "titre" : config.champs.hotes ? "hotes" : undefined, long: false };
}

/** The last line: dress code if the type asks for it, else the RSVP contact. */
const ligneFinale = (config: ConfigEvenement): ChampLie | undefined =>
  config.champs.tenue ? "tenue" : config.champs.contact ? "contact" : undefined;

const fixe = (cle: CleTexteFixe, langue: Langue) => TEXTES_FIXES[cle][langue];

// ── Layouts ──────────────────────────────────────────────────────────────────

/** Round medallion with the icon, stars around it; details on the left, QR code on the right. */
const medaillon: Mise = ({ config, palette: p, langue, icone }) => {
  const { titre: pt, texte: px } = config.polices;
  const { grand, petit, long } = titres(config);
  const fin = ligneFinale(config);
  const e: ElementInvitation[] = [
    forme("halo", 1, "ellipse", { x: 118, y: 26, w: 184, h: 184 }, { fill: p.principale, opacity: 0.08 }),
    forme("disque", 2, "ellipse", { x: 140, y: 48, w: 140, h: 140 }, { degrade: { type: "RADIAL", de: p.fond, a: p.principale, angle: 0 }, fill: p.principale, opacity: 0.22 }),
    forme("anneau", 3, "ring", { x: 140, y: 48, w: 140, h: 140 }, { fill: p.principale, epaisseur: 2 }),
    forme("anneau-fin", 4, "ring", { x: 130, y: 38, w: 160, h: 160 }, { fill: p.principale, epaisseur: 1, opacity: 0.5 }),
    image("icone", 5, icone, 170, 78, 80, 80),
    forme("etoile-1", 6, "star", { x: 106, y: 70, w: 16, h: 16 }, { fill: p.principale }),
    forme("etoile-2", 7, "star", { x: 298, y: 54, w: 12, h: 12 }, { fill: p.principale, opacity: 0.7 }),
    forme("etoile-3", 8, "star", { x: 300, y: 168, w: 18, h: 18 }, { fill: p.principale }),
    forme("etoile-4", 9, "star", { x: 112, y: 176, w: 10, h: 10 }, { fill: p.principale, opacity: 0.6 }),
    texte("intro", 10, { y: 214, font: px, size: 12, color: p.secondaire, text: config.intro[langue], spacing: 4, majuscules: true }),
    texte("titre", 11, { y: 236, font: pt, size: long ? 30 : 44, color: p.principale, linkedTo: grand, height: 62, x: 40, width: 340 }),
  ];
  if (petit) e.push(texte("sous-titre", 12, { y: 300, font: px, size: 15, color: p.secondaire, linkedTo: petit, italic: true }));
  e.push(
    forme("trait", 13, "line", { x: 185, y: 330, w: 50, h: 2 }, { stroke: p.principale, strokeWidth: 1.5 }),
    texte("message", 14, { y: 342, font: px, size: 14, color: p.secondaire, linkedTo: "message", height: 54, x: 60, width: 300 }),
    texte("date", 15, { y: 414, font: px, size: 15, color: p.principale, linkedTo: "date", bold: true, x: 44, width: 226, align: "left" }),
    texte("heure", 16, { y: 438, font: px, size: 13, color: p.secondaire, linkedTo: "heure", x: 44, width: 226, align: "left" }),
    texte("lieu", 17, { y: 462, font: px, size: 14, color: p.secondaire, linkedTo: "lieu", bold: true, height: 42, x: 44, width: 226, align: "left" }),
    qrLieu("qr", 18, 290, 410, 84, encreQr(p)),
    texte("txt-scan", 19, { y: 498, font: px, size: 9, color: p.secondaire, text: fixe("scan", langue), x: 272, width: 120 }),
  );
  if (fin) e.push(texte("fin", 20, { y: 530, font: px, size: 11, color: p.secondaire, linkedTo: fin, x: 44, width: 332 }));
  return e;
};

/** A tall arch, optional lanterns hanging from the top, everything centered inside. */
const arche: Mise = ({ config, palette: p, langue, icone, ornement }) => {
  const { titre: pt, texte: px } = config.polices;
  const { grand, petit, long } = titres(config);
  const fin = ligneFinale(config);
  const e: ElementInvitation[] = [
    forme("arche-fond", 1, "arch", { x: 50, y: 34, w: 320, h: 530 }, { fill: p.principale, opacity: 0.07 }),
    forme("arche", 2, "arch", { x: 50, y: 34, w: 320, h: 530 }, { stroke: p.principale, strokeWidth: 2 }),
    forme("arche-fine", 3, "arch", { x: 62, y: 46, w: 296, h: 506 }, { stroke: p.principale, strokeWidth: 0.8, opacity: 0.6 }),
    image("icone", 4, icone, 180, 84, 60, 60),
  ];
  if (ornement) {
    e.push(
      forme("fil-g", 5, "line", { x: 27, y: 0, w: 70, h: 2, rotation: 90 }, { stroke: p.principale, strokeWidth: 1 }),
      image("pendentif-g", 6, ornement, 10, 66, 34, 52),
      forme("fil-d", 7, "line", { x: 395, y: 0, w: 40, h: 2, rotation: 90 }, { stroke: p.principale, strokeWidth: 1 }),
      image("pendentif-d", 8, ornement, 378, 36, 34, 52),
    );
  }
  e.push(texte("intro", 9, { y: 156, font: px, size: 12, color: p.secondaire, text: config.intro[langue], spacing: 3, majuscules: true, x: 80, width: 260 }));
  e.push(texte("titre", 10, { y: 178, font: pt, size: long ? 28 : 40, color: p.principale, linkedTo: grand, height: 62, x: 80, width: 260 }));
  if (petit) e.push(texte("sous-titre", 11, { y: 240, font: px, size: 15, color: p.secondaire, linkedTo: petit, italic: true, x: 80, width: 260 }));
  e.push(
    image("trait", 12, "divider-flourish", 160, 268, 100, 20),
    texte("message", 13, { y: 296, font: px, size: 14, color: p.secondaire, linkedTo: "message", height: 58, x: 90, width: 240 }),
    texte("date", 14, { y: 362, font: px, size: 15, color: p.principale, linkedTo: "date", bold: true, x: 80, width: 260 }),
    texte("heure", 15, { y: 386, font: px, size: 13, color: p.secondaire, linkedTo: "heure", x: 80, width: 260 }),
    texte("lieu", 16, { y: 408, font: px, size: 14, color: p.secondaire, linkedTo: "lieu", bold: true, height: 40, x: 90, width: 240 }),
    qrLieu("qr", 17, 176, 456, 68, encreQr(p)),
    texte("txt-scan", 18, { y: 528, font: px, size: 9, color: p.secondaire, text: fixe("scan", langue), x: 110, width: 200 }),
  );
  if (fin) e.push(texte("fin", 19, { y: 572, font: px, size: 10, color: p.secondaire, linkedTo: fin }));
  return e;
};

/** Gradient band on top with the icons, bold title, QR code next to the details. */
const bandeau: Mise = ({ config, palette: p, langue, icone, autres }) => {
  const { titre: pt, texte: px } = config.polices;
  const { grand, petit, long } = titres(config);
  const fin = ligneFinale(config);
  const degrade = { type: "LINEAIRE" as const, de: p.principale, a: p.secondaire, angle: 135 };
  const e: ElementInvitation[] = [
    forme("bande", 1, "rect", { x: 0, y: 0, w: 420, h: 178 }, { fill: p.principale, degrade }),
    forme("bulle-1", 2, "ellipse", { x: 280, y: -70, w: 210, h: 210 }, { fill: p.fond, opacity: 0.1 }),
    forme("bulle-2", 3, "ellipse", { x: -50, y: 100, w: 130, h: 130 }, { fill: p.fond, opacity: 0.08 }),
    image("icone", 4, icone, 34, 34, 84, 84, -6),
    image("deco-haut", 5, autres[0] ?? icone, 312, 40, 74, 74, 10),
    texte("intro", 6, { y: 138, font: px, size: 12, color: p.fond, text: config.intro[langue], spacing: 5, majuscules: true, bold: true }),
    texte("titre", 7, { y: 200, font: pt, size: long ? 28 : 38, color: p.principale, linkedTo: grand, height: 62, bold: pt === "Montserrat" }),
  ];
  if (petit) e.push(texte("sous-titre", 8, { y: 264, font: px, size: 15, color: p.secondaire, linkedTo: petit }));
  e.push(
    forme("trait", 9, "line", { x: 40, y: 298, w: 340, h: 2 }, { stroke: p.secondaire, strokeWidth: 1, opacity: 0.3 }),
    texte("message", 10, { y: 312, font: px, size: 14, color: p.secondaire, linkedTo: "message", height: 58, x: 50, width: 320 }),
    forme("pastille", 11, "rect", { x: 36, y: 384, w: 4, h: 104 }, { fill: p.principale, cornerRadius: 2 }),
    texte("date", 12, { y: 388, font: px, size: 15, color: p.principale, linkedTo: "date", bold: true, x: 52, width: 220, align: "left" }),
    texte("heure", 13, { y: 414, font: px, size: 13, color: p.secondaire, linkedTo: "heure", x: 52, width: 220, align: "left" }),
    texte("lieu", 14, { y: 440, font: px, size: 14, color: p.secondaire, linkedTo: "lieu", bold: true, height: 44, x: 52, width: 220, align: "left" }),
    qrLieu("qr", 15, 296, 386, 84, encreQr(p)),
    texte("txt-scan", 16, { y: 474, font: px, size: 9, color: p.secondaire, text: fixe("scan", langue), x: 278, width: 120 }),
    forme("bande-bas", 17, "rect", { x: 0, y: 573, w: 420, h: 22 }, { fill: p.principale, degrade }),
  );
  if (fin) e.push(texte("fin", 18, { y: 520, font: px, size: 11, color: p.secondaire, linkedTo: fin }));
  return e;
};

/** An event ticket: notches, a tear line, a barcode, the QR code on the stub. */
const ticket: Mise = ({ config, palette: p, langue, icone }) => {
  const { titre: pt, texte: px } = config.polices;
  const { grand, petit, long } = titres(config);
  const fin = ligneFinale(config);
  const barres = [3, 1, 2, 1, 4, 1, 1, 3, 2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 1, 2];
  let bx = 56;
  const codeBarre = barres.map((l, i) => {
    const b = forme(`barre-${i + 1}`, 30 + i, "rect", { x: bx, y: 516, w: l * 1.6, h: 26 }, { fill: p.secondaire, opacity: 0.75 });
    bx += l * 1.6 + 3;
    return b;
  });
  const e: ElementInvitation[] = [
    forme("ticket", 1, "rect", { x: 30, y: 36, w: 360, h: 523 }, { fill: p.fond, cornerRadius: 20 }),
    forme("encoche-g", 2, "ellipse", { x: 16, y: 386, w: 30, h: 30 }, { fill: p.principale }),
    forme("encoche-d", 3, "ellipse", { x: 374, y: 386, w: 30, h: 30 }, { fill: p.principale }),
    forme("dechirure", 4, "line", { x: 56, y: 400, w: 308, h: 2 }, { stroke: p.secondaire, strokeWidth: 1, opacity: 0.35 }),
    texte("txt-admis", 5, { y: 60, font: px, size: 11, color: p.principale, text: fixe("admis", langue), spacing: 6, bold: true }),
    image("icone", 6, icone, 182, 86, 56, 56),
    texte("intro", 7, { y: 152, font: px, size: 12, color: p.secondaire, text: config.intro[langue], spacing: 3, majuscules: true }),
    texte("titre", 8, { y: 174, font: pt, size: long ? 28 : 38, color: p.principale, linkedTo: grand, height: 60, x: 50, width: 320, bold: pt === "Montserrat" }),
  ];
  if (petit) e.push(texte("sous-titre", 9, { y: 236, font: px, size: 14, color: p.secondaire, linkedTo: petit, italic: true }));
  e.push(
    texte("message", 10, { y: 264, font: px, size: 13, color: p.secondaire, linkedTo: "message", height: 54, x: 60, width: 300 }),
    texte("date", 11, { y: 328, font: px, size: 16, color: p.principale, linkedTo: "date", bold: true }),
    texte("heure", 12, { y: 354, font: px, size: 13, color: p.secondaire, linkedTo: "heure" }),
    texte("lieu", 13, { y: 420, font: px, size: 14, color: p.secondaire, linkedTo: "lieu", bold: true, height: 44, x: 56, width: 210, align: "left" }),
    qrLieu("qr", 14, 290, 414, 78, encreQr(p)),
    texte("txt-scan", 15, { y: 496, font: px, size: 9, color: p.secondaire, text: fixe("scan", langue), x: 270, width: 118 }),
    ...codeBarre,
  );
  if (fin) e.push(texte("fin", 16, { y: 472, font: px, size: 11, color: p.secondaire, linkedTo: fin, x: 56, width: 210, align: "left" }));
  return e;
};

/** A colored column on the left (icons, QR code), the text left-aligned on the right, a countdown. */
const colonne: Mise = ({ config, palette: p, langue, icone, autres, accent }) => {
  const { titre: pt, texte: px } = config.polices;
  const { grand, petit, long } = titres(config);
  const fin = ligneFinale(config);
  const e: ElementInvitation[] = [
    forme("colonne", 1, "rect", { x: 0, y: 0, w: 140, h: 595 }, { fill: p.principale, degrade: { type: "LINEAIRE", de: p.principale, a: p.secondaire, angle: 90 } }),
    forme("rond", 2, "ellipse", { x: 20, y: 40, w: 100, h: 100 }, { fill: p.fond, opacity: 0.16 }),
    image("icone", 3, icone, 34, 54, 72, 72),
    image("deco", 4, autres[0] ?? icone, 40, 196, 60, 60, -8, 0.9),
    forme("etoile-1", 5, "star", { x: 30, y: 300, w: 14, h: 14 }, { fill: accent }),
    forme("etoile-2", 6, "star", { x: 96, y: 336, w: 10, h: 10 }, { fill: accent, opacity: 0.8 }),
    forme("etoile-3", 7, "star", { x: 58, y: 372, w: 18, h: 18 }, { fill: accent }),
    qrLieu("qr", 8, 28, 430, 84, encreQr(p)),
    texte("txt-scan", 9, { y: 518, font: px, size: 9, color: p.fond, text: fixe("scan", langue), x: 10, width: 120 }),
    texte("intro", 10, { y: 56, font: px, size: 11, color: p.principale, text: config.intro[langue], spacing: 4, majuscules: true, bold: true, x: 164, width: 232, align: "left" }),
    texte("titre", 11, { y: 80, font: pt, size: long ? 28 : 34, color: p.principale, linkedTo: grand, height: 96, x: 164, width: 232, align: "left", lineHeight: 1.1 }),
  ];
  if (petit) e.push(texte("sous-titre", 12, { y: 184, font: px, size: 15, color: p.secondaire, linkedTo: petit, italic: true, x: 164, width: 232, align: "left", height: 40 }));
  e.push(
    forme("trait", 13, "rect", { x: 164, y: 230, w: 54, h: 4 }, { fill: p.principale, cornerRadius: 2 }),
    texte("message", 14, { y: 248, font: px, size: 14, color: p.secondaire, linkedTo: "message", height: 92, x: 164, width: 232, align: "left" }),
    texte("date", 15, { y: 354, font: px, size: 16, color: p.principale, linkedTo: "date", bold: true, x: 164, width: 232, align: "left", height: 44 }),
    texte("heure", 16, { y: 400, font: px, size: 13, color: p.secondaire, linkedTo: "heure", x: 164, width: 232, align: "left" }),
    texte("lieu", 17, { y: 424, font: px, size: 14, color: p.secondaire, linkedTo: "lieu", bold: true, height: 44, x: 164, width: 232, align: "left" }),
    compte("compte", 18, { x: 164, y: 498, w: 232, h: 52 }, px, p.principale, null),
  );
  if (fin) e.push(texte("fin", 19, { y: 560, font: px, size: 10, color: p.secondaire, linkedTo: fin, x: 164, width: 232, align: "left" }));
  return e;
};

/** Confetti all around, a big playful title with a pop shadow, a countdown. */
const confettis: Mise = ({ config, palette: p, langue, icone, autres, accent }) => {
  const { titre: pt, texte: px } = config.polices;
  const { grand, petit, long } = titres(config);
  const fin = ligneFinale(config);
  const couleurs = [p.principale, p.secondaire, accent];
  const formes: ElementForme["shape"][] = ["star", "ellipse", "rect", "star", "rect"];
  // Around the edges only: the middle stays readable.
  const points = semis(
    22,
    3,
    (i) => {
      const cote = i % 4;
      const t = ((i * 37) % 100) / 100;
      if (cote === 0) return { x: 14 + t * 380, y: 10 + ((i * 7) % 26) };
      if (cote === 1) return { x: 14 + t * 380, y: 556 + ((i * 5) % 26) };
      if (cote === 2) return { x: 8 + ((i * 3) % 22), y: 140 + t * 380 };
      return { x: 388 + ((i * 3) % 22), y: 140 + t * 380 };
    },
    (i) => 7 + ((i * 5) % 9),
  );
  const pluie = points.map((pt2, i) => {
    const f = formes[i % formes.length];
    return forme(`confetti-${i + 1}`, 1 + i, f, { x: pt2.x, y: pt2.y, w: f === "rect" ? pt2.t * 1.6 : pt2.t, h: f === "rect" ? pt2.t * 0.6 : pt2.t, rotation: pt2.angle }, { fill: couleurs[i % couleurs.length], opacity: 0.9 });
  });
  const e: ElementInvitation[] = [
    ...pluie,
    image("icone", 30, icone, 44, 46, 86, 86, -8),
    image("deco-haut", 31, autres[0] ?? icone, 296, 34, 86, 104, 8),
    texte("intro", 32, { y: 150, font: px, size: 13, color: p.secondaire, text: config.intro[langue], spacing: 3, bold: true, majuscules: true }),
    texte("titre", 33, {
      y: 172,
      font: pt,
      // Handwritten fonts are narrow; capitals (Cinzel…) need a smaller size to stay on one line.
      size: long ? 32 : pt === "Dancing Script" || pt === "Great Vibes" ? 52 : 34,
      color: p.principale,
      linkedTo: grand,
      height: 74,
      bold: pt !== "Dancing Script" && pt !== "Great Vibes",
      ombre: { color: p.secondaire, blur: 0, offsetX: 3, offsetY: 3, opacity: 0.25 },
    }),
  ];
  if (petit) e.push(texte("sous-titre", 34, { y: 248, font: px, size: 17, color: p.secondaire, linkedTo: petit, bold: true }));
  e.push(
    texte("message", 35, { y: 280, font: px, size: 14, color: p.secondaire, linkedTo: "message", height: 54, x: 60, width: 300 }),
    texte("txt-compte", 36, { y: 340, font: px, size: 11, color: p.secondaire, text: fixe("compte", langue), spacing: 2, majuscules: true }),
    compte("compte", 37, { x: 80, y: 358, w: 260, h: 48 }, px, p.principale, null),
    texte("date", 38, { y: 414, font: px, size: 16, color: p.principale, linkedTo: "date", bold: true }),
    texte("heure", 39, { y: 438, font: px, size: 13, color: p.secondaire, linkedTo: "heure" }),
    texte("lieu", 40, { y: 460, font: px, size: 14, color: p.secondaire, linkedTo: "lieu", bold: true, height: 38, x: 60, width: 300 }),
    qrLieu("qr", 41, 104, 500, 64, encreQr(p)),
    texte("txt-scan", 42, { y: 512, font: px, size: 11, color: p.secondaire, text: fixe("scan", langue), x: 180, width: 150, align: "left", bold: true }),
  );
  if (fin) e.push(texte("fin", 43, { y: 534, font: px, size: 10, color: p.secondaire, linkedTo: fin, x: 180, width: 180, align: "left" }));
  return e;
};

/** Night sky: stars that twinkle, a thin gold frame, lanterns hanging from the top. */
const nuit: Mise = ({ config, palette: p, langue, icone, ornement }) => {
  const { titre: pt, texte: px } = config.polices;
  const { grand, petit, long } = titres(config);
  const fin = ligneFinale(config);
  const etoiles = semis(
    18,
    7,
    (i) => ({ x: 40 + ((i * 89) % 340), y: i % 2 ? 30 + ((i * 53) % 110) : 150 + ((i * 131) % 400) * (i % 3 === 0 ? 1 : 0.2) }),
    (i) => 5 + ((i * 7) % 10),
  ).filter((s) => s.x < 140 || s.x > 280 || s.y < 120 || s.y > 560);
  const e: ElementInvitation[] = [
    forme("cadre", 1, "frame", { x: 22, y: 22, w: 376, h: 551 }, { fill: p.principale, epaisseur: 1, opacity: 0.55, cornerRadius: 6 }),
    ...etoiles.map((s, i) => forme(`etoile-${i + 1}`, 2 + i, "star", { x: s.x, y: s.y, w: s.t, h: s.t }, { fill: p.principale, opacity: 0.55 + (i % 3) * 0.15 })),
    image("icone", 30, icone, 175, 44, 70, 70),
  ];
  if (ornement) {
    e.push(
      forme("fil-g", 31, "line", { x: 79, y: 0, w: 74, h: 2, rotation: 90 }, { stroke: p.principale, strokeWidth: 1 }),
      image("pendentif-g", 32, ornement, 62, 72, 34, 52),
      forme("fil-d", 33, "line", { x: 343, y: 0, w: 46, h: 2, rotation: 90 }, { stroke: p.principale, strokeWidth: 1 }),
      image("pendentif-d", 34, ornement, 326, 44, 34, 52),
    );
  }
  e.push(texte("intro", 35, { y: 134, font: px, size: 12, color: p.principale, text: config.intro[langue], spacing: 5, majuscules: true }));
  e.push(texte("titre", 36, { y: 156, font: pt, size: long ? 28 : 42, color: p.principale, linkedTo: grand, height: 64, x: 50, width: 320 }));
  if (petit) e.push(texte("sous-titre", 37, { y: 222, font: px, size: 15, color: p.secondaire, linkedTo: petit, italic: true }));
  e.push(
    image("trait", 38, "divider-dots", 170, 254, 80, 14),
    texte("message", 39, { y: 278, font: px, size: 14, color: p.secondaire, linkedTo: "message", height: 58, x: 70, width: 280 }),
    texte("date", 40, { y: 346, font: px, size: 16, color: p.principale, linkedTo: "date", bold: true }),
    texte("heure", 41, { y: 372, font: px, size: 13, color: p.secondaire, linkedTo: "heure" }),
    texte("lieu", 42, { y: 396, font: px, size: 14, color: p.secondaire, linkedTo: "lieu", bold: true, height: 40, x: 70, width: 280 }),
    qrLieu("qr", 43, 176, 462, 68, encreQr(p)),
    texte("txt-scan", 44, { y: 534, font: px, size: 9, color: p.secondaire, text: fixe("scan", langue) }),
  );
  if (fin) e.push(texte("fin", 45, { y: 438, font: px, size: 11, color: p.secondaire, linkedTo: fin }));
  return e;
};

/** An instant photo held by tape, with the icon inside, small decorations around it. */
const polaroid: Mise = ({ config, palette: p, langue, icone, autres }) => {
  const { titre: pt, texte: px } = config.polices;
  const { grand, petit, long } = titres(config);
  const fin = ligneFinale(config);
  const ox = 112;
  const oy = 40;
  const angle = -4;
  const local = (dx: number, dy: number) => dansRepere(ox, oy, angle, dx, dy);
  const interieur = local(12, 12);
  const pictogramme = local(52, 46);
  const legende = local(0, 184);
  const e: ElementInvitation[] = [
    forme("ombre-photo", 1, "rect", { x: ox + 4, y: oy + 6, w: 196, h: 224, rotation: angle }, { fill: p.secondaire, opacity: 0.12, cornerRadius: 4 }),
    forme("photo", 2, "rect", { x: ox, y: oy, w: 196, h: 224, rotation: angle }, { fill: "#ffffff", stroke: "#e7e2da", strokeWidth: 1, cornerRadius: 4 }),
    forme("photo-fond", 3, "rect", { x: interieur.x, y: interieur.y, w: 172, h: 160, rotation: angle }, { fill: p.principale, opacity: 0.16, degrade: { type: "LINEAIRE", de: p.principale, a: p.fond, angle: 160 } }),
    image("icone", 4, icone, pictogramme.x, pictogramme.y, 92, 92, angle),
    texte("txt-date", 5, { y: legende.y, x: legende.x, width: 196, rotation: angle, font: pt, size: 18, color: p.secondaire, text: fixe("date", langue) }),
    forme("ruban", 6, "rect", { x: 168, y: 26, w: 92, h: 24, rotation: 6 }, { fill: p.principale, opacity: 0.35 }),
    image("deco-1", 7, autres[0] ?? icone, 34, 214, 68, 68, -14),
    image("deco-2", 8, autres[1] ?? autres[0] ?? icone, 318, 190, 66, 66, 12),
    texte("titre", 9, { y: 286, font: pt, size: long ? 30 : 44, color: p.principale, linkedTo: grand, height: 62 }),
  ];
  if (petit) e.push(texte("sous-titre", 10, { y: 350, font: px, size: 15, color: p.secondaire, linkedTo: petit, italic: true }));
  e.push(
    texte("message", 11, { y: 378, font: px, size: 13, color: p.secondaire, linkedTo: "message", height: 52, x: 60, width: 300 }),
    texte("date", 12, { y: 440, font: px, size: 15, color: p.principale, linkedTo: "date", bold: true, x: 48, width: 230, align: "left" }),
    texte("heure", 13, { y: 464, font: px, size: 13, color: p.secondaire, linkedTo: "heure", x: 48, width: 230, align: "left" }),
    texte("lieu", 14, { y: 488, font: px, size: 14, color: p.secondaire, linkedTo: "lieu", bold: true, height: 40, x: 48, width: 230, align: "left" }),
    qrLieu("qr", 15, 298, 436, 78, encreQr(p)),
    texte("txt-scan", 16, { y: 518, font: px, size: 9, color: p.secondaire, text: fixe("scan", langue), x: 280, width: 114 }),
  );
  if (fin) e.push(texte("fin", 17, { y: 540, font: px, size: 11, color: p.secondaire, linkedTo: fin, x: 48, width: 230, align: "left" }));
  return e;
};

/** Two thin frames and a decoration in each corner, very classic. */
const cadreDouble: Mise = ({ config, palette: p, langue, icone, ornement }) => {
  const { titre: pt, texte: px } = config.polices;
  const { grand, petit, long } = titres(config);
  const fin = ligneFinale(config);
  const coin = ornement ?? "geometric-corner";
  const e: ElementInvitation[] = [
    forme("cadre", 1, "frame", { x: 16, y: 16, w: 388, h: 563 }, { fill: p.principale, epaisseur: 1.5, opacity: 0.9 }),
    forme("cadre-fin", 2, "frame", { x: 26, y: 26, w: 368, h: 543 }, { fill: p.principale, epaisseur: 1, opacity: 0.45 }),
    image("coin-1", 3, coin, 12, 12, 104, 104, 0),
    image("coin-2", 4, coin, 408, 12, 104, 104, 90),
    image("coin-3", 5, coin, 408, 583, 104, 104, 180),
    image("coin-4", 6, coin, 12, 583, 104, 104, 270),
    image("icone", 7, icone, 185, 54, 50, 50),
    texte("intro", 8, { y: 118, font: px, size: 15, color: p.secondaire, text: config.intro[langue], italic: true }),
    texte("titre", 9, { y: 142, font: pt, size: long ? 30 : 46, color: p.principale, linkedTo: grand, height: 68, x: 60, width: 300 }),
  ];
  if (petit) e.push(texte("sous-titre", 10, { y: 212, font: px, size: 15, color: p.secondaire, linkedTo: petit, italic: true }));
  e.push(
    image("trait", 11, "divider-flourish", 145, 244, 130, 24),
    texte("message", 12, { y: 280, font: px, size: 14, color: p.secondaire, linkedTo: "message", height: 58, x: 76, width: 268 }),
    texte("date", 13, { y: 350, font: px, size: 16, color: p.principale, linkedTo: "date", bold: true }),
    texte("heure", 14, { y: 376, font: px, size: 13, color: p.secondaire, linkedTo: "heure" }),
    texte("lieu", 15, { y: 400, font: px, size: 14, color: p.secondaire, linkedTo: "lieu", bold: true, height: 40, x: 76, width: 268 }),
    qrLieu("qr", 16, 178, 458, 64, encreQr(p)),
    texte("txt-scan", 17, { y: 526, font: px, size: 9, color: p.secondaire, text: fixe("scan", langue), x: 120, width: 180 }),
  );
  if (fin) e.push(texte("fin", 18, { y: 542, font: px, size: 10, color: p.secondaire, linkedTo: fin, x: 120, width: 180 }));
  return e;
};

/** Soft clouds, a moon and little stars: for babies. */
const nuages: Mise = ({ config, palette: p, langue, icone, autres, accent }) => {
  const { titre: pt, texte: px } = config.polices;
  const { grand, petit } = titres(config);
  const fin = ligneFinale(config);
  const nuage = (n: string, x: number, y: number, s: number, couche: number, couleur: string, opacite: number): ElementForme[] => [
    forme(`${n}-a`, couche, "ellipse", { x, y: y + 12 * s, w: 70 * s, h: 32 * s }, { fill: couleur, opacity: opacite }),
    forme(`${n}-b`, couche + 1, "ellipse", { x: x + 14 * s, y, w: 38 * s, h: 36 * s }, { fill: couleur, opacity: opacite }),
    forme(`${n}-c`, couche + 2, "ellipse", { x: x + 34 * s, y: y + 4 * s, w: 30 * s, h: 30 * s }, { fill: couleur, opacity: opacite }),
  ];
  const e: ElementInvitation[] = [
    ...nuage("nuage-1", 24, 40, 1.3, 1, p.principale, 0.12),
    ...nuage("nuage-2", 250, 150, 1, 4, p.principale, 0.1),
    ...nuage("nuage-3", 30, 470, 0.9, 7, p.principale, 0.1),
    ...nuage("nuage-4", 290, 520, 1.1, 10, p.principale, 0.12),
    image("lune", 13, autres.includes("cloud-moon") ? "cloud-moon" : (autres[0] ?? icone), 292, 26, 96, 96),
    forme("etoile-1", 14, "star", { x: 150, y: 50, w: 14, h: 14 }, { fill: accent }),
    forme("etoile-2", 15, "star", { x: 244, y: 92, w: 10, h: 10 }, { fill: accent, opacity: 0.8 }),
    forme("etoile-3", 16, "star", { x: 60, y: 160, w: 12, h: 12 }, { fill: accent }),
    image("icone", 17, icone, 170, 112, 80, 80, -6),
    texte("intro", 18, { y: 206, font: px, size: 12, color: p.secondaire, text: config.intro[langue], spacing: 4, majuscules: true }),
    texte("titre", 19, { y: 228, font: pt, size: 42, color: p.principale, linkedTo: grand, height: 62 }),
  ];
  if (petit) e.push(texte("sous-titre", 20, { y: 292, font: px, size: 15, color: p.secondaire, linkedTo: petit, italic: true }));
  e.push(
    texte("message", 21, { y: 322, font: px, size: 14, color: p.secondaire, linkedTo: "message", height: 56, x: 60, width: 300 }),
    texte("date", 22, { y: 388, font: px, size: 16, color: p.principale, linkedTo: "date", bold: true }),
    texte("heure", 23, { y: 412, font: px, size: 13, color: p.secondaire, linkedTo: "heure" }),
    texte("lieu", 24, { y: 434, font: px, size: 14, color: p.secondaire, linkedTo: "lieu", bold: true, height: 40, x: 70, width: 280 }),
    qrLieu("qr", 25, 112, 484, 68, encreQr(p)),
    texte("txt-scan", 26, { y: 498, font: px, size: 11, color: p.secondaire, text: fixe("scan", langue), x: 192, width: 140, align: "left", bold: true }),
    image("pieds", 27, autres.includes("baby-footprints") ? "baby-footprints" : icone, 336, 470, 50, 60, 14, 0.8),
  );
  if (fin) e.push(texte("fin", 28, { y: 520, font: px, size: 10, color: p.secondaire, linkedTo: fin, x: 192, width: 140, align: "left" }));
  return e;
};

/** A laurel crown around the icon, a solemn frame, a serif title. */
const couronne: Mise = ({ config, palette: p, langue, icone }) => {
  const { titre: pt, texte: px } = config.polices;
  const { grand, petit, long } = titres(config);
  const e: ElementInvitation[] = [
    forme("cadre", 1, "frame", { x: 20, y: 20, w: 380, h: 555 }, { fill: p.principale, epaisseur: 3 }),
    forme("cadre-fin", 2, "frame", { x: 32, y: 32, w: 356, h: 531 }, { fill: p.principale, epaisseur: 1, opacity: 0.6 }),
    image("laurier", 3, "laurel", 120, 44, 180, 150),
    image("icone", 4, icone, 172, 82, 76, 70),
    texte("intro", 5, { y: 200, font: px, size: 13, color: p.secondaire, text: config.intro[langue], spacing: 6, majuscules: true }),
    texte("titre", 6, { y: 224, font: pt, size: long ? 26 : 32, color: p.principale, linkedTo: grand, height: 54, x: 50, width: 320 }),
  ];
  if (petit) e.push(texte("sous-titre", 7, { y: 280, font: px, size: 15, color: p.secondaire, linkedTo: petit, italic: true, height: 36, x: 60, width: 300 }));
  e.push(
    forme("trait", 8, "line", { x: 160, y: 320, w: 100, h: 2 }, { stroke: p.principale, strokeWidth: 1.5 }),
    texte("message", 9, { y: 334, font: px, size: 14, color: p.secondaire, linkedTo: "message", height: 56, x: 64, width: 292 }),
    texte("date", 10, { y: 398, font: px, size: 16, color: p.principale, linkedTo: "date", bold: true }),
    texte("heure", 11, { y: 422, font: px, size: 13, color: p.secondaire, linkedTo: "heure" }),
    texte("lieu", 12, { y: 444, font: px, size: 14, color: p.secondaire, linkedTo: "lieu", bold: true, height: 40, x: 64, width: 292 }),
    qrLieu("qr", 13, 180, 488, 60, encreQr(p)),
    texte("txt-scan", 14, { y: 550, font: px, size: 9, color: p.secondaire, text: fixe("scan", langue) }),
  );
  return e;
};

const MISES = { medaillon, arche, bandeau, ticket, colonne, confettis, nuit, polaroid, cadreDouble, nuages, couronne } satisfies Record<string, Mise>;
export type NomMise = keyof typeof MISES;

// ── The designs of each event type ───────────────────────────────────────────

export type Modele = {
  /** Suffix of the template id: `<type>-<n>`. */
  n: number;
  nom: string;
  description: string;
  mise: NomMise;
  /** Index in the palettes of the type, or a palette of its own. */
  palette: number | Palette;
  icone?: string;
  autres?: string[];
  ornement?: string;
  accent?: string;
  ouverture?: TypeOuverture;
  ambiance?: TypeAmbiance;
  /** The written message used by default. */
  ton?: "formel" | "chaleureux";
};

export const MODELES: Record<Exclude<TypeEvenement, "MARIAGE">, Modele[]> = {
  FIANCAILLES: [
    { n: 1, nom: "Rose medallion", description: "Blush card, the ring in a medallion, QR code beside the details.", mise: "medaillon", palette: 0, icone: "diamond-ring" },
    { n: 2, nom: "Golden corners", description: "Ivory and gold, a flower in every corner.", mise: "cadreDouble", palette: 1, icone: "rings", ornement: "flower-corner", ouverture: "ENVELOPPE" },
    { n: 3, nom: "Our instant photo", description: "A taped instant photo with champagne and hearts.", mise: "polaroid", palette: { fond: "#fff8f0", principale: "#b5733f", secondaire: "#5b3a29" }, icone: "champagne", autres: ["hearts-duo", "diamond-ring"], ton: "chaleureux", ambiance: "ETINCELLES" },
  ],
  HENNE: [
    { n: 1, nom: "Henna arch", description: "Deep red and gold, an arch and hanging lanterns.", mise: "arche", palette: 0, icone: "henna-hand", ornement: "lantern" },
    { n: 2, nom: "Night of lanterns", description: "Emerald night sky, twinkling stars, lanterns.", mise: "nuit", palette: { fond: "#123b34", principale: "#e8c877", secondaire: "#f3e9d2" }, icone: "mandala", ornement: "lantern", ton: "chaleureux" },
    { n: 3, nom: "Mandala medallion", description: "Ivory and green, a mandala in a gold ring.", mise: "medaillon", palette: 1, icone: "mandala", ambiance: "PETALES" },
  ],
  ANNIVERSAIRE: [
    { n: 1, nom: "Confetti party", description: "Confetti all around, a bold title and a countdown.", mise: "confettis", palette: 0, icone: "cake", autres: ["balloons"], accent: "#ffb703", ton: "chaleureux" },
    { n: 2, nom: "Party ticket", description: "A night-blue ticket with a barcode and the QR code on the stub.", mise: "ticket", palette: 1, icone: "party-hat", ouverture: "ENVELOPPE", ambiance: "ETINCELLES", ton: "chaleureux" },
    { n: 3, nom: "Sweet snapshot", description: "Pastel pink, an instant photo with the cake.", mise: "polaroid", palette: { fond: "#fdf0f5", principale: "#b8336a", secondaire: "#5a3d5c" }, icone: "cake", autres: ["party-hat", "gift"], ambiance: "BALLONS" },
  ],
  NAISSANCE: [
    { n: 1, nom: "Little clouds", description: "Baby blue clouds, a moon and stars.", mise: "nuages", palette: 0, icone: "baby-rattle", autres: ["cloud-moon", "baby-footprints"], accent: "#f2c14e", ton: "chaleureux" },
    { n: 2, nom: "Pink medallion", description: "Soft pink, the rattle in a medallion.", mise: "medaillon", palette: 1, icone: "baby-rattle" },
    { n: 3, nom: "Sage arch", description: "Sage green arch with tiny footprints.", mise: "arche", palette: { fond: "#f3f7ef", principale: "#56724a", secondaire: "#4f5848" }, icone: "baby-footprints", ambiance: "PETALES" },
  ],
  REMISE_DIPLOME: [
    { n: 1, nom: "Laurel crown", description: "Navy and gold, the cap in a laurel crown.", mise: "couronne", palette: 0, icone: "graduation-cap" },
    { n: 2, nom: "Burgundy column", description: "A burgundy column, the diploma and a countdown.", mise: "colonne", palette: 1, icone: "graduation-cap", autres: ["diploma"], accent: "#e8c877" },
    { n: 3, nom: "Gold confetti", description: "Gold confetti, a proud title and a countdown.", mise: "confettis", palette: { fond: "#fffaf0", principale: "#8a6508", secondaire: "#2f2f2f" }, icone: "diploma", autres: ["graduation-cap"], accent: "#7b1e3a", ton: "chaleureux" },
  ],
  ENTREPRISE: [
    { n: 1, nom: "Corporate band", description: "Navy gradient band, clean type, QR code beside the details.", mise: "bandeau", palette: 0, icone: "geometric-corner", autres: ["laurel"] },
    { n: 2, nom: "Gala pass", description: "Charcoal and gold ticket, like a gala pass.", mise: "ticket", palette: 1, icone: "champagne", ouverture: "RIDEAU" },
    { n: 3, nom: "Teal corners", description: "White card, teal frame, geometric corners.", mise: "cadreDouble", palette: { fond: "#f4f6f8", principale: "#0f766e", secondaire: "#334155" }, icone: "star-sparkle", ornement: "geometric-corner" },
  ],
  CONFERENCE: [
    { n: 1, nom: "Speaker column", description: "Dark blue with a cyan column, a countdown to the talk.", mise: "colonne", palette: 0, icone: "microphone", autres: ["lightbulb"], accent: "#ffd166" },
    { n: 2, nom: "Attendee badge", description: "A ticket-style badge with the QR code on the stub.", mise: "ticket", palette: 1, icone: "lightbulb" },
    { n: 3, nom: "Bright band", description: "Orange gradient band, the microphone and the bulb.", mise: "bandeau", palette: { fond: "#fff7ed", principale: "#c2410c", secondaire: "#1f2937" }, icone: "microphone", autres: ["lightbulb"], ambiance: "CONFETTIS" },
  ],
  ANNIVERSAIRE_MARIAGE: [
    { n: 1, nom: "Golden laurels", description: "Ivory and gold, the rings in a laurel crown.", mise: "couronne", palette: 0, icone: "rings" },
    { n: 2, nom: "Starry anniversary", description: "Night blue and gold, twinkling stars.", mise: "nuit", palette: 1, icone: "champagne", ton: "chaleureux" },
    { n: 3, nom: "Ruby medallion", description: "Ruby red, two hearts in a medallion.", mise: "medaillon", palette: { fond: "#fff5f5", principale: "#9f1239", secondaire: "#4c1d24" }, icone: "hearts-duo", ambiance: "PETALES" },
  ],
  FETE_RELIGIEUSE: [
    { n: 1, nom: "Ramadan nights", description: "Deep teal sky, crescent, stars and lanterns.", mise: "nuit", palette: 0, icone: "crescent-star", ornement: "lantern" },
    { n: 2, nom: "Andalusian arch", description: "Ivory and green arch with lanterns.", mise: "arche", palette: 1, icone: "mandala", ornement: "lantern", ton: "chaleureux" },
    { n: 3, nom: "Geometric frame", description: "Ivory and bronze, geometric corners.", mise: "cadreDouble", palette: { fond: "#fbf6ea", principale: "#7a4f16", secondaire: "#3b2f22" }, icone: "crescent-star", ornement: "geometric-corner", ambiance: "ETINCELLES" },
  ],
  CREMAILLERE: [
    { n: 1, nom: "Home snapshot", description: "An instant photo of the house, leaves and keys.", mise: "polaroid", palette: 0, icone: "house", autres: ["leaf-branch", "house-key"], ton: "chaleureux" },
    { n: 2, nom: "Terracotta column", description: "Warm column with the keys and a countdown.", mise: "colonne", palette: 1, icone: "house-key", autres: ["house"], accent: "#e9c46a" },
    { n: 3, nom: "Blue door band", description: "Blue gradient band, house and balloons.", mise: "bandeau", palette: { fond: "#eef4f8", principale: "#28536b", secondaire: "#3d4b55" }, icone: "house", autres: ["balloons"], ambiance: "BALLONS" },
  ],
};

export function paletteModele(config: ConfigEvenement, modele: Modele): Palette {
  return typeof modele.palette === "number" ? (config.palettes[modele.palette] ?? config.palettes[0]) : modele.palette;
}

/** The elements of one design, in the language asked. */
export function dessiner(config: ConfigEvenement, modele: Modele, langue: Langue): ElementInvitation[] {
  const palette = paletteModele(config, modele);
  return MISES[modele.mise]({
    config,
    palette,
    langue,
    icone: modele.icone ?? config.icone,
    autres: modele.autres ?? config.decorations.filter((d) => d !== (modele.icone ?? config.icone)),
    accent: modele.accent ?? palette.principale,
    ornement: modele.ornement,
  });
}
