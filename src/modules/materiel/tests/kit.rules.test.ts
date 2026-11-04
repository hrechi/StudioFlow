import { describe, expect, it } from "vitest";
import { filtrerKitIA, kitDepuisHistorique } from "../kit.rules";

const disponibles = [
  { id: "camera", nom: "Camera", categorie: "APPAREIL_PHOTO" as const },
  { id: "lens", nom: "Lens", categorie: "OBJECTIF" as const },
];

describe("AI kit response filtering", () => {
  it("rejects unknown ids and removes duplicates", () => {
    const result = filtrerKitIA(
      {
        confiance: 0.8,
        items: [
          { materielId: "unknown", raison: "Invented" },
          { materielId: "camera", raison: "Useful" },
          { materielId: "camera", raison: "Duplicate" },
        ],
      },
      disponibles,
    );

    expect(result?.items.map((item) => item.materielId)).toEqual(["camera"]);
  });

  it("keeps at most ten valid items", () => {
    const many = Array.from({ length: 12 }, (_, index) => ({
      id: `item-${index}`,
      nom: `Item ${index}`,
      categorie: "ACCESSOIRE" as const,
    }));
    const result = filtrerKitIA(
      {
        confiance: 1,
        items: many.map((item) => ({ materielId: item.id, raison: "Useful" })),
      },
      many,
    );

    expect(result?.items).toHaveLength(10);
  });

  it("returns no AI result when no valid item remains", () => {
    expect(
      filtrerKitIA(
        { confiance: 0.4, items: [{ materielId: "unknown", raison: "No" }] },
        disponibles,
      ),
    ).toBeNull();
  });

  it("provides the history fallback ordered by usage", () => {
    const result = kitDepuisHistorique(
      disponibles,
      new Map([
        ["lens", 3],
        ["camera", 1],
      ]),
      "Wedding",
    );

    expect(result.map((item) => item.materielId)).toEqual(["lens", "camera"]);
    expect(result[0]?.raison).toBe("Used in 3 past Wedding sessions.");
  });
});
