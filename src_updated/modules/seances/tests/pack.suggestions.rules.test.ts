import { describe, expect, it } from "vitest";
import {
  descriptionValide,
  filtrerDescriptions,
  filtrerNoms,
  nombresAutorises,
  suggestionsParModele,
  type SuggestionContext,
} from "../pack.suggestions.rules";

const ctx: SuggestionContext = {
  typeNom: "Wedding",
  services: [
    { nom: "Retouched photos", unite: "photos", quantite: 50 },
    { nom: "Photo album", quantite: 1 },
  ],
  dureeMinutes: 150,
  options: ["Drone footage"],
};

describe("filtrerNoms", () => {
  it("drops existing names (case and accent insensitive), duplicates and bad lengths", () => {
    const noms = filtrerNoms(
      ["  \"Signature\" ", "SIGNATURE", "Été", "ete", "A", "x".repeat(81), 12, "Golden Hour."],
      ["signature"],
    );
    expect(noms).toEqual(["Été", "Golden Hour"]);
  });

  it("returns an empty list for non-array input", () => {
    expect(filtrerNoms("nope", [])).toEqual([]);
  });

  it("caps the number of names", () => {
    expect(filtrerNoms(["a1", "b2", "c3", "d4", "e5", "f6"], [])).toHaveLength(4);
  });
});

describe("descriptions", () => {
  const autorises = nombresAutorises(ctx);

  it("accepts the quantities and the duration given by the admin", () => {
    expect(descriptionValide("50 retouched photos over about 2.5 hours of coverage.", autorises)).toBe(true);
    expect(descriptionValide("Coverage of 150 minutes with 1 album.", autorises)).toBe(true);
  });

  it("rejects invented numbers", () => {
    expect(descriptionValide("Includes 200 retouched photos delivered fast.", autorises)).toBe(false);
  });

  it("rejects prices in any common format", () => {
    for (const texte of [
      "A lovely package for 1500 TND only.",
      "Only 900 DT for the full day.",
      "Starting at €50 for everyone.",
      "A great deal at $99 per session.",
    ]) {
      expect(descriptionValide(texte, new Set([1500, 900, 50, 99]))).toBe(false);
    }
  });

  it("rejects too short or too long texts", () => {
    expect(descriptionValide("Too short", autorises)).toBe(false);
    expect(descriptionValide("a".repeat(1001), autorises)).toBe(false);
  });

  it("filters and de-duplicates a raw AI answer", () => {
    const out = filtrerDescriptions(
      [
        "A warm, relaxed wedding package with 50 photos.",
        "A warm, relaxed wedding package with 50 photos.",
        "300 photos for 500 TND!",
        null,
        "An elegant coverage of your day, from preparation to the first dance.",
      ],
      autorises,
    );
    expect(out).toEqual([
      "A warm, relaxed wedding package with 50 photos.",
      "An elegant coverage of your day, from preparation to the first dance.",
    ]);
  });
});

describe("suggestionsParModele", () => {
  it("builds valid names and descriptions from the pack data only", () => {
    const { noms, descriptions } = suggestionsParModele(ctx, ["Wedding Signature"]);
    expect(noms[0]).toBe("Wedding Essentials");
    expect(noms).not.toContain("Wedding Signature");
    expect(descriptions[0]).toContain("Retouched photos (50 photos)");
    expect(descriptions[0]).toContain("Estimated duration: 2 h 30 min.");
    expect(descriptions[0]).toContain("Optional add-ons: Drone footage.");
  });

  it("still answers when the pack has no service yet", () => {
    const { descriptions } = suggestionsParModele({ ...ctx, services: [], options: [], dureeMinutes: 0 }, []);
    expect(descriptions).toHaveLength(1);
    expect(descriptions[0].length).toBeGreaterThanOrEqual(10);
  });
});
