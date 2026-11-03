import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { initials } from "@/lib/utils";
import { analyserQualitePortfolio } from "../ia.service";
import type { PortfolioPublic } from "../portfolio.service";
import type { BlocPortfolio } from "../portfolio.types";

describe("Portfolio Directory Card logic", () => {
  const basePortfolio: PortfolioPublic = {
    id: "portfolio-1",
    proprietaire: "owner-1",
    photographe: {
      nom: "Bernard",
      prenom: "Alice",
      photoProfil: "https://example.com/portrait-alice.jpg",
    },
    slug: "alice-bernard",
    titre: "Studio Alice",
    slogan: "Photographie naturelle",
    photoCouverture: "https://example.com/cover.jpg",
    specialites: ["PORTRAIT", "MARIAGE"],
    styles: ["EDITORIAL"],
    services: ["PHOTOGRAPHIE"],
    disponible: true,
    ville: "Lyon",
    theme: "SOMBRE",
    couleurAccent: "#d97a4a",
    filigrane: false,
    seo: { metaTitre: "Titre", metaDescription: "Description" },
    liensSociaux: [],
    blocsPublies: [
      {
        idBloc: "gal-1",
        type: "GALERIE",
        ordre: 1,
        visible: true,
        miseEnPage: "GRILLE",
        configuration: {},
        elements: [
          {
            idElement: "el-1",
            media: { url: "/img1.jpg", urlMiniature: "/img1-thumb.jpg", largeur: 1000, hauteur: 800 },
            ordreAffichage: 0,
            estMisEnAvant: false,
            role: "NORMAL",
            nombreLikes: 0,
          },
        ],
      },
    ],
    nombreVues: 42,
  };

  it("identifies profile photo for photographer with registered portrait", () => {
    const portfolio = { ...basePortfolio };
    const aboutBlock = portfolio.blocsPublies?.find((b) => b.type === "A_PROPOS");
    const portraitUrl =
      portfolio.photographe.photoProfil ||
      (typeof aboutBlock?.configuration?.photoPortrait === "string" &&
      aboutBlock.configuration.photoPortrait.trim()
        ? aboutBlock.configuration.photoPortrait.trim()
        : undefined) ||
      aboutBlock?.elements?.[0]?.media?.url ||
      null;

    expect(portraitUrl).toBe("https://example.com/portrait-alice.jpg");
    expect(initials(portfolio.photographe.prenom, portfolio.photographe.nom)).toBe("AB");
  });

  it("identifies missing profile photo and does NOT fallback to gallery or cover photos", () => {
    const portfolioWithoutPhoto: PortfolioPublic = {
      ...basePortfolio,
      photographe: {
        nom: "Dupont",
        prenom: "Jean",
        photoProfil: undefined,
      },
      photoCouverture: "https://example.com/cover-dupont.jpg",
    };

    const aboutBlock = portfolioWithoutPhoto.blocsPublies?.find((b) => b.type === "A_PROPOS");
    const portraitUrl =
      portfolioWithoutPhoto.photographe.photoProfil ||
      (typeof aboutBlock?.configuration?.photoPortrait === "string" &&
      aboutBlock.configuration.photoPortrait.trim()
        ? aboutBlock.configuration.photoPortrait.trim()
        : undefined) ||
      aboutBlock?.elements?.[0]?.media?.url ||
      null;

    // Never fallback to cover or gallery photos
    expect(portraitUrl).toBeNull();
    expect(portraitUrl).not.toBe(portfolioWithoutPhoto.photoCouverture);
    expect(initials(portfolioWithoutPhoto.photographe.prenom, portfolioWithoutPhoto.photographe.nom)).toBe("JD");
  });

  it("detects when a portfolio has no published gallery photos", () => {
    const portfolioWithoutPhotos: PortfolioPublic = {
      ...basePortfolio,
      blocsPublies: [],
    };

    const previews = (portfolioWithoutPhotos.blocsPublies ?? [])
      .filter((block) => block.visible && ["GALERIE", "COLLECTION"].includes(block.type))
      .flatMap((block) => block.elements)
      .slice(0, 3);

    expect(previews).toHaveLength(0);
  });

  it("includes PROFILE_PHOTO check in quality audit and marks ACTION when absent", () => {
    const blocksWithoutPortrait: BlocPortfolio[] = [
      {
        idBloc: "hero-1",
        type: "HERO",
        ordre: 0,
        visible: true,
        miseEnPage: "PLEIN_ECRAN",
        elements: [],
        configuration: {},
      },
      {
        idBloc: "about-1",
        type: "A_PROPOS",
        ordre: 1,
        visible: true,
        miseEnPage: "PLEIN_ECRAN",
        elements: [],
        configuration: {}, // No photoPortrait
      },
    ];

    const auditMissing = analyserQualitePortfolio({
      titre: "Studio Test",
      seo: { metaTitre: "Titre", metaDescription: "Description" },
      blocs: blocksWithoutPortrait,
    });

    const checkMissing = auditMissing.resultat?.checksPublication.find(
      (c) => c.id === "PROFILE_PHOTO",
    );
    expect(checkMissing).toBeDefined();
    expect(checkMissing?.status).toBe("ACTION");
    expect(checkMissing?.detail).toContain("Ajoute ta photo de profil pour être mieux visible dans l'annuaire");

    const blocksWithPortrait: BlocPortfolio[] = [
      blocksWithoutPortrait[0],
      {
        idBloc: "about-2",
        type: "A_PROPOS",
        ordre: 1,
        visible: true,
        miseEnPage: "PLEIN_ECRAN",
        elements: [],
        configuration: { photoPortrait: "https://example.com/portrait.jpg" },
      },
    ];

    const auditWithPhoto = analyserQualitePortfolio({
      titre: "Studio Test",
      seo: { metaTitre: "Titre", metaDescription: "Description" },
      blocs: blocksWithPortrait,
    });

    const checkWithPhoto = auditWithPhoto.resultat?.checksPublication.find(
      (c) => c.id === "PROFILE_PHOTO",
    );
    expect(checkWithPhoto).toBeDefined();
    expect(checkWithPhoto?.status).toBe("READY");
  });
});
