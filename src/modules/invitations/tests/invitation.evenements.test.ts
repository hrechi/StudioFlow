import { beforeEach, describe, expect, it, vi } from "vitest";

const gemini = vi.hoisted(() => ({ generateJson: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/llm-gemini", () => {
  class LlmUnavailableError extends Error {}
  return { generateJson: gemini.generateJson, LlmUnavailableError };
});

import classique from "../examples/mariage-classique.json";
import arabe from "../examples/mariage-arabe.json";
import { contraste } from "../invitation.couleurs";
import { champsVisibles, EVENEMENTS, libelleChamp, LISTE_EVENEMENTS } from "../invitation.evenements";
import { rediger, suggererPalette, texteAcceptable, texteModele, validerPalette } from "../invitation.ia";
import { champsManquants, valeurChamp } from "../invitation.linked";
import { contenuSchema, LANGUES, TONS, TYPES_EVENEMENT, typeDe, type DetailsInvitation } from "../invitation.schema";
import { adapterLangue, apercuTemplate, findTemplate, TEMPLATES, templatesDuType } from "../invitation.templates";
import { DECORATIONS } from "../invitation.types";
import { existsSync } from "node:fs";
import { join } from "node:path";

const PUBLIC = join(process.cwd(), "public");

describe("backward compatibility of the document", () => {
  /** A card saved by the first version of the editor, exactly as it sits in MongoDB. */
  const ancienne = {
    size: { width: 420, height: 595 },
    background: { color: "#fbf7ef" },
    details: { nomA: "Sarah", nomB: "Adam", date: "2027-06-19", heure: "19:00", lieu: "Tunis", message: "Bienvenue", langue: "fr" },
    elements: [
      { id: "noms", type: "text", text: "Sarah & Adam", linkedTo: "noms", x: 40, y: 150, width: 340, height: 70, rotation: 0, layer: 2, style: { fontFamily: "Great Vibes", fontSize: 50, color: "#a8843f", align: "center", opacity: 1, bold: false, italic: false, letterSpacing: 0 } },
      { id: "coeur", type: "shape", shape: "heart", x: 1, y: 1, width: 50, height: 50, rotation: 0, layer: 1, style: { fill: "#2f5d50", stroke: null, strokeWidth: 0, opacity: 1 } },
      { id: "img", type: "image", src: "/invitations/decorations/rings.svg", x: 1, y: 1, width: 50, height: 50, rotation: 0, layer: 3, style: { opacity: 1 } },
    ],
  };

  it.each([["first version", ancienne], ["classic example", classique], ["arabic example", arabe]])("still accepts the %s", (_nom, doc) => {
    const parsed = contenuSchema.safeParse(doc);
    expect(parsed.success).toBe(true);
    // Nothing is added or rewritten on the way: the stored shape stays the same.
    if (parsed.success) expect(parsed.data).toEqual(doc);
  });

  it("reads a card without event type as a wedding, with no animation", () => {
    const parsed = contenuSchema.parse(ancienne);
    expect(typeDe(parsed)).toBe("MARIAGE");
    expect(parsed.elements.every((e) => e.animation === undefined)).toBe(true);
    expect(parsed.ouverture).toBeUndefined();
  });

  it("keeps the wedding rules of the first version", () => {
    const vide: DetailsInvitation = { nomA: "", nomB: "", date: "", heure: "", lieu: "", message: "", langue: "en" };
    expect(Object.keys(champsManquants(vide)).sort()).toEqual(["date", "heure", "lieu", "nomA", "nomB"]);
    expect(valeurChamp({ ...vide, nomA: "Lina", nomB: "Adam" }, "noms")).toBe("Lina & Adam");
  });

  it("keeps the ids of the original templates", () => {
    for (const id of ["classique", "floral", "moderne", "royal", "zaffa"]) expect(findTemplate(id)?.typeEvenement).toBe("MARIAGE");
  });
});

describe("event type registry", () => {
  it("has every type of the schema, and only those", () => {
    expect(Object.keys(EVENEMENTS).sort()).toEqual([...TYPES_EVENEMENT].sort());
    expect(LISTE_EVENEMENTS).toHaveLength(11);
  });

  it.each(TYPES_EVENEMENT)("%s is complete", (type) => {
    const c = EVENEMENTS[type];
    expect(c.id).toBe(type);
    expect(c.label.length).toBeGreaterThan(2);
    expect(c.palettes.length).toBeGreaterThanOrEqual(2);
    expect(c.decorations.length).toBeGreaterThanOrEqual(3);
    expect(c.decorations).toContain(c.icone);
    expect(c.consigneIA.length).toBeGreaterThan(10);
    expect(c.requis).toEqual(expect.arrayContaining(["date", "lieu"]));
    for (const langue of LANGUES) {
      expect(c.intro[langue]).toBeTruthy();
      expect(c.messages[langue].formel).toBeTruthy();
      expect(c.messages[langue].chaleureux).toBeTruthy();
    }
    // A required name or title must have a label in the form, or nobody could fill it in.
    for (const champ of c.requis) {
      if (champ === "nomA" || champ === "nomB" || champ === "titre") expect(c.champs[champ], `${type}.${champ}`).toBeTruthy();
    }
  });

  it.each(TYPES_EVENEMENT)("%s has readable palettes", (type) => {
    for (const p of EVENEMENTS[type].palettes) {
      expect(contraste(p.principale, p.fond), `${type} principale ${p.principale}`).toBeGreaterThanOrEqual(3);
      expect(contraste(p.secondaire, p.fond), `${type} secondaire ${p.secondaire}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("uses only decorations that exist on disk and in the library", () => {
    const bibliotheque = new Set(DECORATIONS.map((d) => d.src));
    for (const d of DECORATIONS) expect(existsSync(join(PUBLIC, d.src)), d.src).toBe(true);
    for (const c of LISTE_EVENEMENTS) {
      for (const fichier of c.decorations) expect(bibliotheque.has(`/invitations/decorations/${fichier}.svg`), fichier).toBe(true);
    }
  });

  it("names the fields with the words of the type", () => {
    expect(libelleChamp("ANNIVERSAIRE", "noms")).toBe("Name of the guest of honour");
    expect(libelleChamp("MARIAGE", "noms")).toBe("First name & Second name");
    expect(libelleChamp("CONFERENCE", "nomB")).toBe("Speaker");
    expect(champsVisibles("CREMAILLERE").map((c) => c.champ)).toEqual(["nomA", "contact"]);
  });

  it("asks for the right fields per type", () => {
    const vide: DetailsInvitation = { nomA: "", nomB: "", date: "", heure: "", lieu: "", message: "", langue: "fr" };
    expect(Object.keys(champsManquants(vide, "ANNIVERSAIRE")).sort()).toEqual(["date", "heure", "lieu", "nomA"]);
    expect(Object.keys(champsManquants(vide, "CONFERENCE")).sort()).toEqual(["date", "heure", "lieu", "titre"]);
  });
});

describe("templates", () => {
  it("are all valid documents with unique ids", () => {
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
    for (const t of TEMPLATES) {
      const parsed = contenuSchema.safeParse(t.contenu);
      expect(parsed.success, `${t.id}: ${parsed.success ? "" : JSON.stringify(parsed.error.issues[0])}`).toBe(true);
      expect(t.contenu.typeEvenement).toBe(t.typeEvenement);
    }
  });

  it.each(TYPES_EVENEMENT)("offer at least two cards for %s", (type) => {
    expect(templatesDuType(type).length).toBeGreaterThanOrEqual(2);
  });

  it("are still valid in every language and with sample values", () => {
    for (const t of TEMPLATES) {
      for (const langue of LANGUES) {
        expect(contenuSchema.safeParse(adapterLangue(t.contenu, langue)).success, `${t.id}/${langue}`).toBe(true);
        expect(contenuSchema.safeParse(apercuTemplate(t, langue)).success, `${t.id}/${langue}`).toBe(true);
      }
    }
  });

  it("switch to Arabic fonts and the Arabic message", () => {
    const t = findTemplate("anniversaire-1")!;
    const ar = adapterLangue(t.contenu, "ar");
    expect(ar.details.message).toBe(EVENEMENTS.ANNIVERSAIRE.messages.ar.formel);
    const fontes = ar.elements.flatMap((e) => (e.type === "text" ? [e.style.fontFamily] : []));
    expect(fontes.every((f) => ["Amiri", "Cairo", "Tajawal", "El Messiri", "Reem Kufi"].includes(f))).toBe(true);
  });
});

describe("AI for every event type", () => {
  beforeEach(() => gemini.generateJson.mockReset());

  it("falls back to the written text of the type when the AI gives nothing usable", async () => {
    gemini.generateJson.mockResolvedValue({});
    const r = await rediger({ ton: "JOYEUX", langue: "fr", nomA: "Nour", nomB: "", date: "", lieu: "", typeEvenement: "ANNIVERSAIRE" });
    expect(r).toEqual({ valeur: EVENEMENTS.ANNIVERSAIRE.messages.fr.chaleureux, source: "MODELE" });
  });

  it("refuses answers that are too long or carry links or markup", async () => {
    expect(texteAcceptable("Venez fêter avec nous !")).toBe(true);
    expect(texteAcceptable("<b>hi</b>")).toBe(false);
    expect(texteAcceptable("Click https://evil.test now")).toBe(false);
    expect(texteAcceptable("mot ".repeat(60))).toBe(false);
    gemini.generateJson.mockResolvedValue({ texte: "see https://evil.test" });
    const r = await rediger({ ton: "ELEGANT", langue: "en", nomA: "", nomB: "", date: "", lieu: "", typeEvenement: "CONFERENCE" });
    expect(r.source).toBe("MODELE");
  });

  it("has a written text for every type, language and tone", () => {
    for (const type of TYPES_EVENEMENT) for (const langue of LANGUES) for (const ton of TONS) expect(texteModele(type, langue, ton)).toBeTruthy();
  });

  it("corrects AI colors that are not readable", async () => {
    gemini.generateJson.mockResolvedValue({ fond: "#ffffff", principale: "#fafafa", secondaire: "#eeeeee" });
    const { valeur, source } = await suggererPalette("snow", "NAISSANCE");
    expect(source).toBe("IA");
    expect(contraste(valeur.principale, valeur.fond)).toBeGreaterThanOrEqual(3);
    expect(contraste(valeur.secondaire, valeur.fond)).toBeGreaterThanOrEqual(4.5);
  });

  it("uses the palette of the type without the AI", async () => {
    gemini.generateJson.mockResolvedValue({ fond: "not a color" });
    const { valeur, source } = await suggererPalette("something", "REMISE_DIPLOME");
    expect(source).toBe("MODELE");
    expect(valeur).toEqual(validerPalette(EVENEMENTS.REMISE_DIPLOME.palettes[0]));
  });
});
