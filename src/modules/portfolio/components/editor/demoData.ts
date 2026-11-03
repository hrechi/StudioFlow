import type { BlocPortfolio } from "../../portfolio.types";

export const INITIAL_DEMO_BLOCKS: BlocPortfolio[] = [
  {
    idBloc: "000000000000000000000001",
    type: "HERO",
    ordre: 0,
    visible: true,
    miseEnPage: "PLEIN_ECRAN",
    configuration: {
      titre: "Aurélie & Marc",
      sousTitre: "Un mariage à la fin de l’été au Château de la Rivière",
      texteBouton: "Parlons de votre date →",
      lienBouton: "#contact",
      tagline: "BORDEAUX · MARIAGE · PORTRAIT",
      photoCouverture:
        "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80",
      liensSociaux: [
        { reseau: "INSTAGRAM", url: "https://instagram.com/aurelie_morales" },
        { reseau: "FACEBOOK", url: "https://facebook.com/aurelie.morales.photo" },
        { reseau: "SITE_WEB", url: "https://studioflow.app" },
      ],
    },
    elements: [],
  },
  {
    idBloc: "000000000000000000000002",
    type: "A_PROPOS",
    ordre: 1,
    visible: true,
    miseEnPage: "GRILLE",
    configuration: {
      titre: "Aurélie Morales",
      texte:
        "For more than ten years, I have photographed delicate and spontaneous moments with a natural approach. Based in the Southwest, I travel wherever stories deserve to be told.",
      anneesExperience: 11,
      photoPortrait:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
    },
    elements: [],
  },
  {
    idBloc: "000000000000000000000003",
    type: "GALERIE",
    ordre: 2,
    visible: true,
    miseEnPage: "GRILLE",
    configuration: {
      titre: "MARIAGE",
      categorie: "MARIAGE",
    },
    elements: [],
  },
  {
    idBloc: "000000000000000000000004",
    type: "CASE_STUDY",
    ordre: 3,
    visible: true,
    miseEnPage: "GRILLE",
    configuration: {
      titre: "A Morning at Saint-Michel Market",
      texte:
        "At dawn, merchants set up their stalls. Mist drifts over the Garonne as the neighborhood wakes in an authentic atmosphere.",
      date: "14 September",
      lieu: "Bordeaux, Saint-Michel",
      photo:
        "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80",
    },
    elements: [],
  },
  {
    idBloc: "000000000000000000000005",
    type: "AVANT_APRES",
    ordre: 4,
    visible: true,
    miseEnPage: "GRILLE",
    configuration: {
      titre: "Editing and Retouching",
      description:
        "A subtle film-inspired tone and carefully shaped shadows, while preserving natural skin tones.",
      photoAvant:
        "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1000&q=80",
      photoApres:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=80",
    },
    elements: [],
  },
  {
    idBloc: "000000000000000000000006",
    type: "TEMOIGNAGES",
    ordre: 5,
    visible: true,
    miseEnPage: "GRILLE",
    configuration: {
      titre: "What Couples and Families Say",
      temoignages: [
        {
          id: "t1",
          auteur: "Claire & Julien",
          role: "Wedding in Dordogne",
          note: 5,
          texte:
            "Aurélie captured the very essence of our day without ever intruding. The photographs are timeless and wonderfully poetic.",
        },
        {
          id: "t2",
          auteur: "Sophie & Mathieu",
          role: "Newborn session",
          note: 5,
          texte:
            "Exceptional gentleness throughout the in-home session. The images are luminous and so natural that they move us every time.",
        },
        {
          id: "t3",
          auteur: "Thomas D.",
          role: "Editorial portrait",
          note: 5,
          texte:
            "A precise eye, thoughtful direction, and results that exceed all my professional expectations.",
        },
      ],
    },
    elements: [],
  },
  {
    idBloc: "000000000000000000000007",
    type: "SERVICES",
    ordre: 6,
    visible: true,
    miseEnPage: "GRILLE",
    configuration: {
      titre: "Collections and Pricing",
      forfaits: [
        {
          nom: "Heritage Wedding",
          description:
            "Coverage from preparations through the wedding cake, private online gallery, and fine-art print box.",
          prixAPartirDe: 2400,
          duree: "Journée entière (12h)",
        },
        {
          nom: "Essential Wedding",
          description: "Ceremony, cocktail reception, and couple session. Private high-resolution gallery.",
          prixAPartirDe: 1400,
          duree: "Demi-journée (6h)",
        },
        {
          nom: "Couple / Portrait Session",
          description: "Location of your choice in Bordeaux and the surrounding area, 35 edited photographs.",
          prixAPartirDe: 320,
          duree: "1h30 en extérieur",
        },
      ],
    },
    elements: [],
  },
  {
    idBloc: "000000000000000000000008",
    type: "STATISTIQUES",
    ordre: 7,
    visible: true,
    miseEnPage: "GRILLE",
    configuration: {
      stat1_label: "Sessions completed",
      stat2_label: "Clients served",
      stat3_label: "Verified average rating",
    },
    elements: [],
  },
  {
    idBloc: "000000000000000000000010",
    type: "CONTACT",
    ordre: 8,
    visible: true,
    miseEnPage: "GRILLE",
    configuration: {
      titre: "Let's discuss your project",
      texteIntro:
        "Tell me about your date, location, or project. I accept a limited number of sessions each season so every story receives my full attention.",
      typesSeance: ["Wedding", "Couple Session", "Portrait", "Private Event"],
    },
    elements: [],
  },
];
