/** Ready-made cards. Every image is a local decoration and every name, date or venue is a linked field. */
import { appliquerDetails } from "./invitation.linked";
import type {
  ChampLie,
  ContenuInvitation,
  DetailsInvitation,
  ElementImage,
  ElementTexte,
  Langue,
  Police,
} from "./invitation.schema";

export type TemplateInvitation = { id: string; nom: string; description: string; contenu: ContenuInvitation };

const A5 = { width: 420, height: 595 };
const DECO = "/invitations/decorations";

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
};

function texte(id: string, layer: number, o: OptionsTexte): ElementTexte {
  return {
    id,
    type: "text",
    x: o.x ?? 40,
    y: o.y,
    width: o.width ?? 340,
    height: o.height ?? Math.ceil(o.size * 1.4),
    rotation: 0,
    layer,
    text: o.text ?? "",
    linkedTo: o.linkedTo,
    style: {
      fontFamily: o.font,
      fontSize: o.size,
      color: o.color,
      align: "center",
      opacity: 1,
      bold: o.bold ?? false,
      italic: o.italic ?? false,
      letterSpacing: o.spacing ?? 0,
    },
  };
}

function image(id: string, layer: number, fichier: string, x: number, y: number, width: number, height: number, rotation = 0): ElementImage {
  return { id, type: "image", x, y, width, height, rotation, layer, src: `${DECO}/${fichier}.svg`, style: { opacity: 1 } };
}

const details = (langue: Langue, message: string): DetailsInvitation => ({
  nomA: "",
  nomB: "",
  date: "",
  heure: "",
  lieu: "",
  message,
  langue,
});

const carte = (color: string, elements: ContenuInvitation["elements"], d: DetailsInvitation): ContenuInvitation =>
  appliquerDetails({ size: A5, background: { color }, elements, details: d });

export const TEMPLATES: TemplateInvitation[] = [
  {
    id: "classique",
    nom: "Classic gold",
    description: "Ivory card, thin gold frame, calligraphy names.",
    contenu: carte("#fbf7ef", [
      image("cadre", 1, "frame-gold", 16, 16, 388, 563),
      texte("intro", 2, { y: 96, font: "Cormorant Garamond", size: 15, color: "#7a6a4f", text: "Avec leurs familles,", italic: true }),
      texte("noms", 3, { y: 146, font: "Great Vibes", size: 50, color: "#a8843f", linkedTo: "noms" }),
      image("trait", 4, "divider-flourish", 130, 232, 160, 30),
      texte("message", 5, { y: 276, font: "Cormorant Garamond", size: 17, color: "#4a4032", linkedTo: "message", height: 70, x: 60, width: 300 }),
      texte("date", 6, { y: 372, font: "Playfair Display", size: 18, color: "#4a4032", linkedTo: "date" }),
      texte("heure", 7, { y: 406, font: "Playfair Display", size: 16, color: "#7a6a4f", linkedTo: "heure" }),
      texte("lieu", 8, { y: 446, font: "Cormorant Garamond", size: 18, color: "#4a4032", linkedTo: "lieu", height: 52, x: 60, width: 300, bold: true }),
    ], details("fr", "ont la joie de vous convier à la célébration de leur mariage.")),
  },
  {
    id: "floral",
    nom: "Blush garden",
    description: "Soft pink background with flowers in the corners.",
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
    ], details("en", "We would love you to join us as we say I do.")),
  },
  {
    id: "moderne",
    nom: "Modern line",
    description: "White and charcoal, clean type, no flowers.",
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
    ], details("en", "Please join us for our wedding day.")),
  },
  {
    id: "royal",
    nom: "Royal night",
    description: "Deep navy with an arch and gold lettering.",
    contenu: carte("#14213d", [
      image("arche", 1, "frame-arch", 30, 26, 360, 543),
      image("anneaux", 2, "rings", 180, 100, 60, 42),
      texte("noms", 3, { y: 158, font: "Great Vibes", size: 46, color: "#e8c877", linkedTo: "noms", x: 60, width: 300 }),
      texte("message", 4, { y: 240, font: "Cormorant Garamond", size: 17, color: "#e9e5d8", linkedTo: "message", height: 70, x: 80, width: 260 }),
      image("trait", 5, "divider-dots", 170, 322, 80, 14),
      texte("date", 6, { y: 350, font: "Playfair Display", size: 17, color: "#e8c877", linkedTo: "date", x: 60, width: 300 }),
      texte("heure", 7, { y: 382, font: "Montserrat", size: 13, color: "#e9e5d8", linkedTo: "heure", x: 60, width: 300 }),
      texte("lieu", 8, { y: 416, font: "Cormorant Garamond", size: 18, color: "#e9e5d8", linkedTo: "lieu", height: 52, x: 80, width: 260, bold: true }),
    ], details("fr", "vous prient de leur faire l'honneur d'assister à leur mariage.")),
  },
  {
    id: "zaffa",
    nom: "Zaffa",
    description: "Arabic card in green and ivory, floral frame.",
    contenu: carte("#f6f1e4", [
      image("cadre", 1, "frame-floral", 14, 14, 392, 567),
      texte("intro", 2, { y: 100, font: "Amiri", size: 20, color: "#2f5d50", text: "بسم الله الرحمن الرحيم" }),
      texte("noms", 3, { y: 150, font: "Amiri", size: 44, color: "#2f5d50", linkedTo: "noms", bold: true, x: 60, width: 300 }),
      image("trait", 4, "divider-flourish", 130, 232, 160, 30),
      texte("message", 5, { y: 274, font: "Cairo", size: 16, color: "#3e4a45", linkedTo: "message", height: 72, x: 70, width: 280 }),
      texte("date", 6, { y: 362, font: "Amiri", size: 19, color: "#2f5d50", linkedTo: "date", x: 60, width: 300 }),
      texte("heure", 7, { y: 398, font: "Cairo", size: 15, color: "#3e4a45", linkedTo: "heure", x: 60, width: 300 }),
      texte("lieu", 8, { y: 430, font: "Amiri", size: 19, color: "#2f5d50", linkedTo: "lieu", height: 56, x: 70, width: 280 }),
    ], details("ar", "يتشرفون بدعوتكم لحضور حفل زفافهما.")),
  },
];

export const findTemplate = (id: string) => TEMPLATES.find((t) => t.id === id);

/** A template with sample names, for the thumbnails of the picker. */
export function apercuTemplate(template: TemplateInvitation): ContenuInvitation {
  const arabe = template.contenu.details.langue === "ar";
  return appliquerDetails({
    ...template.contenu,
    details: {
      ...template.contenu.details,
      nomA: arabe ? "سارة" : "Sarah",
      nomB: arabe ? "آدم" : "Adam",
      date: "2027-06-19",
      heure: "19:00",
      lieu: arabe ? "قصر الياسمين، تونس" : "Jasmine Palace, Tunis",
    },
  });
}
