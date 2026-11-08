/**
 * Module : Gestion des Invitations. What the guest page and the "Send" dialog compute, pure: the
 * calendar entry (Google Calendar link and .ics file), the reply links built from the RSVP contact,
 * the words of the guest page in the language of the card, and the message sent with the link.
 */
import { DECALAGE_STUDIO_MINUTES } from "./invitation.animation";
import { configEvenement } from "./invitation.evenements";
import { lienGoogleMaps } from "./invitation.lieu";
import { formaterDate, valeurChamp } from "./invitation.linked";
import type { ContenuInvitation, DetailsInvitation, Langue } from "./invitation.schema";

/** An evening event lasts about four hours when the card gives no end. */
const DUREE_PAR_DEFAUT_H = 4;

const deux = (n: number) => String(n).padStart(2, "0");
const horodatage = (d: Date) =>
  `${d.getUTCFullYear()}${deux(d.getUTCMonth() + 1)}${deux(d.getUTCDate())}T${deux(d.getUTCHours())}${deux(d.getUTCMinutes())}00Z`;
const jour = (d: Date) => `${d.getUTCFullYear()}${deux(d.getUTCMonth() + 1)}${deux(d.getUTCDate())}`;

export type Creneau = { journee: true; debut: string; fin: string } | { journee: false; debut: string; fin: string };

/**
 * Start and end for a calendar. The date and time of the card are read in the studio's time
 * (Tunisia, UTC+1); without a time the event takes the whole day.
 */
export function creneau(details: Pick<DetailsInvitation, "date" | "heure">, decalageMinutes = DECALAGE_STUDIO_MINUTES): Creneau | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(details.date);
  if (!d) return null;
  const h = /^(\d{2}):(\d{2})$/.exec(details.heure);
  if (!h) {
    const debut = new Date(Date.UTC(+d[1], +d[2] - 1, +d[3]));
    return { journee: true, debut: jour(debut), fin: jour(new Date(debut.getTime() + 86_400_000)) };
  }
  const debut = new Date(Date.UTC(+d[1], +d[2] - 1, +d[3], +h[1], +h[2]) - decalageMinutes * 60_000);
  return { journee: false, debut: horodatage(debut), fin: horodatage(new Date(debut.getTime() + DUREE_PAR_DEFAUT_H * 3_600_000)) };
}

/** Name of the event in the calendar: "Wedding · Sarah & Adam", "Iftar dinner · The Gharbi family". */
export function titreAgenda(contenu: Pick<ContenuInvitation, "details" | "typeEvenement">): string {
  const config = configEvenement(contenu.typeEvenement ?? "MARIAGE");
  const { details } = contenu;
  const noms = [details.nomA, details.nomB].filter(Boolean).join(" & ");
  const quoi = details.titre?.trim() || config.label;
  return [quoi, noms].filter(Boolean).join(" · ");
}

const lieuAgenda = (details: DetailsInvitation) => [details.lieu, details.adresse].filter((x) => x?.trim()).join(", ");

export function lienAgendaGoogle(contenu: Pick<ContenuInvitation, "details" | "typeEvenement">, lien?: string): string | null {
  const c = creneau(contenu.details);
  if (!c) return null;
  const notes = [contenu.details.message, lienGoogleMaps(contenu.details), lien].filter(Boolean).join("\n\n");
  const params = new URLSearchParams({ action: "TEMPLATE", text: titreAgenda(contenu), dates: `${c.debut}/${c.fin}`, details: notes, location: lieuAgenda(contenu.details) });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** RFC 5545 text: backslash, semicolon and comma escaped, new lines as \n. */
const echapperIcs = (texte: string) => texte.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Lines longer than 75 octets are folded (continuation lines start with a space). */
function plier(ligne: string): string {
  const morceaux: string[] = [];
  let reste = ligne;
  while (new TextEncoder().encode(reste).length > 75) {
    let n = 74;
    while (new TextEncoder().encode(reste.slice(0, n)).length > 74) n -= 1;
    morceaux.push(reste.slice(0, n));
    reste = ` ${reste.slice(n)}`;
  }
  morceaux.push(reste);
  return morceaux.join("\r\n");
}

/** A calendar file for Apple Calendar, Outlook and the others. `maintenant` makes it testable. */
export function fichierIcs(contenu: Pick<ContenuInvitation, "details" | "typeEvenement">, options: { uid: string; lien?: string; maintenant?: Date }): string | null {
  const c = creneau(contenu.details);
  if (!c) return null;
  const quand = c.journee ? [`DTSTART;VALUE=DATE:${c.debut}`, `DTEND;VALUE=DATE:${c.fin}`] : [`DTSTART:${c.debut}`, `DTEND:${c.fin}`];
  const description = [contenu.details.message, lienGoogleMaps(contenu.details), options.lien].filter(Boolean).join("\n\n");
  const lignes = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ReFrame//Invitations//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${options.uid}@reframe`,
    `DTSTAMP:${horodatage(options.maintenant ?? new Date())}`,
    ...quand,
    `SUMMARY:${echapperIcs(titreAgenda(contenu))}`,
    ...(lieuAgenda(contenu.details) ? [`LOCATION:${echapperIcs(lieuAgenda(contenu.details))}`] : []),
    ...(description ? [`DESCRIPTION:${echapperIcs(description)}`] : []),
    ...(options.lien ? [`URL:${options.lien}`] : []),
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${echapperIcs(titreAgenda(contenu))}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lignes.map(plier).join("\r\n")}\r\n`;
}

// ── Replying to the hosts ────────────────────────────────────────────────────

export type MoyenReponse = { type: "appel" | "whatsapp" | "email"; href: string; valeur: string };

/**
 * The RSVP contact is free text ("Sarah 22 123 456", "rsvp@mail.tn"): the phone numbers and the
 * email found in it become links. A Tunisian number of 8 digits gets the +216 prefix for WhatsApp.
 */
export function moyensReponse(contact: string | undefined): MoyenReponse[] {
  if (!contact?.trim()) return [];
  const moyens: MoyenReponse[] = [];
  const email = /[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}/i.exec(contact)?.[0];
  const telephone = /(\+|00)?\d[\d\s.-]{6,}\d/.exec(contact)?.[0];
  if (telephone) {
    const chiffres = telephone.replace(/\D/g, "").replace(/^00/, "");
    const international = telephone.trim().startsWith("+") || telephone.trim().startsWith("00") ? chiffres : chiffres.length === 8 ? `216${chiffres}` : chiffres;
    if (international.length >= 8) {
      moyens.push({ type: "appel", href: `tel:+${international}`, valeur: telephone.trim() });
      moyens.push({ type: "whatsapp", href: `https://wa.me/${international}`, valeur: telephone.trim() });
    }
  }
  if (email) moyens.push({ type: "email", href: `mailto:${email}`, valeur: email });
  return moyens;
}

// ── Words of the guest page, in the language of the card ─────────────────────

export const MOTS_INVITE = {
  fr: {
    invite: "Vous êtes invité(e)", ouvrir: "Ouvrir l'invitation", toucher: "Touchez pour ouvrir",
    jours: "jours", heures: "heures", minutes: "minutes", secondes: "secondes", avant: "avant le grand jour", passe: "Ce moment a déjà eu lieu. Merci d'y avoir pris part !",
    quand: "Quand", ou: "Où", agenda: "Ajouter à Google Agenda", ics: "Autre agenda (.ics)", tenue: "Tenue", hotes: "Hôtes",
    reponse: "Confirmer votre présence", appeler: "Appeler", whatsapp: "WhatsApp", email: "E-mail", partager: "Partager l'invitation", copie: "Lien copié",
    rejouer: "Revoir l'ouverture", carte: "Voir sur la carte", musique: "Musique", pause: "Pause",
  },
  en: {
    invite: "You are invited", ouvrir: "Open the invitation", toucher: "Tap to open",
    jours: "days", heures: "hours", minutes: "minutes", secondes: "seconds", avant: "until the big day", passe: "This moment has already happened. Thank you for being part of it!",
    quand: "When", ou: "Where", agenda: "Add to Google Calendar", ics: "Other calendar (.ics)", tenue: "Dress code", hotes: "Hosts",
    reponse: "Let them know you're coming", appeler: "Call", whatsapp: "WhatsApp", email: "Email", partager: "Share the invitation", copie: "Link copied",
    rejouer: "Replay the opening", carte: "See on the map", musique: "Music", pause: "Pause",
  },
  ar: {
    invite: "أنتم مدعوون", ouvrir: "افتحوا الدعوة", toucher: "المسوا للفتح",
    jours: "أيام", heures: "ساعات", minutes: "دقائق", secondes: "ثوان", avant: "على اليوم الكبير", passe: "لقد مضت هذه المناسبة. شكرًا لمشاركتكم!",
    quand: "متى", ou: "أين", agenda: "أضف إلى تقويم Google", ics: "تقويم آخر (.ics)", tenue: "اللباس", hotes: "المضيفون",
    reponse: "أكدوا حضوركم", appeler: "اتصال", whatsapp: "واتساب", email: "بريد", partager: "شارك الدعوة", copie: "تم نسخ الرابط",
    rejouer: "إعادة الفتح", carte: "على الخريطة", musique: "موسيقى", pause: "إيقاف",
  },
} satisfies Record<Langue, Record<string, string>>;
export type MotsInvite = (typeof MOTS_INVITE)["en"];

/** Initials for the wax seal: "S & A", or the first letter of the title. */
export function initiales(details: DetailsInvitation): string {
  const lettre = (s: string | undefined) => (s?.trim() ? [...s.trim()][0].toUpperCase() : "");
  const a = lettre(details.nomA);
  const b = lettre(details.nomB);
  if (a && b) return `${a}&${b}`;
  return a || lettre(details.titre) || "♥";
}

// ── The message sent with the link ───────────────────────────────────────────

const ENVOI: Record<Langue, (quoi: string, quand: string, lien: string) => string> = {
  fr: (quoi, quand, lien) => `Vous êtes invité(e) ! ${quoi}${quand ? ` — ${quand}` : ""}.\nOuvrez votre invitation : ${lien}`,
  en: (quoi, quand, lien) => `You're invited! ${quoi}${quand ? ` — ${quand}` : ""}.\nOpen your invitation: ${lien}`,
  ar: (quoi, quand, lien) => `أنتم مدعوون! ${quoi}${quand ? ` — ${quand}` : ""}.\nافتحوا الدعوة: ${lien}`,
};

export function messageEnvoi(contenu: Pick<ContenuInvitation, "details" | "typeEvenement">, lien: string): string {
  const { details } = contenu;
  const quand = [formaterDate(details.date, details.langue), details.heure].filter(Boolean).join(", ");
  const noms = valeurChamp(details, "noms");
  const quoi = [details.titre, details.nomA || details.nomB ? noms : ""].filter(Boolean).join(" · ") || configEvenement(contenu.typeEvenement ?? "MARIAGE").label;
  return ENVOI[details.langue](quoi, quand, lien);
}

export type CanalEnvoi = { id: "whatsapp" | "sms" | "email" | "telegram" | "messenger"; label: string; href: string };

/** One link per app; each opens the app with the message ready to send. */
export function canauxEnvoi(message: string, lien: string, sujet: string): CanalEnvoi[] {
  const m = encodeURIComponent(message);
  return [
    { id: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${m}` },
    { id: "messenger", label: "Messenger", href: `fb-messenger://share/?link=${encodeURIComponent(lien)}` },
    { id: "telegram", label: "Telegram", href: `https://t.me/share/url?url=${encodeURIComponent(lien)}&text=${encodeURIComponent(message.replace(lien, "").trim())}` },
    { id: "sms", label: "SMS", href: `sms:?&body=${m}` },
    { id: "email", label: "Email", href: `mailto:?subject=${encodeURIComponent(sujet)}&body=${m}` },
  ];
}
