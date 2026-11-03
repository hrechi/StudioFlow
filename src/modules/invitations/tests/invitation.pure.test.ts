import { describe, expect, it } from "vitest";
import classique from "../examples/mariage-classique.json";
import arabe from "../examples/mariage-arabe.json";
import { debutHistorique, historiqueReducer } from "../invitation.history";
import { appliquerDetails, champsManquants, formaterDate, valeurChamp } from "../invitation.linked";
import { contenuSchema, elementSchema, type ContenuInvitation } from "../invitation.schema";
import { calculerSnap } from "../invitation.snap";
import { TEMPLATES } from "../invitation.templates";
import { DECORATIONS } from "../invitation.types";

describe("invitation schema", () => {
  it.each([["classic", classique], ["arabic", arabe]])("accepts the %s example", (_nom, exemple) => {
    expect(contenuSchema.safeParse(exemple).success).toBe(true);
  });

  it("accepts every template", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(3);
    for (const t of TEMPLATES) expect(contenuSchema.safeParse(t.contenu).success, t.id).toBe(true);
  });

  it("refuses images from outside the project", () => {
    const base = { id: "a", type: "image", x: 0, y: 0, width: 10, height: 10, rotation: 0, layer: 0, style: { opacity: 1 } };
    for (const src of ["https://evil.test/a.png", "/invitations/decorations/../../secret.svg", "data:image/png;base64,AAAA", "/api/invitations/images/xyz"]) {
      expect(elementSchema.safeParse({ ...base, src }).success, src).toBe(false);
    }
    expect(elementSchema.safeParse({ ...base, src: DECORATIONS[0].src }).success).toBe(true);
    expect(elementSchema.safeParse({ ...base, src: "/api/invitations/images/0123456789abcdef01234567" }).success).toBe(true);
  });

  it("refuses unknown fields and invalid colors", () => {
    expect(contenuSchema.safeParse({ ...classique, background: { color: "red" } }).success).toBe(false);
    expect(contenuSchema.safeParse({ ...classique, extra: 1 }).success).toBe(false);
  });
});

describe("fields linked to the card", () => {
  const contenu = contenuSchema.parse(classique);

  it("updates the text and keeps an element where it was moved", () => {
    const deplace: ContenuInvitation = {
      ...contenu,
      elements: contenu.elements.map((e) => (e.id === "noms" ? { ...e, x: 7, y: 9, rotation: 12, width: 111 } : e)),
    };
    const resultat = appliquerDetails({ ...deplace, details: { ...deplace.details, nomA: "Lina" } });
    const noms = resultat.elements.find((e) => e.id === "noms");
    expect(noms).toMatchObject({ text: "Lina & Adam", x: 7, y: 9, rotation: 12, width: 111 });
  });

  it("leaves free text alone", () => {
    const libre: ContenuInvitation = {
      ...contenu,
      elements: contenu.elements.map((e) => (e.type === "text" ? { ...e, linkedTo: undefined, text: "Mine" } : e)),
    };
    expect(appliquerDetails(libre).elements.find((e) => e.id === "noms")).toMatchObject({ text: "Mine" });
  });

  it("formats the date in the card language without shifting the day", () => {
    expect(formaterDate("2027-06-19", "fr")).toContain("19 juin 2027");
    expect(formaterDate("2027-06-19", "en")).toContain("19 June 2027");
    expect(formaterDate("", "en")).toBe("");
  });

  it("shows a placeholder for an empty field and lists what is missing", () => {
    const vide = { nomA: "", nomB: "", date: "", heure: "", lieu: "", message: "", langue: "en" as const };
    expect(valeurChamp(vide, "noms")).toBe("Your names");
    expect(Object.keys(champsManquants(vide)).sort()).toEqual(["date", "heure", "lieu", "nomA", "nomB"]);
    expect(champsManquants(contenu.details)).toEqual({});
  });
});

describe("undo / redo", () => {
  it("goes back and forth, and a new change clears redo", () => {
    let h = debutHistorique("a");
    h = historiqueReducer(h, { type: "appliquer", valeur: "b" });
    h = historiqueReducer(h, { type: "appliquer", valeur: "c" });
    h = historiqueReducer(h, { type: "annuler" });
    expect(h.present).toBe("b");
    h = historiqueReducer(h, { type: "retablir" });
    expect(h.present).toBe("c");
    h = historiqueReducer(h, { type: "annuler" });
    h = historiqueReducer(h, { type: "appliquer", valeur: "d" });
    expect(h.futur).toEqual([]);
    expect(historiqueReducer(h, { type: "retablir" }).present).toBe("d");
  });

  it("groups changes with the same key into one step", () => {
    let h = debutHistorique("a");
    h = historiqueReducer(h, { type: "appliquer", valeur: "ab", cle: "nom" });
    h = historiqueReducer(h, { type: "appliquer", valeur: "abc", cle: "nom" });
    h = historiqueReducer(h, { type: "annuler" });
    expect(h.present).toBe("a");
  });

  it("does nothing at the ends of the stack", () => {
    const h = debutHistorique("a");
    expect(historiqueReducer(h, { type: "annuler" })).toBe(h);
    expect(historiqueReducer(h, { type: "retablir" })).toBe(h);
  });
});

describe("snapping", () => {
  const carte = { width: 400, height: 600 };

  it("snaps the center of a box to the center of the card", () => {
    const snap = calculerSnap({ x: 147, y: 20, width: 100, height: 20 }, [], carte);
    expect(snap.dx).toBe(3);
    expect(snap.verticales).toEqual([200]);
  });

  it("snaps to the edge of another element", () => {
    const snap = calculerSnap({ x: 52, y: 103, width: 30, height: 30 }, [{ x: 10, y: 100, width: 40, height: 40 }], carte);
    expect(snap.dx).toBe(-2);
    expect(snap.dy).toBe(2); // its center is closer to the center of the other box than its top is to the top
  });

  it("does not move a box far from any guide", () => {
    expect(calculerSnap({ x: 60, y: 60, width: 10, height: 10 }, [], carte)).toMatchObject({ dx: 0, dy: 0, verticales: [], horizontales: [] });
  });
});
