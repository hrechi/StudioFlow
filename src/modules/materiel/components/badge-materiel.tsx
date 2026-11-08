"use client";

/* Module : Gestion du Matériel · Responsable : Amel Mediouni */
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { cleEmballes, clePortee, compterBadge, type JourneeDTO, type PorteeJournee } from "../journee.types";

type NavigatorBadge = Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };

/** Number on the app icon (Badging API). Browsers without it are simply left alone; 0 clears it. */
export function afficherBadge(nombre: number) {
  const nav = navigator as NavigatorBadge;
  if (!nav.setAppBadge || !nav.clearAppBadge) return;
  (nombre > 0 ? nav.setAppBadge(nombre) : nav.clearAppBadge()).catch(() => undefined);
}

function lire<T>(cle: string): T | null {
  try {
    const brut = window.localStorage.getItem(cle);
    return brut ? (JSON.parse(brut) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Keeps the number on the app icon up to date from any Equipment page: on load and each time the
 * app comes back to the front. "My day" updates it itself. Does nothing without the Badging API.
 */
export function BadgeMateriel({ utilisateurId }: { utilisateurId: string }) {
  const chemin = usePathname();
  const surMaJournee = chemin === "/dashboard/materiel/today";

  useEffect(() => {
    if (surMaJournee || !("setAppBadge" in navigator)) return;
    let actif = true;
    const mettreAJour = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const portee = lire<PorteeJournee>(clePortee(utilisateurId)) ?? "moi";
        const reponse = await fetch(`/api/materiel/today?portee=${portee}`, { cache: "no-store" });
        if (!reponse.ok || !actif) return;
        const journee = (await reponse.json()) as JourneeDTO;
        const emballes = new Set(lire<string[]>(cleEmballes(utilisateurId, journee.date)) ?? []);
        afficherBadge(compterBadge(journee, emballes));
      } catch {
        // Offline: the badge keeps its last number.
      }
    };
    void mettreAJour();
    document.addEventListener("visibilitychange", mettreAJour);
    return () => {
      actif = false;
      document.removeEventListener("visibilitychange", mettreAJour);
    };
  }, [surMaJournee, utilisateurId]);

  return null;
}
