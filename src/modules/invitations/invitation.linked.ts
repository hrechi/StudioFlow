/**
 * Link between the form and the card. A text element with `linkedTo` follows a form field: only its
 * text changes, so its position, size, rotation and style survive every edit of the form.
 */
import { EVENEMENTS } from "./invitation.evenements";
import type { ChampLie, ContenuInvitation, DetailsInvitation, Langue, TypeEvenement } from "./invitation.schema";

const LOCALES: Record<Langue, string> = { fr: "fr-FR", en: "en-GB", ar: "ar-TN" };

const ATTENTE: Record<Langue, Record<ChampLie, string>> = {
  fr: {
    noms: "Vos prénoms", nomA: "Prénom", nomB: "Prénom", date: "Date", heure: "Heure", lieu: "Lieu", message: "Votre message",
    titre: "Titre de l'événement", hotes: "Vos hôtes", tenue: "Tenue", contact: "Contact", adresse: "Adresse",
  },
  en: {
    noms: "Your names", nomA: "Name", nomB: "Name", date: "Date", heure: "Time", lieu: "Venue", message: "Your message",
    titre: "Event title", hotes: "Your hosts", tenue: "Dress code", contact: "Contact", adresse: "Address",
  },
  ar: {
    noms: "الأسماء", nomA: "الاسم", nomB: "الاسم", date: "التاريخ", heure: "الوقت", lieu: "المكان", message: "رسالتكم",
    titre: "عنوان المناسبة", hotes: "المضيفون", tenue: "اللباس", contact: "للتواصل", adresse: "العنوان",
  },
};

/** Words printed before some fields ("Dress code: …"), in the language of the card. */
const PREFIXES: Record<Langue, Partial<Record<ChampLie, string>>> = {
  fr: { tenue: "Tenue : ", contact: "Réponse souhaitée : ", hotes: "Organisé par " },
  en: { tenue: "Dress code: ", contact: "RSVP: ", hotes: "Hosted by " },
  ar: { tenue: "اللباس: ", contact: "للتأكيد: ", hotes: "بدعوة من " },
};

/** The date is a plain YYYY-MM-DD: formatted in UTC so it never shifts a day with the timezone. */
export function formaterDate(date: string, langue: Langue): string {
  if (!date) return "";
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat(LOCALES[langue], { dateStyle: "full", timeZone: "UTC" }).format(parsed);
}

export function valeurChamp(details: DetailsInvitation, champ: ChampLie): string {
  const noms = [details.nomA, details.nomB].filter(Boolean).join(" & ");
  const prefixe = (valeur: string | undefined) => (valeur ? `${PREFIXES[details.langue][champ] ?? ""}${valeur}` : "");
  const valeurs: Record<ChampLie, string> = {
    noms,
    nomA: details.nomA,
    nomB: details.nomB,
    date: formaterDate(details.date, details.langue),
    heure: details.heure,
    lieu: details.lieu,
    message: details.message,
    titre: details.titre ?? "",
    hotes: prefixe(details.hotes),
    tenue: prefixe(details.tenue),
    contact: prefixe(details.contact),
    adresse: details.adresse ?? "",
  };
  return valeurs[champ] || ATTENTE[details.langue][champ];
}

export function appliquerDetails(contenu: ContenuInvitation): ContenuInvitation {
  return {
    ...contenu,
    elements: contenu.elements.map((element) =>
      element.type === "text" && element.linkedTo
        ? { ...element, text: valeurChamp(contenu.details, element.linkedTo) }
        : element,
    ),
  };
}

const MESSAGES_MANQUANTS: Partial<Record<keyof DetailsInvitation, string>> = {
  date: "Choose the date.",
  heure: "Choose the time.",
  lieu: "Enter the venue.",
  titre: "Enter the title of the event.",
};

/**
 * What the client should fill in before sending the card, for its event type (the required
 * fields of a wedding are the same as before types existed). Drafts may stay incomplete.
 */
export function champsManquants(details: DetailsInvitation, type: TypeEvenement = "MARIAGE"): Partial<Record<keyof DetailsInvitation, string>> {
  const config = EVENEMENTS[type];
  const erreurs: Partial<Record<keyof DetailsInvitation, string>> = {};
  for (const champ of config.requis) {
    if (details[champ]) continue;
    if (champ === "nomA" || champ === "nomB") {
      erreurs[champ] = type === "MARIAGE"
        ? champ === "nomA" ? "Enter the first name." : "Enter the second name."
        : `Enter: ${(config.champs[champ] ?? "name").toLowerCase()}.`;
    } else {
      erreurs[champ] = MESSAGES_MANQUANTS[champ] ?? "This field is required.";
    }
  }
  return erreurs;
}

const ARABE = /[؀-ۿ]/;

/** Arabic reads right to left and its letters join: the canvas must not space them apart. */
export const estArabe = (texte: string) => ARABE.test(texte);
