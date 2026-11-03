"use client";

import type Konva from "konva";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardPaste,
  Copy,
  Download,
  Loader2,
  Minus,
  Plus,
  Redo2,
  Trash2,
  TriangleAlert,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { saveInvitationAction } from "../invitation.actions";
import { exportInvitation } from "../invitation.canvas";
import { debutHistorique, historiqueReducer } from "../invitation.history";
import { appliquerDetails, champsManquants } from "../invitation.linked";
import type { ContenuInvitation, ElementInvitation, Palette } from "../invitation.schema";
import { CLIENT_PATH, type InvitationView } from "../invitation.types";
import { InvitationStage } from "./invitation-apercu";
import { PanneauAjout, PanneauDetails, PanneauPartage, PanneauStyle } from "./invitation-panels";

type EtatSauvegarde = "enregistre" | "modifie" | "enregistrement" | "erreur";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const DECALAGE_COLLAGE = 16;

const nouvelId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function InvitationEditor({ invitation }: { invitation: InvitationView }) {
  const [historique, dispatch] = useReducer(historiqueReducer<ContenuInvitation>, invitation.contenu, debutHistorique<ContenuInvitation>);
  const contenu = historique.present;
  const [titre, setTitre] = useState(invitation.titre);
  const [selection, setSelection] = useState<string | null>(null);
  const [onglet, setOnglet] = useState("details");
  const [sauvegarde, setSauvegarde] = useState<EtatSauvegarde>("enregistre");
  const [erreurTitre, setErreurTitre] = useState<string>();
  const [zoom, setZoom] = useState(1);
  const [largeur, setLargeur] = useState(0);
  const [exportEnCours, setExportEnCours] = useState(false);
  const stageRef = useRef<Konva.Stage | null>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const pressePapier = useRef<ElementInvitation | null>(null);

  const element = contenu.elements.find((e) => e.id === selection);
  // At 100% the whole card is visible without scrolling; zooming in is a choice.
  const hauteurMax = typeof window === "undefined" ? 800 : window.innerHeight * 0.7;
  const scale = largeur > 0 ? Math.min(largeur / contenu.size.width, hauteurMax / contenu.size.height, 1.3) * zoom : 0;

  /** Every change goes through here: history, and the linked texts follow the form. */
  const changer = useCallback((suivant: ContenuInvitation, cle?: string) => {
    dispatch({ type: "appliquer", valeur: appliquerDetails(suivant), cle });
  }, []);

  const changerElement = useCallback(
    (id: string, patch: Partial<ElementInvitation>, cle?: string) => {
      changer(
        { ...contenu, elements: contenu.elements.map((e) => (e.id === id ? ({ ...e, ...patch } as ElementInvitation) : e)) },
        cle,
      );
    },
    [changer, contenu],
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
      setSelection(complet.id);
      setOnglet("style");
    },
    [changer, contenu, coucheSuivante],
  );

  const supprimer = useCallback(() => {
    if (!selection) return;
    changer({ ...contenu, elements: contenu.elements.filter((e) => e.id !== selection) });
    setSelection(null);
  }, [changer, contenu, selection]);

  const copier = useCallback(() => {
    if (!element) return;
    pressePapier.current = element;
    toast.success("Element copied");
  }, [element]);

  const coller = useCallback(() => {
    const source = pressePapier.current;
    if (!source) return;
    const copie = {
      ...source,
      id: nouvelId(),
      layer: coucheSuivante(),
      x: source.x + DECALAGE_COLLAGE,
      y: source.y + DECALAGE_COLLAGE,
    } as ElementInvitation;
    pressePapier.current = copie;
    changer({ ...contenu, elements: [...contenu.elements, copie] });
    setSelection(copie.id);
  }, [changer, contenu, coucheSuivante]);

  const appliquerPalette = (palette: Palette) => {
    changer({
      ...contenu,
      background: { ...contenu.background, color: palette.fond },
      elements: contenu.elements.map((e) => {
        if (e.type === "text") {
          const principal = e.linkedTo === "noms" || e.linkedTo === "nomA" || e.linkedTo === "nomB";
          return { ...e, style: { ...e.style, color: principal ? palette.principale : palette.secondaire } };
        }
        if (e.type === "shape") {
          return {
            ...e,
            style: {
              ...e.style,
              fill: e.style.fill ? palette.secondaire : null,
              stroke: e.style.stroke ? palette.secondaire : null,
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

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement;
      if (cible.closest("input, textarea, select, [contenteditable=true], [role=combobox], [role=dialog]")) return;
      const ctrl = e.ctrlKey || e.metaKey;
      const lettre = e.key.toLowerCase();
      if (ctrl && lettre === "z") {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? "retablir" : "annuler" });
      } else if (ctrl && lettre === "y") {
        e.preventDefault();
        dispatch({ type: "retablir" });
      } else if (ctrl && lettre === "s") {
        e.preventDefault();
        void enregistrer();
      } else if (ctrl && lettre === "c") {
        copier();
      } else if (ctrl && lettre === "v") {
        coller();
      } else if (ctrl && lettre === "d") {
        e.preventDefault();
        if (element) {
          pressePapier.current = element;
          coller();
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selection) {
          e.preventDefault();
          supprimer();
        }
      } else if (e.key === "Escape") {
        setSelection(null);
      } else if (element && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const pas = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -pas : e.key === "ArrowRight" ? pas : 0;
        const dy = e.key === "ArrowUp" ? -pas : e.key === "ArrowDown" ? pas : 0;
        changerElement(element.id, { x: element.x + dx, y: element.y + dy }, `fleches:${element.id}`);
      }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [changerElement, coller, copier, element, enregistrer, selection, supprimer]);

  // ── Pinch to zoom on a touch screen ───────────────────────────────────────
  const pincement = useRef<{ distance: number; zoom: number } | null>(null);
  const distance = (touches: React.TouchList) =>
    Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);

  const exporter = async (format: "png" | "pdf") => {
    const stage = stageRef.current;
    if (!stage) return;
    const manquants = Object.values(champsManquants(contenu.details));
    if (manquants.length > 0) {
      toast.warning("Some details are still empty", { description: manquants[0] });
    }
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

  const zoomer = (facteur: number) => setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * facteur * 100) / 100)));

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={exportEnCours}>
              {exportEnCours ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
              Download
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => void exporter("pdf")}>PDF, for printing</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void exporter("png")}>PNG, for messages</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-2">
          <div role="toolbar" aria-label="Editing tools" className="flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1">
            <Outil label="Undo (Ctrl+Z)" disabled={historique.passe.length === 0} onClick={() => dispatch({ type: "annuler" })} icon={Undo2} />
            <Outil label="Redo (Ctrl+Y)" disabled={historique.futur.length === 0} onClick={() => dispatch({ type: "retablir" })} icon={Redo2} />
            <span className="mx-1 h-5 w-px bg-border" aria-hidden />
            <Outil label="Copy (Ctrl+C)" disabled={!element} onClick={copier} icon={Copy} />
            <Outil label="Paste (Ctrl+V)" onClick={coller} icon={ClipboardPaste} />
            <Outil label="Delete (Del)" disabled={!element} onClick={supprimer} icon={Trash2} />
            <span className="ml-auto flex items-center gap-1">
              <Outil label="Zoom out" disabled={zoom <= ZOOM_MIN} onClick={() => zoomer(0.8)} icon={Minus} />
              <button type="button" onClick={() => setZoom(1)} className="w-12 rounded text-center text-xs tabular-nums hover:bg-muted" aria-label="Reset zoom">
                {Math.round(zoom * 100)}%
              </button>
              <Outil label="Zoom in" disabled={zoom >= ZOOM_MAX} onClick={() => zoomer(1.25)} icon={Plus} />
            </span>
          </div>
          <div
            ref={zoneRef}
            className="max-h-[75vh] min-h-64 touch-pan-x touch-pan-y overflow-auto rounded-lg bg-muted/50 p-4"
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
              <div className="mx-auto w-fit shadow-card">
                <InvitationStage
                  contenu={contenu}
                  scale={scale}
                  stageRef={stageRef}
                  edition={{
                    selection,
                    onSelect: (id) => {
                      setSelection(id);
                      if (id) setOnglet("style");
                    },
                    onChange: changerElement,
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <Tabs value={onglet} onValueChange={setOnglet} className="min-w-0">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="ajout">Add</TabsTrigger>
            <TabsTrigger value="style">Style</TabsTrigger>
            <TabsTrigger value="partage">Share</TabsTrigger>
          </TabsList>
          <TabsContent value="details">
            <PanneauDetails
              details={contenu.details}
              onChange={(details, cle) => changer({ ...contenu, details }, cle)}
              onPalette={appliquerPalette}
            />
          </TabsContent>
          <TabsContent value="ajout">
            <PanneauAjout contenu={contenu} onAjouter={ajouter} onContenu={changer} />
          </TabsContent>
          <TabsContent value="style">
            <PanneauStyle element={element} contenu={contenu} onChange={changerElement} onContenu={changer} onSupprimer={supprimer} />
          </TabsContent>
          <TabsContent value="partage">
            <PanneauPartage invitation={invitation} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function Outil({ label, icon: Icon, onClick, disabled }: { label: string; icon: typeof Undo2; onClick: () => void; disabled?: boolean }) {
  return (
    <Button type="button" variant="ghost" size="icon" className="size-8" title={label} aria-label={label} onClick={onClick} disabled={disabled}>
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
