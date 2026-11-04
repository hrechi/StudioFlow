import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/llm-gemini", () => ({
  LlmUnavailableError: class LlmUnavailableError extends Error {},
  generateJson: vi.fn(),
}));

import { generateJson } from "@/lib/llm-gemini";
import { analyseParRegles, analyserPanne } from "../panne.analyse";

const materiel = {
  nom: "Camera",
  categorie: "APPAREIL_PHOTO" as const,
  marque: "Demo",
  etat: "BON" as const,
  dateAchat: "2024-01-01T00:00:00.000Z",
};

describe("breakdown analysis", () => {
  beforeEach(() => vi.mocked(generateJson).mockReset());

  it("uses keyword rules when the AI response is unavailable", async () => {
    vi.mocked(generateJson).mockResolvedValue(null);

    const result = await analyserPanne(materiel, "Le boîtier est tombé dans un liquide.");

    expect(result.source).toBe("REGLES");
    expect(result.gravite).toBe("CRITIQUE");
    expect(result.etat).toBe("EN_PANNE");
  });

  it("accepts only known AI enum values", async () => {
    vi.mocked(generateJson).mockResolvedValue({
      gravite: "MAJEURE",
      causeProbable: "Power component failure",
      actionRecommandee: "Send for inspection",
      etat: "EN_PANNE",
    });

    const result = await analyserPanne(materiel, "The camera will not power on.");

    expect(result).toEqual({
      gravite: "MAJEURE",
      causeProbable: "Power component failure",
      actionRecommandee: "Send for inspection",
      etat: "EN_PANNE",
      source: "IA",
    });
  });

  it("falls back when the AI returns invalid enum values", async () => {
    vi.mocked(generateJson).mockResolvedValue({
      gravite: "URGENT",
      causeProbable: "Unknown",
      actionRecommandee: "Inspect",
      etat: "BROKEN",
    });

    expect((await analyserPanne(materiel, "Minor scratch")).source).toBe("REGLES");
  });

  it("keeps the fallback classifier deterministic", () => {
    expect(analyseParRegles("The casing has a small scratch").gravite).toBe("MINEURE");
    expect(analyseParRegles("The motor is making a loud noise").gravite).toBe("MAJEURE");
  });
});
