/**
 * Module : Gestion des Invitations. Animation timing, pure: given an element's animation and the time
 * since the card opened, how it looks right now. The stage applies the result frame by frame; the
 * exports never call it (they show the final state).
 */
import type { AnimationElement, ContenuInvitation, Easing, TypeAmbiance } from "./invitation.schema";

export type EtatAnime = {
  opacite: number;
  dx: number;
  dy: number;
  echelle: number;
  /** Share of the element uncovered by "Reveal", from left to right. */
  revelation: number;
  /** Share of the letters shown by "Typewriter". */
  lettres: number;
};

export const ETAT_FINAL: EtatAnime = { opacite: 1, dx: 0, dy: 0, echelle: 1, revelation: 1, lettres: 1 };

const borne = (v: number) => Math.min(1, Math.max(0, v));

export function appliquerEasing(nom: Easing, t: number): number {
  const x = borne(t);
  switch (nom) {
    case "LINEAIRE": return x;
    case "DOUCE": return x * x * (3 - 2 * x);
    case "ENTREE": return x * x * x;
    case "SORTIE": return 1 - (1 - x) ** 3;
    case "REBOND": {
      // easeOutBack: overshoots a little, then settles.
      const c = 1.70158;
      return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2;
    }
  }
}

const GLISSEMENT = 40;

/** How an element looks `t` seconds after the card opened. Without animation: its final state. */
export function etatAnimation(animation: AnimationElement | undefined, t: number): EtatAnime {
  if (!animation) return ETAT_FINAL;
  const etat: EtatAnime = { ...ETAT_FINAL };
  const fin = animation.delai + animation.duree;

  if (animation.type !== "AUCUNE") {
    const brut = (t - animation.delai) / animation.duree;
    const p = appliquerEasing(animation.easing, brut);
    const avant = t < animation.delai;
    switch (animation.type) {
      case "FONDU": etat.opacite = borne(p); break;
      case "GLISSEMENT_HAUT": etat.dy = (1 - p) * GLISSEMENT; etat.opacite = borne(brut * 1.5); break;
      case "GLISSEMENT_BAS": etat.dy = -(1 - p) * GLISSEMENT; etat.opacite = borne(brut * 1.5); break;
      case "GLISSEMENT_GAUCHE": etat.dx = (1 - p) * GLISSEMENT * 1.5; etat.opacite = borne(brut * 1.5); break;
      case "GLISSEMENT_DROITE": etat.dx = -(1 - p) * GLISSEMENT * 1.5; etat.opacite = borne(brut * 1.5); break;
      case "ZOOM": etat.echelle = 0.6 + 0.4 * p; etat.opacite = borne(brut * 1.5); break;
      case "REVELATION": etat.revelation = borne(p); etat.opacite = avant ? 0 : 1; break;
      case "MACHINE_A_ECRIRE": etat.lettres = borne(brut); etat.opacite = avant ? 0 : 1; break;
    }
  }

  if (animation.boucle !== "AUCUNE") {
    const debut = animation.type === "AUCUNE" ? 0 : fin;
    if (t >= debut) {
      const phase = ((t - debut) / animation.dureeBoucle) * Math.PI * 2;
      if (animation.boucle === "FLOTTEMENT") etat.dy += Math.sin(phase) * 4;
      if (animation.boucle === "SCINTILLEMENT") etat.opacite *= 0.8 + 0.2 * Math.cos(phase);
      if (animation.boucle === "PULSATION") etat.echelle *= 1 + 0.035 * Math.sin(phase);
    }
  }
  return etat;
}

/** When the last entrance is over, in seconds (loops go on after it). */
export function dureeEntrees(contenu: ContenuInvitation): number {
  return contenu.elements.reduce((max, e) => (e.animation && e.animation.type !== "AUCUNE" ? Math.max(max, e.animation.delai + e.animation.duree) : max), 0);
}

export const aDesBoucles = (contenu: ContenuInvitation) => contenu.elements.some((e) => e.animation && e.animation.boucle !== "AUCUNE");

export const estAnimee = (contenu: ContenuInvitation) =>
  contenu.elements.some((e) => e.animation && (e.animation.type !== "AUCUNE" || e.animation.boucle !== "AUCUNE"));

// ── Countdown ────────────────────────────────────────────────────────────────

/** Tunisia is UTC+1 all year: the date and time typed on the card are read in the studio's time. */
export const DECALAGE_STUDIO_MINUTES = 60;

export type CompteARebours = { jours: number; heures: number; minutes: number; secondes: number; passe: boolean };

export function compteARebours(date: string, heure: string, maintenant: Date, decalageMinutes = DECALAGE_STUDIO_MINUTES): CompteARebours | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!d) return null;
  const h = /^(\d{2}):(\d{2})$/.exec(heure);
  const cible = Date.UTC(+d[1], +d[2] - 1, +d[3], h ? +h[1] : 0, h ? +h[2] : 0) - decalageMinutes * 60_000;
  let reste = Math.max(0, Math.floor((cible - maintenant.getTime()) / 1000));
  const jours = Math.floor(reste / 86_400);
  reste -= jours * 86_400;
  const heures = Math.floor(reste / 3600);
  reste -= heures * 3600;
  const minutes = Math.floor(reste / 60);
  return { jours, heures, minutes, secondes: reste - minutes * 60, passe: cible <= maintenant.getTime() };
}

// ── Ambiance and device ──────────────────────────────────────────────────────

export type ConfigParticules = { couleurs: string[]; forme: "petale" | "confetti" | "ballon" | "etincelle" | "lanterne"; vitesse: number; montee: boolean };

export const PARTICULES: Record<TypeAmbiance, ConfigParticules> = {
  PETALES: { couleurs: ["#f4c2c2", "#e8a0a8", "#fbe3e8", "#ffffff"], forme: "petale", vitesse: 0.6, montee: false },
  CONFETTIS: { couleurs: ["#e63946", "#ffb703", "#219ebc", "#8ecae6", "#fb8500"], forme: "confetti", vitesse: 1, montee: false },
  BALLONS: { couleurs: ["#cde4f5", "#f9d6e0", "#fff1c1", "#c9e4c5"], forme: "ballon", vitesse: 0.5, montee: true },
  ETINCELLES: { couleurs: ["#fff4c2", "#e8c877", "#ffffff"], forme: "etincelle", vitesse: 0.35, montee: true },
  LANTERNES: { couleurs: ["#f6c453", "#f39c4a", "#e8c877"], forme: "lanterne", vitesse: 0.3, montee: true },
};

/** A few dozen particles at most: enough for the mood, light on a phone battery. */
export const nombreParticules = (densite: number, leger: boolean) => Math.round([0, 10, 18, 28][Math.min(3, Math.max(1, densite))] * (leger ? 0.5 : 1));

export type ProfilAppareil = "complet" | "leger" | "statique";

/** Reduced motion asked by the user: no animation at all. A small device: no particles or depth. */
export function profilAppareil(info: { mouvementReduit: boolean; coeurs?: number; memoireGo?: number; economieDonnees?: boolean }): ProfilAppareil {
  if (info.mouvementReduit) return "statique";
  if (info.economieDonnees || (info.coeurs !== undefined && info.coeurs <= 2) || (info.memoireGo !== undefined && info.memoireGo <= 2)) return "leger";
  return "complet";
}
