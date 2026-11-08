/** Browser helpers shared by the stage and the export: loading fonts and images before drawing. */
import type Konva from "konva";
import { estArabe } from "./invitation.linked";
import { POLICES_ARABES, type ContenuInvitation, type ElementTexte, type Police } from "./invitation.schema";

/** Amiri comes second: the Latin fonts have no Arabic letters and must not fall back to a system font. */
export const fontePolice = (police: Police) => (POLICES_ARABES.includes(police) ? police : `${police}, Amiri`);

export function styleTexte(style: ElementTexte["style"]) {
  return {
    fontFamily: fontePolice(style.fontFamily),
    fontSize: style.fontSize,
    fontStyle: [style.italic ? "italic" : "", style.bold ? "bold" : ""].filter(Boolean).join(" ") || "normal",
  };
}

/** Font files are split by alphabet: the sample text tells the browser which ones this card needs. */
export async function chargerPolices(contenu: ContenuInvitation): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const demandes = new Set<string>();
  const textes = contenu.elements.filter((e): e is ElementTexte => e.type === "text");
  for (const { style, text } of textes) {
    const variante = `${style.italic ? "italic " : ""}${style.bold ? "700 " : ""}24px`;
    demandes.add(`${variante}|${style.fontFamily}|${text}`);
    if (estArabe(text) && !POLICES_ARABES.includes(style.fontFamily)) demandes.add(`${variante}|Amiri|${text}`);
  }
  for (const e of contenu.elements) {
    if (e.type === "countdown") demandes.add(`700 24px|${e.style.fontFamily}|0123456789`);
  }
  await Promise.all(
    [...demandes].map((demande) => {
      const [variante, police, texte] = demande.split("|");
      return document.fonts.load(`${variante} "${police}"`, texte || "A").catch(() => []);
    }),
  );
}

const images = new Map<string, Promise<HTMLImageElement>>();
const chargees = new Map<string, HTMLImageElement>();

export const imageChargee = (src: string) => chargees.get(src);

export function chargerImage(src: string): Promise<HTMLImageElement> {
  const existante = images.get(src);
  if (existante) return existante;
  const promesse = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => {
      chargees.set(src, image);
      resolve(image);
    };
    image.onerror = () => {
      images.delete(src);
      reject(new Error(`Image not available: ${src}`));
    };
    image.src = src;
  });
  images.set(src, promesse);
  return promesse;
}

function telecharger(blob: Blob, nom: string) {
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nom;
  lien.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const nomFichier = (titre: string, extension: string) =>
  `${titre.normalize("NFKD").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "invitation"}.${extension}`;

const POINTS_PAR_POUCE = 72;
const DPI_EXPORT = 300;

/**
 * exportInvitation: fonts and images are loaded first, and the selection frame and guides are
 * hidden, so the file holds the card only. Everything drawn is local, so the canvas is never
 * tainted. The card is drawn at 300 dpi; size units are PDF points (A5 = 420 × 595).
 */
async function preparer(contenu: ContenuInvitation) {
  const sources = [contenu.background.image, ...contenu.elements.map((e) => (e.type === "image" ? e.src : undefined))];
  await Promise.all([
    chargerPolices(contenu),
    ...sources.filter((s): s is string => !!s).map(chargerImage),
  ]);
  // Two frames: masked and filtered images redraw once their file is in.
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

export async function exportInvitation(stage: Konva.Stage, contenu: ContenuInvitation, titre: string, format: "png" | "pdf") {
  await preparer(contenu);

  const ui = stage.find(".ui");
  ui.forEach((n) => n.hide());
  let dataUrl: string;
  try {
    const pixelRatio = (contenu.size.width * (DPI_EXPORT / POINTS_PAR_POUCE)) / stage.width();
    dataUrl = stage.toDataURL({ mimeType: "image/png", pixelRatio });
  } finally {
    ui.forEach((n) => n.show());
    stage.batchDraw();
  }
  const octets = await (await fetch(dataUrl)).arrayBuffer();

  if (format === "png") {
    telecharger(new Blob([octets], { type: "image/png" }), nomFichier(titre, "png"));
    return;
  }
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  pdf.setTitle(titre);
  const page = pdf.addPage([contenu.size.width, contenu.size.height]);
  const png = await pdf.embedPng(octets);
  page.drawImage(png, { x: 0, y: 0, width: contenu.size.width, height: contenu.size.height });
  const fichier = await pdf.save();
  telecharger(new Blob([fichier.slice()], { type: "application/pdf" }), nomFichier(titre, "pdf"));
}

const LARGEUR_APERCU = 600;

/**
 * Small picture of the card for link previews (WhatsApp, Messenger…): sent to the server when the
 * card is shared, which frames it for Open Graph. Same rules as the export: guides hidden.
 */
export async function imageApercu(stage: Konva.Stage, contenu: ContenuInvitation): Promise<Blob> {
  await preparer(contenu);
  const ui = stage.find(".ui");
  ui.forEach((n) => n.hide());
  try {
    const canvas = stage.toCanvas({ pixelRatio: LARGEUR_APERCU / stage.width() });
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Preview not available"))), "image/png"),
    );
  } finally {
    ui.forEach((n) => n.show());
    stage.batchDraw();
  }
}
