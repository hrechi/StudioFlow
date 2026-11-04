export type GalleryPhoto = {
  id: string;
  src: string;
  alt: string;
  title: string;
  category: string;
  width?: number;
  height?: number;
  year?: string;
};

export type GalleryChapter = {
  id: string;
  number: string; // e.g. "01"
  label: string; // e.g. "01 — PORTRAIT"
  title: string; // e.g. "Âmes & Silences"
  subtitle?: string; // e.g. "Lumière naturelle & regards intimes"
  description?: string;
  photos: GalleryPhoto[];
};

export const GALLERY_CHAPTERS: GalleryChapter[] = [
  {
    id: "portrait",
    number: "01",
    label: "01 — PORTRAIT",
    title: "Âmes & Silences",
    subtitle: "Lumière naturelle, contrastes doux et regards sincères",
    description: "Une exploration intimiste de la vulnérabilité et de la présence en studio comme en extérieur.",
    photos: [
      {
        id: "p1",
        src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1400&q=85",
        alt: "Portrait de femme en clair-obscur",
        title: "Regard Ambré",
        category: "Portrait",
        year: "2024",
      },
      {
        id: "p2",
        src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1400&q=85",
        alt: "Portrait d'homme au soleil couchant",
        title: "Lumière Rasante",
        category: "Portrait",
        year: "2024",
      },
      {
        id: "p3",
        src: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1400&q=85",
        alt: "Profil sculptural en noir et blanc",
        title: "L'Ombre Douce",
        category: "Portrait",
        year: "2023",
      },
      {
        id: "p4",
        src: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1400&q=85",
        alt: "Regard contemplatif en lumière dorée",
        title: "Heure Bleue",
        category: "Portrait",
        year: "2024",
      },
    ],
  },
  {
    id: "mariage",
    number: "02",
    label: "02 — MARIAGE",
    title: "Éclats d'Émotion",
    subtitle: "Instants spontanés, gestes volés et promesses éternelles",
    description: "Le reportage discret de vos célébrations, sans pose artificielle, au plus près des émotions.",
    photos: [
      {
        id: "m1",
        src: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=85",
        alt: "Couple sous le voile en extérieur",
        title: "Le Voile Éthéré",
        category: "Mariage",
        year: "2024",
      },
      {
        id: "m2",
        src: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1400&q=85",
        alt: "Baiser volé sous une arche fleurie",
        title: "La Promesse",
        category: "Mariage",
        year: "2024",
      },
      {
        id: "m3",
        src: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1400&q=85",
        alt: "Marche solennelle dans l'allée",
        title: "L'Arrivée",
        category: "Mariage",
        year: "2023",
      },
      {
        id: "m4",
        src: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1400&q=85",
        alt: "Danse des mariés dans la pénombre",
        title: "Premier Pas",
        category: "Mariage",
        year: "2024",
      },
    ],
  },
  {
    id: "evenement",
    number: "03",
    label: "03 — ÉVÉNEMENT",
    title: "Vibrations Nocturnes",
    subtitle: "Scènes vivantes, énergie partagée et lumières de fête",
    description: "Capturer l'ambiance et la vibration des galas, concerts et rassemblements privés.",
    photos: [
      {
        id: "e1",
        src: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=85",
        alt: "Scène de concert sous projecteurs",
        title: "L'Accord Final",
        category: "Événement",
        year: "2024",
      },
      {
        id: "e2",
        src: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1400&q=85",
        alt: "Danseurs sous confettis dorés",
        title: "Étincelles",
        category: "Événement",
        year: "2024",
      },
      {
        id: "e3",
        src: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1400&q=85",
        alt: "Banquet en plein air au crépuscule",
        title: "Table d'Hôtes",
        category: "Événement",
        year: "2023",
      },
    ],
  },
  {
    id: "rue",
    number: "04",
    label: "04 — RUE & VOYAGE",
    title: "Passages Éphémères",
    subtitle: "Géométries urbaines, silhouettes et lumière du monde",
    description: "L'art de l'instant décisif dans les ruelles du monde entier.",
    photos: [
      {
        id: "r1",
        src: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1400&q=85",
        alt: "Ruelle tokyoïte sous la pluie avec néons",
        title: "Tokyo Rainy Night",
        category: "Rue",
        year: "2024",
      },
      {
        id: "r2",
        src: "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=1400&q=85",
        alt: "Skyline au coucher du soleil",
        title: "Verticalité",
        category: "Rue",
        year: "2023",
      },
      {
        id: "r3",
        src: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1400&q=85",
        alt: "Sommets montagneux et lune",
        title: "L'Horizon Blanc",
        category: "Voyage",
        year: "2024",
      },
    ],
  },
];

