/**
 * Ready-made cards. Every image is a local decoration and every name, date or venue is a linked field.
 *
 * The five wedding cards are drawn by hand (their ids must not change: they are stored nowhere, but
 * links and tests use them). The other event types get three designs each from invitation.modeles.ts,
 * with their own layout, palette and decorations. Every card carries a QR code to the venue.
 */
import { configEvenement, EVENEMENTS } from "./invitation.evenements";
import { appliquerDetails } from "./invitation.linked";
import { A5, cleTexteFixe, dessiner, image, MODELES, qrLieu, texte, TEXTES_FIXES, type Modele } from "./invitation.modeles";
import {
  POLICES_ARABES,
  TYPES_EVENEMENT,
  type AnimationElement,
  type ContenuInvitation,
  type DetailsInvitation,
  type ElementInvitation,
  type Langue,
  type Police,
  type TypeEvenement,
} from "./invitation.schema";

export type TemplateInvitation = {
  id: string;
  nom: string;
  description: string;
  typeEvenement: TypeEvenement;
  contenu: ContenuInvitation;
};

const details = (langue: Langue, message: string): DetailsInvitation => ({
  nomA: "",
  nomB: "",
  date: "",
  heure: "",
  lieu: "",
  message,
  langue,
});

// ── Default animations ───────────────────────────────────────────────────────

const entree = <T extends AnimationElement["type"]>(type: T, delai: number, duree = 0.9, easing: AnimationElement["easing"] = "DOUCE"): Omit<AnimationElement, "type"> & { type: T } => ({
  type,
  duree,
  delai,
  easing,
  boucle: "AUCUNE",
  dureeBoucle: 3,
});

const SCRIPTS: readonly Police[] = ["Great Vibes", "Dancing Script"];
const NOMS = new Set(["noms", "nomA", "nomB", "titre"]);

/**
 * The entrances of a new card, top to bottom: frames fade in, decorations pop and float, confetti
 * and stars pop and twinkle, handwritten names are revealed like ink, the intro is typed, the
 * details slide in from both sides, the QR code and the countdown pop last. Elements that already
 * have an animation keep it. Deterministic (no randomness). Only the public page plays them.
 */
export function animerParDefaut(contenu: ContenuInvitation): ContenuInvitation {
  const ordre = [...contenu.elements].sort((a, b) => a.y - b.y || a.layer - b.layer).map((e) => e.id);
  const surface = contenu.size.width * contenu.size.height;
  let petits = 0;
  return {
    ...contenu,
    elements: contenu.elements.map((e): ElementInvitation => {
      if (e.animation) return e;
      const rang = ordre.indexOf(e.id);
      const delai = Math.min(4, 0.2 + rang * 0.12);
      const grand = e.width * e.height > surface * 0.35;
      if (e.type === "image") {
        if (grand) return { ...e, animation: entree("FONDU", 0.1, 1.2) };
        return { ...e, animation: { ...entree("ZOOM", delai, 1, "REBOND"), boucle: "FLOTTEMENT", dureeBoucle: 3.5 + (rang % 3) * 0.6 } };
      }
      if (e.type === "shape") {
        if (grand || e.shape === "frame" || e.shape === "arch") return { ...e, animation: entree("FONDU", 0.05, 1.2) };
        if (e.width <= 24 && e.height <= 24) {
          // Confetti and stars: they pop one after the other, then twinkle at their own pace.
          petits += 1;
          return { ...e, animation: { ...entree("ZOOM", Math.min(3, 0.3 + petits * 0.07), 0.6, "REBOND"), boucle: e.shape === "star" ? "SCINTILLEMENT" : "AUCUNE", dureeBoucle: 1.6 + (petits % 5) * 0.4 } };
        }
        if (e.shape === "line") return { ...e, animation: entree("REVELATION", delai, 0.8, "SORTIE") };
        return { ...e, animation: entree("FONDU", delai, 0.9) };
      }
      if (e.type === "text") {
        if (e.linkedTo && NOMS.has(e.linkedTo)) {
          return { ...e, animation: SCRIPTS.includes(e.style.fontFamily) ? entree("REVELATION", delai, 1.6, "SORTIE") : entree("ZOOM", delai, 1, "REBOND") };
        }
        if (e.id === "intro") return { ...e, animation: entree("MACHINE_A_ECRIRE", delai, 1.1, "LINEAIRE") };
        if (e.linkedTo === "message") return { ...e, animation: entree("FONDU", delai, 1.1) };
        if (e.linkedTo === "date" || e.linkedTo === "lieu") return { ...e, animation: entree("GLISSEMENT_GAUCHE", delai, 0.8, "SORTIE") };
        if (e.linkedTo === "heure" || e.linkedTo === "tenue" || e.linkedTo === "contact") return { ...e, animation: entree("GLISSEMENT_DROITE", delai, 0.8, "SORTIE") };
        return { ...e, animation: entree("GLISSEMENT_HAUT", delai) };
      }
      if (e.type === "qrcode") return { ...e, animation: entree("ZOOM", Math.min(4.5, delai + 0.3), 0.7, "REBOND") };
      return { ...e, animation: { ...entree("GLISSEMENT_HAUT", delai, 0.9, "SORTIE"), boucle: "PULSATION", dureeBoucle: 2.4 } } as ElementInvitation;
    }),
  };
}

const carte = (
  color: string,
  elements: ContenuInvitation["elements"],
  d: DetailsInvitation,
  type: TypeEvenement = "MARIAGE",
  scene: Pick<Modele, "ouverture" | "ambiance"> & { couleur?: string } = {},
): ContenuInvitation => {
  const config = EVENEMENTS[type];
  return appliquerDetails(animerParDefaut({
    size: A5,
    background: { color },
    elements,
    details: d,
    typeEvenement: type,
    ouverture: { type: scene.ouverture ?? config.ouverture, couleur: scene.couleur ?? config.palettes[0].principale },
    ambiance: { type: scene.ambiance ?? config.ambiance, densite: 2 },
  }));
};

// ── Hand-made wedding cards ──────────────────────────────────────────────────

const MARIAGES: TemplateInvitation[] = [
  {
    id: "classique",
    nom: "Classic gold",
    description: "Ivory card, thin gold frame, calligraphy names.",
    typeEvenement: "MARIAGE",
    contenu: carte("#fbf7ef", [
      image("cadre", 1, "frame-gold", 16, 16, 388, 563),
      texte("intro", 2, { y: 96, font: "Cormorant Garamond", size: 15, color: "#7a6a4f", text: "Avec leurs familles,", italic: true }),
      texte("noms", 3, { y: 146, font: "Great Vibes", size: 50, color: "#a8843f", linkedTo: "noms" }),
      image("trait", 4, "divider-flourish", 130, 232, 160, 30),
      texte("message", 5, { y: 276, font: "Cormorant Garamond", size: 17, color: "#4a4032", linkedTo: "message", height: 70, x: 60, width: 300 }),
      texte("date", 6, { y: 372, font: "Playfair Display", size: 18, color: "#4a4032", linkedTo: "date" }),
      texte("heure", 7, { y: 406, font: "Playfair Display", size: 16, color: "#7a6a4f", linkedTo: "heure" }),
      texte("lieu", 8, { y: 446, font: "Cormorant Garamond", size: 18, color: "#4a4032", linkedTo: "lieu", height: 52, x: 60, width: 300, bold: true }),
      qrLieu("qr", 9, 182, 502, 56, "#4a4032"),
    ], details("fr", "ont la joie de vous convier à la célébration de leur mariage.")),
  },
  {
    id: "floral",
    nom: "Blush garden",
    description: "Soft pink background with flowers in the corners.",
    typeEvenement: "MARIAGE",
    contenu: carte("#fdf1f0", [
      image("fleurs-haut", 1, "flower-corner", 0, 0, 190, 190),
      image("fleurs-bas", 2, "flower-corner", 420, 595, 190, 190, 180),
      texte("intro", 3, { y: 170, font: "Montserrat", size: 11, color: "#a1616a", text: "SAVE THE DATE", spacing: 4 }),
      texte("noms", 4, { y: 200, font: "Great Vibes", size: 48, color: "#8c3f4d", linkedTo: "noms" }),
      image("coeur", 5, "heart-solid", 195, 272, 30, 30),
      texte("message", 6, { y: 312, font: "Cormorant Garamond", size: 17, color: "#5e3f44", linkedTo: "message", height: 52, x: 70, width: 280, italic: true }),
      texte("date", 7, { y: 376, font: "Playfair Display", size: 17, color: "#5e3f44", linkedTo: "date" }),
      texte("heure", 8, { y: 406, font: "Montserrat", size: 13, color: "#a1616a", linkedTo: "heure" }),
      texte("lieu", 9, { y: 434, font: "Cormorant Garamond", size: 17, color: "#5e3f44", linkedTo: "lieu", height: 48, x: 90, width: 240, bold: true }),
      qrLieu("qr", 10, 182, 494, 56, "#5e3f44"),
    ], details("en", "We would love you to join us as we say I do.")),
  },
  {
    id: "moderne",
    nom: "Modern line",
    description: "White and charcoal, clean type, no flowers.",
    typeEvenement: "MARIAGE",
    contenu: carte("#ffffff", [
      {
        id: "bande", type: "shape", shape: "rect", x: 0, y: 0, width: 420, height: 16, rotation: 0, layer: 1,
        style: { fill: "#25282c", stroke: null, strokeWidth: 0, opacity: 1 },
      },
      texte("intro", 2, { y: 90, font: "Montserrat", size: 11, color: "#6b7078", text: "WE ARE GETTING MARRIED", spacing: 4 }),
      texte("nomA", 3, { y: 136, font: "Playfair Display", size: 44, color: "#25282c", linkedTo: "nomA" }),
      texte("et", 4, { y: 196, font: "Playfair Display", size: 22, color: "#b08d57", text: "&", italic: true }),
      texte("nomB", 5, { y: 228, font: "Playfair Display", size: 44, color: "#25282c", linkedTo: "nomB" }),
      {
        id: "trait", type: "shape", shape: "line", x: 170, y: 310, width: 80, height: 2, rotation: 0, layer: 6,
        style: { fill: null, stroke: "#b08d57", strokeWidth: 2, opacity: 1 },
      },
      texte("message", 7, { y: 330, font: "Montserrat", size: 13, color: "#6b7078", linkedTo: "message", height: 56, x: 60, width: 300 }),
      texte("date", 8, { y: 404, font: "Montserrat", size: 15, color: "#25282c", linkedTo: "date", bold: true }),
      texte("heure", 9, { y: 432, font: "Montserrat", size: 13, color: "#6b7078", linkedTo: "heure" }),
      texte("lieu", 10, { y: 462, font: "Montserrat", size: 14, color: "#25282c", linkedTo: "lieu", height: 48, x: 60, width: 300 }),
      qrLieu("qr", 11, 182, 516, 56, "#25282c"),
    ], details("en", "Please join us for our wedding day.")),
  },
  {
    id: "royal",
    nom: "Royal night",
    description: "Deep navy with an arch and gold lettering.",
    typeEvenement: "MARIAGE",
    contenu: carte("#14213d", [
      image("arche", 1, "frame-arch", 30, 26, 360, 543),
      image("anneaux", 2, "rings", 180, 100, 60, 42),
      texte("noms", 3, { y: 158, font: "Great Vibes", size: 46, color: "#e8c877", linkedTo: "noms", x: 60, width: 300 }),
      texte("message", 4, { y: 240, font: "Cormorant Garamond", size: 17, color: "#e9e5d8", linkedTo: "message", height: 70, x: 80, width: 260 }),
      image("trait", 5, "divider-dots", 170, 322, 80, 14),
      texte("date", 6, { y: 350, font: "Playfair Display", size: 17, color: "#e8c877", linkedTo: "date", x: 60, width: 300 }),
      texte("heure", 7, { y: 382, font: "Montserrat", size: 13, color: "#e9e5d8", linkedTo: "heure", x: 60, width: 300 }),
      texte("lieu", 8, { y: 416, font: "Cormorant Garamond", size: 18, color: "#e9e5d8", linkedTo: "lieu", height: 52, x: 80, width: 260, bold: true }),
      qrLieu("qr", 9, 180, 480, 60, "#14213d"),
    ], details("fr", "vous prient de leur faire l'honneur d'assister à leur mariage.")),
  },
  {
    id: "zaffa",
    nom: "Zaffa",
    description: "Arabic card in green and ivory, floral frame.",
    typeEvenement: "MARIAGE",
    contenu: carte("#f6f1e4", [
      image("cadre", 1, "frame-floral", 14, 14, 392, 567),
      texte("intro", 2, { y: 100, font: "Amiri", size: 20, color: "#2f5d50", text: "بسم الله الرحمن الرحيم" }),
      texte("noms", 3, { y: 150, font: "Amiri", size: 44, color: "#2f5d50", linkedTo: "noms", bold: true, x: 60, width: 300 }),
      image("trait", 4, "divider-flourish", 130, 232, 160, 30),
      texte("message", 5, { y: 274, font: "Cairo", size: 16, color: "#3e4a45", linkedTo: "message", height: 72, x: 70, width: 280 }),
      texte("date", 6, { y: 362, font: "Amiri", size: 19, color: "#2f5d50", linkedTo: "date", x: 60, width: 300 }),
      texte("heure", 7, { y: 398, font: "Cairo", size: 15, color: "#3e4a45", linkedTo: "heure", x: 60, width: 300 }),
      texte("lieu", 8, { y: 430, font: "Amiri", size: 19, color: "#2f5d50", linkedTo: "lieu", height: 56, x: 70, width: 280 }),
      qrLieu("qr", 9, 180, 494, 60, "#2f5d50"),
    ], details("ar", "يتشرفان بدعوتكم لحضور حفل زفافهما.")),
  },
];

// ── The other event types: three designs each (invitation.modeles.ts) ────────

const LANGUE_PAR_DEFAUT: Langue = "en";

function fabriquer(type: Exclude<TypeEvenement, "MARIAGE">): TemplateInvitation[] {
  const config = configEvenement(type);
  const slug = type.toLowerCase().replaceAll("_", "-");
  return MODELES[type].map((modele) => {
    const elements = dessiner(config, modele, LANGUE_PAR_DEFAUT);
    const palette = typeof modele.palette === "number" ? config.palettes[modele.palette] : modele.palette;
    return {
      id: `${slug}-${modele.n}`,
      nom: modele.nom,
      description: modele.description,
      typeEvenement: type,
      contenu: carte(palette.fond, elements, details(LANGUE_PAR_DEFAUT, config.messages[LANGUE_PAR_DEFAUT][modele.ton ?? "formel"]), type, {
        ouverture: modele.ouverture,
        ambiance: modele.ambiance,
        couleur: palette.principale,
      }),
    };
  });
}

export const TEMPLATES: TemplateInvitation[] = [
  ...MARIAGES,
  ...TYPES_EVENEMENT.filter((t): t is Exclude<TypeEvenement, "MARIAGE"> => t !== "MARIAGE").flatMap(fabriquer),
];

export const findTemplate = (id: string) => TEMPLATES.find((t) => t.id === id);

export const templatesDuType = (type: TypeEvenement) => TEMPLATES.filter((t) => t.typeEvenement === type);

/**
 * The card in the language chosen at creation: the message, the intro line and the fixed words of
 * the designs ("Scan for directions"…), Arabic fonts and right alignment for an Arabic card.
 * Hand-written free texts are left alone.
 */
export function adapterLangue(contenu: ContenuInvitation, langue: Langue): ContenuInvitation {
  if (contenu.details.langue === langue) return contenu;
  const config = configEvenement(contenu.typeEvenement ?? "MARIAGE");
  const message = (Object.values(config.messages[contenu.details.langue]) as string[]).includes(contenu.details.message)
    ? config.messages[langue].formel
    : contenu.details.message;
  return appliquerDetails({
    ...contenu,
    details: { ...contenu.details, langue, message },
    elements: contenu.elements.map((e) => {
      if (e.type !== "text") return e;
      const avant = contenu.details.langue;
      const fixe = cleTexteFixe(e.id);
      const text = e.id === "intro" && e.text === config.intro[avant]
        ? config.intro[langue]
        : fixe && e.text === TEXTES_FIXES[fixe][avant] ? TEXTES_FIXES[fixe][langue] : e.text;
      const fontFamily = langue === "ar" && !POLICES_ARABES.includes(e.style.fontFamily) ? config.polices.arabe : e.style.fontFamily;
      // Arabic reads from the right: text blocks set on the left side move their alignment with it.
      const align = langue === "ar" && e.style.align === "left" ? "right" : avant === "ar" && e.style.align === "right" ? "left" : e.style.align;
      return { ...e, text, style: { ...e.style, fontFamily, align } };
    }),
  });
}

/** A template with sample names, for the thumbnails of the picker. */
export function apercuTemplate(template: TemplateInvitation, langue?: Langue): ContenuInvitation {
  const contenu = langue ? adapterLangue(template.contenu, langue) : template.contenu;
  const arabe = contenu.details.langue === "ar";
  const exemple = configEvenement(template.typeEvenement).exemple[arabe ? "arabe" : "latin"];
  return appliquerDetails({
    ...contenu,
    details: {
      ...contenu.details,
      ...exemple,
      date: "2027-06-19",
      heure: "19:00",
      lieu: arabe ? "قصر الياسمين، تونس" : "Jasmine Palace, Tunis",
    },
  });
}
