import { describe, expect, it } from "vitest";
import { appliquerEasing, compteARebours, dureeEntrees, etatAnimation, ETAT_FINAL, nombreParticules, profilAppareil } from "../invitation.animation";
import { contraste, controlerQr } from "../invitation.couleurs";
import { lienAppleMaps, lienGoogleMaps, lienWaze, requeteLieu } from "../invitation.lieu";
import { aligner, avecGroupes, degrouper, deplacerCouches, distribuer, dupliquer, grouper, retourner } from "../invitation.outils";
import { matriceQr, texteQr } from "../invitation.qr";
import {
  animationSchema,
  animationTexteSchema,
  contenuSchema,
  elementSchema,
  type DetailsInvitation,
  type ElementInvitation,
} from "../invitation.schema";
import { findTemplate } from "../invitation.templates";

const details = (p: Partial<DetailsInvitation> = {}): DetailsInvitation => ({ nomA: "", nomB: "", date: "", heure: "", lieu: "", message: "", langue: "fr", ...p });

describe("animation bounds", () => {
  const ok = { type: "FONDU", duree: 1, delai: 0, easing: "DOUCE", boucle: "AUCUNE", dureeBoucle: 3 };

  it("accepts a normal animation", () => {
    expect(animationSchema.safeParse(ok).success).toBe(true);
  });

  it.each([
    ["too short", { duree: 0.1 }],
    ["too long", { duree: 7 }],
    ["negative delay", { delai: -1 }],
    ["delay too long", { delai: 16 }],
    ["loop too fast", { dureeBoucle: 0.2 }],
    ["unknown easing", { easing: "ELASTIC" }],
    ["unknown loop", { boucle: "SPIN" }],
    ["unknown field", { vitesse: 2 }],
  ])("refuses an animation %s", (_cas, patch) => {
    expect(animationSchema.safeParse({ ...ok, ...patch }).success).toBe(false);
  });

  it("keeps the typewriter for texts only", () => {
    const machine = { ...ok, type: "MACHINE_A_ECRIRE" };
    expect(animationTexteSchema.safeParse(machine).success).toBe(true);
    expect(animationSchema.safeParse(machine).success).toBe(false);
    const image = { id: "i", type: "image", src: "/invitations/decorations/cake.svg", x: 0, y: 0, width: 10, height: 10, rotation: 0, layer: 1, style: { opacity: 1 }, animation: machine };
    expect(elementSchema.safeParse(image).success).toBe(false);
  });

  it("validates the global opening, ambiance and music", () => {
    const base = findTemplate("classique")!.contenu;
    expect(contenuSchema.safeParse({ ...base, ouverture: { type: "SCEAU", couleur: "#aa3344" } }).success).toBe(true);
    expect(contenuSchema.safeParse({ ...base, ouverture: { type: "TRAPDOOR", couleur: "#aa3344" } }).success).toBe(false);
    expect(contenuSchema.safeParse({ ...base, ambiance: { type: "CONFETTIS", densite: 4 } }).success).toBe(false);
    expect(contenuSchema.safeParse({ ...base, musique: { piste: "oud", volume: 0.5 } }).success).toBe(true);
    expect(contenuSchema.safeParse({ ...base, musique: { piste: "https://evil.test/a.mp3", volume: 0.5 } }).success).toBe(false);
    expect(contenuSchema.safeParse({ ...base, musique: { piste: "oud", volume: 2 } }).success).toBe(false);
  });
});

describe("animation timing", () => {
  const fondu = { type: "FONDU" as const, duree: 1, delai: 0.5, easing: "LINEAIRE" as const, boucle: "AUCUNE" as const, dureeBoucle: 3 };

  it("shows the final state without animation, and at the end of the entrance", () => {
    expect(etatAnimation(undefined, 0)).toEqual(ETAT_FINAL);
    expect(etatAnimation(fondu, 10)).toEqual(ETAT_FINAL);
  });

  it("is invisible before its delay and halfway in the middle", () => {
    expect(etatAnimation(fondu, 0.2).opacite).toBe(0);
    expect(etatAnimation(fondu, 1).opacite).toBeCloseTo(0.5);
  });

  it("types letters and reveals progressively", () => {
    expect(etatAnimation({ ...fondu, type: "MACHINE_A_ECRIRE" }, 1).lettres).toBeCloseTo(0.5);
    expect(etatAnimation({ ...fondu, type: "REVELATION" }, 1).revelation).toBeCloseTo(0.5);
    expect(etatAnimation({ ...fondu, type: "GLISSEMENT_HAUT" }, 0.5).dy).toBeGreaterThan(0);
  });

  it("loops gently after the entrance", () => {
    const flotte = { ...fondu, boucle: "FLOTTEMENT" as const, dureeBoucle: 2 };
    const ecarts = [1.5, 2, 2.5, 3].map((t) => etatAnimation(flotte, t).dy);
    expect(Math.max(...ecarts.map(Math.abs))).toBeLessThanOrEqual(4);
    expect(new Set(ecarts.map((v) => v.toFixed(2))).size).toBeGreaterThan(1);
  });

  it("eases from 0 to 1", () => {
    for (const e of ["LINEAIRE", "DOUCE", "ENTREE", "SORTIE", "REBOND"] as const) {
      expect(appliquerEasing(e, 0)).toBeCloseTo(0);
      expect(appliquerEasing(e, 1)).toBeCloseTo(1);
    }
  });

  it("knows when the entrances end", () => {
    expect(dureeEntrees(findTemplate("anniversaire-1")!.contenu)).toBeGreaterThan(0);
  });

  it("counts down in the studio's time (UTC+1) and stops at zero", () => {
    const c = compteARebours("2027-06-19", "19:00", new Date("2027-06-18T17:00:00Z"));
    expect(c).toEqual({ jours: 1, heures: 1, minutes: 0, secondes: 0, passe: false });
    expect(compteARebours("2020-01-01", "", new Date())).toMatchObject({ jours: 0, passe: true });
    expect(compteARebours("", "", new Date())).toBeNull();
  });

  it("is light on small phones and still for reduced motion", () => {
    expect(profilAppareil({ mouvementReduit: true, coeurs: 8 })).toBe("statique");
    expect(profilAppareil({ mouvementReduit: false, coeurs: 2 })).toBe("leger");
    expect(profilAppareil({ mouvementReduit: false, coeurs: 8, memoireGo: 8 })).toBe("complet");
    expect(nombreParticules(3, false)).toBeLessThanOrEqual(30);
    expect(nombreParticules(3, true)).toBeLessThan(nombreParticules(3, false));
  });
});

describe("Google Maps link", () => {
  it("uses the coordinates first, rounded", () => {
    expect(lienGoogleMaps(details({ lieu: "Palace", coordonnees: { lat: 36.80651234, lng: 10.18151239 } })))
      .toBe("https://www.google.com/maps/search/?api=1&query=36.806512,10.181512");
  });

  it("falls back to the address, then the venue name", () => {
    expect(requeteLieu(details({ lieu: "Dar Ben Gacem", adresse: " 38 Rue du Pacha, Tunis " }))).toEqual({ type: "texte", valeur: "38 Rue du Pacha, Tunis" });
    expect(requeteLieu(details({ lieu: "Dar Ben Gacem" }))).toEqual({ type: "texte", valeur: "Dar Ben Gacem" });
    expect(lienGoogleMaps(details())).toBeNull();
  });

  it.each([
    ["accents and spaces", "Château de l'Étoile, Hammamet"],
    ["Arabic", "قصر الياسمين، تونس"],
    ["symbols", "Rue 18 & 20 #3 / Bloc A? = B"],
  ])("encodes %s so the link opens the right place", (_cas, adresse) => {
    const lien = lienGoogleMaps(details({ adresse }))!;
    expect(lien.startsWith("https://www.google.com/maps/search/?api=1&query=")).toBe(true);
    const query = new URL(lien).searchParams.get("query");
    expect(query).toBe(adresse);
    // Nothing in the address may break the URL: no raw space, "#" or extra parameter.
    expect(lien).not.toMatch(/[\s#]/);
    expect(lien.split("&")).toHaveLength(2); // api=1 & query=…, an "&" in the address stays encoded
    expect(new URL(lien).searchParams.get("api")).toBe("1");
  });

  it("builds Apple Maps and Waze links too", () => {
    const d = details({ lieu: "Palais", coordonnees: { lat: 36.8, lng: 10.18 } });
    expect(lienAppleMaps(d)).toBe("https://maps.apple.com/?ll=36.8,10.18&q=Palais");
    expect(lienWaze(d)).toBe("https://waze.com/ul?ll=36.8,10.18&navigate=yes");
    expect(new URL(lienWaze(details({ adresse: "صفاقس" }))!).searchParams.get("q")).toBe("صفاقس");
  });
});

describe("QR code", () => {
  const qr = { id: "q", type: "qrcode", cible: "CARTE", x: 0, y: 0, width: 96, height: 96, rotation: 0, layer: 1, style: { couleur: "#111111", fond: "#ffffff", marge: 4, opacity: 1 } };

  it("encodes the Google Maps link of the venue", () => {
    const texte = texteQr({ cible: "CARTE" }, details({ adresse: "قصر الياسمين" }));
    expect(texte).toBe(lienGoogleMaps(details({ adresse: "قصر الياسمين" })));
    expect(matriceQr(texte!).taille).toBeGreaterThanOrEqual(21);
    expect(texteQr({ cible: "CARTE" }, details())).toBeNull();
  });

  it("refuses pale codes, tiny codes and a missing margin in the schema", () => {
    expect(elementSchema.safeParse(qr).success).toBe(true);
    expect(elementSchema.safeParse({ ...qr, style: { ...qr.style, couleur: "#dddddd" } }).success).toBe(false);
    expect(elementSchema.safeParse({ ...qr, width: 30, height: 30 }).success).toBe(false);
    expect(elementSchema.safeParse({ ...qr, style: { ...qr.style, marge: 1 } }).success).toBe(false);
    expect(elementSchema.safeParse({ ...qr, style: { ...qr.style, opacity: 0.3 } }).success).toBe(false);
  });

  it("warns before it blocks", () => {
    expect(controlerQr({ couleur: "#000000", fond: "#ffffff", marge: 4, taille: 96 })).toEqual({ ok: true, bloquant: false, avertissements: [] });
    const pale = controlerQr({ couleur: "#777777", fond: "#ffffff", marge: 4, taille: 96 });
    expect(pale.bloquant).toBe(false);
    expect(pale.avertissements.length).toBe(1);
    expect(controlerQr({ couleur: "#cccccc", fond: "#ffffff", marge: 4, taille: 96 }).bloquant).toBe(true);
    expect(controlerQr({ couleur: "#000000", fond: "#ffffff", marge: 4, taille: 40 }).bloquant).toBe(true);
    expect(controlerQr({ couleur: "#ffffff", fond: "#000000", marge: 4, taille: 96 }).avertissements.join()).toMatch(/Light modules/);
  });

  it("measures contrast like WCAG", () => {
    expect(contraste("#000000", "#ffffff")).toBeCloseTo(21);
    expect(contraste("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
  });
});

describe("editing tools", () => {
  const boite = (id: string, x: number, y: number, w = 20, h = 20, extra: Partial<ElementInvitation> = {}): ElementInvitation =>
    ({ id, type: "shape", shape: "rect", x, y, width: w, height: h, rotation: 0, layer: 1, style: { fill: "#000000", stroke: null, strokeWidth: 0, opacity: 1 }, ...extra }) as ElementInvitation;
  const carte = { width: 400, height: 600 };

  it("aligns one element to the card and several to their box", () => {
    expect(aligner([boite("a", 10, 10)], ["a"], "centreH", carte)[0].x).toBe(190);
    const r = aligner([boite("a", 10, 10), boite("b", 100, 50, 40)], ["a", "b"], "droite", carte);
    expect(r.map((e) => e.x + e.width)).toEqual([140, 140]);
  });

  it("does not move locked elements", () => {
    expect(aligner([boite("a", 10, 10, 20, 20, { verrouille: true })], ["a"], "gauche", carte)[0].x).toBe(10);
  });

  it("distributes with equal gaps", () => {
    const r = distribuer([boite("a", 0, 0), boite("b", 30, 0), boite("c", 100, 0)], ["a", "b", "c"], "horizontal");
    expect(r.map((e) => e.x)).toEqual([0, 50, 100]);
  });

  it("groups, selects the whole group, and ungroups", () => {
    const g = grouper([boite("a", 0, 0), boite("b", 50, 0), boite("c", 90, 0)], ["a", "b"], "g1");
    expect(avecGroupes(g, ["a"]).sort()).toEqual(["a", "b"]);
    expect(degrouper(g, ["a"]).every((e) => !e.groupe)).toBe(true);
  });

  it("duplicates on top, shifted, as a new group", () => {
    let n = 0;
    const g = grouper([boite("a", 0, 0), boite("b", 50, 0)], ["a", "b"], "g1");
    const { elements, ids } = dupliquer(g, g, () => `n${n++}`);
    expect(ids).toHaveLength(2);
    const copies = elements.filter((e) => ids.includes(e.id));
    expect(copies.every((c) => c.groupe && c.groupe !== "g1")).toBe(true);
    expect(copies[0].x).toBe(16);
  });

  it("moves layers and keeps them numbered 1…n", () => {
    const els = [boite("a", 0, 0, 1, 1, { layer: 1 }), boite("b", 0, 0, 1, 1, { layer: 2 }), boite("c", 0, 0, 1, 1, { layer: 3 })];
    const devant = deplacerCouches(els, ["a"], "devant");
    expect(devant.find((e) => e.id === "a")!.layer).toBe(3);
    expect(deplacerCouches(els, ["c"], "arriere").find((e) => e.id === "c")!.layer).toBe(2);
  });

  it("flips and flips back", () => {
    const une = retourner([boite("a", 0, 0)], ["a"], "horizontal");
    expect(une[0].flipX).toBe(true);
    expect(retourner(une, ["a"], "horizontal")[0].flipX).toBeUndefined();
  });
});
