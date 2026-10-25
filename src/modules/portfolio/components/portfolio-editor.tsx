"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  ImagePlus,
  LoaderCircle,
  Monitor,
  Save,
  Sparkles,
  Smartphone,
  Trash2,
  Undo2,
  Redo2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SafeImage } from "@/components/shared/safe-image";
import { PortfolioBlockPalette } from "./portfolio-block-palette";
import { CanvasEndDrop } from "./portfolio-block-palette";
import { editorFr } from "./editor/fr";
import {
  chargerPhotosPortfolio,
  analyserQualitePortfolioAction,
  genererSEOAction,
  genererHistoireProjetAction,
  depublierPortfolio,
  dupliquerBloc,
  genererBioPortfolio,
  genererLegendePortfolio,
  genererTexteAltPortfolio,
  lancerSelectionIA,
  publierPortfolio,
  supprimerBloc,
  savePortfolio,
  mettreAJourPortfolio,
  suggererBlocsPortfolio,
} from "../portfolio.actions";
import {
  CATEGORIES_PORTFOLIO,
  MISES_EN_PAGE,
  RESEAUX_SOCIAUX,
  THEMES_PORTFOLIO,
  type BlocPortfolio,
  type ElementBlocPortfolio,
  type PortfolioQualityAudit as PortfolioQualityAuditResult,
  type PhotoQualityReport,
  type TypeBloc,
} from "../portfolio.types";
import { PortfolioQualityAudit } from "./editor/PortfolioQualityAudit";
import type { PortfolioEditorData } from "../portfolio.service";
import type { PortfolioUpdateInput } from "../portfolio.schemas";
import type { PhotoPortfolio } from "../integrations/portfolio-integrations.types";
import styles from "./portfolio-editor.module.css";

type History = { past: BlocPortfolio[][]; future: BlocPortfolio[][] };
const objectId = () => crypto.randomUUID().replaceAll("-", "").slice(0, 24);

const defaults: Record<TypeBloc, Record<string, unknown>> = {
  HERO: {
    titre: "Votre histoire, racontée avec élégance",
    sousTitre: "Des images pour les moments qui comptent.",
    texteBouton: "Me contacter",
    lienBouton: "#contact",
  },
  A_PROPOS: { texte: "Présentez votre approche et votre expérience.", anneesExperience: 0 },
  GALERIE: { titre: "", colonnes: 3, espacement: 16 },
  COLLECTION: { titre: "", colonnes: 3, espacement: 16 },
  CASE_STUDY: {
    titre: "Une histoire de séance",
    texte: "Racontez le déroulement de ce projet.",
    date: "",
    lieu: "",
  },
  AVANT_APRES: {},
  TEMOIGNAGES: { avisIds: [] },
  SERVICES: { forfaits: [] },
  STATISTIQUES: { afficher: ["SEANCES", "NOTE_MOYENNE"] },
  VIDEO: { urlVideo: "https://", titre: "Dans les coulisses" },
  CONTACT: {
    texteIntro: "Parlez-moi de la séance que vous imaginez.",
    typesSeanceProposes: [],
  },
};

export function PortfolioEditor({ portfolio }: { portfolio: PortfolioEditorData }) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<BlocPortfolio[]>(portfolio.blocs);
  const [selected, setSelected] = useState<string | null>(portfolio.blocs[0]?.idBloc ?? null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [inspectorTab, setRéglagesTab] = useState<"block" | "page">("block");
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const [lastModification, setLastModification] = useState(
    () => new Date(portfolio.dateModification),
  );
  const [photos, setPhotos] = useState<PhotoPortfolio[]>([]);
  const [publishing, setPubliering] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [bioDraft, setBioDraft] = useState(portfolio.bio ?? "");
  const [layoutSuggestion, setLayoutSuggestion] = useState<BlocPortfolio[] | null>(null);
  const [suggestedPhotoIds, setSuggestedPhotoIds] = useState<string[]>([]);
  const [suggestedPhotoReports, setSuggestedPhotoReports] = useState<
    Record<string, PhotoQualityReport>
  >({});
  const [suggestedPhotoScores, setSuggestedPhotoScores] = useState<Record<string, number>>({});
  const [seoSuggestion, setSeoSuggestion] = useState<{
    metaTitre: string;
    metaDescription: string;
  } | null>(null);
  const [storySuggestion, setStorySuggestion] = useState<{
    blockId: string;
    titre: string;
    texte: string;
  } | null>(null);
  const [aiPending, setAiPending] = useState(false);
  const [qualityAudit, setQualityAudit] = useState<PortfolioQualityAuditResult | null>(null);
  const [qualityAuditOpen, setQualityAuditOpen] = useState(false);
  const [qualityAuditLoading, setQualityAuditLoading] = useState(false);
  const [preview, setPreview] = useState<"desktop" | "mobile" | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"palette" | "inspector" | null>(null);
  const [paletteDrag, setPaletteDrag] = useState<TypeBloc | null>(null);
  const [dropInsertIndex, setDropInsertIndex] = useState<number | null>(null);
  const [photoPickerBloc, setPhotoPickerBloc] = useState<string | null>(null);
  const [history, setHistory] = useState<History>({ past: [], future: [] });
  const blocksRef = useRef(blocks);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const apply = useCallback((next: BlocPortfolio[]) => {
    setHistory((current) => ({
      past: [...current.past.slice(-49), blocksRef.current],
      future: [],
    }));
    blocksRef.current = next;
    setBlocks(next);
  }, []);

  useEffect(() => {
    void chargerPhotosPortfolio().then((result) => {
      if (result.ok) setPhotos(result.data);
      else toast.error(result.error);
    });
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void savePortfolio({ portfolioId: portfolio.id, blocs: blocksRef.current }).then((result) => {
        setStatus(result.ok ? "saved" : "error");
        if (result.ok) setLastModification(new Date());
        if (!result.ok) toast.error(result.error);
      });
    }, 1000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [blocks, portfolio.id]);

  const selectedBlock = blocks.find((block) => block.idBloc === selected) ?? null;
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const hits = pointerWithin(args);
    return String(args.active.id).startsWith("palette:") && hits.length
      ? hits
      : closestCenter(args);
  }, []);
  function selectBlock(id: string) {
    setSelected(id);
    setRéglagesTab("block");
    setMobilePanel("inspector");
  }
  function updateBlock(id: string, update: Partial<BlocPortfolio>) {
    apply(blocks.map((block) => (block.idBloc === id ? { ...block, ...update } : block)));
  }
  function updateConfiguration(id: string, key: string, value: unknown) {
    const block = blocks.find((item) => item.idBloc === id);
    if (!block) return;
    updateBlock(id, { configuration: { ...block.configuration, [key]: value } });
  }
  function addBlock(type: TypeBloc, index = blocks.length) {
    if (type === "HERO" && blocks.some((block) => block.type === "HERO")) {
      toast.error(editorFr.oneHero);
      return;
    }
    const block: BlocPortfolio = {
      idBloc: objectId(),
      type,
      ordre: index,
      visible: true,
      miseEnPage: "GRILLE",
      configuration: structuredClone(defaults[type]),
      elements: [],
    };
    apply(
      [...blocks.slice(0, index), block, ...blocks.slice(index)].map((item, ordre) => ({
        ...item,
        ordre,
      })),
    );
    selectBlock(block.idBloc);
  }
  function onEditorDragStart(event: DragStartEvent) {
    const data = event.active.data.current as { kind?: string; type?: TypeBloc } | undefined;
    setPaletteDrag(data?.kind === "palette" ? (data.type ?? null) : null);
    setDropInsertIndex(null);
  }
  function onEditorDragOver(event: DragOverEvent) {
    if (!String(event.active.id).startsWith("palette:")) return;
    if (event.over?.id === "canvas-end") setDropInsertIndex(blocks.length);
    else {
      const index = blocks.findIndex((block) => block.idBloc === event.over?.id);
      setDropInsertIndex(index >= 0 ? index : null);
    }
  }
  function onEditorDragEnd(event: DragEndEvent) {
    const data = event.active.data.current as { kind?: string; type?: TypeBloc } | undefined;
    if (data?.kind === "palette" && data.type && event.over) {
      const index =
        event.over.id === "canvas-end"
          ? blocks.length
          : blocks.findIndex((block) => block.idBloc === event.over?.id);
      addBlock(data.type, index < 0 ? blocks.length : index);
    } else if (data?.kind !== "palette") onBlockDrag(event);
    setPaletteDrag(null);
    setDropInsertIndex(null);
  }
  function onEditorDragCancel() {
    setPaletteDrag(null);
    setDropInsertIndex(null);
  }
  function onBlockDrag(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((block) => block.idBloc === active.id);
    const newIndex = blocks.findIndex((block) => block.idBloc === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    apply(arrayMove(blocks, oldIndex, newIndex).map((block, ordre) => ({ ...block, ordre })));
  }
  function onElementDrag(blockId: string, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const block = blocks.find((item) => item.idBloc === blockId);
    if (!block) return;
    const oldIndex = block.elements.findIndex((element) => element.idElement === active.id);
    const newIndex = block.elements.findIndex((element) => element.idElement === over.id);
    const nextElements = arrayMove(block.elements, oldIndex, newIndex).map(
      (element, ordreAffichage) => ({ ...element, ordreAffichage }),
    );
    updateBlock(blockId, { elements: nextElements });
  }
  const undo = useCallback(() => {
    const previous = history.past.at(-1);
    if (!previous) return;
    setHistory((current) => ({
      past: current.past.slice(0, -1),
      future: [blocksRef.current, ...current.future],
    }));
    blocksRef.current = previous;
    setBlocks(previous);
  }, [history.past]);
  const redo = useCallback(() => {
    const next = history.future[0];
    if (!next) return;
    setHistory((current) => ({
      past: [...current.past, blocksRef.current],
      future: current.future.slice(1),
    }));
    blocksRef.current = next;
    setBlocks(next);
  }, [history.future]);
  function addPhoto(blockId: string, photo: (typeof photos)[number]) {
    const block = blocks.find((item) => item.idBloc === blockId);
    if (!block) return;
    const element: ElementBlocPortfolio = {
      idElement: objectId(),
      source: photo.clientId ? "GALERIE_CLIENT" : "UPLOAD_PERSONNEL",
      photoId: photo.id,
      clientConcerne: photo.clientId,
      media: {
        url: photo.url,
        urlMiniature: photo.urlMiniature,
        largeur: 1200,
        hauteur: 800,
        publicId: photo.id,
      },
      titre: "",
      legende: "",
      legendeGenereeIA: false,
      texteAlt: "",
      ordreAffichage: block.elements.length,
      estMisEnAvant: false,
      role: "NORMAL",
      statutConsentement: photo.clientId ? "EN_ATTENTE" : "NON_REQUIS",
      nombreLikes: 0,
      dateAjout: new Date().toISOString(),
    };
    updateBlock(blockId, { elements: [...block.elements, element] });
  }
  async function uploadPersonalPhoto(blockId: string, file: File) {
    const formData = new FormData();
    formData.set("file", file);
    const response = await fetch("/api/portfolio/upload", { method: "POST", body: formData });
    const result = (await response.json()) as {
      ok: boolean;
      message?: string;
      data?: ElementBlocPortfolio["media"];
    };
    if (!response.ok || !result.ok || !result.data) {
      toast.error(result.message ?? "Could not upload this photo.");
      return;
    }
    const block = blocks.find((item) => item.idBloc === blockId);
    if (!block) return;
    const element: ElementBlocPortfolio = {
      idElement: objectId(),
      source: "UPLOAD_PERSONNEL",
      media: result.data,
      ordreAffichage: block.elements.length,
      legende: "",
      texteAlt: "",
      legendeGenereeIA: false,
      estMisEnAvant: false,
      role: "NORMAL",
      statutConsentement: "NON_REQUIS",
      nombreLikes: 0,
      dateAjout: new Date().toISOString(),
    };
    updateBlock(blockId, { elements: [...block.elements, element] });
  }
  async function publish() {
    if (!window.confirm("Publier your current portfolio?")) return;
    setPubliering(true);
    const result = await publierPortfolio({ portfolioId: portfolio.id });
    setPubliering(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setPublishedUrl(result.data.url);
    if (result.data.removedElements.length)
      toast.warning(
        `${result.data.removedElements.length} photos without consent were excluded from publication.`,
      );
    router.refresh();
  }
  async function unpublish() {
    if (!window.confirm("Dépublier this portfolio? Its public page will become unavailable."))
      return;
    const result = await depublierPortfolio({ portfolioId: portfolio.id });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Portfolio unpublished.");
    router.refresh();
  }
  async function generateBio() {
    setAiPending(true);
    const result = await genererBioPortfolio(portfolio.id);
    setAiPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setBioDraft(result.data.bio);
    toast.success("AI bio suggestion ready. Review it before publishing.");
  }
  async function generateSEO() {
    setAiPending(true);
    const result = await genererSEOAction(portfolio.id);
    setAiPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSeoSuggestion(result.data);
  }
  async function generateStory(block: BlocPortfolio) {
    if (block.type !== "CASE_STUDY") return;
    const notes =
      typeof block.configuration.texte === "string" ? block.configuration.texte.trim() : "";
    if (notes.length < 20) {
      toast.error("Ajoutez au moins quelques notes factuelles avant de générer un récit.");
      return;
    }
    setAiPending(true);
    const result = await genererHistoireProjetAction({
      portfolioId: portfolio.id,
      blockId: block.idBloc,
      notes,
      titre: typeof block.configuration.titre === "string" ? block.configuration.titre : undefined,
    });
    setAiPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setStorySuggestion({ blockId: block.idBloc, ...result.data });
  }
  async function suggestLayout() {
    setAiPending(true);
    const result = await suggererBlocsPortfolio(portfolio.id);
    setAiPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setLayoutSuggestion(result.data.blocs);
  }
  async function suggestPhotos() {
    if (
      !window.confirm(
        "Les photos de votre bibliothèque seront envoyées à Gemini pour leur analyse visuelle. Continuer ?",
      )
    )
      return;
    setAiPending(true);
    const result = await lancerSelectionIA();
    setAiPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSuggestedPhotoIds(result.data.photoIds);
    setSuggestedPhotoReports(result.data.reports ?? {});
    setSuggestedPhotoScores(result.data.scores);
    if (!result.data.photoIds.length)
      toast.message("No connected gallery photos are available for AI selection.");
  }
  async function auditPortfolio() {
    if (
      !window.confirm(
        "L’audit envoie à Gemini les textes et données structurées de ce portfolio. Les images ne sont pas incluses. Continuer ?",
      )
    )
      return;
    setQualityAuditOpen(true);
    setQualityAuditLoading(true);
    try {
      const saved = await savePortfolio({ portfolioId: portfolio.id, blocs: blocks });
      if (!saved.ok) {
        toast.error(saved.error);
        return;
      }
      const result = await analyserQualitePortfolioAction({ portfolioId: portfolio.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setQualityAudit(result.data);
    } finally {
      setQualityAuditLoading(false);
    }
  }
  const removeBlock = useCallback(
    (block: BlocPortfolio) => {
      if (!window.confirm(`Supprimer le bloc « ${editorFr.blockNames[block.type]} » ?`)) return;
      void supprimerBloc({ portfolioId: portfolio.id, blockId: block.idBloc }).then((result) => {
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        const next = blocks
          .filter((item) => item.idBloc !== block.idBloc)
          .map((item, ordre) => ({ ...item, ordre }));
        apply(next);
        if (selected === block.idBloc) setSelected(next[0]?.idBloc ?? null);
      });
    },
    [apply, blocks, portfolio.id, selected],
  );
  const moveBlock = useCallback(
    (id: string, delta: number) => {
      const index = blocks.findIndex((block) => block.idBloc === id);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= blocks.length) return;
      apply(arrayMove(blocks, index, target).map((block, ordre) => ({ ...block, ordre })));
    },
    [apply, blocks],
  );
  useEffect(() => {
    function handleEditorShortcut(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      )
        return;
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (modifier && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      } else if (modifier && event.key.toLowerCase() === "d" && selectedBlock) {
        event.preventDefault();
        void dupliquerBloc({ portfolioId: portfolio.id, blockId: selectedBlock.idBloc }).then(
          (result) => {
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            const index = blocks.findIndex((block) => block.idBloc === selectedBlock.idBloc);
            const next = [...blocks];
            next.splice(index + 1, 0, result.data.bloc);
            apply(next.map((block, ordre) => ({ ...block, ordre })));
            selectBlock(result.data.bloc.idBloc);
          },
        );
      } else if (event.altKey && event.key === "ArrowUp" && selectedBlock) {
        event.preventDefault();
        moveBlock(selectedBlock.idBloc, -1);
      } else if (event.altKey && event.key === "ArrowDown" && selectedBlock) {
        event.preventDefault();
        moveBlock(selectedBlock.idBloc, 1);
      } else if (event.key === "Escape") {
        setSelected(null);
        setSelectedElement(null);
      } else if ((event.key === "Delete" || event.key === "Backspace") && selectedBlock) {
        event.preventDefault();
        removeBlock(selectedBlock);
      }
    }
    window.addEventListener("keydown", handleEditorShortcut);
    return () => window.removeEventListener("keydown", handleEditorShortcut);
  }, [selectedBlock, blocks, portfolio.id, apply, moveBlock, redo, removeBlock, undo]);
  const dirty =
    portfolio.statut === "PUBLIE" &&
    (status !== "saved" || lastModification > new Date(portfolio.datePublication ?? 0));

  return (
    <div className={styles.editor}>
      {dirty && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          Vous avez des modifications non publiées.
        </div>
      )}
      {publishedUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Portfolio publié"
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
        >
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl">
            <h2 className="text-xl font-semibold">Portfolio publié</h2>
            <p className="mt-2 text-sm break-all text-muted-foreground">{publishedUrl}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={() => void navigator.clipboard.writeText(publishedUrl)}>
                Copier le lien
              </Button>
              <Button asChild variant="outline">
                <a href={publishedUrl} target="_blank" rel="noreferrer">
                  Voir ma page
                </a>
              </Button>
              <Button variant="ghost" onClick={() => setPublishedUrl(null)}>
                Fermer
              </Button>
            </div>
            <div className="mt-5">
              <p className="mb-2 text-sm font-medium">Code QR</p>
              <SafeImage
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(publishedUrl)}`}
                alt="Code QR de votre portfolio public"
                width={160}
                height={160}
                unoptimized
              />
            </div>
          </div>
        </div>
      )}
      <Card className={`${styles.toolbar} ${styles.editorToolbar} gap-3 px-3 py-2.5`}>
        <div className={styles.toolbarIdentity}>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={editorFr.back}
            onClick={() => router.push("/dashboard/portfolio")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className={styles.toolbarPortfolio}>
            <span className={styles.toolbarKicker}>STUDIOFLOW / PORTFOLIO</span>
            <strong>{portfolio.titre}</strong>
          </div>
        </div>
        <div className={styles.toolbarStatus} aria-live="polite">
          {status === "saving" ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : status === "error" ? (
            <span className={styles.statusError}>{editorFr.saveError}</span>
          ) : (
            <>
              <Save className="size-4" />
              {editorFr.saved}
            </>
          )}
        </div>
        <div className={styles.toolbarActions}>
          <div className={styles.previewToggle} aria-label={editorFr.preview}>
            <Button
              size="sm"
              variant={preview === "desktop" ? "default" : "ghost"}
              aria-label={editorFr.desktop}
              onClick={() => setPreview(preview === "desktop" ? null : "desktop")}
            >
              <Monitor className="size-4" />
              <span className={styles.toolbarButtonText}>{editorFr.desktop}</span>
            </Button>
            <Button
              size="sm"
              variant={preview === "mobile" ? "default" : "ghost"}
              aria-label={editorFr.mobile}
              onClick={() => setPreview(preview === "mobile" ? null : "mobile")}
            >
              <Smartphone className="size-4" />
              <span className={styles.toolbarButtonText}>{editorFr.mobile}</span>
            </Button>
          </div>
          <div className={`${styles.mobilePanelButtons} flex gap-2`}>
            <Button
              size="sm"
              variant={mobilePanel === "palette" ? "default" : "outline"}
              onClick={() => setMobilePanel(mobilePanel === "palette" ? null : "palette")}
            >
              Blocs
            </Button>
            <Button
              size="sm"
              variant={mobilePanel === "inspector" ? "default" : "outline"}
              onClick={() => setMobilePanel(mobilePanel === "inspector" ? null : "inspector")}
            >
              Réglages
            </Button>
          </div>
          <Button size="sm" variant="outline" disabled={!history.past.length} onClick={undo}>
            <Undo2 className="size-4" />
            Annuler
          </Button>
          <Button size="sm" variant="outline" disabled={!history.future.length} onClick={redo}>
            <Redo2 className="size-4" />
            Rétablir
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={qualityAuditLoading}
            onClick={() => void auditPortfolio()}
          >
            <Sparkles className="size-4" />
            Audit IA
          </Button>
          {portfolio.statut === "PUBLIE" && (
            <Button size="sm" variant="outline" onClick={() => void unpublish()}>
              Dépublier
            </Button>
          )}
          <Button size="sm" onClick={() => void publish()} disabled={publishing}>
            {publishing
              ? "Publication…"
              : portfolio.statut === "PUBLIE"
                ? "Mettre à jour la publication"
                : "Publier"}
          </Button>
        </div>
      </Card>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={onEditorDragStart}
        onDragOver={onEditorDragOver}
        onDragEnd={onEditorDragEnd}
        onDragCancel={onEditorDragCancel}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              "Appuyez sur Espace pour déplacer un bloc, utilisez les flèches puis Espace pour le déposer.",
          },
          announcements: {
            onDragStart: ({ active }) =>
              `Bloc ${String(active.id)} sélectionné pour le déplacement.`,
            onDragOver: ({ active, over }) =>
              over
                ? `Bloc déplacé au-dessus de ${String(over.id)}.`
                : `Bloc ${String(active.id)} déplacé.`,
            onDragEnd: ({ active, over }) =>
              over ? `Bloc ${String(active.id)} déposé.` : "Déplacement annulé.",
            onDragCancel: () => "Déplacement annulé.",
          },
        }}
      >
        <div className={styles.workspace}>
          <aside
            className={`${styles.panel} ${styles.palettePanel} ${
              mobilePanel === "palette" ? styles.mobilePanelOpen : ""
            }`}
          >
            <div className="space-y-3">
              <h2 className={styles.panelTitle}>Blocs</h2>
              <Button
                size="sm"
                variant="outline"
                disabled={aiPending}
                onClick={() => void suggestLayout()}
              >
                <Sparkles className="size-4" />
                Suggérer une mise en page
              </Button>
              {layoutSuggestion && (
                <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 text-xs">
                  <p>L’IA suggère cet ordre de blocs. Vérifiez-le puis appliquez-le.</p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="xs"
                      onClick={() => {
                        apply(layoutSuggestion);
                        setLayoutSuggestion(null);
                      }}
                    >
                      Appliquer
                    </Button>
                    <Button size="xs" variant="ghost" onClick={() => setLayoutSuggestion(null)}>
                      Ignorer
                    </Button>
                  </div>
                </div>
              )}
              <Button
                size="sm"
                variant="outline"
                disabled={aiPending}
                onClick={() => void suggestPhotos()}
              >
                <Sparkles className="size-4" />
                Sélectionner les meilleures photos
              </Button>
              {suggestedPhotoIds.length > 0 && (
                <div className="rounded-lg border border-violet-500/30 p-3 text-xs">
                  <p>
                    Sélection de l’IA — choisissez une photo pour l’ajouter au bloc sélectionné.
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {suggestedPhotoIds.map((id) => {
                      const photo = photos.find((item) => item.id === id);
                      return photo ? (
                        <button
                          type="button"
                          key={id}
                          disabled={!selectedBlock}
                          onClick={() => selectedBlock && addPhoto(selectedBlock.idBloc, photo)}
                          className="relative aspect-square overflow-hidden rounded-lg"
                        >
                          <SafeImage
                            src={photo.urlMiniature}
                            alt=""
                            fill
                            unoptimized
                            sizes="120px"
                            className="object-cover"
                          />
                          <span className="absolute inset-x-0 bottom-0 bg-black/70 p-1.5 text-left text-[10px] leading-snug text-white">
                            <span className="block font-semibold">
                              Gemini {suggestedPhotoScores[id]}/100 · Ajouter au bloc
                            </span>
                            <span className="mt-0.5 line-clamp-2 block text-white/75">
                              {suggestedPhotoReports[id]?.raison}
                            </span>
                          </span>
                        </button>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
            <PortfolioBlockPalette
              blocks={blocks}
              selectedBlockId={selected}
              disabled={aiPending}
              onAdd={(type, index) => addBlock(type, index)}
            />
          </aside>

          <section className={styles.canvas} aria-label="Aperçu du portfolio">
            <div className={styles.canvasHeader}>
              <div>
                <p className={styles.eyebrow}>
                  ●{" "}
                  {dirty
                    ? editorFr.unpublishedChanges
                    : portfolio.statut === "PUBLIE"
                      ? editorFr.published
                      : editorFr.workingDraft}
                </p>
                <h2 className={styles.canvasTitle}>{portfolio.titre}</h2>
              </div>
              <p className={styles.canvasMeta}>
                {blocks.length} blocs · {blocks.filter((block) => block.visible).length} visibles ·{" "}
                {portfolio.statut === "PUBLIE"
                  ? dirty
                    ? editorFr.unpublishedChanges.toLowerCase()
                    : portfolio.datePublication
                      ? `${editorFr.published.toLowerCase()} ${new Date(portfolio.datePublication).toLocaleDateString("fr-FR")}`
                      : editorFr.published.toLowerCase()
                  : editorFr.neverPublished}
              </p>
            </div>
            {preview && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={preview === "desktop" ? "default" : "outline"}
                  onClick={() => setPreview("desktop")}
                >
                  Bureau
                </Button>
                <Button
                  size="sm"
                  variant={preview === "mobile" ? "default" : "outline"}
                  onClick={() => setPreview("mobile")}
                >
                  Mobile
                </Button>
              </div>
            )}
            {preview ? (
              <EditorPreview portfolio={portfolio} blocks={blocks} mobile={preview === "mobile"} />
            ) : (
              <div className={styles.blockStack}>
                <SortableContext
                  items={blocks.map((block) => block.idBloc)}
                  strategy={verticalListSortingStrategy}
                >
                  {blocks.map((block, index) => (
                    <SortableBloc
                      key={block.idBloc}
                      block={block}
                      portfolio={portfolio}
                      active={selected === block.idBloc}
                      paletteOver={dropInsertIndex === index}
                      canMoveUp={index > 0}
                      canMoveDown={index < blocks.length - 1}
                      onMoveUp={() => moveBlock(block.idBloc, -1)}
                      onMoveDown={() => moveBlock(block.idBloc, 1)}
                      onToggleVisible={() => updateBlock(block.idBloc, { visible: !block.visible })}
                      pickerOpen={photoPickerBloc === block.idBloc}
                      onPickerToggle={() =>
                        setPhotoPickerBloc(photoPickerBloc === block.idBloc ? null : block.idBloc)
                      }
                      onSelect={() => selectBlock(block.idBloc)}
                      onRemove={() => removeBlock(block)}
                      onDuplicate={() =>
                        void dupliquerBloc({
                          portfolioId: portfolio.id,
                          blockId: block.idBloc,
                        }).then((result) => {
                          if (result.ok) {
                            const index = blocks.findIndex((item) => item.idBloc === block.idBloc);
                            const next = [...blocks];
                            next.splice(index + 1, 0, result.data.bloc);
                            apply(next.map((item, ordre) => ({ ...item, ordre })));
                            selectBlock(result.data.bloc.idBloc);
                          } else toast.error(result.error);
                        })
                      }
                      onDragElements={(event) => onElementDrag(block.idBloc, event)}
                      sensors={sensors}
                      onSelectElement={(id) => {
                        selectBlock(block.idBloc);
                        setSelectedElement(id);
                      }}
                      selectedElement={selectedElement}
                      onUpdateElement={(elementId, update) =>
                        updateBlock(block.idBloc, {
                          elements: block.elements.map((element) =>
                            element.idElement === elementId ? { ...element, ...update } : element,
                          ),
                        })
                      }
                      onRemovePhoto={(id) =>
                        updateBlock(block.idBloc, {
                          elements: block.elements
                            .filter((element) => element.idElement !== id)
                            .map((element, ordreAffichage) => ({ ...element, ordreAffichage })),
                        })
                      }
                      onAddPhoto={(photo) => addPhoto(block.idBloc, photo)}
                      onUpload={(file) => uploadPersonalPhoto(block.idBloc, file)}
                      photos={photos}
                    />
                  ))}
                </SortableContext>
                <CanvasEndDrop empty={blocks.length === 0} />
              </div>
            )}
          </section>

          <aside
            className={`${styles.panel} ${styles.inspector} ${
              mobilePanel === "inspector" ? styles.mobilePanelOpen : ""
            }`}
          >
            <div>
              <h2 className={styles.panelTitle}>Réglages</h2>
              <div className={styles.tabs} role="tablist" aria-label="Editor inspector">
                <button
                  type="button"
                  role="tab"
                  aria-selected={inspectorTab === "block"}
                  onClick={() => setRéglagesTab("block")}
                >
                  Bloc
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={inspectorTab === "page"}
                  onClick={() => setRéglagesTab("page")}
                >
                  Page
                </button>
              </div>
            </div>
            {inspectorTab === "page" ? (
              <PortfolioPageProperties
                portfolio={portfolio}
                bio={bioDraft}
                onBioChange={setBioDraft}
                onUpdate={(update) =>
                  void mettreAJourPortfolio(portfolio.id, update).then((result) => {
                    if (!result.ok) toast.error(result.error);
                    else router.refresh();
                  })
                }
                onGenerateBio={() => void generateBio()}
                onGenerateSEO={() => void generateSEO()}
                seoSuggestion={seoSuggestion}
                onDismissSEO={() => setSeoSuggestion(null)}
                onApplySEO={() => {
                  if (!seoSuggestion) return;
                  void mettreAJourPortfolio(portfolio.id, {
                    seo: { ...portfolio.seo, ...seoSuggestion },
                  }).then((result) => {
                    if (!result.ok) toast.error(result.error);
                    else {
                      setSeoSuggestion(null);
                      router.refresh();
                    }
                  });
                }}
                aiPending={aiPending}
              />
            ) : selectedBlock ? (
              <>
                {storySuggestion?.blockId === selectedBlock.idBloc && (
                  <div className="space-y-2 rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 text-xs">
                    <p className="font-semibold">
                      Suggestion de récit — vérifiez les faits avant application
                    </p>
                    <p className="font-medium">{storySuggestion.titre}</p>
                    <p className="whitespace-pre-wrap text-muted-foreground">
                      {storySuggestion.texte}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="xs"
                        onClick={() => {
                          updateBlock(selectedBlock.idBloc, {
                            configuration: {
                              ...selectedBlock.configuration,
                              titre: storySuggestion.titre,
                              texte: storySuggestion.texte,
                            },
                          });
                          setStorySuggestion(null);
                        }}
                      >
                        Appliquer
                      </Button>
                      <Button size="xs" variant="ghost" onClick={() => setStorySuggestion(null)}>
                        Ignorer
                      </Button>
                    </div>
                  </div>
                )}
                <BlockProperties
                  block={selectedBlock}
                  onChange={(key, value) => updateConfiguration(selectedBlock.idBloc, key, value)}
                  onVisible={(visible) => updateBlock(selectedBlock.idBloc, { visible })}
                  onLayout={(miseEnPage) => updateBlock(selectedBlock.idBloc, { miseEnPage })}
                  onGenerateStory={() => void generateStory(selectedBlock)}
                  aiPending={aiPending}
                />
                <PhotoProperties
                  portfolioId={portfolio.id}
                  block={selectedBlock}
                  selected={selectedElement}
                  onUpdate={(elementId, update) =>
                    updateBlock(selectedBlock.idBloc, {
                      elements: selectedBlock.elements.map((element) =>
                        element.idElement === elementId ? { ...element, ...update } : element,
                      ),
                    })
                  }
                />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sélectionnez un bloc sur l’aperçu.</p>
            )}
          </aside>
        </div>
        <DragOverlay dropAnimation={null}>
          {paletteDrag ? (
            <div className="paletteDragOverlay">{editorFr.blockNames[paletteDrag]}</div>
          ) : null}
        </DragOverlay>
      </DndContext>
      {qualityAuditOpen && (
        <PortfolioQualityAudit
          audit={qualityAudit}
          isLoading={qualityAuditLoading}
          onClose={() => setQualityAuditOpen(false)}
          onAddBlock={(type) => addBlock(type, blocks.length)}
        />
      )}
    </div>
  );
}

function SortableBloc({
  block,
  portfolio,
  active,
  paletteOver,
  canMoveUp,
  canMoveDown,
  pickerOpen,
  onSelect,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onToggleVisible,
  onPickerToggle,
  onDragElements,
  sensors,
  onSelectElement,
  selectedElement,
  onUpdateElement,
  onRemovePhoto,
  onAddPhoto,
  onUpload,
  photos,
}: {
  block: BlocPortfolio;
  portfolio: PortfolioEditorData;
  active: boolean;
  paletteOver: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  pickerOpen: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleVisible: () => void;
  onPickerToggle: () => void;
  onDragElements: (event: DragEndEvent) => void;
  sensors: ReturnType<typeof useSensors>;
  onSelectElement: (id: string) => void;
  selectedElement: string | null;
  onUpdateElement: (id: string, update: Partial<ElementBlocPortfolio>) => void;
  onRemovePhoto: (id: string) => void;
  onAddPhoto: (photo: {
    id: string;
    url: string;
    urlMiniature: string;
    scoreQualite: number;
    clientId?: string;
  }) => void;
  onUpload: (file: File) => Promise<void>;
  photos: {
    id: string;
    url: string;
    urlMiniature: string;
    scoreQualite: number;
    clientId?: string;
  }[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.idBloc,
  });
  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={onSelect}
      className={`${styles.block} ${active ? styles.blockActive : ""} ${paletteOver ? styles.blockOver : ""} ${!block.visible ? styles.blockHidden : ""} ${isDragging ? "opacity-50" : ""}`}
    >
      {!block.visible && <span className={styles.hiddenBadge}>Masqué sur la page</span>}
      <header className={`${styles.blockHeader} flex items-center gap-1 p-2`}>
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Réorganiser ${editorFr.blockNames[block.type]}`}
          className="cursor-grab rounded p-1 focus-visible:ring-2"
        >
          <GripVertical className="size-4" />
        </button>
        <span className="max-w-36 flex-1 truncate text-left text-xs font-semibold">
          {editorFr.blockNames[block.type]}
        </span>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Monter le bloc"
          disabled={!canMoveUp}
          onClick={(event) => {
            event.stopPropagation();
            onMoveUp();
          }}
        >
          <ArrowUp className="size-3.5" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Descendre le bloc"
          disabled={!canMoveDown}
          onClick={(event) => {
            event.stopPropagation();
            onMoveDown();
          }}
        >
          <ArrowDown className="size-3.5" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={block.visible ? "Masquer le bloc" : "Afficher le bloc"}
          onClick={(event) => {
            event.stopPropagation();
            onToggleVisible();
          }}
        >
          {block.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={editorFr.duplicate}
          onClick={(event) => {
            event.stopPropagation();
            onDuplicate();
          }}
        >
          <Copy className="size-3.5" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={editorFr.delete}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </header>
      <div className={`${styles.blockContent} space-y-0`}>
        <BlockPreview block={block} portfolio={portfolio} />
        {block.elements.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragElements}
          >
            <SortableContext
              items={block.elements.map((element) => element.idElement)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
                {block.elements.map((element) => (
                  <SortablePhoto
                    key={element.idElement}
                    element={element}
                    selected={selectedElement === element.idElement}
                    onSelect={() => onSelectElement(element.idElement)}
                    onUpdate={onUpdateElement}
                    onRemove={() => onRemovePhoto(element.idElement)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
        <details
          open={pickerOpen}
          onToggle={(event) => {
            if ((event.currentTarget as HTMLDetailsElement).open !== pickerOpen) onPickerToggle();
          }}
          onClick={(event) => event.stopPropagation()}
          className={styles.blockDetails}
        >
          <summary
            className="cursor-pointer text-xs font-medium"
            onClick={(event) => {
              event.preventDefault();
              onPickerToggle();
            }}
          >
            <ImagePlus className="mr-1 inline size-3.5" />
            {editorFr.addPhotos}
          </summary>
          <div className="mt-2 grid max-h-64 grid-cols-2 gap-2 overflow-auto">
            {photos.length ? (
              photos.map((photo) => (
                <button
                  type="button"
                  key={photo.id}
                  onClick={() => onAddPhoto(photo)}
                  className="overflow-hidden rounded-lg border border-border text-left"
                >
                  <span className="relative block aspect-[4/3]">
                    <SafeImage
                      src={photo.urlMiniature}
                      alt=""
                      fill
                      unoptimized
                      sizes="150px"
                      className="object-cover"
                    />
                  </span>
                  <span className="block truncate p-1 text-[10px]">
                    Qualité {photo.scoreQualite}
                  </span>
                </button>
              ))
            ) : (
              <p className="col-span-2 py-3 text-xs text-muted-foreground">
                {editorFr.labels.noGalleryPhotos}
              </p>
            )}
          </div>
          <label className="mt-3 block cursor-pointer rounded-lg border border-dashed border-border p-3 text-center text-xs font-medium">
            {editorFr.labels.uploadPersonal}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onUpload(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </details>
      </div>
    </article>
  );
}

function SortablePhoto({
  element,
  selected,
  onSelect,
  onUpdate,
  onRemove,
}: {
  element: ElementBlocPortfolio;
  selected: boolean;
  onSelect: () => void;
  onUpdate: (id: string, update: Partial<ElementBlocPortfolio>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: element.idElement,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`overflow-hidden rounded-lg border ${selected ? "border-primary" : "border-border"}`}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        className="relative block aspect-[4/3] w-full"
        {...attributes}
        {...listeners}
      >
        <SafeImage
          src={element.media.urlMiniature}
          alt={element.texteAlt || ""}
          fill
          unoptimized
          sizes="180px"
          className="object-cover"
        />
      </button>
      <div className="p-2">
        <Input
          value={element.legende ?? ""}
          maxLength={1000}
          aria-label="Photo caption"
          placeholder="Légende"
          onClick={(event) => event.stopPropagation()}
          onChange={(event) =>
            onUpdate(element.idElement, { legende: event.target.value, legendeGenereeIA: false })
          }
          className="h-8 text-xs"
        />
        <div className="mt-1 flex items-center justify-between gap-1">
          <span className="block truncate text-[10px] text-muted-foreground">
            {element.statutConsentement === "ACCORDE" || element.statutConsentement === "NON_REQUIS"
              ? editorFr.labels.consentReady
              : editorFr.labels.consentPending}
          </span>
          <button
            type="button"
            className="text-[10px] text-red-700"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
          >
            {editorFr.labels.removePhoto}
          </button>
        </div>
      </div>
    </li>
  );
}

function BlockPreview({
  block,
  portfolio,
}: {
  block: BlocPortfolio;
  portfolio: PortfolioEditorData;
}) {
  const config = block.configuration;
  const title =
    typeof config.titre === "string" && config.titre
      ? config.titre
      : block.type.replaceAll("_", " ");
  const text = (key: string) => (typeof config[key] === "string" ? (config[key] as string) : "");
  const photos = [...block.elements].sort((a, b) => a.ordreAffichage - b.ordreAffichage);
  const columns =
    block.miseEnPage === "PLEIN_ECRAN" ? 1 : Math.min(4, Math.max(2, Number(config.colonnes) || 3));
  const gap = Math.min(100, Math.max(0, Number(config.espacement ?? 16)));
  const photoGrid = photos.length ? (
    <div
      className={styles.previewGrid}
      style={{
        gridTemplateColumns:
          block.miseEnPage === "CARROUSEL" ? undefined : `repeat(${columns}, minmax(0, 1fr))`,
        gridAutoFlow: block.miseEnPage === "CARROUSEL" ? "column" : undefined,
        gridAutoColumns: block.miseEnPage === "CARROUSEL" ? `minmax(75%, 1fr)` : undefined,
        overflowX: block.miseEnPage === "CARROUSEL" ? "auto" : undefined,
        gap,
      }}
    >
      {photos.slice(0, 6).map((photo) => (
        <div key={photo.idElement} className={styles.previewImage}>
          <SafeImage
            src={photo.media.urlMiniature}
            alt={photo.texteAlt ?? ""}
            fill
            unoptimized
            sizes="(min-width: 1000px) 30vw, 80vw"
            className="object-cover"
          />
        </div>
      ))}
    </div>
  ) : (
    <div className={styles.emptyMedia}>
      Ajoutez des photos depuis votre galerie pour prévisualiser cette section.
    </div>
  );

  switch (block.type) {
    case "HERO":
      return (
        <section className={styles.hero}>
          <SafeImage
            src={portfolio.photoCouverture}
            alt={portfolio.titre}
            fill
            unoptimized
            sizes="(min-width: 1000px) 70vw, 100vw"
            className="object-cover"
          />
          <div className={styles.heroVeil} />
          <div className={styles.heroCopy}>
            <p className={styles.previewStamp}>
              {[portfolio.ville, portfolio.specialites.join(" · ")].filter(Boolean).join(" · ") ||
                "Portfolio"}
            </p>
            <h1>{title}</h1>
            <p>{text("sousTitre") || portfolio.slogan}</p>
            {text("texteBouton") && (
              <span className={styles.heroButton}>
                {text("texteBouton")} <span aria-hidden="true">→</span>
              </span>
            )}
          </div>
        </section>
      );
    case "A_PROPOS":
      return (
        <section className={styles.previewSection}>
          <div>
            <p className={styles.previewStamp}>À propos</p>
            <h2>{portfolio.titre}</h2>
            <p className={styles.previewBody}>
              {text("texte") ||
                portfolio.bio ||
                "Add a short introduction to your work and approach."}
            </p>
            {Number(config.anneesExperience) > 0 && (
              <p className={styles.previewMeta}>
                {String(config.anneesExperience)} ans derrière l’appareil
              </p>
            )}
          </div>
          {photos[0] ? (
            <div className={styles.aboutImage}>
              <SafeImage
                src={photos[0].media.urlMiniature}
                alt={photos[0].texteAlt ?? ""}
                fill
                unoptimized
                sizes="320px"
                className="object-cover"
              />
            </div>
          ) : null}
        </section>
      );
    case "GALERIE":
    case "COLLECTION":
      return (
        <section className={styles.previewSection}>
          <p className={styles.previewStamp}>
            {block.type === "COLLECTION" ? "Collection" : "Galerie"}
          </p>
          <h2>
            {title === block.type.replaceAll("_", " ")
              ? String(config.categorie ?? "Sélection")
              : title}
          </h2>
          {photoGrid}
        </section>
      );
    case "CASE_STUDY":
      return (
        <section className={styles.previewSection}>
          <p className={styles.previewStamp}>
            {[text("lieu"), text("date")].filter(Boolean).join(" · ") || "Récit sélectionné"}
          </p>
          <h2>{title}</h2>
          <p className={styles.previewBody}>
            {text("texte") || "Ajoutez quelques détails sur la séance et son déroulement."}
          </p>
          {photoGrid}
        </section>
      );
    case "AVANT_APRES": {
      const before = photos.find((photo) => photo.role === "AVANT");
      const after = photos.find((photo) => photo.role === "APRES");
      return (
        <section className={styles.previewSection}>
          <p className={styles.previewStamp}>Avant / après</p>
          <h2>{title}</h2>
          {before && after ? (
            <div className={styles.comparePreview}>
              {[before, after].map((photo) => (
                <div key={photo.idElement} className={styles.previewImage}>
                  <SafeImage
                    src={photo.media.urlMiniature}
                    alt={photo.role}
                    fill
                    unoptimized
                    sizes="30vw"
                    className="object-cover"
                  />
                  <span>{photo.role}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyMedia}>
              Ajoutez une photo Avant et une photo Après pour prévisualiser la comparaison.
            </div>
          )}
        </section>
      );
    }
    case "TEMOIGNAGES":
      return (
        <section className={styles.previewSection}>
          <p className={styles.previewStamp}>Témoignages</p>
          <h2>{title || "Les avis de vos clients"}</h2>
          <div className={styles.emptyMedia}>
            Publiered client reviews will appear in this section.
          </div>
        </section>
      );
    case "SERVICES": {
      const packages = Array.isArray(config.forfaits)
        ? (config.forfaits as Record<string, unknown>[])
        : [];
      return (
        <section className={styles.previewSection}>
          <p className={styles.previewStamp}>Prestations</p>
          <h2>{title || "Séances et formules"}</h2>
          {packages.length ? (
            <div className={styles.serviceGrid}>
              {packages.slice(0, 3).map((item, index) => (
                <div key={`${String(item.nom)}-${index}`} className={styles.serviceCard}>
                  <h3>{String(item.nom ?? "Package")}</h3>
                  <p>{String(item.description ?? "")}</p>
                  <strong>{String(item.prixAPartirDe ?? "")}</strong>
                  <small>{String(item.duree ?? "")}</small>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyMedia}>Ajoutez vos forfaits dans les réglages du bloc.</div>
          )}
        </section>
      );
    }
    case "STATISTIQUES":
      return (
        <section className={styles.previewSection}>
          <p className={styles.previewStamp}>En un regard</p>
          <h2>Quelques statistiques</h2>
          <div className={styles.emptyMedia}>Les statistiques vérifiées apparaîtront ici.</div>
        </section>
      );
    case "VIDEO":
      return (
        <section className={styles.previewSection}>
          <p className={styles.previewStamp}>Film</p>
          <h2>{title || "Un film de cette journée"}</h2>
          <div className={styles.emptyMedia}>
            {text("urlVideo") && text("urlVideo") !== "https://"
              ? "Lien vidéo ajouté"
              : "Ajoutez l’URL de la vidéo dans les réglages du bloc."}
          </div>
        </section>
      );
    case "CONTACT":
      return (
        <section className={styles.contactPreview}>
          <div>
            <p className={styles.previewStamp}>Contact</p>
            <h2>Let&apos;s plan your session.</h2>
            <p className={styles.previewBody}>
              {text("texteIntro") ||
                portfolio.slogan ||
                "Indiquez aux visiteurs comment vous contacter."}
            </p>
          </div>
          <span className={styles.heroButton}>
            Demander un devis <span aria-hidden="true">→</span>
          </span>
        </section>
      );
  }
}

function BlockProperties({
  block,
  onChange,
  onVisible,
  onLayout,
  onGenerateStory,
  aiPending,
}: {
  block: BlocPortfolio;
  onChange: (key: string, value: unknown) => void;
  onVisible: (value: boolean) => void;
  onLayout: (value: BlocPortfolio["miseEnPage"]) => void;
  onGenerateStory: () => void;
  aiPending: boolean;
}) {
  const configurationFields = Object.entries(block.configuration).filter(
    ([key]) => key !== "forfaits" && key !== "categorie",
  );
  return (
    <div className="space-y-4 p-4">
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={block.visible}
          onChange={(event) => onVisible(event.target.checked)}
        />
        {editorFr.visible}
      </label>
      <section className="space-y-2 border-b border-border pb-4">
        <h3 className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          {editorFr.layout}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {MISES_EN_PAGE.map((item) => (
            <button
              type="button"
              key={item}
              aria-pressed={block.miseEnPage === item}
              onClick={() => onLayout(item)}
              className={`rounded-md border px-2 py-2 text-xs ${block.miseEnPage === item ? "border-amber-500 bg-amber-500/10" : "border-border"}`}
            >
              {editorFr.layouts[item]}
            </button>
          ))}
        </div>
        {["GALERIE", "COLLECTION", "AVANT_APRES"].includes(block.type) && (
          <p className="text-[10px] text-muted-foreground">{editorFr.labels.layoutHelp}</p>
        )}
      </section>
      <section className="space-y-3">
        <h3 className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          {editorFr.content}
        </h3>
        {block.type === "CASE_STUDY" && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={aiPending}
            onClick={onGenerateStory}
          >
            <Sparkles className="size-4" />
            Suggérer un récit depuis mes notes
          </Button>
        )}
        {configurationFields.map(([key, value]) => {
          const label = editorFr.fields[key] ?? key;
          if (Array.isArray(value)) {
            const structured = value.some((item) => typeof item === "object" && item !== null);
            return (
              <label key={key} className="grid gap-1 text-xs">
                {label}
                {structured ? (
                  <textarea
                    defaultValue={JSON.stringify(value, null, 2)}
                    onBlur={(event) => {
                      try {
                        const parsed: unknown = JSON.parse(event.target.value);
                        if (Array.isArray(parsed)) onChange(key, parsed);
                        else toast.error("Saisissez une liste JSON valide.");
                      } catch {
                        toast.error("Le JSON des forfaits est invalide.");
                      }
                    }}
                    className="min-h-32 rounded-lg border border-border bg-background p-2 font-mono text-[11px]"
                  />
                ) : (
                  <textarea
                    value={value.join(", ")}
                    onChange={(event) =>
                      onChange(
                        key,
                        event.target.value
                          .split(",")
                          .map((part) => part.trim())
                          .filter(Boolean),
                      )
                    }
                    className="min-h-16 rounded-lg border border-border bg-background p-2"
                  />
                )}
              </label>
            );
          }
          if (key === "categorie")
            return (
              <label key={key} className="grid gap-1 text-xs">
                {label}
                <select
                  value={value as string}
                  onChange={(event) => onChange(key, event.target.value)}
                  className="h-9 rounded-lg border border-border bg-background px-2"
                >
                  {CATEGORIES_PORTFOLIO.map((category) => (
                    <option key={category} value={category}>
                      {editorFr.categories[category]}
                    </option>
                  ))}
                </select>
              </label>
            );
          if (typeof value === "number")
            return (
              <label key={key} className="grid gap-1 text-xs">
                {label}
                {key === "colonnes" ? (
                  <select
                    value={value}
                    onChange={(event) => onChange(key, Number(event.target.value))}
                    className="h-9 rounded-lg border border-border bg-background px-2"
                  >
                    {[2, 3, 4].map((count) => (
                      <option key={count} value={count}>
                        {count} colonnes
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type="number"
                    min={0}
                    value={value}
                    onChange={(event) => onChange(key, Number(event.target.value))}
                  />
                )}
              </label>
            );
          if (typeof value === "string")
            return (
              <label key={key} className="grid gap-1 text-xs">
                {label}
                {value.length > 100 ||
                ["texte", "sousTitre", "texteIntro", "description"].includes(key) ? (
                  <textarea
                    value={value}
                    onChange={(event) => onChange(key, event.target.value)}
                    className="min-h-20 rounded-lg border border-border bg-background p-2"
                  />
                ) : (
                  <Input value={value} onChange={(event) => onChange(key, event.target.value)} />
                )}
              </label>
            );
          return null;
        })}
        {(block.type === "GALERIE" || block.type === "COLLECTION") && (
          <label className="grid gap-1 text-xs">
            {editorFr.fields.categorie}
            <select
              value={String(block.configuration.categorie ?? "__NONE__")}
              onChange={(event) =>
                onChange(
                  "categorie",
                  event.target.value === "__NONE__" ? undefined : event.target.value,
                )
              }
              className="h-9 rounded-lg border border-border bg-background px-2"
            >
              <option value="__NONE__">Toutes les spécialités</option>
              {CATEGORIES_PORTFOLIO.map((category) => (
                <option key={category} value={category}>
                  {editorFr.categories[category]}
                </option>
              ))}
            </select>
          </label>
        )}
        {block.type === "SERVICES" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{editorFr.fields.forfaits}</span>
              <button
                type="button"
                className="rounded-md border border-border px-2 py-1 text-[11px]"
                onClick={() =>
                  onChange("forfaits", [
                    ...(Array.isArray(block.configuration.forfaits)
                      ? block.configuration.forfaits
                      : []),
                    { nom: "Nouvelle formule", description: "", prixAPartirDe: 0, duree: "" },
                  ])
                }
              >
                + Ajouter
              </button>
            </div>
            {(Array.isArray(block.configuration.forfaits)
              ? (block.configuration.forfaits as Record<string, unknown>[])
              : []
            ).map((item, index, all) => (
              <fieldset key={index} className="space-y-2 rounded-lg border border-border p-3">
                <legend className="px-1 text-[10px] text-muted-foreground">
                  Formule {index + 1}
                </legend>
                <label className="grid gap-1 text-xs">
                  Nom
                  <Input
                    value={String(item.nom ?? "")}
                    maxLength={120}
                    onChange={(event) =>
                      onChange(
                        "forfaits",
                        all.map((entry, i) =>
                          i === index ? { ...entry, nom: event.target.value } : entry,
                        ),
                      )
                    }
                  />
                </label>
                <label className="grid gap-1 text-xs">
                  Description
                  <textarea
                    value={String(item.description ?? "")}
                    maxLength={500}
                    onChange={(event) =>
                      onChange(
                        "forfaits",
                        all.map((entry, i) =>
                          i === index ? { ...entry, description: event.target.value } : entry,
                        ),
                      )
                    }
                    className="min-h-16 rounded-lg border border-border bg-background p-2"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="grid gap-1 text-xs">
                    À partir de
                    <Input
                      type="number"
                      min={0}
                      value={Number(item.prixAPartirDe ?? 0)}
                      onChange={(event) =>
                        onChange(
                          "forfaits",
                          all.map((entry, i) =>
                            i === index
                              ? { ...entry, prixAPartirDe: Number(event.target.value) }
                              : entry,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="grid gap-1 text-xs">
                    Durée
                    <Input
                      value={String(item.duree ?? "")}
                      maxLength={80}
                      onChange={(event) =>
                        onChange(
                          "forfaits",
                          all.map((entry, i) =>
                            i === index ? { ...entry, duree: event.target.value } : entry,
                          ),
                        )
                      }
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className="text-xs text-red-700"
                  onClick={() =>
                    onChange(
                      "forfaits",
                      all.filter((_, i) => i !== index),
                    )
                  }
                >
                  Supprimer cette formule
                </button>
              </fieldset>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function PortfolioPageProperties({
  portfolio,
  bio,
  onBioChange,
  onUpdate,
  onGenerateBio,
  onGenerateSEO,
  seoSuggestion,
  onDismissSEO,
  onApplySEO,
  aiPending,
}: {
  portfolio: PortfolioEditorData;
  bio: string;
  onBioChange: (value: string) => void;
  onUpdate: (update: PortfolioUpdateInput) => void;
  onGenerateBio: () => void;
  onGenerateSEO: () => void;
  seoSuggestion: { metaTitre: string; metaDescription: string } | null;
  onDismissSEO: () => void;
  onApplySEO: () => void;
  aiPending: boolean;
}) {
  return (
    <div className="space-y-4">
      <section className="space-y-3 border-b border-border pb-4">
        <h3 className="text-sm font-semibold">Profil</h3>
        <label className="grid gap-1 text-xs">
          Nom affiché
          <Input
            defaultValue={portfolio.titre}
            maxLength={160}
            onBlur={(event) => onUpdate({ titre: event.target.value })}
          />
        </label>
        <label className="grid gap-1 text-xs">
          Slogan
          <Input
            defaultValue={portfolio.slogan ?? ""}
            maxLength={300}
            onBlur={(event) => onUpdate({ slogan: event.target.value })}
          />
        </label>
        <label className="grid gap-1 text-xs">
          Ville
          <Input
            defaultValue={portfolio.ville ?? ""}
            maxLength={120}
            onBlur={(event) => onUpdate({ ville: event.target.value })}
          />
        </label>
        <label className="grid gap-1 text-xs">
          Biographie
          <textarea
            value={bio}
            maxLength={5000}
            onChange={(event) => onBioChange(event.target.value)}
            onBlur={() => onUpdate({ bio })}
            className="min-h-24 rounded-lg border border-border bg-background p-2"
          />
        </label>
        <Button size="sm" variant="outline" disabled={aiPending} onClick={onGenerateBio}>
          <Sparkles className="size-4" />
          Suggérer une biographie avec l’IA
        </Button>
        <label className="grid gap-1 text-xs">
          URL de la photo de couverture
          <Input
            defaultValue={portfolio.photoCouverture}
            type="url"
            onBlur={(event) => onUpdate({ photoCouverture: event.target.value })}
          />
        </label>
      </section>
      <section className="space-y-3 border-b border-border pb-4">
        <h3 className="text-sm font-semibold">Apparence</h3>
        <label className="grid gap-1 text-xs">
          Thème
          <select
            defaultValue={portfolio.theme}
            onChange={(event) =>
              onUpdate({ theme: event.target.value as PortfolioUpdateInput["theme"] })
            }
            className="h-9 rounded-lg border border-border bg-background px-2"
          >
            {THEMES_PORTFOLIO.map((theme) => (
              <option key={theme}>{theme}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs">
          Couleur d’accent
          <Input
            type="color"
            defaultValue={portfolio.couleurAccent}
            onChange={(event) => onUpdate({ couleurAccent: event.target.value })}
          />
        </label>
        <label className="grid gap-1 text-xs">
          Spécialités
          <select
            multiple
            defaultValue={portfolio.specialites}
            onChange={(event) =>
              onUpdate({
                specialites: Array.from(
                  event.target.selectedOptions,
                  (option) => option.value as (typeof CATEGORIES_PORTFOLIO)[number],
                ),
              })
            }
            className="min-h-24 rounded-lg border border-border bg-background p-2"
          >
            {CATEGORIES_PORTFOLIO.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            defaultChecked={portfolio.filigrane}
            onChange={(event) => onUpdate({ filigrane: event.target.checked })}
          />
          Ajouter un filigrane aux photos publiées
        </label>
      </section>
      <section className="space-y-3 border-b border-border pb-4">
        <h3 className="text-sm font-semibold">Publication et partage</h3>
        <label className="grid gap-1 text-xs">
          Visibilité
          <select
            value={portfolio.visibilite}
            onChange={(event) =>
              onUpdate({ visibilite: event.target.value as PortfolioUpdateInput["visibilite"] })
            }
            className="h-9 rounded-lg border border-border bg-background px-2"
          >
            <option value="PUBLIC">Public</option>
            <option value="PRIVE">Privé</option>
          </select>
        </label>
        {portfolio.statut === "PUBLIE" && (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void navigator.clipboard
                  .writeText(`${window.location.origin}/portfolio/${portfolio.slug}`)
                  .then(() => toast.success("Lien copié."))
              }
            >
              Copier le lien public
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={`/portfolio/${portfolio.slug}`} target="_blank" rel="noreferrer">
                Ouvrir la page
              </a>
            </Button>
          </div>
        )}
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium">Liens sociaux</legend>
          {RESEAUX_SOCIAUX.map((reseau) => (
            <label key={reseau} className="grid gap-1 text-xs">
              {
                {
                  INSTAGRAM: "Instagram",
                  FACEBOOK: "Facebook",
                  TIKTOK: "TikTok",
                  YOUTUBE: "YouTube",
                  SITE_WEB: "Site web",
                }[reseau]
              }
              <Input
                type="url"
                defaultValue={
                  portfolio.liensSociaux.find((link) => link.reseau === reseau)?.url ?? ""
                }
                placeholder="https://…"
                onBlur={(event) => {
                  const url = event.target.value.trim();
                  const liensSociaux = portfolio.liensSociaux.filter(
                    (link) => link.reseau !== reseau,
                  );
                  if (url) liensSociaux.push({ reseau, url });
                  onUpdate({ liensSociaux });
                }}
              />
            </label>
          ))}
        </fieldset>
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Référencement</h3>
        <Button size="sm" variant="outline" disabled={aiPending} onClick={onGenerateSEO}>
          <Sparkles className="size-4" />
          Suggérer les métadonnées SEO
        </Button>
        {seoSuggestion && (
          <div className="space-y-2 rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 text-xs">
            <p className="font-semibold">Suggestion Gemini — relisez avant d’appliquer</p>
            <p className="font-medium">{seoSuggestion.metaTitre}</p>
            <p className="text-muted-foreground">{seoSuggestion.metaDescription}</p>
            <div className="flex gap-2">
              <Button size="xs" onClick={onApplySEO}>
                Appliquer
              </Button>
              <Button size="xs" variant="ghost" onClick={onDismissSEO}>
                Ignorer
              </Button>
            </div>
          </div>
        )}
        <label className="grid gap-1 text-xs">
          Titre SEO
          <Input
            key={portfolio.seo.metaTitre}
            defaultValue={portfolio.seo.metaTitre}
            maxLength={160}
            onBlur={(event) =>
              onUpdate({ seo: { ...portfolio.seo, metaTitre: event.target.value } })
            }
          />
        </label>
        <label className="grid gap-1 text-xs">
          Description SEO
          <textarea
            key={portfolio.seo.metaDescription}
            defaultValue={portfolio.seo.metaDescription}
            maxLength={320}
            onBlur={(event) =>
              onUpdate({ seo: { ...portfolio.seo, metaDescription: event.target.value } })
            }
            className="min-h-20 rounded-lg border border-border bg-background p-2"
          />
        </label>
        <label className="grid gap-1 text-xs">
          Image de partage
          <Input
            defaultValue={portfolio.seo.imageOG ?? ""}
            type="url"
            onBlur={(event) =>
              onUpdate({ seo: { ...portfolio.seo, imageOG: event.target.value || undefined } })
            }
          />
        </label>
      </section>
    </div>
  );
}

function PhotoProperties({
  portfolioId,
  block,
  selected,
  onUpdate,
}: {
  portfolioId: string;
  block: BlocPortfolio;
  selected: string | null;
  onUpdate: (elementId: string, update: Partial<ElementBlocPortfolio>) => void;
}) {
  const [pending, setPending] = useState(false);
  const element = block.elements.find((item) => item.idElement === selected);
  if (!element) return null;
  const currentElement = element;
  async function generate(
    action: typeof genererLegendePortfolio | typeof genererTexteAltPortfolio,
  ) {
    if (
      !window.confirm(
        "Cette action envoie l’image à Gemini pour générer le texte demandé. Continuer ?",
      )
    )
      return;
    setPending(true);
    const result = await action({ portfolioId, elementId: currentElement.idElement });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onUpdate(currentElement.idElement, result.data);
  }
  return (
    <div className="space-y-2 border-t border-border pt-4">
      <h3 className="text-sm font-semibold">Réglages de la photo</h3>
      <label className="grid gap-1 text-xs">
        Légende
        <textarea
          value={element.legende ?? ""}
          maxLength={1000}
          onChange={(event) =>
            onUpdate(element.idElement, { legende: event.target.value, legendeGenereeIA: false })
          }
          className="min-h-16 rounded-lg border border-border bg-background p-2"
        />
      </label>
      {element.legendeGenereeIA && (
        <span className="text-xs text-violet-600">Légende générée par l’IA</span>
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => void generate(genererLegendePortfolio)}
      >
        <Sparkles className="size-4" />
        Générer une légende
      </Button>
      <label className="grid gap-1 text-xs">
        Texte alternatif
        <Input
          value={element.texteAlt ?? ""}
          maxLength={300}
          onChange={(event) =>
            onUpdate(element.idElement, { texteAlt: event.target.value, texteAltGenereeIA: false })
          }
        />
      </label>
      {element.texteAltGenereeIA && (
        <span className="text-xs text-violet-600">Texte alternatif généré par l’IA</span>
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => void generate(genererTexteAltPortfolio)}
      >
        <Sparkles className="size-4" />
        Générer le texte alternatif
      </Button>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={element.estMisEnAvant}
          onChange={(event) => onUpdate(element.idElement, { estMisEnAvant: event.target.checked })}
        />
        Photo à la une
      </label>
      <label className="grid gap-1 text-xs">
        Rôle
        <select
          value={element.role}
          onChange={(event) =>
            onUpdate(element.idElement, {
              role: event.target.value as ElementBlocPortfolio["role"],
            })
          }
          className="h-9 rounded-lg border border-border bg-background px-2"
        >
          <option value="NORMAL">Standard</option>
          <option value="AVANT">Avant</option>
          <option value="APRES">Après</option>
        </select>
      </label>
      {element.role !== "NORMAL" && (
        <label className="grid gap-1 text-xs">
          Numéro de paire
          <Input
            type="number"
            min={1}
            value={element.paire ?? 1}
            onChange={(event) => onUpdate(element.idElement, { paire: Number(event.target.value) })}
          />
        </label>
      )}
    </div>
  );
}

function EditorPreview({
  portfolio,
  blocks,
  mobile,
}: {
  portfolio: PortfolioEditorData;
  blocks: BlocPortfolio[];
  mobile: boolean;
}) {
  return (
    <div
      className={`${styles.previewPage} mx-auto overflow-hidden shadow-soft ${mobile ? "max-w-sm" : "max-w-5xl"}`}
      style={{ "--portfolio-accent": portfolio.couleurAccent } as CSSProperties}
    >
      <div className={styles.hero}>
        <SafeImage
          src={portfolio.photoCouverture}
          alt={portfolio.titre}
          fill
          unoptimized
          sizes="100vw"
          className="object-cover"
        />
        <div className={styles.heroVeil} />
        <div className={styles.heroCopy}>
          <p className={styles.previewStamp}>
            {portfolio.ville} · {portfolio.specialites.join(" · ")}
          </p>
          <h1>{portfolio.titre}</h1>
          <p>{portfolio.slogan}</p>
        </div>
      </div>
      {blocks
        .filter((block) => block.visible)
        .map((block) => (
          <BlockPreview key={block.idBloc} block={block} portfolio={portfolio} />
        ))}
    </div>
  );
}
