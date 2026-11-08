import { describe, expect, it } from "vitest";
import { canauxEnvoi, creneau, fichierIcs, initiales, lienAgendaGoogle, messageEnvoi, moyensReponse, titreAgenda } from "../invitation.invite";
import { lireNominatim, lirePhoton, variantesRecherche } from "../invitation.lieu";
import { MODELES, TEXTES_FIXES } from "../invitation.modeles";
import { contenuSchema, type ContenuInvitation, type DetailsInvitation } from "../invitation.schema";
import { adapterLangue, findTemplate, TEMPLATES, templatesDuType } from "../invitation.templates";

const details = (extra: Partial<DetailsInvitation> = {}): DetailsInvitation => ({
  nomA: "Sarah",
  nomB: "Adam",
  date: "2027-06-19",
  heure: "19:30",
  lieu: "Dar El Marsa",
  message: "Join us!",
  langue: "en",
  ...extra,
});
const carte = (extra: Partial<DetailsInvitation> = {}): Pick<ContenuInvitation, "details" | "typeEvenement"> => ({ details: details(extra), typeEvenement: "MARIAGE" });

describe("map search", () => {
  it("tries the whole text, then without postcode and country, then without the venue name", () => {
    expect(variantesRecherche("Salle Le Pacha, Ennasr, 2037 Ariana, Tunisie")).toEqual([
      "Salle Le Pacha, Ennasr, 2037 Ariana, Tunisie",
      "Salle Le Pacha, Ennasr, Ariana",
      "Ennasr, Ariana",
      "Ariana",
    ]);
    expect(variantesRecherche("  Villa   Carthage ")).toEqual(["Villa Carthage"]);
    expect(variantesRecherche("")).toEqual([]);
  });

  it("reads Nominatim and Photon answers and skips broken rows", () => {
    expect(lireNominatim([{ lat: "36.88", lon: "10.33", name: "Dar El Marsa", display_name: "Dar El Marsa, La Marsa, Tunis, Tunisie" }, { lat: "x" }])).toEqual([
      { nom: "Dar El Marsa", detail: "La Marsa, Tunis, Tunisie", lat: 36.88, lng: 10.33 },
    ]);
    expect(lireNominatim("oops")).toEqual([]);
    const photon = lirePhoton({ features: [{ geometry: { coordinates: [10.07, 36.83] }, properties: { name: "Salle des fêtes", city: "Ariana", country: "Tunisie" } }, { geometry: {} }] });
    expect(photon).toEqual([{ nom: "Salle des fêtes", detail: "Ariana, Tunisie", lat: 36.83, lng: 10.07 }]);
  });
});

describe("calendar", () => {
  it("reads the date and time in Tunis time (UTC+1) and lasts four hours", () => {
    expect(creneau({ date: "2027-06-19", heure: "19:30" })).toEqual({ journee: false, debut: "20270619T183000Z", fin: "20270619T223000Z" });
    expect(creneau({ date: "2027-06-19", heure: "" })).toEqual({ journee: true, debut: "20270619", fin: "20270620" });
    expect(creneau({ date: "", heure: "19:30" })).toBeNull();
  });

  it("builds a Google Calendar link with the venue", () => {
    const lien = new URL(lienAgendaGoogle(carte())!);
    expect(lien.searchParams.get("dates")).toBe("20270619T183000Z/20270619T223000Z");
    expect(lien.searchParams.get("text")).toBe("Wedding · Sarah & Adam");
    expect(lien.searchParams.get("location")).toBe("Dar El Marsa");
    expect(titreAgenda({ details: details({ titre: "Iftar dinner", nomA: "The Gharbi family", nomB: "" }), typeEvenement: "FETE_RELIGIEUSE" })).toBe("Iftar dinner · The Gharbi family");
  });

  it("writes a valid .ics file: escaped text, folded lines, a reminder the day before", () => {
    const ics = fichierIcs(carte({ lieu: "Dar El Marsa; salle 2, La Marsa", message: "x".repeat(200) }), { uid: "abc", maintenant: new Date("2027-01-01T10:00:00Z") })!;
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20270619T183000Z");
    expect(ics).toContain("LOCATION:Dar El Marsa\\; salle 2\\, La Marsa");
    expect(ics).toContain("TRIGGER:-P1D");
    for (const ligne of ics.split("\r\n")) expect(new TextEncoder().encode(ligne).length).toBeLessThanOrEqual(75);
    expect(fichierIcs(carte({ date: "" }), { uid: "x" })).toBeNull();
  });
});

describe("replying and sending", () => {
  it("turns the RSVP contact into call, WhatsApp and email links", () => {
    expect(moyensReponse("Sarah 22 123 456")).toEqual([
      { type: "appel", href: "tel:+21622123456", valeur: "22 123 456" },
      { type: "whatsapp", href: "https://wa.me/21622123456", valeur: "22 123 456" },
    ]);
    expect(moyensReponse("+33 6 12 34 56 78 or rsvp@mail.tn").map((m) => m.href)).toEqual(["tel:+33612345678", "https://wa.me/33612345678", "mailto:rsvp@mail.tn"]);
    expect(moyensReponse("just text")).toEqual([]);
    expect(moyensReponse(undefined)).toEqual([]);
  });

  it("writes the message in the language of the card, with the link", () => {
    const message = messageEnvoi(carte(), "https://x.tn/invitation/t");
    expect(message).toMatch(/^You're invited! Sarah & Adam — Saturday,? 19 June 2027, 19:30\.\n/);
    expect(message.endsWith("Open your invitation: https://x.tn/invitation/t")).toBe(true);
    expect(messageEnvoi(carte({ langue: "fr" }), "L")).toContain("Ouvrez votre invitation : L");
    const canaux = canauxEnvoi("Hi https://x.tn", "https://x.tn", "Wedding");
    expect(canaux.map((c) => c.id)).toEqual(["whatsapp", "messenger", "telegram", "sms", "email"]);
    expect(canaux[0].href).toBe("https://wa.me/?text=Hi%20https%3A%2F%2Fx.tn");
  });

  it("puts the initials on the wax seal", () => {
    expect(initiales(details())).toBe("S&A");
    expect(initiales(details({ nomA: "", nomB: "", titre: "iftar" }))).toBe("I");
  });
});

describe("designs", () => {
  it("give every type three different layouts, and every card a QR code to the venue", () => {
    for (const modeles of Object.values(MODELES)) expect(new Set(modeles.map((m) => m.mise)).size).toBe(3);
    for (const t of TEMPLATES) expect(t.contenu.elements.some((e) => e.type === "qrcode"), t.id).toBe(true);
    expect(templatesDuType("ANNIVERSAIRE").map((t) => t.id)).toEqual(["anniversaire-1", "anniversaire-2", "anniversaire-3"]);
  });

  it("no two types share the same layout with the same icon", () => {
    const signatures = Object.values(MODELES).flatMap((modeles) => modeles.map((m) => `${m.mise}/${m.icone}`));
    expect(new Set(signatures).size).toBe(signatures.length);
  });

  it("translate their fixed words and align right in Arabic", () => {
    const fr = adapterLangue(findTemplate("conference-1")!.contenu, "fr");
    const scan = fr.elements.find((e) => e.id === "txt-scan");
    expect(scan?.type === "text" && scan.text).toBe(TEXTES_FIXES.scan.fr);
    const ar = adapterLangue(findTemplate("conference-1")!.contenu, "ar");
    const titre = ar.elements.find((e) => e.id === "titre");
    expect(titre?.type === "text" && titre.style.align).toBe("right");
    expect(contenuSchema.safeParse(ar).success).toBe(true);
  });

  it("animate every element of a new card", () => {
    for (const t of TEMPLATES) expect(t.contenu.elements.every((e) => e.animation), t.id).toBe(true);
  });
});
