/**
 * Module : Gestion des Invitations. Registry of event types.
 *
 * One entry per type: the labels of the form fields, what must be filled in before sending, the
 * default palettes, decorations and fonts, how the card opens and what floats around it on the
 * public page, the tone guidance given to the AI and the written texts used when the AI is off.
 * Templates (invitation.templates.ts) and the AI (invitation.ia.ts) are built from this table.
 */
import type {
  ChampLie,
  DetailsInvitation,
  Langue,
  Palette,
  Police,
  TypeAmbiance,
  TypeEvenement,
  TypeOuverture,
} from "./invitation.schema";

/** Optional form fields: a type shows the ones it gives a label to. */
export type ChampOptionnel = "nomA" | "nomB" | "titre" | "hotes" | "tenue" | "contact";

export type ConfigEvenement = {
  id: TypeEvenement;
  label: string;
  description: string;
  /** Decoration used as the icon of the type in the pickers. */
  icone: string;
  champs: Partial<Record<ChampOptionnel, string>>;
  /** What should be filled in before the card is sent (drafts may stay incomplete). */
  requis: (keyof DetailsInvitation)[];
  /** At least two: the templates are made from them. */
  palettes: [Palette, Palette, ...Palette[]];
  /** File names in public/invitations/decorations, without ".svg". */
  decorations: string[];
  polices: { titre: Police; texte: Police; arabe: Police };
  ouverture: TypeOuverture;
  ambiance: TypeAmbiance;
  /** For the AI: what the message is about and the tone that suits it. Written in English. */
  consigneIA: string;
  /** The small line at the top of the generated templates. */
  intro: Record<Langue, string>;
  /** Written texts, used by the templates and when the AI is not available. */
  messages: Record<Langue, { formel: string; chaleureux: string }>;
  /** Sample values for the template thumbnails. */
  exemple: { latin: Partial<DetailsInvitation>; arabe: Partial<DetailsInvitation> };
};

export const EVENEMENTS: Record<TypeEvenement, ConfigEvenement> = {
  MARIAGE: {
    id: "MARIAGE",
    label: "Wedding",
    description: "Ceremony, reception or both.",
    icone: "rings",
    champs: { nomA: "First name", nomB: "Second name", tenue: "Dress code", contact: "RSVP contact" },
    requis: ["nomA", "nomB", "date", "heure", "lieu"],
    palettes: [
      { fond: "#fbf7ef", principale: "#a8843f", secondaire: "#4a4032" },
      { fond: "#14213d", principale: "#e8c877", secondaire: "#e9e5d8" },
      { fond: "#fdf1f0", principale: "#8c3f4d", secondaire: "#5e3f44" },
    ],
    decorations: ["rings", "flower-rose", "flower-corner", "leaf-branch", "hearts-duo", "frame-gold", "frame-floral", "frame-arch", "divider-flourish"],
    polices: { titre: "Great Vibes", texte: "Cormorant Garamond", arabe: "Amiri" },
    ouverture: "ENVELOPPE",
    ambiance: "PETALES",
    consigneIA: "a wedding invitation: the couple invites their guests to their marriage",
    intro: { fr: "Avec leurs familles,", en: "Together with their families", ar: "بكل فرح" },
    messages: {
      fr: { formel: "ont la joie de vous convier à la célébration de leur mariage.", chaleureux: "On se marie ! Venez rire, danser et faire la fête avec nous pour ce grand jour." },
      en: { formel: "request the honour of your presence as they celebrate their marriage.", chaleureux: "We're getting married! Come laugh, dance and celebrate the big day with us." },
      ar: { formel: "يتشرفان بدعوتكم لحضور حفل زفافهما.", chaleureux: "سنتزوج! تعالوا نضحك ونرقص ونحتفل معًا بهذا اليوم الكبير." },
    },
    exemple: { latin: { nomA: "Sarah", nomB: "Adam" }, arabe: { nomA: "سارة", nomB: "آدم" } },
  },
  FIANCAILLES: {
    id: "FIANCAILLES",
    label: "Engagement",
    description: "Announce the engagement and gather the families.",
    icone: "diamond-ring",
    champs: { nomA: "First name", nomB: "Second name", tenue: "Dress code", contact: "RSVP contact" },
    requis: ["nomA", "nomB", "date", "lieu"],
    palettes: [
      { fond: "#fdf3ef", principale: "#b5656f", secondaire: "#5e3f44" },
      { fond: "#f7f1e6", principale: "#9c7a3c", secondaire: "#3f3a33" },
    ],
    decorations: ["diamond-ring", "rings", "hearts-duo", "flower-corner", "champagne", "frame-floral"],
    polices: { titre: "Great Vibes", texte: "Cormorant Garamond", arabe: "Amiri" },
    ouverture: "SCEAU",
    ambiance: "PETALES",
    consigneIA: "an engagement party: the couple announces their engagement and invites family and friends",
    intro: { fr: "SAVE THE DATE", en: "SAVE THE DATE", ar: "خطوبة" },
    messages: {
      fr: { formel: "ont la joie de vous annoncer leurs fiançailles et seraient heureux de les célébrer avec vous.", chaleureux: "On s'est dit oui ! Venez fêter nos fiançailles avec nous." },
      en: { formel: "are delighted to announce their engagement and would love to celebrate with you.", chaleureux: "We said yes! Come and celebrate our engagement with us." },
      ar: { formel: "يسعدهما أن يعلنا خطوبتهما ويتشرفان بحضوركم للاحتفال معهما.", chaleureux: "قلنا نعم! تعالوا نحتفل بخطوبتنا معًا." },
    },
    exemple: { latin: { nomA: "Lina", nomB: "Karim" }, arabe: { nomA: "لينا", nomB: "كريم" } },
  },
  HENNE: {
    id: "HENNE",
    label: "Henna night",
    description: "The traditional evening before the wedding.",
    icone: "henna-hand",
    champs: { nomA: "Bride's name", nomB: "Groom's name (optional)", hotes: "Hosted by", tenue: "Dress code" },
    requis: ["nomA", "date", "heure", "lieu"],
    palettes: [
      { fond: "#5c1a1b", principale: "#e8c877", secondaire: "#f6e7d0" },
      { fond: "#f6f1e4", principale: "#2f5d50", secondaire: "#7a4b22" },
    ],
    decorations: ["mandala", "henna-hand", "lantern", "frame-arch", "flower-rose", "star-sparkle"],
    polices: { titre: "Cinzel", texte: "Cormorant Garamond", arabe: "El Messiri" },
    ouverture: "RIDEAU",
    ambiance: "LANTERNES",
    consigneIA: "a henna night before a wedding, a festive North African tradition with songs, henna and sweets",
    intro: { fr: "Soirée du henné", en: "Henna night", ar: "ليلة الحناء" },
    messages: {
      fr: { formel: "vous invite à partager la soirée du henné, entre traditions, chants et douceurs.", chaleureux: "Venez chanter, danser et poser le henné avec nous pour une soirée inoubliable !" },
      en: { formel: "invites you to share her henna night, an evening of traditions, songs and sweets.", chaleureux: "Come sing, dance and get your henna done with us for an unforgettable night!" },
      ar: { formel: "تتشرف بدعوتكم لمشاركتها ليلة الحناء، بين العادات والأغاني والحلويات.", chaleureux: "تعالوا نغني ونرقص ونتزين بالحناء في ليلة لا تنسى!" },
    },
    exemple: { latin: { nomA: "Yasmine", nomB: "" }, arabe: { nomA: "ياسمين", nomB: "" } },
  },
  ANNIVERSAIRE: {
    id: "ANNIVERSAIRE",
    label: "Birthday",
    description: "From a first birthday to a big round number.",
    icone: "cake",
    champs: { nomA: "Name of the guest of honour", titre: "Celebration (e.g. 30th birthday)", contact: "RSVP contact", tenue: "Dress code" },
    requis: ["nomA", "date", "heure", "lieu"],
    palettes: [
      { fond: "#fff7e6", principale: "#d62839", secondaire: "#1d5c7a" },
      { fond: "#1d1b3a", principale: "#ffb703", secondaire: "#f1f1f1" },
    ],
    decorations: ["balloons", "cake", "confetti", "gift", "party-hat", "star-sparkle"],
    polices: { titre: "Dancing Script", texte: "Montserrat", arabe: "Cairo" },
    ouverture: "CADEAU",
    ambiance: "CONFETTIS",
    consigneIA: "a birthday party: friendly, festive, can be playful",
    intro: { fr: "C'est la fête !", en: "Let's celebrate!", ar: "حفلة عيد ميلاد" },
    messages: {
      fr: { formel: "a le plaisir de vous inviter à célébrer son anniversaire.", chaleureux: "Ballons, gâteau et bonne humeur : venez fêter mon anniversaire avec moi !" },
      en: { formel: "is pleased to invite you to celebrate their birthday.", chaleureux: "Balloons, cake and good vibes: come celebrate my birthday with me!" },
      ar: { formel: "يسعدنا دعوتكم للاحتفال بعيد الميلاد.", chaleureux: "بالونات وكعكة وأجواء رائعة: تعالوا نحتفل بعيد الميلاد معًا!" },
    },
    exemple: { latin: { nomA: "Nour", titre: "30th birthday" }, arabe: { nomA: "نور", titre: "عيد الميلاد الثلاثون" } },
  },
  NAISSANCE: {
    id: "NAISSANCE",
    label: "Baby shower / Newborn",
    description: "Celebrate a baby on the way or just arrived.",
    icone: "baby-rattle",
    champs: { nomA: "Baby's name (if known)", hotes: "Parents", contact: "RSVP contact" },
    requis: ["date", "heure", "lieu"],
    palettes: [
      { fond: "#f4f8fc", principale: "#4f6f94", secondaire: "#5f6f85" },
      { fond: "#fff5f7", principale: "#b05873", secondaire: "#6f5a61" },
    ],
    decorations: ["baby-rattle", "baby-footprints", "cloud-moon", "star-sparkle", "balloons"],
    polices: { titre: "Dancing Script", texte: "Lato", arabe: "Tajawal" },
    ouverture: "CADEAU",
    ambiance: "BALLONS",
    consigneIA: "a baby shower or a party for a newborn: tender, warm and light",
    intro: { fr: "Baby shower", en: "Baby shower", ar: "مرحبًا بالمولود" },
    messages: {
      fr: { formel: "Nous avons la joie de vous convier à célébrer l'arrivée de notre bébé.", chaleureux: "Un petit bonheur arrive ! Venez le fêter avec nous autour d'un goûter tout doux." },
      en: { formel: "We are delighted to invite you to celebrate the arrival of our baby.", chaleureux: "A little bundle of joy is on the way! Come celebrate with us over a sweet afternoon." },
      ar: { formel: "يسعدنا دعوتكم للاحتفال بقدوم مولودنا.", chaleureux: "فرحة صغيرة في الطريق! تعالوا نحتفل معًا في جلسة لطيفة." },
    },
    exemple: { latin: { nomA: "Little Adam", hotes: "Ines & Sami" }, arabe: { nomA: "آدم الصغير", hotes: "إيناس وسامي" } },
  },
  REMISE_DIPLOME: {
    id: "REMISE_DIPLOME",
    label: "Graduation",
    description: "A degree, a diploma, a well-deserved party.",
    icone: "graduation-cap",
    champs: { nomA: "Graduate's name", titre: "Degree or school", contact: "RSVP contact" },
    requis: ["nomA", "date", "heure", "lieu"],
    palettes: [
      { fond: "#0f2a4a", principale: "#e8c877", secondaire: "#f1f1f1" },
      { fond: "#ffffff", principale: "#7b1e3a", secondaire: "#3d3d3d" },
    ],
    decorations: ["graduation-cap", "diploma", "laurel", "star-sparkle", "confetti"],
    polices: { titre: "Cinzel", texte: "Lato", arabe: "El Messiri" },
    ouverture: "ENVELOPPE",
    ambiance: "CONFETTIS",
    consigneIA: "a graduation party: proud, celebratory, thanks the people who helped",
    intro: { fr: "Remise de diplôme", en: "Graduation", ar: "حفل التخرج" },
    messages: {
      fr: { formel: "a l'honneur de vous convier à la célébration de sa remise de diplôme.", chaleureux: "Diplôme en poche ! Venez fêter cette réussite avec moi." },
      en: { formel: "is honoured to invite you to celebrate their graduation.", chaleureux: "Degree in hand! Come celebrate this milestone with me." },
      ar: { formel: "يسعدنا دعوتكم لحضور حفل التخرج.", chaleureux: "الشهادة في اليد! تعالوا نحتفل بهذا النجاح معًا." },
    },
    exemple: { latin: { nomA: "Rania Ben Ali", titre: "Master in Architecture" }, arabe: { nomA: "رانية بن علي", titre: "ماجستير في الهندسة المعمارية" } },
  },
  ENTREPRISE: {
    id: "ENTREPRISE",
    label: "Corporate event",
    description: "Launch, gala, team party, anniversary of a company.",
    icone: "geometric-corner",
    champs: { nomA: "Company", titre: "Name of the event", hotes: "Hosted by", tenue: "Dress code", contact: "RSVP contact" },
    requis: ["nomA", "titre", "date", "heure", "lieu"],
    palettes: [
      { fond: "#ffffff", principale: "#1d3557", secondaire: "#4f5d6e" },
      { fond: "#25282c", principale: "#c9a46a", secondaire: "#e9edf2" },
    ],
    decorations: ["geometric-corner", "champagne", "laurel", "divider-dots", "star-sparkle"],
    polices: { titre: "Montserrat", texte: "Lato", arabe: "Tajawal" },
    ouverture: "ENVELOPPE",
    ambiance: "ETINCELLES",
    consigneIA: "a corporate event: professional, clear and welcoming, no private jokes",
    intro: { fr: "Invitation", en: "You are invited", ar: "دعوة" },
    messages: {
      fr: { formel: "a le plaisir de vous convier à cet événement, en présence de ses partenaires et collaborateurs.", chaleureux: "Rejoignez-nous pour une soirée d'échanges et de célébration !" },
      en: { formel: "is pleased to invite you to this event, alongside its partners and colleagues.", chaleureux: "Join us for an evening of conversations and celebration!" },
      ar: { formel: "يسرنا دعوتكم لحضور هذا الحدث بحضور شركائنا وزملائنا.", chaleureux: "انضموا إلينا في أمسية من التواصل والاحتفال!" },
    },
    exemple: { latin: { nomA: "Atelier Médina", titre: "10 years together" }, arabe: { nomA: "أتيليه المدينة", titre: "عشر سنوات معًا" } },
  },
  CONFERENCE: {
    id: "CONFERENCE",
    label: "Conference or workshop",
    description: "A talk, a training day, a meetup.",
    icone: "microphone",
    champs: { nomA: "Organiser", nomB: "Speaker", titre: "Title of the talk or workshop", contact: "Registration contact" },
    requis: ["titre", "date", "heure", "lieu"],
    palettes: [
      { fond: "#0b1d33", principale: "#4cc9f0", secondaire: "#e9edf2" },
      { fond: "#f7f7f2", principale: "#1f5f8b", secondaire: "#3d3d3d" },
    ],
    decorations: ["microphone", "lightbulb", "geometric-corner", "divider-dots"],
    polices: { titre: "Montserrat", texte: "Lato", arabe: "Cairo" },
    ouverture: "RIDEAU",
    ambiance: "ETINCELLES",
    consigneIA: "a conference or workshop invitation: informative, inviting people to learn and take part",
    intro: { fr: "Conférence", en: "Conference", ar: "مؤتمر" },
    messages: {
      fr: { formel: "vous invite à une rencontre pour apprendre, échanger et partager les bonnes pratiques.", chaleureux: "Une session pour apprendre, poser vos questions et repartir plein d'idées !" },
      en: { formel: "invites you to a session to learn, exchange and share good practice.", chaleureux: "A session to learn, ask your questions and leave full of ideas!" },
      ar: { formel: "يدعوكم إلى لقاء للتعلم والتبادل ومشاركة أفضل الممارسات.", chaleureux: "جلسة للتعلم وطرح أسئلتكم والعودة بأفكار جديدة!" },
    },
    exemple: { latin: { nomA: "Tunis Photo Club", nomB: "Mehdi Trabelsi", titre: "Light in portrait photography" }, arabe: { nomA: "نادي تونس للتصوير", nomB: "مهدي الطرابلسي", titre: "الضوء في تصوير البورتريه" } },
  },
  ANNIVERSAIRE_MARIAGE: {
    id: "ANNIVERSAIRE_MARIAGE",
    label: "Anniversary",
    description: "Years of marriage, a celebration of love.",
    icone: "hearts-duo",
    champs: { nomA: "First name", nomB: "Second name", titre: "Anniversary (e.g. 25 years)", contact: "RSVP contact" },
    requis: ["nomA", "nomB", "date", "lieu"],
    palettes: [
      { fond: "#f8f5ee", principale: "#8c6d3f", secondaire: "#4a4032" },
      { fond: "#2b2d42", principale: "#d4af37", secondaire: "#edf2f4" },
    ],
    decorations: ["rings", "hearts-duo", "champagne", "laurel", "flower-rose", "frame-gold"],
    polices: { titre: "Great Vibes", texte: "Cormorant Garamond", arabe: "Amiri" },
    ouverture: "SCEAU",
    ambiance: "ETINCELLES",
    consigneIA: "a wedding anniversary: grateful, warm, celebrates the years spent together",
    intro: { fr: "Nous fêtons", en: "Celebrating", ar: "نحتفل" },
    messages: {
      fr: { formel: "célèbrent leurs années de mariage et seraient heureux de partager ce moment avec vous.", chaleureux: "Tant d'années d'amour, et l'envie de les fêter avec vous !" },
      en: { formel: "are celebrating their years of marriage and would be glad to share this moment with you.", chaleureux: "So many years of love, and we want to celebrate them with you!" },
      ar: { formel: "يحتفلان بذكرى زواجهما ويسعدهما مشاركتكم هذه اللحظة.", chaleureux: "سنوات من الحب، ونريد أن نحتفل بها معكم!" },
    },
    exemple: { latin: { nomA: "Hedi", nomB: "Amel", titre: "25 years" }, arabe: { nomA: "الهادي", nomB: "أمل", titre: "خمسة وعشرون عامًا" } },
  },
  FETE_RELIGIEUSE: {
    id: "FETE_RELIGIEUSE",
    label: "Religious celebration",
    description: "Eid, Iftar and other celebrations with family and friends.",
    icone: "crescent-star",
    champs: { nomA: "Family or host", titre: "Celebration (Eid, Iftar…)", contact: "RSVP contact" },
    requis: ["titre", "date", "heure", "lieu"],
    palettes: [
      { fond: "#0f3d3e", principale: "#e8c877", secondaire: "#f6f1e4" },
      { fond: "#f6f1e4", principale: "#1f5f5b", secondaire: "#6e4a24" },
    ],
    decorations: ["crescent-star", "lantern", "mandala", "frame-arch", "star-sparkle"],
    polices: { titre: "Cinzel", texte: "Cormorant Garamond", arabe: "El Messiri" },
    ouverture: "RIDEAU",
    ambiance: "LANTERNES",
    consigneIA: "a religious celebration such as Eid or an Iftar: respectful, warm and inclusive, without religious claims or quotations",
    intro: { fr: "Invitation", en: "You are invited", ar: "دعوة" },
    messages: {
      fr: { formel: "a la joie de vous convier à partager ce moment béni autour d'une table conviviale.", chaleureux: "Venez partager avec nous la joie de cette fête, en famille et entre amis." },
      en: { formel: "is delighted to invite you to share this blessed moment around a warm table.", chaleureux: "Come share the joy of this celebration with us, with family and friends." },
      ar: { formel: "يتشرفون بدعوتكم لمشاركتهم هذه المناسبة المباركة حول مائدة عامرة.", chaleureux: "تعالوا نتشارك فرحة هذه المناسبة مع العائلة والأصدقاء." },
    },
    exemple: { latin: { nomA: "The Gharbi family", titre: "Iftar dinner" }, arabe: { nomA: "عائلة الغربي", titre: "مأدبة إفطار" } },
  },
  CREMAILLERE: {
    id: "CREMAILLERE",
    label: "Housewarming",
    description: "Show your new home to the people you love.",
    icone: "house-key",
    champs: { nomA: "Hosts", contact: "RSVP contact" },
    requis: ["nomA", "date", "heure", "lieu"],
    palettes: [
      { fond: "#fbf8f3", principale: "#3a5a40", secondaire: "#5c5f4f" },
      { fond: "#fefae0", principale: "#a35a1c", secondaire: "#283618" },
    ],
    decorations: ["house", "house-key", "leaf-branch", "balloons"],
    polices: { titre: "Playfair Display", texte: "Lato", arabe: "Tajawal" },
    ouverture: "CADEAU",
    ambiance: "CONFETTIS",
    consigneIA: "a housewarming party: relaxed, friendly, invites people to discover the new home",
    intro: { fr: "Nouveau chez-nous", en: "New home!", ar: "بيت جديد" },
    messages: {
      fr: { formel: "ont le plaisir de vous accueillir dans leur nouvelle maison pour pendre la crémaillère.", chaleureux: "Nouvelles clés, nouvelle déco : venez fêter notre nouveau chez-nous !" },
      en: { formel: "would be pleased to welcome you to their new home for a housewarming.", chaleureux: "New keys, new home: come celebrate our new place with us!" },
      ar: { formel: "يسعدهم استقبالكم في منزلهم الجديد للاحتفال به.", chaleureux: "مفاتيح جديدة وبيت جديد: تعالوا نحتفل معًا!" },
    },
    exemple: { latin: { nomA: "Sarra & Youssef" }, arabe: { nomA: "سارة ويوسف" } },
  },
};

export const LISTE_EVENEMENTS = Object.values(EVENEMENTS);

export const configEvenement = (type: TypeEvenement): ConfigEvenement => EVENEMENTS[type];

/** Optional fields the form shows for a type, with their label. */
export function champsVisibles(type: TypeEvenement): { champ: ChampOptionnel; label: string }[] {
  return (Object.entries(EVENEMENTS[type].champs) as [ChampOptionnel, string][]).map(([champ, label]) => ({ champ, label }));
}

const LIBELLES_COMMUNS: Record<ChampLie, string> = {
  noms: "Both names",
  nomA: "First name",
  nomB: "Second name",
  date: "Date",
  heure: "Time",
  lieu: "Venue",
  message: "Message",
  titre: "Title",
  hotes: "Hosts",
  tenue: "Dress code",
  contact: "Contact",
  adresse: "Address",
};

/** Label of a linked field in the editor, with the words of the event type. */
export function libelleChamp(type: TypeEvenement, champ: ChampLie): string {
  const { champs } = EVENEMENTS[type];
  if (champ === "noms") {
    if (champs.nomA && champs.nomB) return `${champs.nomA} & ${champs.nomB}`.replace(/ \(.*?\)/g, "");
    return champs.nomA ?? LIBELLES_COMMUNS.noms;
  }
  return (champ in champs ? champs[champ as ChampOptionnel] : undefined) ?? LIBELLES_COMMUNS[champ];
}
