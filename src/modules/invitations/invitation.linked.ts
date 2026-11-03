/**
 * Link between the form and the card. A text element with `linkedTo` follows a form field: only its
 * text changes, so its position, size, rotation and style survive every edit of the form.
 */
import type { ChampLie, ContenuInvitation, DetailsInvitation, Langue } from "./invitation.schema";

const LOCALES: Record<Langue, string> = { fr: "fr-FR", en: "en-GB", ar: "ar-TN" };

const ATTENTE: Record<Langue, Record<ChampLie, string>> = {
  fr: { noms: "Vos prénoms", nomA: "Prénom", nomB: "Prénom", date: "Date", heure: "Heure", lieu: "Lieu", message: "Votre message" },
  en: { noms: "Your names", nomA: "Name", nomB: "Name", date: "Date", heure: "Time", lieu: "Venue", message: "Your message" },
  ar: { noms: "الأسماء", nomA: "الاسم", nomB: "الاسم", date: "التاريخ", heure: "الوقت", lieu: "المكان", message: "رسالتكم" },
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
  const valeurs: Record<ChampLie, string> = {
    noms,
    nomA: details.nomA,
    nomB: details.nomB,
    date: formaterDate(details.date, details.langue),
    heure: details.heure,
    lieu: details.lieu,
    message: details.message,
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

/** What the client should fill in before sending the card. Drafts may stay incomplete. */
export function champsManquants(details: DetailsInvitation): Partial<Record<keyof DetailsInvitation, string>> {
  const erreurs: Partial<Record<keyof DetailsInvitation, string>> = {};
  if (!details.nomA) erreurs.nomA = "Enter the first name.";
  if (!details.nomB) erreurs.nomB = "Enter the second name.";
  if (!details.date) erreurs.date = "Choose the date.";
  if (!details.heure) erreurs.heure = "Choose the time.";
  if (!details.lieu) erreurs.lieu = "Enter the venue.";
  return erreurs;
}

const ARABE = /[؀-ۿ]/;

/** Arabic reads right to left and its letters join: the canvas must not space them apart. */
export const estArabe = (texte: string) => ARABE.test(texte);
