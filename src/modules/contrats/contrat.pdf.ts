import "server-only";
/**
 * Module : Contrats & Blockchain · Responsable : Yosser Rafrafi
 * Génération PDF avec pdf-lib — même style que facturation.pdf.ts.
 * Supporte les modes CHAMPS (structuré) et LIBRE (texte brut).
 */
import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import { WORDMARK_PATH, WORDMARK_VIEWBOX } from "@/components/shared/logo-paths";
import type { ContratDTO } from "./contrat.types";

// ── Palette ───────────────────────────────────────────────────────────────────

const hex = (value: string): RGB => {
  const n = parseInt(value.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
const C = {
  ink: hex("#0a0a0a"),
  bone: hex("#f2efe9"),
  gold: hex("#c9a96e"),
  goldDark: hex("#806128"),
  slate: hex("#3a3733"),
  gray: hex("#8a867e"),
  border: hex("#e2ded6"),
  surface: hex("#f8f6f2"),
  success: hex("#136b43"),
};

const STUDIO = {
  nom: "ReFrame",
  tagline: "PHOTOGRAPHY STUDIO",
  adresse: "Rue du Lac Léman, Les Berges du Lac, 1053 Tunis",
  contact: "+216 70 000 000  ·  contact@reframe.tn",
};

const A4 = { w: 595.28, h: 841.89 };
const M = 48;

type Fonts = { regular: PDFFont; bold: PDFFont };

function safe(text: string): string {
  return text
    .replace(/[   ]/g, " ")
    .replace(/[^\x20-\x7e\xa1-\xff\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u2026\u20ac]/g, "?");
}

function drawSpaced(
  page: PDFPage,
  text: string,
  o: { x: number; y: number; size: number; font: PDFFont; color: RGB; spacing?: number },
) {
  if (!o.spacing) {
    page.drawText(text, { x: o.x, y: o.y, size: o.size, font: o.font, color: o.color });
    return;
  }
  let x = o.x;
  for (const ch of text) {
    page.drawText(ch, { x, y: o.y, size: o.size, font: o.font, color: o.color });
    x += o.font.widthOfTextAtSize(ch, o.size) + o.spacing;
  }
}

class Writer {
  page: PDFPage;
  y: number;

  constructor(
    private doc: PDFDocument,
    readonly fonts: Fonts,
    private titre: string,
    private reference: string,
  ) {
    this.page = this.newPage();
    this.y = A4.h - 150;
  }

  private newPage(): PDFPage {
    const page = this.doc.addPage([A4.w, A4.h]);
    page.drawRectangle({ x: 0, y: A4.h - 112, width: A4.w, height: 112, color: C.ink });
    const scale = 22 / Number(WORDMARK_VIEWBOX.split(" ")[3]);
    page.drawSvgPath(WORDMARK_PATH, { x: M, y: A4.h - 40, scale, color: C.bone });
    drawSpaced(page, STUDIO.tagline, {
      x: M, y: A4.h - 78, size: 7, font: this.fonts.regular, color: C.gold, spacing: 2.6,
    });
    // Section label "CONTRACT" top right
    const titleSize = 20;
    const label = safe(this.titre.length > 28 ? this.titre.slice(0, 26) + "…" : this.titre);
    const titleW = this.fonts.bold.widthOfTextAtSize(label, titleSize) + label.length * 3;
    drawSpaced(page, label, {
      x: A4.w - M - titleW, y: A4.h - 58, size: titleSize, font: this.fonts.bold, color: C.bone, spacing: 3,
    });
    const refW = this.fonts.regular.widthOfTextAtSize(this.reference, 10);
    page.drawText(this.reference, {
      x: A4.w - M - refW, y: A4.h - 78, size: 10, font: this.fonts.regular, color: C.gold,
    });
    page.drawRectangle({ x: 0, y: A4.h - 115, width: A4.w, height: 3, color: C.gold });
    this.footer(page);
    return page;
  }

  private footer(page: PDFPage) {
    page.drawLine({ start: { x: M, y: 52 }, end: { x: A4.w - M, y: 52 }, thickness: 0.6, color: C.gold });
    page.drawText(safe(`${STUDIO.nom}  ·  ${STUDIO.adresse}`), {
      x: M, y: 38, size: 7.5, font: this.fonts.regular, color: C.gray,
    });
    page.drawText(safe(STUDIO.contact), {
      x: M, y: 27, size: 7.5, font: this.fonts.regular, color: C.gray,
    });
    const count = this.doc.getPageCount();
    const label = `${this.reference}  ·  page ${count}`;
    page.drawText(label, {
      x: A4.w - M - this.fonts.regular.widthOfTextAtSize(label, 7.5), y: 27,
      size: 7.5, font: this.fonts.regular, color: C.gray,
    });
  }

  ensure(needed: number) {
    if (this.y - needed < 80) {
      this.page = this.newPage();
      this.y = A4.h - 150;
    }
  }

  text(
    value: string,
    x: number,
    opts: { size?: number; bold?: boolean; color?: RGB; right?: boolean; spacing?: number } = {},
  ) {
    const size = opts.size ?? 9.5;
    const font = opts.bold ? this.fonts.bold : this.fonts.regular;
    const str = safe(value);
    const width = font.widthOfTextAtSize(str, size) + (opts.spacing ?? 0) * str.length;
    drawSpaced(this.page, str, {
      x: opts.right ? x - width : x,
      y: this.y,
      size,
      font,
      color: opts.color ?? C.slate,
      spacing: opts.spacing,
    });
  }

  wrap(value: string, width: number, size = 9.5, bold = false): string[] {
    const font = bold ? this.fonts.bold : this.fonts.regular;
    const lines: string[] = [];
    for (const paragraph of safe(value).split("\n")) {
      let line = "";
      for (const word of paragraph.split(" ")) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
        else { if (line) lines.push(line); line = word; }
      }
      lines.push(line);
    }
    return lines;
  }

  label(value: string, x: number) {
    this.text(value.toUpperCase(), x, { size: 7, bold: true, color: C.goldDark, spacing: 1.4 });
  }

  rule(color = C.border, thickness = 0.6) {
    this.page.drawLine({
      start: { x: M, y: this.y }, end: { x: A4.w - M, y: this.y }, thickness, color,
    });
  }

  band(height: number, color: RGB, x = M, width = A4.w - 2 * M) {
    this.page.drawRectangle({ x, y: this.y - height + 12, width, height, color });
  }
}

function parties(w: Writer, contrat: ContratDTO) {
  const right = A4.w / 2 + 10;
  w.label("Studio", M);
  w.label("Client", right);
  w.y -= 15;
  w.text(STUDIO.nom, M, { bold: true, size: 11, color: C.ink });
  w.text(`${contrat.client.prenom} ${contrat.client.nom}`.trim(), right, { bold: true, size: 11, color: C.ink });
  w.y -= 13;
  w.text(STUDIO.adresse, M, { size: 8.5 });
  w.text(contrat.client.email, right, { size: 8.5 });
  w.y -= 28;

  const dateStr = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(contrat.createdAt));
  w.band(40, C.bone);
  const cols = (A4.w - 2 * M) / 3;
  w.label("Reference", M + 12);
  w.label("Date", M + 12 + cols);
  w.label("Status", M + 12 + cols * 2);
  w.y -= 14;
  w.text(contrat.reference, M + 12, { bold: true, size: 9.5, color: C.ink });
  w.text(dateStr, M + 12 + cols, { bold: true, size: 9.5, color: C.ink });
  w.text("CONTRACT", M + 12 + cols * 2, { bold: true, size: 9.5, color: C.ink });
  w.y -= 34;
}

function section(w: Writer, heading: string, content: string) {
  w.ensure(50);
  w.band(22, C.ink);
  w.y -= 5;
  w.text(heading, M + 10, { size: 8.5, bold: true, color: C.bone, spacing: 0.8 });
  w.y -= 22;
  const lines = w.wrap(content, A4.w - 2 * M - 20, 9.5);
  for (const line of lines) {
    w.ensure(16);
    w.text(line, M + 10, { color: C.slate });
    w.y -= 14;
  }
  w.y -= 10;
}

function signatureBlock(w: Writer, contrat: ContratDTO) {
  w.ensure(120);
  w.y -= 10;
  w.rule(C.gold);
  w.y -= 20;

  const half = (A4.w - 2 * M) / 2 - 10;
  w.label("Studio signature", M);
  w.label("Client signature", M + half + 20);
  w.y -= 15;
  w.text("ReFrame Studio", M, { bold: true, color: C.ink });
  w.text(`${contrat.client.prenom} ${contrat.client.nom}`.trim(), M + half + 20, { color: C.ink });
  w.y -= 40;
  w.page.drawLine({ start: { x: M, y: w.y }, end: { x: M + half, y: w.y }, thickness: 0.6, color: C.border });
  w.page.drawLine({ start: { x: M + half + 20, y: w.y }, end: { x: A4.w - M, y: w.y }, thickness: 0.6, color: C.border });
  w.y -= 15;

  if (contrat.blockchain) {
    w.ensure(40);
    w.y -= 8;
    w.label("Blockchain certificate", M);
    w.y -= 12;
    w.text(`SHA-256: ${contrat.blockchain.sha256}`, M, { size: 7, color: C.gray });
    w.y -= 11;
    if (contrat.blockchain.txHash) {
      w.text(`TX: ${contrat.blockchain.txHash}`, M, { size: 7, color: C.gray });
      w.y -= 11;
    }
    w.text("Verify at: /verifier-contrat", M, { size: 7, color: C.gold });
  }
}

async function create(contrat: ContratDTO) {
  const doc = await PDFDocument.create();
  const [regular, bold] = await Promise.all([
    doc.embedFont(StandardFonts.Helvetica),
    doc.embedFont(StandardFonts.HelveticaBold),
  ]);
  doc.setTitle(safe(contrat.titre));
  doc.setAuthor(STUDIO.nom);
  doc.setCreationDate(new Date(contrat.createdAt));
  return { doc, fonts: { regular, bold } };
}

/**
 * Generate a contract PDF (modes CHAMPS and LIBRE).
 * Returns a Uint8Array suitable for GridFS storage.
 */
export async function renderContratPdf(contrat: ContratDTO): Promise<Uint8Array> {
  const { doc, fonts } = await create(contrat);
  const w = new Writer(doc, fonts, contrat.titre, contrat.reference);

  parties(w, contrat);

  if (contrat.modeCreation === "CHAMPS" && contrat.contenu?.champs) {
    const ch = contrat.contenu.champs;
    if (ch.dateSeance || ch.lieuSeance) {
      const detail = [ch.dateSeance && `Date: ${ch.dateSeance}`, ch.lieuSeance && `Location: ${ch.lieuSeance}`]
        .filter(Boolean).join("   ·   ");
      section(w, "Session Details", detail);
    }
    section(w, "Services & Deliverables", ch.prestations);
    if (ch.montantTTC !== undefined) {
      section(w, "Amount (incl. VAT)", `${ch.montantTTC.toLocaleString("fr-TN", { minimumFractionDigits: 3 })} TND`);
    }
    if (ch.conditionsAnnulation) section(w, "Cancellation Terms", ch.conditionsAnnulation);
    if (ch.delaiLivraison) section(w, "Delivery", ch.delaiLivraison);
    if (ch.clausesSupplementaires) section(w, "Additional Clauses", ch.clausesSupplementaires);
  } else if (contrat.modeCreation === "LIBRE" && contrat.contenu?.texteLibre) {
    section(w, "Contract Terms", contrat.contenu.texteLibre);
  }

  signatureBlock(w, contrat);
  return doc.save();
}
