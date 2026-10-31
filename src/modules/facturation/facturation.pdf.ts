import "server-only";
import { degrees, PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { WORDMARK_PATH, WORDMARK_VIEWBOX } from "@/components/shared/logo-paths";
import {
  factureTypeLabel,
  modePaiementLabels,
  planPaiementLabels,
  statutDevisConfig,
  statutFactureConfig,
  type Devis,
  type Facture,
} from "./facturation.types";

/** Brand chart (globals.css): ink, bone, champagne gold, warm grays. */
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
  danger: hex("#a12828"),
};

const STUDIO = {
  nom: "ReFrame",
  tagline: "PHOTOGRAPHY STUDIO",
  adresse: "Rue du Lac Léman, Les Berges du Lac, 1053 Tunis",
  contact: "+216 70 000 000  ·  contact@reframe.tn",
};

const A4 = { w: 595.28, h: 841.89 };
const M = 48; // page margin

type Fonts = { regular: PDFFont; bold: PDFFont };

/** Standard PDF fonts only know WinAnsi: replace anything else so a name can never break the export. */
function safe(text: string): string {
  return text
    .replace(/[   ]/g, " ")
    .replace(/[^\x20-\x7e¡-ÿ–—‘’“”•…€]/g, "?");
}

function money(value: number): string {
  return `${safe(new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value))} TND`;
}

function date(iso?: string): string {
  return iso ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(iso)) : "—";
}

/** Letter-spaced text (pdf-lib has no character spacing option): draws one glyph at a time. */
function drawSpaced(page: PDFPage, text: string, o: { x: number; y: number; size: number; font: PDFFont; color: RGB; spacing?: number }) {
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
    private numero: string,
  ) {
    this.page = this.newPage();
    this.y = A4.h - 150;
  }

  private newPage(): PDFPage {
    const page = this.doc.addPage([A4.w, A4.h]);
    // Header band: ink background, bone wordmark, gold accents.
    page.drawRectangle({ x: 0, y: A4.h - 112, width: A4.w, height: 112, color: C.ink });
    // The SVG origin is its top-left corner: y is where the top of the wordmark goes.
    const scale = 22 / Number(WORDMARK_VIEWBOX.split(" ")[3]);
    page.drawSvgPath(WORDMARK_PATH, { x: M, y: A4.h - 40, scale, color: C.bone });
    drawSpaced(page, STUDIO.tagline, { x: M, y: A4.h - 78, size: 7, font: this.fonts.regular, color: C.gold, spacing: 2.6 });
    const titleSize = 20;
    const titleW = this.fonts.bold.widthOfTextAtSize(this.titre, titleSize) + this.titre.length * 3;
    drawSpaced(page, this.titre, { x: A4.w - M - titleW, y: A4.h - 58, size: titleSize, font: this.fonts.bold, color: C.bone, spacing: 3 });
    const numW = this.fonts.regular.widthOfTextAtSize(this.numero, 10);
    page.drawText(this.numero, { x: A4.w - M - numW, y: A4.h - 78, size: 10, font: this.fonts.regular, color: C.gold });
    page.drawRectangle({ x: 0, y: A4.h - 115, width: A4.w, height: 3, color: C.gold });
    this.footer(page);
    return page;
  }

  private footer(page: PDFPage) {
    page.drawLine({ start: { x: M, y: 52 }, end: { x: A4.w - M, y: 52 }, thickness: 0.6, color: C.gold });
    page.drawText(safe(`${STUDIO.nom}  ·  ${STUDIO.adresse}`), { x: M, y: 38, size: 7.5, font: this.fonts.regular, color: C.gray });
    page.drawText(safe(STUDIO.contact), { x: M, y: 27, size: 7.5, font: this.fonts.regular, color: C.gray });
    const count = this.doc.getPageCount();
    const label = `${this.numero}  ·  page ${count}`;
    page.drawText(label, { x: A4.w - M - this.fonts.regular.widthOfTextAtSize(label, 7.5), y: 27, size: 7.5, font: this.fonts.regular, color: C.gray });
  }

  /** Starts a new page when fewer than `needed` points are left above the footer. */
  ensure(needed: number) {
    if (this.y - needed < 80) {
      this.page = this.newPage();
      this.y = A4.h - 150;
    }
  }

  text(value: string, x: number, opts: { size?: number; bold?: boolean; color?: RGB; right?: boolean; spacing?: number } = {}) {
    const size = opts.size ?? 9.5;
    const font = opts.bold ? this.fonts.bold : this.fonts.regular;
    const str = safe(value);
    const width = font.widthOfTextAtSize(str, size) + (opts.spacing ?? 0) * str.length;
    drawSpaced(this.page, str, { x: opts.right ? x - width : x, y: this.y, size, font, color: opts.color ?? C.slate, spacing: opts.spacing });
  }

  /** Splits a string so each line fits `width` at `size`. */
  wrap(value: string, width: number, size = 9.5, bold = false): string[] {
    const font = bold ? this.fonts.bold : this.fonts.regular;
    const lines: string[] = [];
    for (const paragraph of safe(value).split("\n")) {
      let line = "";
      for (const word of paragraph.split(" ")) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate;
        else {
          if (line) lines.push(line);
          line = word;
        }
      }
      lines.push(line);
    }
    return lines;
  }

  label(value: string, x: number) {
    this.text(value.toUpperCase(), x, { size: 7, bold: true, color: C.goldDark, spacing: 1.4 });
  }

  rule(color = C.border, thickness = 0.6) {
    this.page.drawLine({ start: { x: M, y: this.y }, end: { x: A4.w - M, y: this.y }, thickness, color });
  }

  band(height: number, color: RGB, x = M, width = A4.w - 2 * M) {
    this.page.drawRectangle({ x, y: this.y - height + 12, width, height, color });
  }
}

/** Studio / client blocks and the key dates row shared by quotes and invoices. */
function parties(w: Writer, devis: Devis, meta: [string, string][]) {
  const right = A4.w / 2 + 10;
  w.label("From", M);
  w.label("Billed to", right);
  w.y -= 15;
  w.text(STUDIO.nom, M, { bold: true, size: 11, color: C.ink });
  w.text(`${devis.client.prenom} ${devis.client.nom}`.trim(), right, { bold: true, size: 11, color: C.ink });
  w.y -= 13;
  w.text(STUDIO.adresse, M, { size: 8.5 });
  w.text(`Session: ${devis.seance.titre}`, right, { size: 8.5 });
  w.y -= 11;
  w.text(STUDIO.contact, M, { size: 8.5 });
  if (devis.seance.date) w.text(`Session date: ${date(devis.seance.date)}`, right, { size: 8.5 });
  w.y -= 28;

  // Key facts in a bone band.
  w.band(40, C.bone);
  const colW = (A4.w - 2 * M) / meta.length;
  meta.forEach(([k], i) => w.label(k, M + 12 + i * colW));
  w.y -= 14;
  meta.forEach(([, v], i) => w.text(v, M + 12 + i * colW, { bold: true, size: 9.5, color: C.ink }));
  w.y -= 34;
}

function servicesTable(w: Writer, devis: Devis) {
  const cols = { desc: M + 10, qty: 330, unit: 430, total: A4.w - M - 10 };
  w.band(24, C.ink);
  w.y -= 4;
  w.text("DESCRIPTION", cols.desc, { size: 7.5, bold: true, color: C.bone, spacing: 1 });
  w.text("QTY", cols.qty, { size: 7.5, bold: true, color: C.bone, spacing: 1, right: true });
  w.text("UNIT PRICE", cols.unit, { size: 7.5, bold: true, color: C.bone, spacing: 1, right: true });
  w.text("TOTAL EXCL. VAT", cols.total, { size: 7.5, bold: true, color: C.bone, spacing: 1, right: true });
  w.y -= 24;
  devis.prestations.forEach((p, i) => {
    const lines = w.wrap(p.designation, 250);
    const h = lines.length * 12 + 10;
    w.ensure(h + 10);
    if (i % 2 === 1) w.band(h, C.surface);
    w.text(String(p.quantite), cols.qty, { right: true });
    w.text(money(p.prixUnitaire), cols.unit, { right: true });
    w.text(money(p.quantite * p.prixUnitaire), cols.total, { right: true, bold: true, color: C.ink });
    lines.forEach((line, j) => {
      w.text(line, cols.desc, { color: C.ink });
      if (j < lines.length - 1) w.y -= 12;
    });
    w.y -= 10;
    w.rule();
    w.y -= 14;
  });
}

function totals(w: Writer, rows: [string, string, ("strong" | "grand")?][]) {
  const x = A4.w - M - 220;
  const right = A4.w - M - 10;
  w.ensure(rows.length * 18 + 30);
  w.y -= 4;
  for (const [k, v, style] of rows) {
    if (style === "grand") {
      w.y -= 8;
      w.page.drawRectangle({ x, y: w.y - 9, width: 220, height: 27, color: C.ink });
      w.text(k, x + 10, { bold: true, size: 10.5, color: C.bone });
      w.text(v, right, { bold: true, size: 11.5, color: C.gold, right: true });
      w.y -= 26;
    } else {
      w.text(k, x + 10, { bold: style === "strong", color: style === "strong" ? C.ink : C.slate });
      w.text(v, right, { right: true, bold: style === "strong", color: style === "strong" ? C.ink : C.slate });
      w.y -= 17;
    }
  }
}

function note(w: Writer, title: string, body: string) {
  const lines = w.wrap(body, A4.w - 2 * M - 24, 9);
  w.ensure(lines.length * 12 + 40);
  w.y -= 6;
  const h = lines.length * 12 + 30;
  w.page.drawRectangle({ x: M, y: w.y - h + 12, width: 2.5, height: h, color: C.gold });
  w.label(title, M + 14);
  w.y -= 14;
  for (const line of lines) {
    w.text(line, M + 14, { size: 9 });
    w.y -= 12;
  }
  w.y -= 12;
}

/** Green "PAID" stamp in the free space left of the totals, once the invoice is settled. */
function paidStamp(w: Writer, top: number, datePaiement?: string) {
  const x = M + 40;
  const y = top - 78;
  const rotate = degrees(12);
  w.page.drawRectangle({ x, y, width: 140, height: 52, borderColor: C.success, borderWidth: 2.5, rotate, opacity: 0, borderOpacity: 0.85 });
  w.page.drawText("PAID", { x: x + 30, y: y + 22, size: 26, font: w.fonts.bold, color: C.success, rotate, opacity: 0.85 });
  if (datePaiement) {
    w.page.drawText(safe(`in full · ${date(datePaiement)}`), { x: x + 22, y: y + 8, size: 8, font: w.fonts.regular, color: C.success, rotate, opacity: 0.85 });
  }
}

async function create(titre: string, numero: string) {
  const doc = await PDFDocument.create();
  doc.setTitle(`${titre} ${numero} — ${STUDIO.nom}`);
  doc.setAuthor(STUDIO.nom);
  doc.setCreator(`${STUDIO.nom} · StudioFlow`);
  const fonts = { regular: await doc.embedFont(StandardFonts.Helvetica), bold: await doc.embedFont(StandardFonts.HelveticaBold) };
  return { doc, w: new Writer(doc, fonts, titre, numero) };
}

/** Quote PDF (cahier: Devis) with services, totals and the client's payment choice. */
export async function renderDevisPdf(devis: Devis): Promise<Uint8Array> {
  const { doc, w } = await create("QUOTE", devis.numero);
  parties(w, devis, [
    ["Issued", date(devis.dateEmission)],
    ["Valid until", date(devis.dateValidite)],
    ["Status", statutDevisConfig[devis.statut].label],
    ["Deposit", `${devis.tauxAcompte ?? 0}%`],
  ]);
  servicesTable(w, devis);
  const sousTotal = devis.sousTotal ?? devis.montantHT;
  totals(w, [
    ["Subtotal", money(sousTotal)],
    [`Discount ${devis.remise}%`, `- ${money(sousTotal - devis.montantHT)}`],
    ["Total excl. VAT", money(devis.montantHT), "strong"],
    [`VAT ${devis.tva}%`, money(devis.montantTVA ?? devis.montantTTC - devis.montantHT)],
    ["Total incl. VAT", money(devis.montantTTC), "grand"],
  ]);
  if (devis.planPaiement) {
    note(w, "Payment", `${planPaiementLabels[devis.planPaiement]}${devis.modePaiementPrefere ? ` · ${modePaiementLabels[devis.modePaiementPrefere]}` : ""}. Accepted on ${date(devis.dateReponse)}.`);
  } else if (devis.statut === "ENVOYE") {
    note(w, "How to accept", `Accept this quote from your client space before ${date(devis.dateValidite)} and choose to pay in full or with a ${devis.tauxAcompte ?? 0}% deposit.`);
  }
  if (devis.commentaire) note(w, "Note", devis.commentaire);
  return doc.save();
}

/** Invoice PDF (cahier: Facture) — amount due, payments received and what is left. */
export async function renderFacturePdf(devis: Devis, facture: Facture): Promise<Uint8Array> {
  const { doc, w } = await create("INVOICE", facture.numero);
  const reste = facture.montantTTC - facture.montantPaye;
  parties(w, devis, [
    ["Issued", date(facture.dateEmission)],
    ["Due", date(facture.dateEcheance)],
    ["Type", factureTypeLabel(facture)],
    ["Status", statutFactureConfig[facture.statut].label],
  ]);
  w.text(`Quote ${devis.numero} · total ${money(devis.montantTTC)} incl. VAT`, M, { size: 8.5, color: C.gray });
  w.y -= 20;
  servicesTable(w, devis);

  const rows: [string, string, ("strong" | "grand")?][] = [
    ["Quote total incl. VAT", money(devis.montantTTC)],
  ];
  if (!facture.paiementUnique) {
    rows.push([`${factureTypeLabel(facture)} (this invoice)`, money(facture.montantTTC), "strong"]);
  }
  rows.push(["Paid", `- ${money(facture.montantPaye)}`]);
  rows.push([reste > 0 ? "Amount due" : "Paid in full", money(Math.max(0, reste)), "grand"]);
  w.ensure(rows.length * 18 + 30);
  const topTotals = w.y;
  totals(w, rows);
  if (reste <= 0) paidStamp(w, topTotals, facture.datePaiement);

  if (facture.paiements?.length) {
    w.ensure(40 + facture.paiements.length * 14);
    w.y -= 8;
    w.label("Payments received", M);
    w.y -= 14;
    for (const p of facture.paiements) {
      w.text(`${date(p.date)}  ·  ${modePaiementLabels[p.modePaiement]}${p.reference ? `  ·  ${p.reference}` : ""}`, M, { size: 9 });
      w.text(money(p.montant), A4.w - M - 10, { size: 9, right: true, bold: true, color: C.success });
      w.y -= 14;
    }
    w.y -= 8;
  }
  if (reste > 0) {
    const mode = devis.modePaiementPrefere ? modePaiementLabels[devis.modePaiementPrefere].toLowerCase() : "your chosen method";
    note(w, "How to pay", `Please pay ${money(reste)} by ${date(facture.dateEcheance)} (${mode}). Mention ${facture.numero} with your payment; the studio confirms it in your client space once received.`);
  }
  return doc.save();
}
