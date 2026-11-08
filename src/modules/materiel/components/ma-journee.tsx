"use client";

/* Module : Gestion du Matériel · Responsable : Amel Mediouni */
/**
 * "My day", phone first. A checklist per session, in the order of the day:
 *   Pack (tick each item) → Pick up (confirmed / handed over) → Shoot → Return (one item at a time)
 * with everything the photographer needs on site: client and how to reach them, venue and
 * directions, what was sold, the team, the studio's brief and the client's message, and the tasks
 * of the day for that session.
 *
 * Works offline from the last copy, refreshes when the app comes back, and keeps the app badge up
 * to date. The services check every right again (owner or ADMIN).
 */
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  ClipboardList,
  Clock,
  FileDown,
  Hand,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquareQuote,
  Navigation,
  Package,
  PackageCheck,
  Phone,
  RefreshCw,
  RotateCcw,
  StickyNote,
  Users,
  WifiOff,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";
import { statutSeanceReelConfig, type StatutSeanceReel } from "@/modules/seances/seance.dto";
import { setTacheStatutAction } from "@/modules/seances/tache.actions";
import {
  cleEmballes,
  cleInstantane,
  clePortee,
  compterBadge,
  FUSEAU_STUDIO,
  instantaneValide,
  PREFIXE_STOCKAGE,
  STATUTS_A_PRENDRE,
  type JourneeDTO,
  type PorteeJournee,
  type ReservationJourDTO,
  type SeanceJourDTO,
  type TacheJourDTO,
} from "../journee.types";
import { categorieMaterielLabels, statutReservationConfig } from "../materiel.types";
import { afficherBadge } from "./badge-materiel";
import {
  appliquerTransitionGroupeAction,
  confirmerReservationAction,
  demarrerReservationAction,
  enregistrerRetourAction,
  genererPackingListAction,
  signalerPanneAction,
} from "../reservation-materiel.actions";

// ── Storage on the phone (always guarded: private mode, full or blocked storage) ──

function lire<T>(cle: string): T | null {
  try {
    const brut = window.localStorage.getItem(cle);
    return brut ? (JSON.parse(brut) as T) : null;
  } catch {
    return null;
  }
}

function ecrire(cle: string, valeur: unknown) {
  try {
    window.localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    // Storage full or blocked: the page still works, only without the offline copy.
  }
}

/** Never keep another account's data on this device. */
function oublierAutresComptes(utilisateurId: string) {
  try {
    const cles = Object.keys(window.localStorage).filter((k) => k.startsWith(PREFIXE_STOCKAGE) && !k.includes(`:${utilisateurId}:`) && !k.endsWith(`:${utilisateurId}`));
    for (const k of cles) window.localStorage.removeItem(k);
  } catch {
    // Nothing to clean, or no access to storage.
  }
}

// ── Time ─────────────────────────────────────────────────────────────────────

const heure = (iso: string) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: FUSEAU_STUDIO }).format(new Date(iso));
const jourLong = (date: string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
const jourCourt = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: FUSEAU_STUDIO }).format(new Date(iso));

function duree(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h} h${m ? ` ${String(m).padStart(2, "0")}` : ""}` : `${m} min`;
}

type Moment = { etat: "avant" | "pendant" | "apres"; texte: string };

function moment(seance: SeanceJourDTO, maintenant: number): Moment {
  const debut = new Date(seance.dateDebut).getTime();
  const fin = new Date(seance.dateFin).getTime();
  if (maintenant < debut) return { etat: "avant", texte: `Starts in ${duree((debut - maintenant) / 60_000)}` };
  if (maintenant < fin) return { etat: "pendant", texte: `Now · ends in ${duree((fin - maintenant) / 60_000)}` };
  return { etat: "apres", texte: `Ended ${duree((maintenant - fin) / 60_000)} ago` };
}

/** Re-render every 30 s for the "starts in" texts. Null until mounted (no server/client mismatch). */
function useHorloge(): number | null {
  const [maintenant, setMaintenant] = useState<number | null>(null);
  useEffect(() => {
    const premier = requestAnimationFrame(() => setMaintenant(Date.now()));
    const timer = setInterval(() => setMaintenant(Date.now()), 30_000);
    return () => {
      cancelAnimationFrame(premier);
      clearInterval(timer);
    };
  }, []);
  return maintenant;
}

async function chargerJournee(portee: PorteeJournee): Promise<JourneeDTO> {
  const reponse = await fetch(`/api/materiel/today?portee=${portee}`, { cache: "no-store", credentials: "same-origin" });
  if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
  return (await reponse.json()) as JourneeDTO;
}

// ── Checklist of a session ───────────────────────────────────────────────────

type Etapes = { faites: number; total: number };

/** Each item counts once when packed (or further), once when returned; each task once when done. */
function etapesSeance(s: SeanceJourDTO, emballes: ReadonlySet<string>): Etapes {
  let faites = 0;
  let total = 0;
  for (const r of s.reservations) {
    total += 2;
    if (!STATUTS_A_PRENDRE.includes(r.statut) || emballes.has(r.id)) faites += 1;
    if (r.statut === "RETOURNEE") faites += 1;
  }
  for (const t of s.taches) {
    total += 1;
    if (t.statut === "TERMINEE") faites += 1;
  }
  return { faites, total };
}

const SEUIL_TIRER = 70;

export function MaJournee({ initiale, utilisateur }: { initiale: JourneeDTO; utilisateur: { id: string; role: string } }) {
  const admin = utilisateur.role === "ADMIN";
  const [journee, setJournee] = useState(initiale);
  const [portee, setPortee] = useState<PorteeJournee>(initiale.portee);
  const [chargement, setChargement] = useState(false);
  const [horsLigne, setHorsLigne] = useState(false);
  const [emballes, setEmballes] = useState<Set<string>>(() => new Set());
  const [tachesFaites, setTachesFaites] = useState<Record<string, boolean>>({});
  const [tirage, setTirage] = useState(0);
  const [retour, setRetour] = useState<ReservationJourDTO | null>(null);
  const [enCoursIds, setEnCoursIds] = useState<Set<string>>(() => new Set());
  const departTirage = useRef<number | null>(null);
  const maintenant = useHorloge();

  // ── Load, save the snapshot, fall back to it offline ───────────────────────
  const rafraichir = useCallback(
    async (cible: PorteeJournee, silencieux = false) => {
      if (!silencieux) setChargement(true);
      try {
        const donnees = await chargerJournee(cible);
        setJournee(donnees);
        setTachesFaites({});
        setHorsLigne(false);
        ecrire(cleInstantane(utilisateur.id, cible), donnees);
      } catch {
        const copie = lire<unknown>(cleInstantane(utilisateur.id, cible));
        if (instantaneValide(copie, utilisateur.id)) setJournee(copie);
        setHorsLigne(true);
      } finally {
        setChargement(false);
      }
    },
    [utilisateur.id],
  );

  useEffect(() => {
    oublierAutresComptes(utilisateur.id);
    ecrire(cleInstantane(utilisateur.id, initiale.portee), initiale);
    // The admin's last choice (Me / Everyone) is read after the first paint: the server cannot know it.
    const cadre = requestAnimationFrame(() => {
      const choisie = admin ? lire<PorteeJournee>(clePortee(utilisateur.id)) : null;
      if (choisie && choisie !== initiale.portee) {
        setPortee(choisie);
        void rafraichir(choisie);
      }
    });
    return () => cancelAnimationFrame(cadre);
  }, [admin, initiale, rafraichir, utilisateur.id]);

  // Packed boxes are per user and per day; a new day starts empty.
  useEffect(() => {
    const cadre = requestAnimationFrame(() => {
      const liste = lire<string[]>(cleEmballes(utilisateur.id, journee.date));
      setEmballes(new Set(Array.isArray(liste) ? liste : []));
    });
    return () => cancelAnimationFrame(cadre);
  }, [journee.date, utilisateur.id]);

  // Back to the app, or back online: fresh data, quietly.
  useEffect(() => {
    const retourApp = () => {
      if (document.visibilityState === "visible") void rafraichir(portee, true);
    };
    const enLigne = () => void rafraichir(portee, true);
    const horsReseau = () => setHorsLigne(true);
    document.addEventListener("visibilitychange", retourApp);
    window.addEventListener("online", enLigne);
    window.addEventListener("offline", horsReseau);
    return () => {
      document.removeEventListener("visibilitychange", retourApp);
      window.removeEventListener("online", enLigne);
      window.removeEventListener("offline", horsReseau);
    };
  }, [portee, rafraichir]);

  // ── App badge: equipment to take today (not packed yet) + overdue returns ───
  useEffect(() => {
    if (journee.utilisateurId !== utilisateur.id) return;
    afficherBadge(compterBadge(journee, emballes));
  }, [journee, emballes, utilisateur.id]);

  const changerPortee = (suivante: PorteeJournee) => {
    if (suivante === portee) return;
    setPortee(suivante);
    ecrire(clePortee(utilisateur.id), suivante);
    void rafraichir(suivante);
  };

  const basculerEmballe = (id: string, coche: boolean) => {
    navigator.vibrate?.(10);
    setEmballes((actuels) => {
      const suivants = new Set(actuels);
      if (coche) suivants.add(id);
      else suivants.delete(id);
      ecrire(cleEmballes(utilisateur.id, journee.date), [...suivants]);
      return suivants;
    });
  };

  // ── Actions (the services check the rights again) ──────────────────────────
  const [, start] = useTransition();
  const agir = (ids: string[], travail: () => Promise<ActionResult<unknown>>, succes: string) => {
    setEnCoursIds((actuels) => new Set([...actuels, ...ids]));
    start(async () => {
      const result = await travail();
      setEnCoursIds((actuels) => new Set([...actuels].filter((id) => !ids.includes(id))));
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const echecs = Array.isArray(result.data) ? (result.data as { ok: boolean; error?: string }[]).filter((r) => !r.ok) : [];
      if (echecs.length > 0) toast.warning(`${echecs.length} item(s) could not be changed`, { description: echecs[0].error });
      else toast.success(succes);
      await rafraichir(portee, true);
    });
  };

  const confirmer = (ids: string[]) =>
    agir(ids, () => (ids.length === 1 ? confirmerReservationAction(ids[0]) : appliquerTransitionGroupeAction(ids, "CONFIRMEE")), ids.length === 1 ? "Reservation confirmed" : "Reservations confirmed");

  const remettre = (id: string) => agir([id], () => demarrerReservationAction(id), "Handed over: the item is now out");

  const rendre = (r: ReservationJourDTO, etat: "BON" | "USE", remarque: string, panne: string | null) =>
    agir(
      [r.id],
      async () => {
        const result = await enregistrerRetourAction(r.id, { etat, remarque });
        if (!result.ok || !panne) return result;
        const signale = await signalerPanneAction(r.materiel.id, { description: panne });
        return signale.ok ? { ok: true, data: undefined } : { ...signale, error: `Returned, but the problem was not reported: ${signale.error}` };
      },
      panne ? `${r.materiel.nom} returned and reported out of order` : `${r.materiel.nom} returned`,
    );

  const basculerTache = (t: TacheJourDTO, faite: boolean) => {
    navigator.vibrate?.(10);
    setTachesFaites((a) => ({ ...a, [t.id]: faite }));
    start(async () => {
      const result = await setTacheStatutAction(t.id, faite ? "TERMINEE" : "A_FAIRE");
      if (!result.ok) {
        setTachesFaites((a) => ({ ...a, [t.id]: !faite }));
        toast.error(result.error);
      }
    });
  };

  const packingList = (id: string) =>
    start(async () => {
      const result = await genererPackingListAction(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const octets = Uint8Array.from(atob(result.data.base64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([octets], { type: "application/pdf" }));
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = "packing-list.pdf";
      lien.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    });

  // ── Pull to refresh ────────────────────────────────────────────────────────
  const surTouche = {
    onTouchStart: (e: React.TouchEvent) => {
      departTirage.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
    },
    onTouchMove: (e: React.TouchEvent) => {
      if (departTirage.current === null) return;
      setTirage(Math.max(0, Math.min(110, e.touches[0].clientY - departTirage.current)));
    },
    onTouchEnd: () => {
      if (tirage >= SEUIL_TIRER) void rafraichir(portee);
      departTirage.current = null;
      setTirage(0);
    },
  };

  // Tasks ticked here show at once, before the server answers.
  const avecTaches = useCallback((t: TacheJourDTO): TacheJourDTO => (t.id in tachesFaites ? { ...t, statut: tachesFaites[t.id] ? "TERMINEE" : "A_FAIRE" } : t), [tachesFaites]);
  const seances = useMemo(() => journee.seances.map((s) => ({ ...s, taches: s.taches.map(avecTaches) })), [journee.seances, avecTaches]);
  const tachesLibres = journee.taches.map(avecTaches);

  const toutes = seances.flatMap((s) => s.reservations);
  const aEmballer = toutes.filter((r) => STATUTS_A_PRENDRE.includes(r.statut) && !emballes.has(r.id)).length;
  const aRendre = toutes.filter((r) => r.statut === "EN_COURS").length + journee.retards.length;
  const etapes = seances.reduce<Etapes>((acc, s) => {
    const e = etapesSeance(s, emballes);
    return { faites: acc.faites + e.faites, total: acc.total + e.total };
  }, { faites: 0, total: 0 });
  // The session to look at first: the one happening now, else the next one, else the last one.
  const prochaine = maintenant === null ? seances[0] : (seances.find((s) => moment(s, maintenant).etat === "pendant") ?? seances.find((s) => moment(s, maintenant).etat === "avant") ?? seances.at(-1));
  const vide = seances.length === 0 && journee.retards.length === 0 && tachesLibres.length === 0;
  const desactive = horsLigne;

  return (
    <div className="mx-auto w-full max-w-2xl min-w-0 space-y-4 pb-10" {...surTouche}>
      <div aria-hidden className="flex justify-center overflow-hidden transition-[height]" style={{ height: tirage > 0 ? tirage * 0.5 : 0 }}>
        <RefreshCw className={cn("mt-2 size-5 text-muted-foreground", tirage >= SEUIL_TIRER && "text-primary")} style={{ transform: `rotate(${tirage * 3}deg)` }} />
      </div>

      {horsLigne && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
          <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>Offline · last updated {heure(journee.genereLe)}. You can still tick what you packed; actions come back with the connection.</span>
        </div>
      )}

      <header className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Today</p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground first-letter:uppercase">{jourLong(journee.date)}</h2>
          </div>
          <Button variant="outline" size="icon" className="size-11 shrink-0 rounded-full" onClick={() => void rafraichir(portee)} disabled={chargement} aria-label="Refresh">
            <RefreshCw className={cn(chargement && "animate-spin")} aria-hidden />
          </Button>
        </div>
        {admin && (
          <div role="radiogroup" aria-label="Whose day" className="grid grid-cols-2 rounded-full border bg-card p-1 sm:inline-grid">
            {(["moi", "tous"] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={portee === p}
                onClick={() => changerPortee(p)}
                className={cn("min-h-10 rounded-full px-5 text-sm font-medium transition-colors", portee === p ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
              >
                {p === "moi" ? "My sessions" : "Whole studio"}
              </button>
            ))}
          </div>
        )}
      </header>

      {chargement ? (
        <Squelette />
      ) : vide ? (
        <EmptyState
          icon={CalendarCheck}
          title="Nothing planned today"
          description="No session, no equipment to take and no task for today. Enjoy!"
          action={
            <Button asChild variant="outline">
              <Link href="/dashboard/materiel/reservations">
                See upcoming reservations
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <Bilan etapes={etapes} seances={seances.length} aEmballer={aEmballer} aRendre={aRendre} taches={journee.resume.taches} prochaine={prochaine} maintenant={maintenant} />

          {journee.retards.length > 0 && (
            <section aria-labelledby="retards" className="space-y-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 sm:p-4">
              <h3 id="retards" className="flex items-center gap-2 font-semibold text-destructive-text">
                <AlertTriangle className="size-5 shrink-0" aria-hidden />
                {journee.retards.length} overdue {journee.retards.length > 1 ? "returns" : "return"} from earlier days
              </h3>
              <ul className="space-y-2">
                {journee.retards.map((r) => (
                  <LigneRendre key={r.id} reservation={r} detail={`${r.seanceTitre} · due ${jourCourt(r.dateFin)}`} occupe={enCoursIds.has(r.id)} desactive={desactive} onRendre={() => setRetour(r)} />
                ))}
              </ul>
            </section>
          )}

          <ol className="space-y-4">
            {seances.map((s) => (
              <CarteSeance
                key={s.id}
                seance={s}
                admin={admin}
                emballes={emballes}
                enCoursIds={enCoursIds}
                desactive={desactive}
                maintenant={maintenant}
                ouverteParDefaut={s.id === prochaine?.id || seances.length === 1}
                onEmballe={basculerEmballe}
                onConfirmer={confirmer}
                onRemettre={remettre}
                onRendre={setRetour}
                onTache={basculerTache}
                onPackingList={packingList}
              />
            ))}
          </ol>

          {tachesLibres.length > 0 && (
            <section aria-labelledby="taches" className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 id="taches" className="font-semibold text-foreground">Other tasks due today</h3>
                <Button asChild variant="link" size="sm">
                  <Link href="/dashboard/taches">
                    All tasks
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </div>
              <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
                {tachesLibres.map((t) => (
                  <LigneTache key={t.id} tache={t} detail={t.seanceTitre} desactive={desactive} onChange={(v) => basculerTache(t, v)} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <DialogRetour
        cible={retour}
        onClose={() => setRetour(null)}
        onValider={(etat, remarque, panne) => {
          if (!retour) return;
          const r = retour;
          setRetour(null);
          rendre(r, etat, remarque, panne);
        }}
      />
    </div>
  );
}

// ── Day summary ──────────────────────────────────────────────────────────────

function Anneau({ part }: { part: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 64 64" className="size-16 shrink-0 -rotate-90" aria-hidden>
      <circle cx="32" cy="32" r={r} fill="none" className="stroke-muted" strokeWidth="7" />
      <circle cx="32" cy="32" r={r} fill="none" className="stroke-primary transition-[stroke-dashoffset] duration-700" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - part)} />
    </svg>
  );
}

function Bilan({
  etapes,
  seances,
  aEmballer,
  aRendre,
  taches,
  prochaine,
  maintenant,
}: {
  etapes: Etapes;
  seances: number;
  aEmballer: number;
  aRendre: number;
  taches: number;
  prochaine: SeanceJourDTO | undefined;
  maintenant: number | null;
}) {
  const part = etapes.total > 0 ? etapes.faites / etapes.total : 1;
  const m = prochaine && maintenant !== null ? moment(prochaine, maintenant) : null;
  const chips: { icon: typeof Camera; texte: string; ton?: "alerte" | "ok" }[] = [
    { icon: Camera, texte: `${seances} ${seances === 1 ? "session" : "sessions"}` },
    { icon: Package, texte: aEmballer > 0 ? `${aEmballer} to pack` : "All packed", ton: aEmballer > 0 ? undefined : "ok" },
    { icon: RotateCcw, texte: aRendre > 0 ? `${aRendre} to return` : "Nothing to return", ton: aRendre > 0 ? "alerte" : "ok" },
    { icon: ClipboardList, texte: `${taches} ${taches === 1 ? "task" : "tasks"}` },
  ];
  return (
    <section aria-label="Your day at a glance" className="space-y-3 rounded-2xl border bg-card p-4 shadow-xs">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Anneau part={part} />
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums">{Math.round(part * 100)}%</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{etapes.faites} of {etapes.total} steps done</p>
          {prochaine && (
            <>
              <p className="truncate font-semibold text-foreground">{m?.etat === "pendant" ? "Now: " : m?.etat === "avant" ? "Next: " : "Last: "}{prochaine.titre}</p>
              {m && (
                <p className={cn("flex items-center gap-1.5 text-sm", m.etat === "pendant" ? "font-medium text-primary-text" : "text-muted-foreground")}>
                  {m.etat === "pendant" && <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-primary" /></span>}
                  {m.texte}
                </p>
              )}
            </>
          )}
        </div>
      </div>
      <ul className="flex flex-wrap gap-2">
        {chips.map(({ icon: Icon, texte, ton }) => (
          <li key={texte} className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium", ton === "alerte" && "border-warning/50 bg-warning/10", ton === "ok" && "border-success/40 bg-success/10 text-success-text")}>
            <Icon className="size-3.5" aria-hidden />
            {texte}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── A session ────────────────────────────────────────────────────────────────

function Ligne({ icon: Icon, children, action }: { icon: typeof Camera; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1 text-sm break-words">{children}</div>
      {action}
    </div>
  );
}

function TitreEtape({ numero, titre, compte, fait }: { numero: number; titre: string; compte?: string; fait?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold", fait ? "bg-success text-white" : "bg-foreground text-background")}>
        {fait ? <Check className="size-3.5" aria-hidden /> : numero}
      </span>
      <h4 className="min-w-0 flex-1 text-sm font-semibold text-foreground">{titre}</h4>
      {compte && <span className="text-xs text-muted-foreground tabular-nums">{compte}</span>}
    </div>
  );
}

function CarteSeance({
  seance: s,
  admin,
  emballes,
  enCoursIds,
  desactive,
  maintenant,
  ouverteParDefaut,
  onEmballe,
  onConfirmer,
  onRemettre,
  onRendre,
  onTache,
  onPackingList,
}: {
  seance: SeanceJourDTO;
  admin: boolean;
  emballes: Set<string>;
  enCoursIds: Set<string>;
  desactive: boolean;
  maintenant: number | null;
  ouverteParDefaut: boolean;
  onEmballe: (id: string, coche: boolean) => void;
  onConfirmer: (ids: string[]) => void;
  onRemettre: (id: string) => void;
  onRendre: (r: ReservationJourDTO) => void;
  onTache: (t: TacheJourDTO, faite: boolean) => void;
  onPackingList: (id: string) => void;
}) {
  const [ouverte, setOuverte] = useState(ouverteParDefaut);
  const m = maintenant !== null ? moment(s, maintenant) : null;
  const etapes = etapesSeance(s, emballes);
  const aPrendre = s.reservations.filter((r) => STATUTS_A_PRENDRE.includes(r.statut));
  const avecMoi = s.reservations.filter((r) => r.statut === "EN_COURS");
  const rendus = s.reservations.filter((r) => r.statut === "RETOURNEE");
  const aConfirmer = aPrendre.filter((r) => r.statut === "EN_ATTENTE" && r.peutAgir).map((r) => r.id);
  const emballesIci = aPrendre.filter((r) => emballes.has(r.id)).length;
  const minutes = (new Date(s.dateFin).getTime() - new Date(s.dateDebut).getTime()) / 60_000;
  const telephone = s.clientTelephone?.replace(/[^\d+]/g, "");
  const whatsapp = telephone ? (telephone.startsWith("+") ? telephone.slice(1) : telephone.length === 8 ? `216${telephone}` : telephone) : null;
  let numero = 0;

  return (
    <li>
      <article className={cn("overflow-hidden rounded-2xl border bg-card shadow-xs", m?.etat === "pendant" && "border-primary/50 ring-2 ring-primary/20")}>
        <button type="button" onClick={() => setOuverte((o) => !o)} aria-expanded={ouverte} className="flex w-full items-start gap-3 p-4 text-left">
          <div className={cn("shrink-0 rounded-xl px-2.5 py-1.5 text-center", m?.etat === "pendant" ? "bg-primary text-primary-foreground" : "bg-muted")}>
            <p className="text-lg leading-tight font-bold tabular-nums">{heure(s.dateDebut)}</p>
            <p className="text-[11px] tabular-nums opacity-75">{heure(s.dateFin)}</p>
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="leading-snug font-semibold break-words text-foreground">{s.titre}</h3>
            <p className="text-sm text-muted-foreground">{s.typeEvenement} · {duree(minutes)}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge value={s.statut as StatutSeanceReel} config={statutSeanceReelConfig} />
              {m && <span className={cn("text-xs", m.etat === "pendant" ? "font-medium text-primary-text" : "text-muted-foreground")}>{m.texte}</span>}
            </div>
          </div>
          <ChevronDown className={cn("mt-1 size-5 shrink-0 text-muted-foreground transition-transform", ouverte && "rotate-180")} aria-hidden />
        </button>

        <div className="px-4 pb-3">
          <div className="flex items-center gap-2" aria-label={`${etapes.faites} of ${etapes.total} steps done`}>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${etapes.total ? (etapes.faites / etapes.total) * 100 : 100}%` }} />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">{etapes.faites}/{etapes.total}</span>
          </div>
        </div>

        {ouverte && (
          <div className="space-y-5 border-t px-4 pt-4 pb-4">
            {/* Everything about the session */}
            <div className="space-y-3">
              <Ligne
                icon={Users}
                action={
                  (telephone || s.clientEmail) && (
                    <div className="flex shrink-0 gap-1">
                      {telephone && (
                        <Button asChild variant="outline" size="icon" className="size-10" aria-label={`Call ${s.clientNom}`}>
                          <a href={`tel:${telephone}`}><Phone aria-hidden /></a>
                        </Button>
                      )}
                      {whatsapp && (
                        <Button asChild variant="outline" size="icon" className="size-10" aria-label={`WhatsApp ${s.clientNom}`}>
                          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden /></a>
                        </Button>
                      )}
                      {!telephone && s.clientEmail && (
                        <Button asChild variant="outline" size="icon" className="size-10" aria-label={`Email ${s.clientNom}`}>
                          <a href={`mailto:${s.clientEmail}`}><Mail aria-hidden /></a>
                        </Button>
                      )}
                    </div>
                  )
                }
              >
                <p className="font-medium text-foreground">{s.clientNom}</p>
                <p className="text-muted-foreground">{[s.clientTelephone, s.clientEmail].filter(Boolean).join(" · ") || "Client"}</p>
              </Ligne>

              {s.lieu && (
                <div className="space-y-2">
                  <Ligne icon={MapPin}>
                    <p className="font-medium text-foreground">{s.lieu}</p>
                  </Ligne>
                  {s.itineraire && (
                    <Button asChild className="h-11 w-full">
                      <a href={s.itineraire} target="_blank" rel="noopener noreferrer">
                        <Navigation aria-hidden />
                        Directions
                      </a>
                    </Button>
                  )}
                </div>
              )}

              {s.prestation && (
                <Ligne icon={Camera}>
                  <p className="text-muted-foreground">Service</p>
                  <p className="font-medium text-foreground">{s.prestation}</p>
                </Ligne>
              )}

              {s.equipe.length > 0 && (
                <Ligne icon={Users}>
                  <p className="mb-1 text-muted-foreground">Team</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {s.equipe.map((e) => (
                      <li key={`${e.nom}${e.role}`} className={cn("rounded-full border px-2.5 py-1 text-xs", e.moi && "border-primary/50 bg-primary/10 font-medium")}>
                        {e.moi ? "You" : e.nom} · {e.role.toLowerCase()}
                      </li>
                    ))}
                  </ul>
                </Ligne>
              )}

              {s.notes && (
                <div className="rounded-xl bg-muted/60 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <StickyNote className="size-3.5" aria-hidden />
                    Brief from the studio
                  </p>
                  <p className="text-sm whitespace-pre-line break-words text-foreground">{s.notes}</p>
                </div>
              )}
              {s.messageClient && (
                <div className="rounded-xl border border-dashed p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <MessageSquareQuote className="size-3.5" aria-hidden />
                    From the client
                  </p>
                  <p className="text-sm whitespace-pre-line break-words text-foreground">{s.messageClient}</p>
                </div>
              )}
            </div>

            {/* The checklist */}
            {s.reservations.length === 0 ? (
              <p className="rounded-xl bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">No equipment reserved for this session.</p>
            ) : (
              <>
                {aPrendre.length > 0 && (
                  <div className="space-y-2">
                    <TitreEtape numero={++numero} titre="Pack your bag" compte={`${emballesIci}/${aPrendre.length} packed`} fait={emballesIci === aPrendre.length} />
                    <ul className="divide-y overflow-hidden rounded-xl border">
                      {aPrendre.map((r) => (
                        <LigneEmballer
                          key={r.id}
                          reservation={r}
                          emballe={emballes.has(r.id)}
                          admin={admin}
                          occupe={enCoursIds.has(r.id)}
                          desactive={desactive}
                          onEmballe={onEmballe}
                          onConfirmer={() => onConfirmer([r.id])}
                          onRemettre={() => onRemettre(r.id)}
                        />
                      ))}
                    </ul>
                    {aConfirmer.length > 1 && (
                      <Button variant="outline" className="h-11 w-full" disabled={desactive} onClick={() => onConfirmer(aConfirmer)}>
                        <Check aria-hidden />
                        Confirm the {aConfirmer.length} pending items
                      </Button>
                    )}
                    {!admin && aPrendre.some((r) => r.statut === "CONFIRMEE") && (
                      <p className="text-xs text-muted-foreground">Confirmed items are handed over by the studio when you pick them up.</p>
                    )}
                  </div>
                )}

                {avecMoi.length > 0 && (
                  <div className="space-y-2">
                    <TitreEtape numero={++numero} titre="Return after the shoot" compte={`${avecMoi.length} still out`} />
                    <ul className="space-y-2">
                      {avecMoi.map((r) => (
                        <LigneRendre
                          key={r.id}
                          reservation={r}
                          detail={`${categorieMaterielLabels[r.materiel.categorie]} · S/N ${r.materiel.numeroSerie}${r.reservePar ? ` · ${r.reservePar}` : ""}`}
                          occupe={enCoursIds.has(r.id)}
                          desactive={desactive}
                          onRendre={() => onRendre(r)}
                        />
                      ))}
                    </ul>
                  </div>
                )}

                {rendus.length > 0 && (
                  <div className="space-y-2">
                    <TitreEtape numero={++numero} titre="Returned" compte={`${rendus.length}/${s.reservations.length}`} fait={rendus.length === s.reservations.length} />
                    <ul className="divide-y overflow-hidden rounded-xl border bg-muted/30">
                      {rendus.map((r) => (
                        <li key={r.id} className="flex min-h-12 items-center gap-3 px-3 py-2">
                          <CheckCircle2 className="size-5 shrink-0 text-success-text" aria-hidden />
                          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground line-through">{r.materiel.nom}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {s.taches.length > 0 && (
              <div className="space-y-2">
                <TitreEtape numero={++numero} titre="Tasks today" compte={`${s.taches.filter((t) => t.statut === "TERMINEE").length}/${s.taches.length}`} fait={s.taches.every((t) => t.statut === "TERMINEE")} />
                <ul className="divide-y overflow-hidden rounded-xl border">
                  {s.taches.map((t) => (
                    <LigneTache key={t.id} tache={t} desactive={desactive} onChange={(v) => onTache(t, v)} />
                  ))}
                </ul>
              </div>
            )}

            {s.reservations.length > 0 && (
              <Button variant="ghost" className="h-10 w-full text-muted-foreground" disabled={desactive} onClick={() => onPackingList(s.reservations[0].id)}>
                <FileDown aria-hidden />
                Packing list (PDF)
              </Button>
            )}
          </div>
        )}
      </article>
    </li>
  );
}

// ── Checklist rows ───────────────────────────────────────────────────────────

/** A big round tick, easy to hit with a thumb. */
function Coche({ coche, onChange, label, disabled }: { coche: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={coche}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!coche)}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full border-2 transition-all active:scale-90 disabled:opacity-50",
        coche ? "border-success bg-success text-white" : "border-muted-foreground/40 bg-background",
      )}
    >
      {coche ? <Check className="size-5" strokeWidth={3} aria-hidden /> : <Circle className="size-5 opacity-0" aria-hidden />}
    </button>
  );
}

function LigneEmballer({
  reservation: r,
  emballe,
  admin,
  occupe,
  desactive,
  onEmballe,
  onConfirmer,
  onRemettre,
}: {
  reservation: ReservationJourDTO;
  emballe: boolean;
  admin: boolean;
  occupe: boolean;
  desactive: boolean;
  onEmballe: (id: string, coche: boolean) => void;
  onConfirmer: () => void;
  onRemettre: () => void;
}) {
  return (
    <li className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 transition-colors", emballe && "bg-success/5")}>
      <Coche coche={emballe} onChange={(v) => onEmballe(r.id, v)} label={`Packed: ${r.materiel.nom}`} />
      <div className="min-w-0 flex-1 basis-40">
        <p className={cn("text-sm font-medium break-words", emballe && "text-muted-foreground line-through")}>{r.materiel.nom}</p>
        <p className="truncate text-xs text-muted-foreground">
          {categorieMaterielLabels[r.materiel.categorie]} · S/N {r.materiel.numeroSerie}
        </p>
      </div>
      <div className="flex items-center gap-2 max-sm:w-full max-sm:justify-end max-sm:pl-14">
        <StatusBadge value={r.statut} config={statutReservationConfig} />
        {r.statut === "EN_ATTENTE" && r.peutAgir && (
          <Button size="sm" variant="outline" className="h-9" disabled={desactive || occupe} onClick={onConfirmer}>
            {occupe ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
            Confirm
          </Button>
        )}
        {r.statut === "CONFIRMEE" && admin && (
          <Button size="sm" variant="secondary" className="h-9" disabled={desactive || occupe} onClick={onRemettre}>
            {occupe ? <Loader2 className="animate-spin" aria-hidden /> : <Hand aria-hidden />}
            Hand over
          </Button>
        )}
      </div>
    </li>
  );
}

function LigneRendre({
  reservation: r,
  detail,
  occupe,
  desactive,
  onRendre,
}: {
  reservation: ReservationJourDTO;
  detail: string;
  occupe: boolean;
  desactive: boolean;
  onRendre: () => void;
}) {
  return (
    <li className={cn("flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3", r.enRetard && "border-destructive/40")}>
      <PackageCheck className={cn("size-6 shrink-0", r.enRetard ? "text-destructive-text" : "text-muted-foreground")} aria-hidden />
      <div className="min-w-0 flex-1 basis-40">
        <p className="text-sm font-medium break-words text-foreground">{r.materiel.nom}</p>
        <p className="text-xs break-words text-muted-foreground">
          {detail}
          {r.enRetard && <span className="font-medium text-destructive-text"> · overdue since {heure(r.dateFin)}</span>}
        </p>
      </div>
      {r.peutAgir ? (
        <Button className="h-11 max-sm:w-full" variant={r.enRetard ? "destructive" : "default"} disabled={desactive || occupe} onClick={onRendre}>
          {occupe ? <Loader2 className="animate-spin" aria-hidden /> : <RotateCcw aria-hidden />}
          Return this item
        </Button>
      ) : (
        <span className="text-xs text-muted-foreground">Booked by {r.reservePar ?? "someone else"}</span>
      )}
    </li>
  );
}

function LigneTache({ tache: t, detail, desactive, onChange }: { tache: TacheJourDTO; detail?: string; desactive: boolean; onChange: (faite: boolean) => void }) {
  const faite = t.statut === "TERMINEE";
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <Coche coche={faite} onChange={onChange} label={`Done: ${t.titre}`} disabled={desactive} />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium break-words", faite && "text-muted-foreground line-through")}>{t.titre}</p>
        <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
          {detail && <span>{detail}</span>}
          {t.dateLimite && (
            <span className={cn("inline-flex items-center gap-1", t.enRetard && !faite && "text-destructive-text")}>
              <Clock className="size-3" aria-hidden />
              {heure(t.dateLimite)}
            </span>
          )}
          {t.priorite === "HAUTE" && <span className="font-medium text-destructive-text">High priority</span>}
        </p>
      </div>
    </li>
  );
}

// ── Return dialog (bottom sheet on a phone) ──────────────────────────────────

function DialogRetour({
  cible,
  onClose,
  onValider,
}: {
  cible: ReservationJourDTO | null;
  onClose: () => void;
  onValider: (etat: "BON" | "USE", remarque: string, panne: string | null) => void;
}) {
  const [etat, setEtat] = useState<"BON" | "USE" | "PANNE">("BON");
  const [remarque, setRemarque] = useState("");
  const panneValide = etat !== "PANNE" || remarque.trim().length >= 5;
  const fermer = () => {
    setEtat("BON");
    setRemarque("");
    onClose();
  };
  return (
    <Dialog open={!!cible} onOpenChange={(open) => !open && fermer()}>
      <DialogContent className="max-sm:top-auto max-sm:bottom-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <DialogHeader className="text-left">
          <DialogTitle>Return {cible?.materiel.nom}</DialogTitle>
          <DialogDescription>
            {cible && `${categorieMaterielLabels[cible.materiel.categorie]} · S/N ${cible.materiel.numeroSerie}. `}In what condition is it?
          </DialogDescription>
        </DialogHeader>
        <div role="radiogroup" aria-label="Condition" className="grid grid-cols-3 gap-2">
          {(
            [
              ["BON", "Good", CheckCircle2],
              ["USE", "Worn", Clock],
              ["PANNE", "Problem", Wrench],
            ] as const
          ).map(([valeur, libelle, Icon]) => (
            <button
              key={valeur}
              type="button"
              role="radio"
              aria-checked={etat === valeur}
              onClick={() => setEtat(valeur)}
              className={cn(
                "flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border text-sm font-medium transition-colors",
                etat === valeur
                  ? valeur === "PANNE"
                    ? "border-destructive bg-destructive/15 ring-2 ring-destructive/40"
                    : "border-foreground bg-foreground text-background ring-2 ring-foreground/20"
                  : "text-muted-foreground hover:bg-muted/50",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {libelle}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="remarque-retour">{etat === "PANNE" ? "What is wrong? (required)" : "Remark (optional)"}</Label>
          <Textarea
            id="remarque-retour"
            rows={2}
            maxLength={500}
            value={remarque}
            onChange={(e) => setRemarque(e.target.value)}
            placeholder={etat === "PANNE" ? "The autofocus no longer works…" : "Scratch on the lens hood…"}
          />
          {etat === "PANNE" && <p className="text-xs text-muted-foreground">The item is marked out of order and the people who booked it next are told.</p>}
        </div>
        <DialogFooter className="gap-2 max-sm:flex-col-reverse">
          <Button variant="outline" className="h-11" onClick={fermer}>
            Cancel
          </Button>
          <Button
            className="h-11"
            variant={etat === "PANNE" ? "destructive" : "default"}
            disabled={!panneValide}
            onClick={() => {
              const texte = remarque.trim();
              onValider(etat === "BON" ? "BON" : "USE", texte, etat === "PANNE" ? texte : null);
              setRemarque("");
              setEtat("BON");
            }}
          >
            <RotateCcw aria-hidden />
            {etat === "PANNE" ? "Return and report" : "Record the return"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Squelette() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-32 rounded-2xl" />
      {[0, 1].map((i) => (
        <Skeleton key={i} className="h-56 rounded-2xl" />
      ))}
    </div>
  );
}
