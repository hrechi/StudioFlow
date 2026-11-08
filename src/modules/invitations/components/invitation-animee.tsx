"use client";

/**
 * The card a guest opens. In order:
 *  1. a closed scene that moves by itself (envelope with a wax seal, folded card sealed with wax,
 *     theatre curtains, a gift box) over a slowly moving background in the colors of the card;
 *  2. the opening, on tap: the letter slides out of the envelope, the seal cracks and the card
 *     unfolds, the curtains gather, the lid flies off; then a burst of petals or confetti;
 *  3. the card plays its entrances, catches the light now and then, follows the tilt of the phone;
 *  4. below it, the practical side appears block by block: live countdown, calendar, map and
 *     directions, dress code, RSVP buttons, sharing.
 *
 * Kind to every phone: `prefers-reduced-motion` shows the still card and the details, small devices
 * get fewer particles and no depth, particles stop while the tab is hidden, and any error falls back
 * to the still card.
 */
import {
  CalendarPlus,
  Check,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  Music,
  Navigation,
  Phone,
  RotateCcw,
  Share2,
  Shirt,
  Smartphone,
  Users,
  VolumeX,
} from "lucide-react";
import { Component, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { compteARebours, estAnimee, nombreParticules, PARTICULES, profilAppareil, type ProfilAppareil } from "../invitation.animation";
import { configEvenement } from "../invitation.evenements";
import { fichierIcs, initiales, lienAgendaGoogle, moyensReponse, MOTS_INVITE, type MotsInvite } from "../invitation.invite";
import { lienAppleMaps, lienGoogleMaps, lienWaze } from "../invitation.lieu";
import { formaterDate, valeurChamp } from "../invitation.linked";
import type { ContenuInvitation, ElementTexte, TypeAmbiance, TypeOuverture } from "../invitation.schema";
import { MUSIQUES } from "../invitation.types";
import { InvitationApercu } from "./invitation-apercu";

// ── Keyframes (scoped by their rf-inv- prefix) ───────────────────────────────

const STYLES = `
@keyframes rf-inv-aurore { 0% { transform: translate(-10%, -6%) scale(1) } 50% { transform: translate(8%, 6%) scale(1.15) } 100% { transform: translate(-4%, 10%) scale(0.95) } }
@keyframes rf-inv-flotte { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
@keyframes rf-inv-respire { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
@keyframes rf-inv-lueur { 0%, 100% { box-shadow: 0 0 0 0 var(--rf-lueur), 0 10px 25px rgba(0,0,0,.35) } 50% { box-shadow: 0 0 0 14px transparent, 0 10px 25px rgba(0,0,0,.35) } }
@keyframes rf-inv-onde { 0% { transform: scale(1); opacity: .55 } 100% { transform: scale(1.7); opacity: 0 } }
@keyframes rf-inv-balance { 0%, 100% { transform: skewX(0deg) } 50% { transform: skewX(1.4deg) } }
@keyframes rf-inv-secoue { 0%, 70%, 100% { transform: rotate(0) } 75% { transform: rotate(-5deg) } 80% { transform: rotate(5deg) } 85% { transform: rotate(-4deg) } 90% { transform: rotate(3deg) } 95% { transform: rotate(-1deg) } }
@keyframes rf-inv-rayons { 0% { transform: scale(.2) rotate(0deg); opacity: 0 } 30% { opacity: 1 } 100% { transform: scale(2.6) rotate(70deg); opacity: 0 } }
@keyframes rf-inv-eclair { 0% { opacity: 0 } 25% { opacity: 1 } 100% { opacity: 0 } }
@keyframes rf-inv-reflet { 0%, 72% { transform: translateX(-130%) skewX(-18deg) } 92%, 100% { transform: translateX(230%) skewX(-18deg) } }
@keyframes rf-inv-apparait { from { opacity: 0; transform: translateY(18px) scale(.98) } to { opacity: 1; transform: none } }
@keyframes rf-inv-egaliseur { 0%, 100% { transform: scaleY(.3) } 50% { transform: scaleY(1) } }
@keyframes rf-inv-scintille { 0%, 100% { opacity: .2; transform: scale(.6) } 50% { opacity: 1; transform: scale(1) } }
/* Guests see the same light page whatever the theme of the person who made the card. */
.rf-inv-clair {
  color-scheme: light;
  --background: #f7f5f1; --card: #ffffff; --popover: #ffffff; --muted: #ece9e3; --secondary: #e9e6df; --accent: #f3ecdf;
  --foreground: #111111; --card-foreground: #111111; --popover-foreground: #111111; --secondary-foreground: #2a2826;
  --muted-foreground: #5f5b55; --accent-foreground: #6e5120; --primary: #111111; --primary-foreground: #f7f5f1;
  --primary-hover: #2b2b2b; --primary-text: #7a5a22; --border: #e2ded6; --input: #8f8a82; --ring: #806128;
  color: var(--foreground);
}
.dark .rf-inv-clair [data-slot="button"][data-variant="outline"] { background: rgba(255,255,255,.7); }
`;

/** How long each opening takes before the card is fully there, in ms. */
const DUREE_SCENE: Record<TypeOuverture, number> = { ENVELOPPE: 1750, SCEAU: 1500, RIDEAU: 1400, CADEAU: 1500 };
/** Scenes that uncover the card while they open (the others hand it over at the end). */
const DEVOILE: Record<TypeOuverture, boolean> = { ENVELOPPE: false, SCEAU: true, RIDEAU: true, CADEAU: false };

// ── Device profile ───────────────────────────────────────────────────────────

function useProfil(): ProfilAppareil {
  const [profil, setProfil] = useState<ProfilAppareil>("complet");
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const lire = () => {
      const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
      setProfil(profilAppareil({
        mouvementReduit: media.matches,
        coeurs: nav.hardwareConcurrency,
        memoireGo: nav.deviceMemory,
        economieDonnees: nav.connection?.saveData,
      }));
    };
    lire();
    media.addEventListener("change", lire);
    return () => media.removeEventListener("change", lire);
  }, []);
  return profil;
}

// ── Safety net ───────────────────────────────────────────────────────────────

class Repli extends Component<{ secours: ReactNode; children: ReactNode }, { erreur: boolean }> {
  state = { erreur: false };
  static getDerivedStateFromError() {
    return { erreur: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[invitations] animated card failed, showing the still card", error);
  }
  render() {
    return this.state.erreur ? this.props.secours : this.props.children;
  }
}

// ── Particles ────────────────────────────────────────────────────────────────

type Particule = { x: number; y: number; vx: number; vy: number; taille: number; angle: number; va: number; couleur: string; phase: number; vie: number };

function dessinerParticule(ctx: CanvasRenderingContext2D, forme: (typeof PARTICULES)[TypeAmbiance]["forme"], p: Particule, t: number) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.fillStyle = p.couleur;
  switch (forme) {
    case "petale":
      ctx.globalAlpha *= 0.9;
      ctx.beginPath();
      ctx.moveTo(0, -p.taille);
      ctx.quadraticCurveTo(p.taille * 0.7, -p.taille * 0.2, 0, p.taille);
      ctx.quadraticCurveTo(-p.taille * 0.7, -p.taille * 0.2, 0, -p.taille);
      ctx.fill();
      break;
    case "confetti":
      ctx.scale(1, Math.cos(t / 180 + p.phase));
      ctx.fillRect(-p.taille / 2, -p.taille / 4, p.taille, p.taille / 2);
      break;
    case "ballon":
      ctx.rotate(-p.angle);
      ctx.globalAlpha *= 0.85;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.taille * 0.8, p.taille, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.45)";
      ctx.beginPath();
      ctx.ellipse(-p.taille * 0.3, -p.taille * 0.4, p.taille * 0.18, p.taille * 0.28, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(120,120,120,0.5)";
      ctx.beginPath();
      ctx.moveTo(0, p.taille);
      ctx.quadraticCurveTo(4, p.taille * 1.8, 0, p.taille * 2.6);
      ctx.stroke();
      break;
    case "etincelle": {
      ctx.globalAlpha *= 0.45 + 0.55 * Math.abs(Math.sin(t / 500 + p.phase));
      const r = p.taille * 0.7;
      ctx.shadowColor = p.couleur;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.quadraticCurveTo(0, 0, 0, r);
      ctx.quadraticCurveTo(0, 0, -r, 0);
      ctx.quadraticCurveTo(0, 0, 0, -r);
      ctx.fill();
      break;
    }
    case "lanterne":
      ctx.rotate(-p.angle + Math.sin(t / 900 + p.phase) * 0.15);
      ctx.shadowColor = p.couleur;
      ctx.shadowBlur = 16;
      ctx.globalAlpha *= 0.9;
      ctx.beginPath();
      ctx.roundRect(-p.taille * 0.5, -p.taille * 0.7, p.taille, p.taille * 1.4, p.taille * 0.35);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.55)";
      ctx.fillRect(-p.taille * 0.15, -p.taille * 0.4, p.taille * 0.3, p.taille * 0.8);
      break;
  }
  ctx.restore();
}

/** Canvas sized to its box, with the device pixel ratio (max 2). */
function useCanevas(ref: React.RefObject<HTMLCanvasElement | null>) {
  return useCallback(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return null;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const largeur = canvas.clientWidth;
    const hauteur = canvas.clientHeight;
    canvas.width = largeur * ratio;
    canvas.height = hauteur * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { ctx, largeur, hauteur };
  }, [ref]);
}

/** The mood around the card: particles that drift all the time. */
function Particules({ type, densite, leger }: { type: TypeAmbiance; densite: number; leger: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const mesurer = useCanevas(ref);
  useEffect(() => {
    let zone = mesurer();
    if (!zone) return;
    const config = PARTICULES[type];
    let nombre = nombreParticules(densite, leger);
    const nouvelle = (auHasard: boolean): Particule => ({
      x: Math.random() * zone!.largeur,
      y: auHasard ? Math.random() * zone!.hauteur : config.montee ? zone!.hauteur + 20 : -20,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (config.montee ? -1 : 1) * (0.4 + Math.random() * 0.8) * config.vitesse,
      taille: 6 + Math.random() * (config.forme === "ballon" ? 14 : config.forme === "lanterne" ? 10 : 6),
      angle: Math.random() * Math.PI * 2,
      va: (Math.random() - 0.5) * 0.04,
      couleur: config.couleurs[Math.floor(Math.random() * config.couleurs.length)],
      phase: Math.random() * Math.PI * 2,
      vie: 1,
    });
    let particules = Array.from({ length: nombre }, () => nouvelle(true));
    let cadre = 0;
    let dernier = performance.now();
    let mesures = 0;
    let total = 0;
    const boucle = (t: number) => {
      const { ctx, largeur, hauteur } = zone!;
      const ecart = t - dernier;
      dernier = t;
      // The first two seconds tell how the phone copes: fewer particles, or none.
      if (mesures < 120) {
        mesures += 1;
        total += ecart;
        if (mesures === 120) {
          const moyenne = total / mesures;
          if (moyenne > 40) nombre = 0;
          else if (moyenne > 24) nombre = Math.floor(nombre / 2);
          particules = particules.slice(0, nombre);
        }
      }
      ctx.clearRect(0, 0, largeur, hauteur);
      for (const p of particules) {
        p.x += p.vx + Math.sin(t / 1400 + p.phase) * 0.3;
        p.y += p.vy;
        p.angle += p.va;
        if (p.y > hauteur + 40 || p.y < -60 || p.x < -40 || p.x > largeur + 40) Object.assign(p, nouvelle(false));
        dessinerParticule(ctx, config.forme, p, t);
      }
      if (nombre > 0) cadre = requestAnimationFrame(boucle);
    };
    cadre = requestAnimationFrame(boucle);

    const visibilite = () => {
      cancelAnimationFrame(cadre);
      if (!document.hidden && nombre > 0) {
        dernier = performance.now();
        cadre = requestAnimationFrame(boucle);
      }
    };
    const redimensionner = () => {
      zone = mesurer() ?? zone;
    };
    document.addEventListener("visibilitychange", visibilite);
    window.addEventListener("resize", redimensionner);
    return () => {
      cancelAnimationFrame(cadre);
      document.removeEventListener("visibilitychange", visibilite);
      window.removeEventListener("resize", redimensionner);
    };
  }, [type, densite, leger, mesurer]);
  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 size-full" />;
}

/** One burst when the card opens: petals or confetti thrown from the card, falling with gravity. */
function Rafale({ type, leger }: { type: TypeAmbiance; leger: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const mesurer = useCanevas(ref);
  const [fini, setFini] = useState(false);
  useEffect(() => {
    const zone = mesurer();
    if (!zone) return;
    const config = PARTICULES[type];
    // Balloons and lanterns float up slowly: their burst is confetti-like sparks in the same colors.
    const forme = config.forme === "ballon" || config.forme === "lanterne" ? "etincelle" : config.forme;
    const { ctx, largeur, hauteur } = zone;
    const cx = largeur / 2;
    const cy = hauteur * 0.42;
    const eclats: Particule[] = Array.from({ length: leger ? 36 : 80 }, (_, i) => {
      const angle = (i / (leger ? 36 : 80)) * Math.PI * 2 + Math.random() * 0.4;
      const force = 4 + Math.random() * 9;
      return {
        x: cx + Math.cos(angle) * 20,
        y: cy + Math.sin(angle) * 20,
        vx: Math.cos(angle) * force,
        vy: Math.sin(angle) * force - 4,
        taille: 5 + Math.random() * 6,
        angle: Math.random() * Math.PI,
        va: (Math.random() - 0.5) * 0.3,
        couleur: config.couleurs[i % config.couleurs.length],
        phase: Math.random() * Math.PI * 2,
        vie: 1,
      };
    });
    let cadre = 0;
    const debut = performance.now();
    const boucle = (t: number) => {
      const age = (t - debut) / 1000;
      ctx.clearRect(0, 0, largeur, hauteur);
      for (const p of eclats) {
        p.vx *= 0.975;
        p.vy = p.vy * 0.975 + 0.22;
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.va;
        p.vie = Math.max(0, 1 - age / 2.8);
        ctx.globalAlpha = p.vie;
        dessinerParticule(ctx, forme, p, t);
      }
      ctx.globalAlpha = 1;
      if (age < 2.8) cadre = requestAnimationFrame(boucle);
      else setFini(true);
    };
    cadre = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(cadre);
  }, [type, leger, mesurer]);
  return fini ? null : <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 z-30 size-full" />;
}

// ── Depth (pointer, or the tilt of the phone) ─────────────────────────────────

type OrientationAvecPermission = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };

function useProfondeur(actif: boolean) {
  const [inclinaison, setInclinaison] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (!actif) return;
    const borne = (v: number) => Math.max(-1, Math.min(1, v));
    const souris = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      setInclinaison({ x: borne((e.clientX / window.innerWidth) * 2 - 1), y: borne((e.clientY / window.innerHeight) * 2 - 1) });
    };
    const telephone = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      setInclinaison({ x: borne(e.gamma / 25), y: borne((e.beta - 45) / 25) });
    };
    window.addEventListener("pointermove", souris);
    window.addEventListener("deviceorientation", telephone);
    return () => {
      window.removeEventListener("pointermove", souris);
      window.removeEventListener("deviceorientation", telephone);
    };
  }, [actif]);
  return inclinaison;
}

/** iOS asks before giving the tilt of the phone; the question must come from a tap. */
async function demanderInclinaison() {
  const Orientation = (typeof DeviceOrientationEvent !== "undefined" ? DeviceOrientationEvent : undefined) as OrientationAvecPermission | undefined;
  if (!Orientation?.requestPermission) return;
  await Orientation.requestPermission().catch(() => "denied");
}

// ── Background ───────────────────────────────────────────────────────────────

/** Three soft blobs in the colors of the card, drifting slowly behind everything. */
function Aurore({ fond, principale, fixe }: { fond: string; principale: string; fixe: boolean }) {
  const blob = (couleur: string, style: CSSProperties) => (
    <div
      className="absolute rounded-full blur-3xl"
      style={{ background: couleur, opacity: 0.55, animation: fixe ? undefined : "rf-inv-aurore 18s ease-in-out infinite alternate", ...style }}
    />
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ background: `color-mix(in srgb, ${fond} 70%, #e9e6e1)` }}>
      {blob(`color-mix(in srgb, ${principale} 55%, white)`, { width: "70%", height: "45%", top: "-10%", left: "-15%" })}
      {blob(`color-mix(in srgb, ${fond} 60%, ${principale})`, { width: "60%", height: "50%", bottom: "-15%", right: "-20%", animationDelay: "-6s" })}
      {blob(`color-mix(in srgb, ${principale} 30%, ${fond})`, { width: "45%", height: "35%", top: "40%", left: "30%", animationDelay: "-12s", animationDuration: "24s" })}
    </div>
  );
}

// ── Opening scenes ───────────────────────────────────────────────────────────

const COURBE = "cubic-bezier(.2,.8,.2,1)";

type PropsScene = { couleur: string; ouvre: boolean; sceau: string };

/** Wax seal with the initials, shared by the envelope and the folded card. */
function Sceau({ couleur, sceau, taille, ouvre, style }: { couleur: string; sceau: string; taille: number; ouvre: boolean; style?: CSSProperties }) {
  const cire = `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${couleur} 55%, white), ${couleur} 55%, color-mix(in srgb, ${couleur} 60%, black))`;
  return (
    <div className="absolute" style={{ width: taille, height: taille, ...style }}>
      {(["gauche", "droite"] as const).map((moitie) => (
        <div
          key={moitie}
          className="absolute inset-0 rounded-full"
          style={{
            background: cire,
            boxShadow: "0 6px 14px rgba(0,0,0,.35), inset 0 -4px 8px rgba(0,0,0,.25), inset 0 3px 6px rgba(255,255,255,.25)",
            clipPath: moitie === "gauche" ? "polygon(0 0, 55% 0, 42% 50%, 58% 100%, 0 100%)" : "polygon(55% 0, 100% 0, 100% 100%, 58% 100%, 42% 50%)",
            transform: ouvre ? `translateX(${moitie === "gauche" ? -50 : 50}px) translateY(30px) rotate(${moitie === "gauche" ? -35 : 35}deg)` : "none",
            opacity: ouvre ? 0 : 1,
            transition: `transform 650ms ${COURBE}, opacity 500ms ease 150ms`,
          }}
        />
      ))}
      <div
        className="absolute inset-[16%] flex items-center justify-center rounded-full border-2 border-white/35 font-serif font-semibold text-white/90"
        style={{ fontSize: taille * 0.26, textShadow: "0 -1px 0 rgba(0,0,0,.35), 0 1px 1px rgba(255,255,255,.3)", opacity: ouvre ? 0 : 1, transition: "opacity 200ms" }}
      >
        {sceau}
      </div>
    </div>
  );
}

function SceneEnveloppe({ couleur, ouvre, sceau }: PropsScene) {
  const papier = (part: number) => `color-mix(in srgb, ${couleur} ${part}%, #fffaf2)`;
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: ouvre ? 0 : 1, transition: "opacity 450ms ease 1250ms" }}>
      <div style={{ animation: ouvre ? undefined : "rf-inv-flotte 4s ease-in-out infinite", transform: ouvre ? "translateY(60px)" : undefined, transition: `transform 700ms ease-in 1050ms` }}>
        <div className="relative aspect-[3/2] w-[min(78vw,300px)] [perspective:900px]">
          <div className="absolute inset-0 rounded-md shadow-2xl" style={{ background: papier(38) }} />
          {/* The letter, which slides up out of the envelope. */}
          <div
            className="absolute inset-x-[7%] top-[6%] bottom-[10%] rounded-sm bg-white p-[8%] shadow-md"
            style={{ transform: ouvre ? "translateY(-70%)" : "none", transition: `transform 700ms ${COURBE} 480ms`, zIndex: 1 }}
          >
            <div className="mx-auto mb-[6%] h-[10%] w-1/2 rounded-full" style={{ background: papier(60) }} />
            {[80, 64, 72].map((w) => (
              <div key={w} className="mx-auto mb-[5%] h-[5%] rounded-full bg-black/10" style={{ width: `${w}%` }} />
            ))}
          </div>
          <div className="absolute inset-0 rounded-md" style={{ background: papier(26), clipPath: "polygon(0 32%, 50% 64%, 100% 32%, 100% 100%, 0 100%)", zIndex: 2 }} />
          <div
            className="absolute inset-x-0 top-0 h-[58%] origin-top"
            style={{
              background: `linear-gradient(180deg, ${papier(55)}, ${papier(45)})`,
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              transform: ouvre ? "rotateX(180deg)" : "none",
              transition: "transform 520ms ease 120ms, z-index 0s 380ms",
              zIndex: ouvre ? 0 : 3,
              filter: "drop-shadow(0 2px 2px rgba(0,0,0,.12))",
            }}
          />
          <Sceau couleur={couleur} sceau={sceau} taille={58} ouvre={ouvre} style={{ top: "40%", left: "50%", marginLeft: -29, zIndex: 4 }} />
        </div>
      </div>
    </div>
  );
}

function SceneSceau({ couleur, ouvre, sceau }: PropsScene) {
  const papier = `color-mix(in srgb, ${couleur} 10%, #fbf6ec)`;
  const volet = (cote: "gauche" | "droite"): CSSProperties => ({
    background: `linear-gradient(${cote === "gauche" ? 90 : 270}deg, ${papier} 70%, color-mix(in srgb, ${papier} 88%, black))`,
    transformOrigin: cote === "gauche" ? "left center" : "right center",
    transform: ouvre ? `rotateY(${cote === "gauche" ? -108 : 108}deg)` : "none",
    transition: `transform 1000ms ${COURBE} 350ms, opacity 400ms ease 1000ms`,
    opacity: ouvre ? 0 : 1,
  });
  return (
    <div className="absolute inset-0 [perspective:1400px]">
      <div className="absolute inset-y-0 left-0 w-1/2 border-r border-black/10" style={volet("gauche")}>
        <div className="absolute inset-4 rounded-sm border" style={{ borderColor: `color-mix(in srgb, ${couleur} 35%, transparent)` }} />
      </div>
      <div className="absolute inset-y-0 right-0 w-1/2" style={volet("droite")}>
        <div className="absolute inset-4 rounded-sm border" style={{ borderColor: `color-mix(in srgb, ${couleur} 35%, transparent)` }} />
      </div>
      <div className="absolute top-1/2 left-1/2 size-32 -translate-x-1/2 -translate-y-1/2">
        <div className="absolute inset-0 rounded-full" style={{ ["--rf-lueur" as string]: `color-mix(in srgb, ${couleur} 45%, transparent)`, animation: ouvre ? undefined : "rf-inv-lueur 2.4s ease-in-out infinite" }} />
        <Sceau couleur={couleur} sceau={sceau} taille={128} ouvre={ouvre} style={{ inset: 0 }} />
        {ouvre && <div className="absolute -inset-24 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,.95),transparent_60%)]" style={{ animation: "rf-inv-eclair 700ms ease-out forwards" }} />}
      </div>
    </div>
  );
}

function SceneRideau({ couleur, ouvre }: PropsScene) {
  const velours = `linear-gradient(90deg, rgba(0,0,0,.28), rgba(255,255,255,.1) 22%, rgba(0,0,0,.22) 45%, rgba(255,255,255,.12) 68%, rgba(0,0,0,.28)), ${couleur}`;
  const pan = (cote: "gauche" | "droite"): CSSProperties => ({
    background: velours,
    backgroundSize: "64px 100%",
    transformOrigin: cote === "gauche" ? "left top" : "right top",
    transform: ouvre ? "scaleX(0.12)" : undefined,
    animation: ouvre ? undefined : `rf-inv-balance ${cote === "gauche" ? 5 : 5.6}s ease-in-out infinite`,
    transition: `transform 1250ms ${COURBE}`,
    boxShadow: cote === "gauche" ? "inset -24px 0 30px rgba(0,0,0,.35)" : "inset 24px 0 30px rgba(0,0,0,.35)",
  });
  const frange = "repeating-linear-gradient(90deg, #e8c877 0 3px, #b8933f 3px 5px, transparent 5px 7px)";
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(255,244,200,.55),transparent_60%)]" style={{ opacity: ouvre ? 1 : 0, transition: "opacity 900ms ease 300ms" }} />
      <div className="absolute inset-0 flex">
        {(["gauche", "droite"] as const).map((cote) => (
          <div key={cote} className="relative h-full w-1/2" style={pan(cote)}>
            <div className="absolute inset-x-0 bottom-0 h-3" style={{ background: frange }} />
          </div>
        ))}
      </div>
      <div
        className="absolute inset-x-0 top-0 h-16"
        style={{
          background: `radial-gradient(circle at 50% 0, color-mix(in srgb, ${couleur} 80%, black) 68%, transparent 70%) 0 0 / 56px 56px repeat-x, linear-gradient(color-mix(in srgb, ${couleur} 80%, black), color-mix(in srgb, ${couleur} 80%, black)) 0 0 / 100% 22px no-repeat`,
          transform: ouvre ? "translateY(-100%)" : "none",
          transition: "transform 700ms ease 700ms",
        }}
      >
        <div className="absolute inset-x-0 top-[22px] h-[3px] bg-[#e8c877]" />
      </div>
    </div>
  );
}

function SceneCadeau({ couleur, ouvre }: PropsScene) {
  const fonce = `color-mix(in srgb, ${couleur} 82%, black)`;
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: ouvre ? 0 : 1, transition: "opacity 450ms ease 1000ms" }}>
      {ouvre && (
        <div
          className="absolute size-72 rounded-full"
          style={{ background: `repeating-conic-gradient(color-mix(in srgb, ${couleur} 35%, white) 0 10deg, transparent 10deg 30deg)`, animation: "rf-inv-rayons 1300ms ease-out forwards" }}
        />
      )}
      <div className="relative h-44 w-48" style={{ animation: ouvre ? undefined : "rf-inv-secoue 2.6s ease-in-out infinite", transformOrigin: "50% 100%" }}>
        <div
          className="absolute inset-x-0 bottom-0 h-32 rounded-md shadow-2xl"
          style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${couleur} 85%, white), ${couleur})`, transform: ouvre ? "scale(.85) translateY(20px)" : "none", transition: "transform 500ms ease 450ms" }}
        >
          <div className="absolute inset-y-0 left-1/2 w-7 -translate-x-1/2 bg-white/85 shadow-[0_0_0_2px_rgba(0,0,0,.05)]" />
        </div>
        <div
          className="absolute inset-x-[-10px] top-6 h-11 rounded-md shadow-lg"
          style={{ background: fonce, transform: ouvre ? "translateY(-200px) rotate(-28deg)" : "none", opacity: ouvre ? 0 : 1, transition: `transform 800ms ${COURBE}, opacity 400ms ease 450ms` }}
        >
          <div className="absolute inset-y-0 left-1/2 w-7 -translate-x-1/2 bg-white/85" />
          <div className="absolute -top-8 left-1/2 flex -translate-x-1/2 gap-0.5">
            <span className="block size-9 rotate-[-30deg] rounded-[50%_50%_50%_0] border-[5px] border-white/90" />
            <span className="block size-9 rotate-[120deg] rounded-[50%_50%_50%_0] border-[5px] border-white/90" />
          </div>
        </div>
      </div>
    </div>
  );
}

const SCENES: Record<TypeOuverture, (p: PropsScene) => ReactNode> = {
  ENVELOPPE: SceneEnveloppe,
  SCEAU: SceneSceau,
  RIDEAU: SceneRideau,
  CADEAU: SceneCadeau,
};

// ── The practical side, under the card ───────────────────────────────────────

function useMaintenant(actif: boolean) {
  const [maintenant, setMaintenant] = useState<Date | null>(null);
  useEffect(() => {
    if (!actif) return;
    const premier = requestAnimationFrame(() => setMaintenant(new Date()));
    const timer = setInterval(() => setMaintenant(new Date()), 1000);
    return () => {
      cancelAnimationFrame(premier);
      clearInterval(timer);
    };
  }, [actif]);
  return maintenant;
}

function Bloc({ rang, children, className }: { rang: number; children: ReactNode; className?: string }) {
  return (
    <section
      className={cn("rounded-2xl bg-background/85 p-4 shadow-lg ring-1 ring-black/5 backdrop-blur-md", className)}
      style={{ animation: `rf-inv-apparait 650ms ${COURBE} both`, animationDelay: `${300 + rang * 140}ms` }}
    >
      {children}
    </section>
  );
}

function CompteVivant({ contenu, couleur, mots }: { contenu: ContenuInvitation; couleur: string; mots: MotsInvite }) {
  const maintenant = useMaintenant(true);
  const compte = maintenant ? compteARebours(contenu.details.date, contenu.details.heure, maintenant) : null;
  if (!compte) return null;
  if (compte.passe) return <p className="text-center text-sm text-muted-foreground">{mots.passe}</p>;
  const cases: [number, string][] = [
    [compte.jours, mots.jours],
    [compte.heures, mots.heures],
    [compte.minutes, mots.minutes],
    [compte.secondes, mots.secondes],
  ];
  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {cases.map(([valeur, libelle]) => (
          <div key={libelle} className="overflow-hidden rounded-xl py-2 text-center text-white shadow-inner" style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${couleur} 85%, white), ${couleur})` }}>
            <p key={valeur} className="text-2xl font-bold tabular-nums leading-tight animate-in fade-in slide-in-from-top-2 duration-300">{String(valeur).padStart(2, "0")}</p>
            <p className="text-[10px] tracking-wide uppercase opacity-85">{libelle}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">{mots.avant}</p>
    </div>
  );
}

function FicheInvite({ contenu, couleur, apercu }: { contenu: ContenuInvitation; couleur: string; apercu: boolean }) {
  const { details } = contenu;
  const mots = MOTS_INVITE[details.langue];
  const google = lienGoogleMaps(details);
  const agenda = lienAgendaGoogle(contenu, apercu ? undefined : typeof window !== "undefined" ? window.location.href : undefined);
  const reponses = moyensReponse(details.contact);
  const [copie, setCopie] = useState(false);
  const dir = details.langue === "ar" ? "rtl" : "ltr";
  let rang = 0;

  const telechargerIcs = () => {
    const ics = fichierIcs(contenu, { uid: `${details.date}-${details.nomA}-${details.titre ?? ""}`.replace(/\W+/g, "-"), lien: window.location.href });
    if (!ics) return;
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "invitation.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const partager = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: document.title, url }).catch(() => undefined);
      return;
    }
    await navigator.clipboard?.writeText(url);
    setCopie(true);
    toast.success(mots.copie);
    setTimeout(() => setCopie(false), 1500);
  };

  const icone = (Icon: typeof Clock) => (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full text-white" style={{ background: couleur }}>
      <Icon className="size-4" aria-hidden />
    </span>
  );

  return (
    <div className="w-full space-y-3" dir={dir}>
      {details.date && (
        <Bloc rang={rang++}>
          <CompteVivant contenu={contenu} couleur={couleur} mots={mots} />
        </Bloc>
      )}

      {details.date && (
        <Bloc rang={rang++} className="space-y-3">
          <div className="flex items-start gap-3">
            {icone(Clock)}
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{mots.quand}</p>
              <p className="font-semibold text-foreground first-letter:uppercase">{formaterDate(details.date, details.langue)}</p>
              {details.heure && <p className="text-sm text-muted-foreground">{details.heure}</p>}
            </div>
          </div>
          <div className="grid gap-2">
            {agenda && (
              <Button asChild variant="outline" className="h-11">
                <a href={agenda} target="_blank" rel="noopener noreferrer">
                  <CalendarPlus aria-hidden />
                  {mots.agenda}
                </a>
              </Button>
            )}
            <Button variant="outline" className="h-11" onClick={telechargerIcs} disabled={apercu}>
              <CalendarPlus aria-hidden />
              {mots.ics}
            </Button>
          </div>
        </Bloc>
      )}

      {google && (
        <Bloc rang={rang++} className="space-y-3">
          <div className="flex items-start gap-3">
            {icone(MapPin)}
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{mots.ou}</p>
              <p className="font-semibold text-foreground" dir="auto">{details.lieu || details.adresse}</p>
              {details.adresse && details.lieu && <p className="text-sm text-muted-foreground" dir="auto">{details.adresse}</p>}
            </div>
          </div>
          {details.coordonnees && (
            <iframe
              title={mots.carte}
              loading="lazy"
              className="h-52 w-full rounded-xl border-0"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${details.coordonnees.lng - 0.006}%2C${details.coordonnees.lat - 0.004}%2C${details.coordonnees.lng + 0.006}%2C${details.coordonnees.lat + 0.004}&layer=mapnik&marker=${details.coordonnees.lat}%2C${details.coordonnees.lng}`}
            />
          )}
          <div className="grid grid-cols-3 gap-2">
            <Button asChild className="h-11 text-white" style={{ background: couleur }}>
              <a href={google} target="_blank" rel="noopener noreferrer">
                <Navigation aria-hidden />
                Maps
              </a>
            </Button>
            <Button asChild variant="outline" className="h-11">
              <a href={lienAppleMaps(details)!} target="_blank" rel="noopener noreferrer">Apple</a>
            </Button>
            <Button asChild variant="outline" className="h-11">
              <a href={lienWaze(details)!} target="_blank" rel="noopener noreferrer">Waze</a>
            </Button>
          </div>
        </Bloc>
      )}

      {(details.tenue || details.hotes) && (
        <Bloc rang={rang++} className="space-y-3">
          {details.tenue && (
            <div className="flex items-center gap-3">
              {icone(Shirt)}
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{mots.tenue}</p>
                <p className="font-medium text-foreground" dir="auto">{details.tenue}</p>
              </div>
            </div>
          )}
          {details.hotes && (
            <div className="flex items-center gap-3">
              {icone(Users)}
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{mots.hotes}</p>
                <p className="font-medium text-foreground" dir="auto">{details.hotes}</p>
              </div>
            </div>
          )}
        </Bloc>
      )}

      {reponses.length > 0 && (
        <Bloc rang={rang++} className="space-y-3">
          <p className="text-center font-semibold text-foreground">{mots.reponse}</p>
          <div className={cn("grid gap-2", reponses.length === 1 ? "grid-cols-1" : reponses.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
            {reponses.map((r) => {
              const Icon = r.type === "appel" ? Phone : r.type === "whatsapp" ? MessageCircle : Mail;
              return (
                <Button key={r.type} asChild variant={r.type === "whatsapp" ? "default" : "outline"} className={cn("h-11", r.type === "whatsapp" && "bg-[#1f9d55] text-white hover:bg-[#1a8a4a]")}>
                  <a href={r.href} target={r.type === "whatsapp" ? "_blank" : undefined} rel="noopener noreferrer">
                    <Icon aria-hidden />
                    {r.type === "appel" ? mots.appeler : r.type === "whatsapp" ? mots.whatsapp : mots.email}
                  </a>
                </Button>
              );
            })}
          </div>
        </Bloc>
      )}

      {!apercu && (
        <Bloc rang={rang++} className="bg-transparent p-0 shadow-none ring-0 backdrop-blur-none">
          <Button variant="secondary" className="h-11 w-full shadow-md" onClick={() => void partager()}>
            {copie ? <Check aria-hidden /> : <Share2 aria-hidden />}
            {mots.partager}
          </Button>
        </Bloc>
      )}
    </div>
  );
}

// ── The animated card ────────────────────────────────────────────────────────

type Etat = "ferme" | "ouverture" | "ouvert";

export function InvitationAnimee({
  contenu,
  titre,
  musique,
  liensCarte = true,
  cadre = "page",
}: {
  contenu: ContenuInvitation;
  titre: string;
  /** URL of the music file, only when the file really exists. */
  musique?: string | null;
  /** Practical details under the card (countdown, calendar, map, RSVP). */
  liensCarte?: boolean;
  /** Whole screen (public page) or inside the phone frame of the editor's preview. */
  cadre?: "page" | "telephone";
}) {
  const profil = useProfil();
  const statique = profil === "statique";
  const leger = profil === "leger";
  const [etatChoisi, setEtat] = useState<Etat>(contenu.ouverture ? "ferme" : "ouvert");
  // Less motion asked: no opening scene, the card is simply there.
  const etat: Etat = statique ? "ouvert" : etatChoisi;
  const [debut, setDebut] = useState<number | null>(null);
  const [rafale, setRafale] = useState(0);
  const [joue, setJoue] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const config = configEvenement(contenu.typeEvenement ?? "MARIAGE");
  const anime = estAnimee(contenu) && !statique;
  const profondeur = useProfondeur(profil === "complet" && etat === "ouvert");
  const telephone = cadre === "telephone";
  const couleur = contenu.ouverture?.couleur ?? config.palettes[0].principale;
  const mots = MOTS_INVITE[contenu.details.langue];
  const ouverture = contenu.ouverture?.type;
  const carteVisible = etat === "ouvert" || (etat === "ouverture" && !!ouverture && DEVOILE[ouverture]);

  // The headline of the closed scene uses the font and color of the card's own title.
  const titreCarte = contenu.elements.find((e): e is ElementTexte => e.type === "text" && (e.linkedTo === "noms" || e.linkedTo === "titre" || e.linkedTo === "nomA"));
  const enTete = contenu.details.titre?.trim() && config.requis.includes("titre") ? contenu.details.titre : valeurChamp(contenu.details, "noms");

  // Without an opening scene, the entrances start as soon as the card is on screen.
  useEffect(() => {
    if (statique || contenu.ouverture) return;
    const cadreAnim = requestAnimationFrame(() => {
      setDebut(performance.now());
      setRafale((r) => r + 1);
    });
    return () => cancelAnimationFrame(cadreAnim);
  }, [contenu.ouverture, statique]);

  const lancerMusique = useCallback(() => {
    if (!musique) return;
    const audio = audioRef.current ?? new Audio(musique);
    audioRef.current = audio;
    audio.loop = true;
    audio.volume = contenu.musique?.volume ?? 0.6;
    audio.play().then(() => setJoue(true)).catch(() => setJoue(false));
  }, [musique, contenu.musique?.volume]);

  useEffect(() => () => audioRef.current?.pause(), []);

  const ouvrir = () => {
    // Everything that needs the guest's tap happens here: music, and the tilt permission on iOS.
    lancerMusique();
    if (profil === "complet") void demanderInclinaison();
    navigator.vibrate?.(15);
    setEtat("ouverture");
    const duree = ouverture ? DUREE_SCENE[ouverture] : 0;
    // Uncovering scenes start the entrances while they open; the others when the card is handed over.
    if (ouverture && DEVOILE[ouverture]) setTimeout(() => setDebut(performance.now()), duree * 0.45);
    setTimeout(() => {
      setEtat("ouvert");
      setDebut((d) => d ?? performance.now());
      setRafale((r) => r + 1);
    }, duree);
  };

  const rejouer = () => {
    audioRef.current?.pause();
    setJoue(false);
    setDebut(null);
    if (contenu.ouverture) {
      setEtat("ferme");
    } else {
      requestAnimationFrame(() => {
        setDebut(performance.now());
        setRafale((r) => r + 1);
      });
    }
  };

  const basculerMusique = () => {
    const audio = audioRef.current;
    if (audio && joue) {
      audio.pause();
      setJoue(false);
    } else {
      lancerMusique();
    }
  };

  const lecture = useMemo(() => (anime ? { debut } : undefined), [anime, debut]);
  const { width, height } = contenu.size;
  const largeurCarte = telephone ? `min(100%, 340px)` : `min(100%, ${width * 1.3}px, calc((100dvh - 7rem) * ${width / height}))`;

  const carteStatique = (
    <div style={{ width: largeurCarte }} className="mx-auto py-6">
      <InvitationApercu contenu={contenu} className="w-full overflow-hidden rounded-sm shadow-xl" />
    </div>
  );

  return (
    <Repli secours={carteStatique}>
      <style>{STYLES}</style>
      <div className={cn("rf-inv-clair relative isolate flex flex-col items-center", telephone ? "min-h-full" : "min-h-dvh")}>
        <Aurore fond={contenu.background.color} principale={couleur} fixe={statique} />
        {contenu.ambiance && !statique && etat === "ouvert" && <Particules type={contenu.ambiance.type} densite={contenu.ambiance.densite} leger={leger} />}

        <div className={cn("relative z-10 flex w-full flex-col items-center gap-5", telephone ? "px-4 pt-6 pb-20" : "px-4 pt-8 pb-24 sm:px-8 sm:pt-12")}>
          <div
            className="relative w-full"
            style={{
              width: largeurCarte,
              transform: `perspective(1200px) rotateY(${profondeur.x * 7}deg) rotateX(${-profondeur.y * 7}deg) translateY(${carteVisible ? 0 : 24}px) scale(${carteVisible ? 1 : 0.9})`,
              opacity: carteVisible ? 1 : 0,
              transition: `transform 700ms ${COURBE}, opacity 700ms ease`,
            }}
          >
            <div style={{ animation: etat === "ouvert" && !statique ? "rf-inv-respire 6s ease-in-out infinite" : undefined }}>
              <div className="relative overflow-hidden rounded-sm shadow-[0_25px_60px_-15px_rgba(0,0,0,.45)]">
                <InvitationApercu contenu={contenu} lecture={lecture} className="w-full" />
                {etat === "ouvert" && !statique && (
                  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/45 to-transparent mix-blend-soft-light" style={{ animation: "rf-inv-reflet 7s ease-in-out 1.6s infinite" }} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {etat === "ouvert" && liensCarte && <div className="w-full" style={{ maxWidth: telephone ? 340 : 460 }}><FicheInvite contenu={contenu} couleur={couleur} apercu={telephone} /></div>}
        </div>

        {rafale > 0 && contenu.ambiance && !statique && <Rafale key={rafale} type={contenu.ambiance.type} leger={leger} />}

        {etat !== "ouvert" && ouverture && (
          <div className="absolute inset-0 z-20 overflow-hidden">
            {SCENES[ouverture]({ couleur, ouvre: etat === "ouverture", sceau: initiales(contenu.details) })}
            {etat === "ferme" && (
              <div className={cn("absolute inset-x-0 flex flex-col items-center gap-3 px-6 text-center", ouverture === "SCEAU" ? "bottom-[8%]" : "bottom-[10%]")}>
                <div className="space-y-1 rounded-2xl bg-black/40 px-5 py-3 text-white shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-700">
                  <p className="text-[11px] tracking-[0.25em] uppercase opacity-80">{mots.invite}</p>
                  <p className="text-3xl leading-tight" dir="auto" style={{ fontFamily: titreCarte ? `"${titreCarte.style.fontFamily}"` : undefined }}>{enTete}</p>
                  {contenu.details.date && <p className="text-xs opacity-80 first-letter:uppercase">{formaterDate(contenu.details.date, contenu.details.langue)}</p>}
                </div>
                <div className="relative">
                  <span aria-hidden className="absolute inset-0 rounded-full bg-white/70" style={{ animation: "rf-inv-onde 1.8s ease-out infinite" }} />
                  <Button size="lg" className="relative h-12 rounded-full px-8 text-base shadow-xl" onClick={ouvrir} autoFocus>
                    {mots.ouvrir}
                  </Button>
                </div>
                <span className="sr-only">{titre}</span>
              </div>
            )}
          </div>
        )}

        {etat === "ouvert" && (
          <div className={cn("z-30 flex gap-2", telephone ? "absolute right-3 bottom-3" : "fixed right-4 bottom-4")}>
            {musique && (
              <Button size="icon" variant="secondary" className="size-11 rounded-full shadow-lg" onClick={basculerMusique} aria-label={joue ? mots.pause : mots.musique}>
                {joue ? (
                  <span aria-hidden className="flex h-4 items-end gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="block h-full w-1 origin-bottom rounded-full bg-current" style={{ animation: `rf-inv-egaliseur ${0.7 + i * 0.15}s ease-in-out ${i * 0.1}s infinite` }} />
                    ))}
                  </span>
                ) : (
                  <Music aria-hidden />
                )}
              </Button>
            )}
            {(contenu.ouverture || anime) && (
              <Button size="icon" variant="secondary" className="size-11 rounded-full shadow-lg" onClick={rejouer} aria-label={mots.rejouer} title={mots.rejouer}>
                <RotateCcw aria-hidden />
              </Button>
            )}
          </div>
        )}
        <span className="sr-only">{config.label}</span>
      </div>
    </Repli>
  );
}

// ── Preview from the editor ──────────────────────────────────────────────────

/**
 * "Preview as guest": the whole public experience inside a phone, as guests will see it. On a
 * phone the dialog takes the whole screen instead. A replay button and the link when it is shared.
 */
export function ApercuInvite({
  contenu,
  titre,
  musiques,
  open,
  onOpenChange,
  lienPublic,
}: {
  contenu: ContenuInvitation;
  titre: string;
  musiques: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Address of the shared page, when the link is on. */
  lienPublic?: string | null;
}) {
  const [cle, setCle] = useState(0);
  const piste = contenu.musique && musiques.includes(contenu.musique.piste) ? MUSIQUES[contenu.musique.piste].fichier : null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] max-w-none flex-col gap-3 rounded-none p-0 sm:h-auto sm:max-h-[96dvh] sm:max-w-3xl sm:rounded-lg sm:p-6">
        <DialogHeader className="px-4 pt-4 text-left sm:p-0">
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="size-5" aria-hidden />
            Preview as guest
          </DialogTitle>
          <DialogDescription>Exactly what people see when they open your link: tap Open, then scroll under the card.</DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
          {/* Phone frame on larger screens; the screen itself on a phone. */}
          <div className="relative mx-auto h-full w-full sm:h-[min(760px,82dvh)] sm:w-auto sm:aspect-[390/800] sm:rounded-[2.6rem] sm:border-[10px] sm:border-neutral-900 sm:bg-neutral-900 sm:shadow-2xl">
            <div aria-hidden className="absolute top-2 left-1/2 z-40 hidden h-5 w-24 -translate-x-1/2 rounded-full bg-neutral-900 sm:block" />
            <div className="relative h-full overflow-x-hidden overflow-y-auto overscroll-contain bg-muted sm:rounded-[2rem]">
              {open && <InvitationAnimee key={cle} contenu={contenu} titre={titre} musique={piste} cadre="telephone" />}
            </div>
          </div>
          <div className="space-y-3 px-4 pb-4 sm:p-0">
            <Button variant="outline" className="w-full" onClick={() => setCle((c) => c + 1)}>
              <RotateCcw aria-hidden />
              Replay from the start
            </Button>
            {lienPublic && (
              <Button asChild variant="secondary" className="w-full">
                <a href={lienPublic} target="_blank" rel="noopener noreferrer">
                  <ExternalLink aria-hidden />
                  Open the real page
                </a>
              </Button>
            )}
            <ul className="hidden space-y-1.5 text-xs text-muted-foreground sm:block">
              <li>• The opening scene, the particles and the music are chosen in the Motion tab.</li>
              <li>• Under the card guests get a live countdown, calendar buttons, the map and the RSVP buttons (from the contact you typed).</li>
              <li>• Guests who asked their phone for less motion see the still card. Downloads always show the still card.</li>
            </ul>
            {!piste && contenu.musique && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <VolumeX className="size-3.5" aria-hidden />
                The chosen music file is not installed yet.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
