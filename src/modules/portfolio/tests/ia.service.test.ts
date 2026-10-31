import { describe, expect, it, vi } from "vitest";
import type { BlocPortfolio } from "../portfolio.types";

vi.mock("server-only", () => ({}));
vi.mock("../integrations", () => ({
  portfolioIntegrations: {
    photosService: {
      listerMeilleuresPhotos: vi.fn(),
      listerPhotosDuPhotographe: vi.fn(),
    },
  },
}));

import { analyserQualitePortfolio, selectionnerMeilleuresPhotosIA } from "../ia.service";

const block = (
  type: BlocPortfolio["type"],
  configuration: Record<string, unknown> = {},
): BlocPortfolio => ({
  idBloc: crypto.randomUUID().replaceAll("-", "").slice(0, 24),
  type,
  ordre: 0,
  visible: true,
  miseEnPage: "GRILLE",
  configuration,
  elements: [],
});

describe("portfolio quality analysis", () => {
  it("returns a score with strengths and actionable improvements", () => {
    const result = analyserQualitePortfolio({
      titre: "Studio Étoile",
      slogan: "Photographie naturelle et lumineuse",
      bio: "Une biographie suffisamment longue pour présenter le style, l'approche et l'expérience du photographe.",
      photoCouverture: "https://example.com/cover.jpg",
      seo: {
        metaTitre: "Photographe de mariage",
        metaDescription: "Portfolio de photographie de mariage.",
      },
      blocs: [
        block("HERO", { titre: "Studio Étoile" }),
        block("A_PROPOS", { titre: "À propos", texte: "Une présentation", anneesExperience: 8 }),
        block("GALERIE", { titre: "Mariage", colonnes: 3 }),
        block("CONTACT", { titre: "Parlons de votre projet" }),
      ],
    });

    describe("smart photo selection", () => {
      it("automatically selects only unique photos above the quality threshold", async () => {
        const { portfolioIntegrations } = await import("../integrations");
        vi.mocked(portfolioIntegrations.photosService.listerPhotosDuPhotographe).mockResolvedValue([
          { id: "high", url: "high.jpg", urlMiniature: "high.jpg", scoreQualite: 92 },
          { id: "duplicate", url: "high.jpg", urlMiniature: "high.jpg", scoreQualite: 88 },
          {
            id: "acceptable",
            url: "acceptable.jpg",
            urlMiniature: "acceptable.jpg",
            scoreQualite: 50,
          },
          { id: "medium", url: "medium.jpg", urlMiniature: "medium.jpg", scoreQualite: 49 },
        ]);

        const result = await selectionnerMeilleuresPhotosIA("photographer");

        expect(result.resultat?.photoIds).toEqual(["high", "acceptable"]);
        expect(result.resultat?.similarPhotoIds).toEqual(["duplicate"]);
        expect(result.resultat?.lowQualityPhotoIds).toEqual(["medium"]);
      });
    });

    expect(result.statut).toBe("COMPLETED");
    expect(result.resultat?.score).toBeGreaterThan(0);
    expect(result.resultat?.criteria).toHaveLength(12);
    expect(result.resultat?.strengths.length).toBeGreaterThan(0);
    expect(result.resultat?.improvements.length).toBeGreaterThan(0);
  });

  it("flags a blank portfolio as needing improvement", () => {
    const result = analyserQualitePortfolio({
      titre: "",
      seo: {},
      blocs: [],
    });

    expect(result.resultat?.score).toBeLessThan(30);
    expect(result.resultat?.criteria.find((item) => item.id === "CTA")?.status).toBe("ACTION");
    expect(result.resultat?.criteria.find((item) => item.id === "CTA")?.detail).toBe(
      "Ajoutez un bloc Contact pour transformer les visites en demandes.",
    );
  });
});
