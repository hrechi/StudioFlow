import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { PDFDocument, PDFName, PDFRawStream } from "pdf-lib";

vi.mock("server-only", () => ({}));

import { renderDevisPdf, renderFacturePdf } from "../facturation.pdf";
import type { Devis, Facture } from "../facturation.types";

const facture: Facture = {
  id: "f1",
  numero: "FAC-2026-0001",
  type: "SOLDE",
  dateEmission: "2026-01-01T00:00:00.000Z",
  dateEcheance: "2026-01-08T00:00:00.000Z",
  montantTTC: 100,
  montantPaye: 0,
  statut: "EN_ATTENTE",
};
const devis = {
  id: "d1",
  numero: "DEV-2026-0001",
  dateEmission: "2026-01-01T00:00:00.000Z",
  dateValidite: "2026-02-01T00:00:00.000Z",
  prestations: [{ designation: "Shooting", quantite: 1, prixUnitaire: 100 }],
  montantHT: 84,
  tva: 19,
  montantTTC: 100,
  remise: 0,
  statut: "ACCEPTE",
  genereParIA: false,
  client: { id: "c1", prenom: "Sara", nom: "Ben Ali" },
  seance: { id: "s1", titre: "Mariage" },
  factures: [facture],
} satisfies Devis;

const image = () => sharp({ create: { width: 120, height: 60, channels: 3, background: "#123456" } }).png().toBuffer();

async function imagesIn(bytes: Uint8Array) {
  const pdf = await PDFDocument.load(bytes);
  return pdf.context.enumerateIndirectObjects().filter(([, object]) =>
    object instanceof PDFRawStream && object.dict.get(PDFName.of("Subtype")) === PDFName.of("Image"),
  ).length;
}

describe("PDF signatures", () => {
  it("has no image when nothing was added", async () => {
    expect(await imagesIn(await renderFacturePdf(devis, facture))).toBe(0);
    expect(await imagesIn(await renderDevisPdf(devis))).toBe(0);
  });

  it("prints the studio signature and stamp on quotes and invoices", async () => {
    const visa = { studioSignature: await image(), studioCachet: await image() };
    expect(await imagesIn(await renderDevisPdf(devis, visa))).toBe(2);
    expect(await imagesIn(await renderFacturePdf(devis, facture, visa))).toBe(2);
  });

  it("still renders when only one of them exists", async () => {
    expect(await imagesIn(await renderFacturePdf(devis, facture, { studioSignature: await image() }))).toBe(1);
    expect(await imagesIn(await renderDevisPdf(devis, { studioCachet: await image() }))).toBe(1);
  });
});
