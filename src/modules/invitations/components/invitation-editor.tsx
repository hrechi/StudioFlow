"use client";

import type Konva from "konva";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  ArrowLeft,
  BoxSelect,
  CheckCircle2,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Download,
  FlipHorizontal2,
  FlipVertical2,
  Grid3x3,
  Group,
  Hand,
  LayoutGrid,
  Loader2,
  Minus,
  Play,
  Plus,
  QrCode,
  Redo2,
  Send,
  Trash2,
  TriangleAlert,
  Undo2,
  Ungroup,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { saveInvitationAction } from "../invitation.actions";
import { luminance } from "../invitation.couleurs";
import { exportInvitation, imageApercu } from "../invitation.canvas";
import { debutHistorique, historiqueReducer } from "../invitation.history";
import { appliquerDetails, champsManquants } from "../invitation.linked";
import {
  aligner,
  avecGroupes,
  degrouper,
  deplacerCouches,
  distribuer,
  dupliquer,
  grouper,
  retourner,
  type Alignement,
  type DeplacementCouche,
} from "../invitation.outils";
import { qrLieu } from "../invitation.modeles";
import { typeDe, type ContenuInvitation, type ElementInvitation, type Palette } from "../invitation.schema";
import { CLIENT_PATH, type InvitationView } from "../invitation.types";
import { PanneauAnimation } from "./invitation-animation-panel";
import { InvitationStage } from "./invitation-apercu";
import { PanneauCalques } from "./invitation-calques";
import { ApercuInvite } from "./invitation-animee";
import { ContenuEnvoi, DialogEnvoi, lienPartage, type EtatPartage } from "./invitation-envoi";
import { PanneauAjout, PanneauDetails, PanneauStyle } from "./invitation-panels";

type EtatSauvegarde = "enregistre" | "modifie" | "enregistrement" | "erreur";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const GRILLE = 10;

const nouvelId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const ALIGNEMENTS: { mode: Alignement; label: string; icon: typeof AlignStartVertical }[] = [
  { mode: "gauche", label: "Align left", icon: AlignStartVertical },
  { mode: "centreH", label: "Align centers horizontally", icon: AlignCenterVertical },
  { mode: "droite", label: "Align right", icon: AlignEndVertical },
  { mode: "haut", label: "Align top", icon: AlignStartHorizontal },
  { mode: "centreV", label: "Align centers vertically", icon: AlignCenterHorizontal },
  { mode: "bas", label: "Align bottom", icon: AlignEndHorizontal },
];

export function InvitationEditor({ invitation, musiques = [], envoyer = false }: { invitation: InvitationView; musiques?: string[]; /** Open the Send dialog right away (from the list). */ envoyer?: boolean }) {
  const [historique, dispatch] = useReducer(historiqueReducer<ContenuInvitation>, invitation.contenu, debutHistorique<ContenuInvitation>);
  const contenu = historique.present;
  const [titre, setTitre] = useState(invitation.titre);
  const [selection, setSelection] = useState<string[]>([]);
  const [onglet, setOnglet] = useState("details");
  const [sauvegarde, setSauvegarde] = useState<EtatSauvegarde>("enregistre");
  const [erreurTitre, setErreurTitre] = useState<string>();
  const [zoom, setZoom] = useState(1);
  const [largeur, setLargeur] = useState(0);
  const [exportEnCours, setExportEnCours] = useState(false);
  const [grille, setGrille] = useState(false);
  const [multiple, setMultiple] = useState(false);
  const [main, setMain] = useState(false);
  const [apercuInvite, setApercuInvite] = useState(false);
  const [partage, setPartage] = useState<EtatPartage>({ actif: invitation.partageActif, token: invitation.partageToken });
  const [envoi, setEnvoi] = useState(envoyer);
  const partageActif = partage.actif;
  const stageRef = useRef<Konva.Stage | null>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const pressePapier = useRef<ElementInvitation[]>([]);

  const selectionnes = contenu.elements.filter((e) => selection.includes(e.id));
  const element = selectionnes.length === 1 ? selectionnes[0] : undefined;
  const type = typeDe(contenu);
  // At 100% the whole card is visible without scrolling; zooming in is a choice.
  const hauteurMax = typeof window === "undefined" ? 800 : window.innerHeight * 0.7;
  const scale = largeur > 0 ? Math.min(largeur / contenu.size.width, hauteurMax / contenu.size.height, 1.3) * zoom : 0;

  /** Every change goes through here: history, and the linked texts follow the form. */
  const changer = useCallback((suivant: ContenuInvitation, cle?: string) => {
    dispatch({ type: "appliquer", valeur: appliquerDetails(suivant), cle });
  }, []);

  const changerElements = useCallback(
    (elements: ElementInvitation[], cle?: string) => changer({ ...contenu, elements }, cle),
    [changer, contenu],
  );

  const changerElement = useCallback(
    (id: string, patch: Partial<ElementInvitation>, cle?: string) => {
      changerElements(contenu.elements.map((e) => (e.id === id ? ({ ...e, ...patch } as ElementInvitation) : e)), cle);
    },
    [changerElements, contenu.elements],
  );

  const changerPlusieurs = useCallback(
    (patches: { id: string; patch: Partial<ElementInvitation> }[]) => {
      const parId = new Map(patches.map((p) => [p.id, p.patch]));
      changerElements(contenu.elements.map((e) => (parId.has(e.id) ? ({ ...e, ...parId.get(e.id) } as ElementInvitation) : e)));
    },
    [changerElements, contenu.elements],
  );

  const coucheSuivante = useCallback(
    () => contenu.elements.reduce((max, e) => Math.max(max, e.layer), 0) + 1,
    [contenu.elements],
  );

  /** New elements land on top, in the middle of the card, and are selected. */
  const ajouter = useCallback(
    (nouveau: Omit<ElementInvitation, "id" | "layer" | "x" | "y" | "rotation"> & Partial<Pick<ElementInvitation, "x" | "y">>) => {
      const complet = {
        rotation: 0,
        x: (contenu.size.width - nouveau.width) / 2,
        y: (contenu.size.height - nouveau.height) / 2,
        ...nouveau,
        id: nouvelId(),
        layer: coucheSuivante(),
      } as ElementInvitation;
      changer({ ...contenu, elements: [...contenu.elements, complet] });
      setSelection([complet.id]);
      setOnglet("style");
    },
    [changer, contenu, coucheSuivante],
  );

  /** A click selects the whole group of an element; Shift adds to (or removes from) the selection. */
  const choisir = useCallback(
    (id: string | null, ajout?: boolean) => {
      if (!id) {
        setSelection([]);
        return;
      }
      const ids = avecGroupes(contenu.elements, [id]);
      setSelection((actuelle) => {
        if (!ajout) return ids;
        const tous = ids.every((i) => actuelle.includes(i));
        return tous ? actuelle.filter((i) => !ids.includes(i)) : [...new Set([...actuelle, ...ids])];
      });
      if (!ajout) setOnglet((o) => (o === "details" || o === "ajout" ? "style" : o));
    },
    [contenu.elements],
  );

  const sansQr = !contenu.elements.some((e) => e.type === "qrcode");
  /**
   * The venue QR code, in the darkest color of the card's texts, on the first free spot along the
   * bottom (center, right, left), so it never covers a text of an older card.
   */
  const ajouterQr = () => {
    const encre = contenu.elements
      .flatMap((e) => (e.type === "text" ? [e.style.color] : []))
      .sort((a, b) => luminance(a) - luminance(b))[0];
    const taille = 72;
    const { width: w, height: h } = contenu.size;
    const surface = w * h;
    // Frames, bands and backgrounds may sit under the code; texts and decorations may not.
    // A text box is often as wide as the card: only the width its letters take really counts.
    const obstacles = contenu.elements
      .filter((e) => e.visible !== false && e.width * e.height < surface * 0.35)
      .map((e) => {
        if (e.type !== "text" || e.style.courbe) return { x: e.x, y: e.y, width: e.width, height: e.height };
        const largeur = Math.min(e.width, e.text.length * e.style.fontSize * 0.55 + 8);
        const x = e.style.align === "left" ? e.x : e.style.align === "right" ? e.x + e.width - largeur : e.x + (e.width - largeur) / 2;
        return { x, y: e.y, width: largeur, height: e.height };
      });
    const libre = (x: number, y: number) =>
      obstacles.every((e) => x + taille <= e.x || x >= e.x + e.width || y + taille <= e.y || y >= e.y + e.height);
    const candidats = [28, 48, 90].flatMap((bas) => [0.5, 0.8, 0.2].map((cx) => ({ x: Math.round(w * cx - taille / 2), y: h - taille - bas })));
    const place = candidats.find((c) => libre(c.x, c.y)) ?? candidats[0];
    ajouter({ ...qrLieu("qr", 0, place.x, place.y, taille, encre && luminance(encre) < 0.18 ? encre : "#1c1c1c") });
  };

  const supprimer = useCallback(() => {
    if (selection.length === 0) return;
    changerElements(contenu.elements.filter((e) => !selection.includes(e.id) || e.verrouille));
    setSelection([]);
  }, [changerElements, contenu.elements, selection]);

  const copier = useCallback(() => {
    if (selectionnes.length === 0) return;
    pressePapier.current = selectionnes;
    toast.success(selectionnes.length > 1 ? `${selectionnes.length} elements copied` : "Element copied");
  }, [selectionnes]);

  const coller = useCallback(() => {
    if (pressePapier.current.length === 0) return;
    const { elements, ids } = dupliquer(contenu.elements, pressePapier.current, nouvelId);
    pressePapier.current = elements.filter((e) => ids.includes(e.id));
    changerElements(elements);
    setSelection(ids);
  }, [changerElements, contenu.elements]);

  const dupliquerSelection = useCallback(() => {
    if (selectionnes.length === 0) return;
    const { elements, ids } = dupliquer(contenu.elements, selectionnes, nouvelId);
    changerElements(elements);
    setSelection(ids);
  }, [changerElements, contenu.elements, selectionnes]);

  const outils = {
    aligner: (mode: Alignement) => changerElements(aligner(contenu.elements, selection, mode, contenu.size)),
    distribuer: (axe: "horizontal" | "vertical") => changerElements(distribuer(contenu.elements, selection, axe)),
    grouper: () => changerElements(grouper(contenu.elements, selection, nouvelId())),
    degrouper: () => changerElements(degrouper(contenu.elements, selection)),
    retourner: (axe: "horizontal" | "vertical") => changerElements(retourner(contenu.elements, selection, axe)),
    couches: (vers: DeplacementCouche) => changerElements(deplacerCouches(contenu.elements, selection, vers)),
  };
  const groupee = selectionnes.length > 1 && selectionnes.every((e) => e.groupe && e.groupe === selectionnes[0].groupe);

  const appliquerPalette = (palette: Palette) => {
    changer({
      ...contenu,
      background: { ...contenu.background, color: palette.fond },
      elements: contenu.elements.map((e) => {
        if (e.type === "text") {
          const principal = e.linkedTo === "noms" || e.linkedTo === "nomA" || e.linkedTo === "nomB" || e.linkedTo === "titre";
          return { ...e, style: { ...e.style, color: principal ? palette.principale : palette.secondaire } };
        }
        if (e.type === "countdown") return { ...e, style: { ...e.style, color: palette.principale } };
        if (e.type === "shape") {
          return {
            ...e,
            style: {
              ...e.style,
              fill: e.style.fill ? palette.secondaire : null,
              stroke: e.style.stroke ? palette.secondaire : null,
              degrade: e.style.degrade ? { ...e.style.degrade, de: palette.principale, a: palette.secondaire } : undefined,
            },
          };
        }
        return e;
      }),
    });
  };

  // ── Fit the card to the available width ───────────────────────────────────
  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return;
    const observer = new ResizeObserver(([entry]) => setLargeur(entry.contentRect.width));
    observer.observe(zone);
    return () => observer.disconnect();
  }, []);

  // ── Autosave: one request at a time, the latest state always ends up saved ─
  const dernierEnregistre = useRef({ contenu: invitation.contenu, titre: invitation.titre });
  const enCours = useRef(false);
  const aJour = useRef({ contenu, titre });
  useEffect(() => {
    aJour.current = { contenu, titre };
  }, [contenu, titre]);

  // Link preview (Open Graph): refreshed a little after the saves, only while the card is shared.
  const apercuEnvoye = useRef<ContenuInvitation | null>(null);
  const envoyerApercu = useCallback(async () => {
    const stage = stageRef.current;
    const actuel = aJour.current.contenu;
    if (!stage || apercuEnvoye.current === actuel) return;
    try {
      const image = await imageApercu(stage, actuel);
      const form = new FormData();
      form.append("image", image, "apercu.png");
      const reponse = await fetch(`/api/invitations/${invitation.id}/apercu`, { method: "POST", body: form });
      if (reponse.ok) apercuEnvoye.current = actuel;
    } catch (error) {
      // The preview is a bonus: the card works without it.
      console.warn("[invitations] link preview not updated", error);
    }
  }, [invitation.id]);

  useEffect(() => {
    if (!partageActif || sauvegarde !== "enregistre") return;
    const timer = setTimeout(() => void envoyerApercu(), 4000);
    return () => clearTimeout(timer);
  }, [partageActif, sauvegarde, contenu, envoyerApercu]);

  const changerPartage = (suivant: EtatPartage) => {
    setPartage(suivant);
    if (suivant.actif) void envoyerApercu();
  };

  const enregistrer = useCallback(async () => {
    if (enCours.current) return;
    enCours.current = true;
    const identique = () =>
      aJour.current.contenu === dernierEnregistre.current.contenu && aJour.current.titre === dernierEnregistre.current.titre;
    while (!identique()) {
      const cible = aJour.current;
      setSauvegarde("enregistrement");
      const result = await saveInvitationAction(invitation.id, cible);
      if (!result.ok) {
        enCours.current = false;
        setSauvegarde("erreur");
        setErreurTitre(result.fieldErrors?.titre?.[0]);
        if (!result.fieldErrors?.titre) toast.error(result.error);
        return;
      }
      setErreurTitre(undefined);
      dernierEnregistre.current = cible;
    }
    enCours.current = false;
    setSauvegarde("enregistre");
  }, [invitation.id]);

  useEffect(() => {
    if (contenu === dernierEnregistre.current.contenu && titre === dernierEnregistre.current.titre) return;
    setSauvegarde("modifie");
    const timer = setTimeout(() => void enregistrer(), 1200);
    return () => clearTimeout(timer);
  }, [contenu, titre, enregistrer]);

  useEffect(() => {
    if (sauvegarde === "enregistre") return;
    const prevenir = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", prevenir);
    return () => window.removeEventListener("beforeunload", prevenir);
  }, [sauvegarde]);

  const zoomer = useCallback(
    (facteur: number) => setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * facteur * 100) / 100))),
    [],
  );

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  const [espace, setEspace] = useState(false);
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement;
      if (cible.closest("input, textarea, select, [contenteditable=true], [role=combobox], [role=dialog]")) return;
      const ctrl = e.ctrlKey || e.metaKey;
      const lettre = e.key.toLowerCase();
      if (e.key === " ") {
        e.preventDefault();
        setEspace(true);
      } else if (ctrl && lettre === "z") {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? "retablir" : "annuler" });
      } else if (ctrl && lettre === "y") {
        e.preventDefault();
        dispatch({ type: "retablir" });
      } else if (ctrl && lettre === "s") {
        e.preventDefault();
        void enregistrer();
      } else if (ctrl && lettre === "a") {
        e.preventDefault();
        setSelection(contenu.elements.filter((x) => x.visible !== false && !x.verrouille).map((x) => x.id));
      } else if (ctrl && lettre === "c") {
        copier();
      } else if (ctrl && lettre === "v") {
        coller();
      } else if (ctrl && lettre === "d") {
        e.preventDefault();
        dupliquerSelection();
      } else if (ctrl && lettre === "g") {
        e.preventDefault();
        if (e.shiftKey) outils.degrouper();
        else outils.grouper();
      } else if (ctrl && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        zoomer(1.25);
      } else if (ctrl && e.key === "-") {
        e.preventDefault();
        zoomer(0.8);
      } else if (ctrl && e.key === "0") {
        e.preventDefault();
        setZoom(1);
      } else if (e.key === "]") {
        outils.couches(ctrl ? "devant" : "avant");
      } else if (e.key === "[") {
        outils.couches(ctrl ? "fond" : "arriere");
      } else if (e.shiftKey && lettre === "h") {
        outils.retourner("horizontal");
      } else if (e.shiftKey && lettre === "v") {
        outils.retourner("vertical");
      } else if (!ctrl && lettre === "g") {
        setGrille((g) => !g);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selection.length > 0) {
          e.preventDefault();
          supprimer();
        }
      } else if (e.key === "Escape") {
        setSelection([]);
      } else if (selectionnes.length > 0 && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const pas = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -pas : e.key === "ArrowRight" ? pas : 0;
        const dy = e.key === "ArrowUp" ? -pas : e.key === "ArrowDown" ? pas : 0;
        const ids = selectionnes.filter((x) => !x.verrouille).map((x) => x.id);
        changerElements(contenu.elements.map((x) => (ids.includes(x.id) ? { ...x, x: x.x + dx, y: x.y + dy } : x)), `fleches:${ids.join(",")}`);
      }
    };
    const relache = (e: KeyboardEvent) => {
      if (e.key === " ") setEspace(false);
    };
    window.addEventListener("keydown", touche);
    window.addEventListener("keyup", relache);
    return () => {
      window.removeEventListener("keydown", touche);
      window.removeEventListener("keyup", relache);
    };
    // `outils` is rebuilt on each render from the same values listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changerElements, coller, copier, contenu.elements, dupliquerSelection, enregistrer, selection, selectionnes, supprimer, zoomer]);

  // ── Pan (hand tool or Space + drag) and zoom (pinch, Ctrl + wheel) ─────────
  const panoramique = main || espace;
  const glisse = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const pincement = useRef<{ distance: number; zoom: number } | null>(null);
  const distance = (touches: React.TouchList) =>
    Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);

  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return;
    const molette = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomer(e.deltaY < 0 ? 1.1 : 0.9);
    };
    zone.addEventListener("wheel", molette, { passive: false });
    return () => zone.removeEventListener("wheel", molette);
  }, [zoomer]);

  const exporter = async (format: "png" | "pdf") => {
    const stage = stageRef.current;
    if (!stage) return;
    const manquants = Object.values(champsManquants(contenu.details, type));
    if (manquants.length > 0) {
      toast.warning("Some details are still empty", { description: manquants[0] });
    }
    setSelection([]);
    setExportEnCours(true);
    try {
      await exportInvitation(stage, contenu, titre, format);
    } catch (error) {
      console.error(error);
      toast.error("The export failed. Please try again.");
    } finally {
      setExportEnCours(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href={CLIENT_PATH} aria-label="Back to my invitations">
            <ArrowLeft aria-hidden />
          </Link>
        </Button>
        <div className="min-w-40 flex-1">
          <Input
            aria-label="Name of the invitation"
            aria-invalid={!!erreurTitre}
            value={titre}
            maxLength={80}
            onChange={(e) => setTitre(e.target.value)}
            className="h-9 font-semibold"
          />
          {erreurTitre && <p className="mt-1 text-xs text-destructive">{erreurTitre}</p>}
        </div>
        <EtatEnregistrement etat={sauvegarde} onReessayer={() => void enregistrer()} />
        <Button variant="outline" onClick={() => setApercuInvite(true)}>
          <Play aria-hidden />
          <span className="max-sm:sr-only">Preview as guest</span>
        </Button>
        <Button onClick={() => setEnvoi(true)}>
          <Send aria-hidden />
          Send
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={exportEnCours}>
              {exportEnCours ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
              <span className="max-sm:sr-only">Download</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => void exporter("pdf")}>PDF, for printing</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void exporter("png")}>PNG, for messages</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {sansQr && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <QrCode className="size-5 shrink-0 text-primary" aria-hidden />
          <p className="min-w-0 flex-1">This card has no QR code to the venue yet. Guests scan it to open the directions in Google Maps.</p>
          <Button size="sm" onClick={ajouterQr}>
            Add the QR code
          </Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="min-w-0 space-y-2">
          <div role="toolbar" aria-label="Editing tools" className="flex flex-wrap items-center gap-0.5 rounded-lg border bg-card p-1">
            <Outil label="Undo (Ctrl+Z)" disabled={historique.passe.length === 0} onClick={() => dispatch({ type: "annuler" })} icon={Undo2} />
            <Outil label="Redo (Ctrl+Y)" disabled={historique.futur.length === 0} onClick={() => dispatch({ type: "retablir" })} icon={Redo2} />
            <Separateur />
            <Outil label="Copy (Ctrl+C)" disabled={selection.length === 0} onClick={copier} icon={Copy} />
            <Outil label="Paste (Ctrl+V)" onClick={coller} icon={ClipboardPaste} />
            <Outil label="Duplicate (Ctrl+D)" disabled={selection.length === 0} onClick={dupliquerSelection} icon={CopyPlus} />
            <Outil label="Delete (Del)" disabled={selection.length === 0} onClick={supprimer} icon={Trash2} />
            <Separateur />
            {groupee ? (
              <Outil label="Ungroup (Ctrl+Shift+G)" onClick={outils.degrouper} icon={Ungroup} />
            ) : (
              <Outil label="Group (Ctrl+G)" disabled={selection.length < 2} onClick={outils.grouper} icon={Group} />
            )}
            <Outil label="Flip horizontally (Shift+H)" disabled={selection.length === 0} onClick={() => outils.retourner("horizontal")} icon={FlipHorizontal2} />
            <Outil label="Flip vertically (Shift+V)" disabled={selection.length === 0} onClick={() => outils.retourner("vertical")} icon={FlipVertical2} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="size-8" title="Align and distribute" aria-label="Align and distribute" disabled={selection.length === 0}>
                  <LayoutGrid aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel className="text-xs">{selection.length === 1 ? "Align to the card" : "Align the selection"}</DropdownMenuLabel>
                {ALIGNEMENTS.map(({ mode, label, icon: Icon }) => (
                  <DropdownMenuItem key={mode} onSelect={() => outils.aligner(mode)}>
                    <Icon aria-hidden />
                    {label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={selection.length < 3} onSelect={() => outils.distribuer("horizontal")}>
                  <AlignHorizontalDistributeCenter aria-hidden />
                  Distribute horizontally
                </DropdownMenuItem>
                <DropdownMenuItem disabled={selection.length < 3} onSelect={() => outils.distribuer("vertical")}>
                  <AlignVerticalDistributeCenter aria-hidden />
                  Distribute vertically
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Separateur />
            <Bascule label="Select several (or Shift + click)" actif={multiple} onClick={() => setMultiple((m) => !m)} icon={BoxSelect} />
            <Bascule label="Grid (G)" actif={grille} onClick={() => setGrille((g) => !g)} icon={Grid3x3} />
            <Bascule label="Move the view (or hold Space)" actif={main} onClick={() => setMain((m) => !m)} icon={Hand} />
            <span className="ml-auto flex items-center gap-0.5">
              <Outil label="Zoom out (Ctrl+-)" disabled={zoom <= ZOOM_MIN} onClick={() => zoomer(0.8)} icon={Minus} />
              <button type="button" onClick={() => setZoom(1)} className="w-12 rounded text-center text-xs tabular-nums hover:bg-muted" aria-label="Reset zoom">
                {Math.round(zoom * 100)}%
              </button>
              <Outil label="Zoom in (Ctrl++)" disabled={zoom >= ZOOM_MAX} onClick={() => zoomer(1.25)} icon={Plus} />
            </span>
          </div>
          <div
            ref={zoneRef}
            className={`max-h-[75vh] min-h-64 touch-pan-x touch-pan-y overflow-auto rounded-lg bg-muted/50 p-4 ${panoramique ? "cursor-grab active:cursor-grabbing" : ""}`}
            onPointerDown={(e) => {
              if (!panoramique || !zoneRef.current) return;
              glisse.current = { x: e.clientX, y: e.clientY, left: zoneRef.current.scrollLeft, top: zoneRef.current.scrollTop };
            }}
            onPointerMove={(e) => {
              if (!glisse.current || !zoneRef.current) return;
              zoneRef.current.scrollLeft = glisse.current.left - (e.clientX - glisse.current.x);
              zoneRef.current.scrollTop = glisse.current.top - (e.clientY - glisse.current.y);
            }}
            onPointerUp={() => {
              glisse.current = null;
            }}
            onTouchStart={(e) => {
              if (e.touches.length === 2) pincement.current = { distance: distance(e.touches), zoom };
            }}
            onTouchMove={(e) => {
              if (e.touches.length !== 2 || !pincement.current) return;
              const ratio = distance(e.touches) / pincement.current.distance;
              setZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(pincement.current.zoom * ratio * 100) / 100)));
            }}
            onTouchEnd={() => {
              pincement.current = null;
            }}
          >
            {scale > 0 && (
              <div className={`mx-auto w-fit shadow-card ${panoramique ? "pointer-events-none" : ""}`}>
                <InvitationStage
                  contenu={contenu}
                  scale={scale}
                  stageRef={stageRef}
                  edition={{
                    selection,
                    onSelect: choisir,
                    onChange: changerElement,
                    onChangeMany: changerPlusieurs,
                    grille: grille ? GRILLE : null,
                    multiple,
                  }}
                />
              </div>
            )}
          </div>
          <p className="hidden text-xs text-muted-foreground sm:block">
            Shift + click selects several elements · Ctrl + wheel zooms · Space + drag moves the view · G shows the grid
          </p>
        </div>

        <Tabs value={onglet} onValueChange={setOnglet} className="min-w-0">
          <TabsList className="grid h-auto w-full grid-cols-3 gap-y-1 sm:grid-cols-6 [&>button]:px-1 [&>button]:text-xs sm:[&>button]:text-sm">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="ajout">Add</TabsTrigger>
            <TabsTrigger value="style">Style</TabsTrigger>
            <TabsTrigger value="calques">Layers</TabsTrigger>
            <TabsTrigger value="animation">Motion</TabsTrigger>
            <TabsTrigger value="partage">Send</TabsTrigger>
          </TabsList>
          <TabsContent value="details">
            <PanneauDetails
              details={contenu.details}
              typeEvenement={type}
              onChange={(details, cle) => changer({ ...contenu, details }, cle)}
              onPalette={appliquerPalette}
            />
          </TabsContent>
          <TabsContent value="ajout">
            <PanneauAjout contenu={contenu} onAjouter={ajouter} onContenu={changer} />
          </TabsContent>
          <TabsContent value="style">
            <PanneauStyle
              element={element}
              selection={selectionnes}
              contenu={contenu}
              onChange={changerElement}
              onContenu={changer}
              onSupprimer={supprimer}
              onCouches={outils.couches}
              onAligner={outils.aligner}
            />
          </TabsContent>
          <TabsContent value="calques">
            <PanneauCalques
              contenu={contenu}
              selection={selection}
              onSelect={choisir}
              onChange={changerElement}
              onElements={changerElements}
            />
          </TabsContent>
          <TabsContent value="animation">
            <PanneauAnimation
              contenu={contenu}
              element={element}
              musiques={musiques}
              onChange={changerElement}
              onContenu={changer}
              onApercuInvite={() => setApercuInvite(true)}
            />
          </TabsContent>
          <TabsContent value="partage">
            <Card>
              <CardContent>
                <ContenuEnvoi invitationId={invitation.id} contenu={contenu} partage={partage} onPartage={changerPartage} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ApercuInvite
        contenu={contenu}
        titre={titre}
        musiques={musiques}
        open={apercuInvite}
        onOpenChange={setApercuInvite}
        lienPublic={partage.actif ? lienPartage(partage.token) : null}
      />
      <DialogEnvoi open={envoi} onOpenChange={setEnvoi} invitationId={invitation.id} contenu={contenu} partage={partage} onPartage={changerPartage} />
    </div>
  );
}

function Separateur() {
  return <span className="mx-1 h-5 w-px bg-border" aria-hidden />;
}

function Outil({ label, icon: Icon, onClick, disabled }: { label: string; icon: typeof Undo2; onClick: () => void; disabled?: boolean }) {
  return (
    <Button type="button" variant="ghost" size="icon" className="size-8" title={label} aria-label={label} onClick={onClick} disabled={disabled}>
      <Icon aria-hidden />
    </Button>
  );
}

function Bascule({ label, icon: Icon, onClick, actif }: { label: string; icon: typeof Undo2; onClick: () => void; actif: boolean }) {
  return (
    <Button type="button" variant={actif ? "secondary" : "ghost"} size="icon" className="size-8" title={label} aria-label={label} aria-pressed={actif} onClick={onClick}>
      <Icon aria-hidden />
    </Button>
  );
}

function EtatEnregistrement({ etat, onReessayer }: { etat: EtatSauvegarde; onReessayer: () => void }) {
  if (etat === "erreur") {
    return (
      <button type="button" onClick={onReessayer} className="flex items-center gap-1 text-xs font-medium text-destructive hover:underline">
        <TriangleAlert className="size-3.5" aria-hidden />
        Not saved, try again
      </button>
    );
  }
  return (
    <span role="status" className="flex w-20 items-center gap-1 text-xs text-muted-foreground">
      {etat === "enregistre" ? <CheckCircle2 className="size-3.5 text-success-text" aria-hidden /> : <Loader2 className="size-3.5 animate-spin" aria-hidden />}
      {etat === "enregistre" ? "Saved" : "Saving…"}
    </span>
  );
}
