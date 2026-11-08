"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EditorTopBar, type ViewportMode } from "./EditorTopBar";
import { BlockPalette } from "./BlockPalette";
import { Canvas } from "./Canvas";
import { PropertiesPanel, type InspectorTab } from "./PropertiesPanel";
import { PhotoPicker, type PhotoItem } from "./PhotoPicker";
import { PortfolioQualityAudit } from "./PortfolioQualityAudit";
import { PortfolioStatsInsights } from "../portfolio-stats-insights";
import { INITIAL_DEMO_BLOCKS } from "./demoData";
import { BLOCK_ICONS } from "./paletteData";
import type {
  BlocPortfolio,
  CategoriePortfolio,
  ElementBlocPortfolio,
  PortfolioQualityAudit as PortfolioQualityAuditResult,
  TypeBloc,
} from "../../portfolio.types";
import {
  CATEGORIES_PORTFOLIO,
  STRUCTURE_PORTFOLIO_DEFAUT,
  STRUCTURE_PORTFOLIO_PAR_SPECIALITE,
  categoriePortfolioLabels,
} from "../../portfolio.types";
import type { PortfolioEditorData } from "../../portfolio.service";
import {
  savePortfolio,
  mettreAJourPortfolio,
  publierPortfolio,
  chargerPhotosPortfolio,
  analyserQualitePortfolioAction,
  supprimerPortfolio,
  depublierPortfolio,
  genererBioPortfolio,
  genererSEOAction,
  genererHistoireProjetAction,
  genererLegendePortfolio,
  genererTexteAltPortfolio,
  suggererBlocsPortfolio,
} from "../../portfolio.actions";
import { editorFr } from "./fr";
import "./editor.css";

const defaultBlockConfigs: Record<TypeBloc, Record<string, unknown>> = {
  HERO: {
    titre: "Votre portfolio",
    sousTitre: "",
    texteBouton: "Me contacter",
    lienBouton: "#contact",
    tagline: "",
    videoFond: "",
    liensSociaux: [],
  },
  A_PROPOS: {
    titre: "",
    texte: "",
    anneesExperience: 0,
    photoPortrait: "",
    citation: "",
    legendePortrait: "",
    lieuBase: "",
    depuis: "",
    materiel: "",
    langues: "",
  },
  GALERIE: { titre: "" },
  COLLECTION: { titre: "" },
  CASE_STUDY: {
    titre: "",
    texte: "",
    date: "",
    lieu: "",
  },
  AVANT_APRES: {},
  TEMOIGNAGES: { titre: "", temoignages: [] },
  SERVICES: { titre: "", forfaits: [] },
  PROCESSUS: {
    titre: "Comment se déroule une séance",
    etapes: [
      {
        titre: "Premier échange",
        description: "Nous échangeons sur vos envies, votre date et l’ambiance souhaitée.",
      },
      {
        titre: "Préparation",
        description: "Je vous guide pour choisir le lieu, le rythme et les détails utiles.",
      },
      {
        titre: "La séance",
        description: "Je vous accompagne avec discrétion pour des images naturelles.",
      },
      {
        titre: "Livraison",
        description: "Vous recevez une galerie privée de vos images soigneusement retouchées.",
      },
    ],
  },
  FAQ: { titre: "Questions fréquentes", questions: [] },
  STATISTIQUES: {
    stat1_label: "Séances réalisées",
    stat2_label: "Clients",
    stat3_label: "Note moyenne",
  },
  VIDEO: {},
  CONTACT: {
    titre: "Parlons de votre projet",
    texteIntro: "",
    typesSeanceProposes: [],
  },
};

type EditorShellProps = {
  initialPortfolio?: PortfolioEditorData;
  portfolioSlug?: string;
  portfolioTitle?: string;
  initialPhotos?: PhotoItem[];
  photographerName?: string;
};

export function EditorShell({
  initialPortfolio,
  portfolioSlug = initialPortfolio?.slug || "portfolio",
  portfolioTitle = initialPortfolio?.titre || "Mon Portfolio",
  initialPhotos = [],
  photographerName = portfolioTitle,
}: EditorShellProps) {
  const router = useRouter();
  const portfolioId = initialPortfolio?.id;

  // Connected photographer's photos from MongoDB
  const [photographerPhotos, setPhotographerPhotos] = useState<PhotoItem[]>(initialPhotos);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);

  // Core blocks state loaded from MongoDB
  const [blocks, setBlocks] = useState<BlocPortfolio[]>(
    (initialPortfolio?.blocs ?? []).filter((b) => b.type !== "VIDEO"),
  );
  const [structureSpecialite, setStructureSpecialite] = useState<CategoriePortfolio | "DEFAUT">(
    (initialPortfolio?.specialites[0] as CategoriePortfolio | undefined) ?? "PORTRAIT",
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(
    initialPortfolio?.blocs?.[0]?.idBloc ?? null,
  );

  // History stack for Undo / Redo
  const [history, setHistory] = useState<{
    past: BlocPortfolio[][];
    future: BlocPortfolio[][];
  }>({ past: [], future: [] });

  // Viewport & Saving status
  const [viewportMode, setViewportMode] = useState<ViewportMode>("desktop");
  const [isSaving, setIsSaving] = useState(false);
  const [isUnpublishDialogOpen, setIsUnpublishDialogOpen] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [isDeletePortfolioDialogOpen, setIsDeletePortfolioDialogOpen] = useState(false);
  const [isDeletingPortfolio, setIsDeletingPortfolio] = useState(false);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(
    initialPortfolio?.statut !== "PUBLIE",
  );
  const [isPublished, setIsPublished] = useState(initialPortfolio?.statut === "PUBLIE");
  const [portfolioStatus, setPortfolioStatus] = useState<"BROUILLON" | "PUBLIE" | "DEPUBLIE">(
    initialPortfolio?.statut ?? "BROUILLON",
  );
  const [publishSummary, setPublishSummary] = useState<{
    url: string;
    removedCount: number;
    visibility: "PUBLIC" | "PRIVE";
  } | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Responsive drawers
  const [paletteDrawerOpen, setPaletteDrawerOpen] = useState(false);
  const [inspectorDrawerOpen, setInspectorDrawerOpen] = useState(false);
  const [qualityAudit, setQualityAudit] = useState<PortfolioQualityAuditResult | null>(null);
  const [publicationBlockers, setPublicationBlockers] = useState<
    {
      id: string;
      title: string;
      detail: string;
      blockId?: string;
      blockType?: TypeBloc;
    }[]
  >([]);
  const [isQualityAuditOpen, setIsQualityAuditOpen] = useState(false);
  const [isQualityAuditLoading, setIsQualityAuditLoading] = useState(false);
  const [isAiPending, setIsAiPending] = useState(false);
  const [isStatsInsightsOpen, setIsStatsInsightsOpen] = useState(false);
  const [layoutSuggestion, setLayoutSuggestion] = useState<BlocPortfolio[] | null>(null);
  const [seoSuggestion, setSeoSuggestion] = useState<{
    metaTitre: string;
    metaDescription: string;
  } | null>(null);
  const [storySuggestion, setStorySuggestion] = useState<{
    blockId: string;
    titre: string;
    texte: string;
  } | null>(null);

  // Inspector tab
  const [activeTab, setActiveTab] = useState<InspectorTab>("block");

  // Resizable Right Sidebar width (slide to resize)
  const DEFAULT_SIDEBAR_WIDTH = 340;
  const MIN_SIDEBAR_WIDTH = 290;
  const MAX_SIDEBAR_WIDTH = 680;
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("studioflow_editor_sidebar_width");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_SIDEBAR_WIDTH && parsed <= MAX_SIDEBAR_WIDTH) {
          return parsed;
        }
      }
    }
    return DEFAULT_SIDEBAR_WIDTH;
  });
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  const handleSidebarWidthChange = useCallback((newWidth: number) => {
    const clamped = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, newWidth));
    setSidebarWidth(clamped);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("studioflow_editor_sidebar_width", String(clamped));
      } catch {
        // ignore storage errors
      }
    }
  }, []);

  const handleStartSidebarResize = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsResizingSidebar(true);
      const startX = e.clientX;
      const startWidth = sidebarWidth;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const delta = startX - moveEvent.clientX;
        handleSidebarWidthChange(startWidth + delta);
      };

      const handlePointerUp = () => {
        setIsResizingSidebar(false);
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    },
    [sidebarWidth, handleSidebarWidthChange],
  );

  // Photo picker state
  const [photoPickerBlocId, setPhotoPickerBlocId] = useState<string | null>(null);

  const refreshPhotographerPhotos = useCallback(async () => {
    setIsLoadingPhotos(true);
    try {
      const res = await chargerPhotosPortfolio();
      if (!res.ok) {
        setPhotographerPhotos([]);
        toast.error(res.error || "Impossible de charger les galeries.");
        return;
      }
      setPhotographerPhotos(res.data);
      toast.success(`${res.data.length} photo(s) chargée(s) depuis MongoDB.`);
    } catch {
      setPhotographerPhotos([]);
      toast.error("Impossible de charger les galeries.");
    } finally {
      setIsLoadingPhotos(false);
    }
  }, []);

  const handleOpenPhotoPicker = async (blocId: string) => {
    setPhotoPickerBlocId(blocId);
    await refreshPhotographerPhotos();
  };

  // Drag and Drop state
  const [draggedType, setDraggedType] = useState<TypeBloc | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [overTargetId, setOverTargetId] = useState<string | null>(null);

  // Portfolio page settings from MongoDB
  const displayName = photographerName || initialPortfolio?.titre || portfolioTitle;
  const [portfolioData, setPortfolioData] = useState({
    titre: displayName,
    slogan: initialPortfolio?.slogan || "",
    ville: initialPortfolio?.ville || "",
    region: initialPortfolio?.region || "",
    pays: initialPortfolio?.pays || "",
    bio: initialPortfolio?.bio || "",
    specialites: (initialPortfolio?.specialites as string[]) || [],
    styles: (initialPortfolio?.styles as string[]) || [],
    services: (initialPortfolio?.services as string[]) || [],
    disponible: initialPortfolio?.disponible ?? false,
    visibilite: initialPortfolio?.visibilite ?? "PUBLIC",
    theme: initialPortfolio?.theme || "MINIMAL",
    couleurAccent: initialPortfolio?.couleurAccent || "#e0563b",
    seo: initialPortfolio?.seo || { metaTitre: "", metaDescription: "" },
  });
  const portfolioDataRef = useRef(portfolioData);
  const pendingPortfolioUpdatesRef = useRef<Record<string, unknown>>({});
  const portfolioSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const portfolioFlushPromiseRef = useRef<Promise<boolean> | null>(null);

  const flushPortfolioData = (): Promise<boolean> => {
    if (portfolioFlushPromiseRef.current) return portfolioFlushPromiseRef.current;
    if (portfolioSaveTimeoutRef.current) {
      clearTimeout(portfolioSaveTimeoutRef.current);
      portfolioSaveTimeoutRef.current = null;
    }

    const request = (async () => {
      while (true) {
        const updates = pendingPortfolioUpdatesRef.current;
        if (Object.keys(updates).length === 0) {
          setIsSaving(false);
          return true;
        }
        pendingPortfolioUpdatesRef.current = {};
        if (!portfolioId) {
          pendingPortfolioUpdatesRef.current = updates;
          setIsSaving(false);
          return false;
        }

        try {
          const result = await mettreAJourPortfolio(portfolioId, updates);
          if (!result.ok) {
            pendingPortfolioUpdatesRef.current = {
              ...updates,
              ...pendingPortfolioUpdatesRef.current,
            };
            toast.error(result.error);
            setIsSaving(false);
            return false;
          }
        } catch {
          pendingPortfolioUpdatesRef.current = {
            ...updates,
            ...pendingPortfolioUpdatesRef.current,
          };
          toast.error("Impossible d’enregistrer les réglages du portfolio.");
          setIsSaving(false);
          return false;
        }
      }
    })();
    portfolioFlushPromiseRef.current = request;
    void request.finally(() => {
      if (portfolioFlushPromiseRef.current === request) {
        portfolioFlushPromiseRef.current = null;
      }
    });
    return request;
  };

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Auto-save blocks to MongoDB with debounce
  const applyBlocksChange = useCallback(
    (nextBlocks: BlocPortfolio[]) => {
      setHistory((prev) => ({
        past: [...prev.past.slice(-30), blocks],
        future: [],
      }));
      setBlocks(nextBlocks);
      setHasUnpublishedChanges(true);

      setIsSaving(true);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        if (portfolioId) {
          try {
            const res = await savePortfolio({ portfolioId, blocs: nextBlocks });
            if (!res.ok) {
              console.error("Save portfolio failed:", res.error);
              toast.error(res.error || "Erreur de sauvegarde.");
            }
          } catch (err) {
            console.error("Save portfolio exception:", err);
            toast.error("Erreur lors de l'enregistrement du portfolio.");
          }
        }
        setIsSaving(false);
      }, 1000);
    },
    [blocks, portfolioId],
  );

  // Update Page Settings and persist to MongoDB
  const handleUpdatePortfolioData = (field: string, val: unknown) => {
    const nextData = { ...portfolioDataRef.current, [field]: val };
    portfolioDataRef.current = nextData;
    setPortfolioData(nextData);
    setHasUnpublishedChanges(true);
    if (!portfolioId) return;
    pendingPortfolioUpdatesRef.current = {
      ...pendingPortfolioUpdatesRef.current,
      [field]: val,
    };
    setIsSaving(true);
    if (portfolioSaveTimeoutRef.current) clearTimeout(portfolioSaveTimeoutRef.current);
    portfolioSaveTimeoutRef.current = setTimeout(() => {
      void flushPortfolioData();
    }, 600);
  };

  const handleGenerateBio = async () => {
    if (!portfolioId) return toast.error("Portfolio introuvable.");
    setIsAiPending(true);
    try {
      const result = await genererBioPortfolio(portfolioId);
      if (!result.ok) return toast.error(result.error);
      portfolioDataRef.current = { ...portfolioDataRef.current, bio: result.data.bio };
      setPortfolioData((current) => ({ ...current, bio: result.data.bio }));
      setHasUnpublishedChanges(true);
      toast.success("Biographie IA générée. Relis-la avant publication.");
    } catch {
      toast.error("Impossible de générer la biographie.");
    } finally {
      setIsAiPending(false);
    }
  };

  const handleGenerateSeo = async () => {
    if (!portfolioId) return toast.error("Portfolio introuvable.");
    setIsAiPending(true);
    try {
      const result = await genererSEOAction(portfolioId);
      if (!result.ok) return toast.error(result.error);
      setSeoSuggestion(result.data);
    } catch {
      toast.error("Impossible de générer les métadonnées SEO.");
    } finally {
      setIsAiPending(false);
    }
  };

  const handleGenerateStory = async (blockId: string) => {
    if (!portfolioId) return toast.error("Portfolio introuvable.");
    const block = blocks.find((item) => item.idBloc === blockId);
    const notes =
      typeof block?.configuration.texte === "string" ? block.configuration.texte.trim() : "";
    if (!block || block.type !== "CASE_STUDY") return;
    if (notes.length < 20) {
      toast.error("Ajoute au moins 20 caractères de notes factuelles dans le récit.");
      return;
    }
    setIsAiPending(true);
    try {
      const result = await genererHistoireProjetAction({
        portfolioId,
        blockId,
        notes,
        titre:
          typeof block.configuration.titre === "string" ? block.configuration.titre : undefined,
      });
      if (!result.ok) return toast.error(result.error);
      setStorySuggestion({ blockId, ...result.data });
    } catch {
      toast.error("Impossible de générer le récit de cette étude de cas.");
    } finally {
      setIsAiPending(false);
    }
  };

  const handleGeneratePhotoText = async (elementId: string, kind: "caption" | "alt") => {
    if (!portfolioId) return toast.error("Portfolio introuvable.");
    if (!window.confirm("Cette action envoie l’image sélectionnée à Gemini. Continuer ?")) return;
    setIsAiPending(true);
    try {
      let update: Partial<ElementBlocPortfolio>;
      if (kind === "caption") {
        const result = await genererLegendePortfolio({ portfolioId, elementId });
        if (!result.ok) return toast.error(result.error);
        update = { legende: result.data.legende, legendeGenereeIA: true };
      } else {
        const result = await genererTexteAltPortfolio({ portfolioId, elementId });
        if (!result.ok) return toast.error(result.error);
        update = { texteAlt: result.data.texteAlt, texteAltGenereeIA: true };
      }
      const nextBlocks = blocks.map((block) => ({
        ...block,
        elements: block.elements.map((element) =>
          element.idElement === elementId ? { ...element, ...update } : element,
        ),
      }));
      applyBlocksChange(nextBlocks);
      toast.success(kind === "caption" ? "Légende générée." : "Texte alternatif généré.");
    } catch {
      toast.error("Impossible de générer le texte de la photo.");
    } finally {
      setIsAiPending(false);
    }
  };

  const handleSuggestLayout = async () => {
    if (!portfolioId) return toast.error("Portfolio introuvable.");
    setIsAiPending(true);
    try {
      const result = await suggererBlocsPortfolio(portfolioId);
      if (!result.ok) return toast.error(result.error);
      setLayoutSuggestion(result.data.blocs);
    } catch {
      toast.error("Impossible de suggérer l’ordre des blocs.");
    } finally {
      setIsAiPending(false);
    }
  };

  const handleApplySeoSuggestion = () => {
    if (!seoSuggestion) return;
    void handleUpdatePortfolioData("seo", { ...portfolioData.seo, ...seoSuggestion });
    setSeoSuggestion(null);
    toast.success("Métadonnées SEO appliquées.");
  };

  const handleApplyStorySuggestion = () => {
    if (!storySuggestion) return;
    const block = blocks.find((item) => item.idBloc === storySuggestion.blockId);
    if (!block) return setStorySuggestion(null);
    handleUpdateBlock(block.idBloc, {
      configuration: {
        ...block.configuration,
        titre: storySuggestion.titre,
        texte: storySuggestion.texte,
      },
    });
    setStorySuggestion(null);
    toast.success("Récit appliqué au bloc.");
  };

  // Undo / Redo handlers
  const handleUndo = useCallback(() => {
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    setHistory((prev) => ({
      past: prev.past.slice(0, -1),
      future: [blocks, ...prev.future],
    }));
    setBlocks(previous);
    if (portfolioId) {
      void savePortfolio({ portfolioId, blocs: previous }).catch(console.error);
    }
  }, [history.past, blocks, portfolioId]);

  const handleRedo = useCallback(() => {
    if (history.future.length === 0) return;
    const next = history.future[0];
    setHistory((prev) => ({
      past: [...prev.past, blocks],
      future: prev.future.slice(1),
    }));
    setBlocks(next);
    if (portfolioId) {
      void savePortfolio({ portfolioId, blocs: next }).catch(console.error);
    }
  }, [history.future, blocks, portfolioId]);

  // Keyboard shortcut listener: Ctrl+Z / Ctrl+Shift+Z / Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (e.key === "Escape") {
        setSelectedBlockId(null);
        setPaletteDrawerOpen(false);
        setInspectorDrawerOpen(false);
        setActiveTab("page");
        setIsQualityAuditOpen(false);
        setIsStatsInsightsOpen(false);
        setPublishSummary(null);
        setPhotoPickerBlocId(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Block counts calculation for palette
  const blockUsageCounts = blocks.reduce(
    (acc, b) => {
      acc[b.type] = (acc[b.type] || 0) + 1;
      return acc;
    },
    {} as Partial<Record<TypeBloc, number>>,
  );

  // Selection
  const handleSelectBlock = (id: string | null) => {
    setSelectedBlockId(id);
    if (id) {
      setActiveTab("block");
      if (window.innerWidth < 1100) setInspectorDrawerOpen(true);
    }
  };

  // Add block
  const handleAddBlock = (type: TypeBloc, targetIndex?: number) => {
    if (type === "HERO" && blocks.some((b) => b.type === "HERO")) {
      toast.error(editorFr.oneHero);
      return;
    }

    // Generate valid 24-char hex Mongo ObjectId
    const newBlockId = crypto.randomUUID().replaceAll("-", "").slice(0, 24);
    const insertAt =
      typeof targetIndex === "number"
        ? targetIndex
        : selectedBlockId
          ? blocks.findIndex((b) => b.idBloc === selectedBlockId) + 1
          : blocks.length;

    const config = structuredClone(defaultBlockConfigs[type]);
    if ((type === "HERO" || type === "A_PROPOS") && portfolioTitle) {
      config.titre = portfolioTitle;
    }

    const newBlock: BlocPortfolio = {
      idBloc: newBlockId,
      type,
      ordre: insertAt,
      visible: true,
      miseEnPage: type === "HERO" ? "PLEIN_ECRAN" : "GRILLE",
      configuration: config,
      elements: [],
    };

    const nextBlocks = [...blocks.slice(0, insertAt), newBlock, ...blocks.slice(insertAt)].map(
      (b, idx) => ({ ...b, ordre: idx }),
    );

    applyBlocksChange(nextBlocks);
    handleSelectBlock(newBlockId);
    toast.success(`Bloc ${editorFr.blockNames[type]} ajouté`);
  };

  // Move block up / down
  const handleMoveBlock = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;
    const reordered = arrayMove(blocks, index, targetIndex).map((b, idx) => ({
      ...b,
      ordre: idx,
    }));
    applyBlocksChange(reordered);
  };

  // Toggle visibility
  const handleToggleVisibility = (id: string) => {
    const nextBlocks = blocks.map((b) => (b.idBloc === id ? { ...b, visible: !b.visible } : b));
    applyBlocksChange(nextBlocks);
  };

  // Duplicate block
  const handleDuplicateBlock = (id: string) => {
    const index = blocks.findIndex((b) => b.idBloc === id);
    if (index === -1) return;
    const source = blocks[index];

    if (source.type === "HERO") {
      toast.error(editorFr.oneHero);
      return;
    }

    const duplicateId = crypto.randomUUID().replaceAll("-", "").slice(0, 24);
    const duplicateBlock: BlocPortfolio = {
      ...structuredClone(source),
      idBloc: duplicateId,
      ordre: index + 1,
    };

    const nextBlocks = [
      ...blocks.slice(0, index + 1),
      duplicateBlock,
      ...blocks.slice(index + 1),
    ].map((b, idx) => ({ ...b, ordre: idx }));

    applyBlocksChange(nextBlocks);
    handleSelectBlock(duplicateId);
    toast.success("Bloc dupliqué");
  };

  // Delete block
  const handleDeleteBlock = (id: string) => {
    const index = blocks.findIndex((b) => b.idBloc === id);
    if (index === -1) return;
    const nextBlocks = blocks
      .filter((b) => b.idBloc !== id)
      .map((b, idx) => ({ ...b, ordre: idx }));

    applyBlocksChange(nextBlocks);
    if (selectedBlockId === id) {
      const nextSelected = nextBlocks[index]?.idBloc || nextBlocks[index - 1]?.idBloc || null;
      setSelectedBlockId(nextSelected);
      if (!nextSelected) setActiveTab("page");
    }
    toast.success("Bloc supprimé");
  };

  // Update block properties
  const handleUpdateBlock = (id: string, update: Partial<BlocPortfolio>) => {
    const nextBlocks = blocks.map((b) => (b.idBloc === id ? { ...b, ...update } : b));
    applyBlocksChange(nextBlocks);
  };

  // Update configuration field
  const handleUpdateConfiguration = (id: string, key: string, value: unknown) => {
    const nextBlocks = blocks.map((b) => {
      if (b.idBloc !== id) return b;
      return {
        ...b,
        configuration: {
          ...b.configuration,
          [key]: value,
        },
      };
    });
    applyBlocksChange(nextBlocks);
  };

  // Remove photo from gallery block
  const handleRemoveElement = (blocId: string, elementId: string) => {
    const nextBlocks = blocks.map((b) => {
      if (b.idBloc !== blocId) return b;
      // Re-index ordreAffichage to stay continuous after removal
      const remaining = b.elements
        .filter((el) => el.idElement !== elementId)
        .map((el, i) => ({ ...el, ordreAffichage: i }));
      return { ...b, elements: remaining };
    });
    applyBlocksChange(nextBlocks);
    toast.success("Photo retirée du bloc");
  };

  // Add photos from PhotoPicker
  const handleAddPhotosToBlock = (newElements: ElementBlocPortfolio[]) => {
    if (!photoPickerBlocId) return;
    const targetBlock = blocks.find((b) => b.idBloc === photoPickerBlocId);
    if (targetBlock && (targetBlock.type === "GALERIE" || targetBlock.type === "COLLECTION")) {
      const remainingSlots = Math.max(0, 12 - targetBlock.elements.length);
      if (remainingSlots <= 0) {
        toast.error("Cette galerie contient déjà le nombre maximum de 12 photos.");
        return;
      }
      if (newElements.length > remainingSlots) {
        newElements = newElements.slice(0, remainingSlots);
        toast.info(`Seules ${remainingSlots} photo(s) ont été ajoutées pour respecter le maximum de 12.`);
      }
    }
    const nextBlocks = blocks.map((b) => {
      if (b.idBloc !== photoPickerBlocId) return b;
      const updatedConfig = { ...b.configuration };
      // Assign ordreAffichage continuing from the last existing element
      const baseOrder = b.elements.length;
      const reorderedNew = newElements.map((el, i) => ({
        ...el,
        ordreAffichage: baseOrder + i,
      }));
      return {
        ...b,
        configuration: updatedConfig,
        elements: [...b.elements, ...reorderedNew].slice(0, 12),
      };
    });
    applyBlocksChange(nextBlocks);
    toast.success(`${newElements.length} photo(s) ajoutée(s)`);
  };

  // Publish to MongoDB
  const handlePublish = async () => {
    if (!portfolioId) {
      toast.error("Portfolio introuvable.");
      return;
    }
    setIsSaving(true);
    try {
      if (!(await flushPortfolioData())) return;
      setIsSaving(true);
      const saveRes = await savePortfolio({ portfolioId, blocs: blocks });
      if (!saveRes.ok) {
        toast.error(saveRes.error || "Erreur d'enregistrement des blocs.");
        setIsSaving(false);
        return;
      }
      const res = await publierPortfolio({ portfolioId });
      if (res.ok) {
        setIsPublished(true);
        setPortfolioStatus("PUBLIE");
        setHasUnpublishedChanges(false);
        setPublishSummary({
          url: res.data.url,
          removedCount: res.data.removedElements.length,
          visibility: portfolioDataRef.current.visibilite,
        });
      } else {
        toast.error(res.error || "Erreur de publication.");
      }
    } catch {
      toast.error("Erreur serveur lors de la publication.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnpublish = () => {
    if (!portfolioId) return toast.error("Portfolio introuvable.");
    setIsUnpublishDialogOpen(true);
  };

  const confirmUnpublish = async () => {
    if (!portfolioId) return;
    setIsUnpublishing(true);
    try {
      const result = await depublierPortfolio({ portfolioId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setIsUnpublishDialogOpen(false);
      setIsPublished(false);
      setPortfolioStatus("DEPUBLIE");
      setHasUnpublishedChanges(false);
      toast.success(editorFr.unpublishedSuccess);
    } catch {
      toast.error(editorFr.unpublishError);
    } finally {
      setIsUnpublishing(false);
    }
  };

  const handlePreview = async () => {
    if (!portfolioId) return toast.error("Portfolio introuvable.");
    const previewWindow = window.open("about:blank", "_blank");
    if (!previewWindow) {
      toast.error(editorFr.allowPreviewPopup);
      return;
    }
    previewWindow.opener = null;
    setIsSaving(true);
    try {
      if (!(await flushPortfolioData())) {
        previewWindow.close();
        return;
      }
      const result = await savePortfolio({ portfolioId, blocs: blocks });
      if (!result.ok) {
        previewWindow.close();
        toast.error(result.error || editorFr.saveError);
        return;
      }
      previewWindow.location.replace("/dashboard/portfolio/preview");
    } catch {
      previewWindow.close();
      toast.error(editorFr.previewError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQualityAudit = async () => {
    if (!portfolioId) {
      toast.error("Portfolio introuvable.");
      return;
    }
    const confirmed = window.confirm(
      "L’audit envoie à Gemini les textes et données structurées du portfolio. Les images ne sont pas incluses. Continuer ?",
    );
    if (!confirmed) return;
    setIsQualityAuditOpen(true);
    setIsQualityAuditLoading(true);
    try {
      const saveRes = await savePortfolio({ portfolioId, blocs: blocks });
      if (!saveRes.ok) {
        toast.error(saveRes.error || "Erreur d'enregistrement des blocs.");
        return;
      }
      const result = await analyserQualitePortfolioAction({ portfolioId });
      if (!result.ok) {
        toast.error(result.error || "Impossible d'analyser le portfolio.");
        return;
      }
      const blockers: typeof publicationBlockers = [];
      const heroBlocks = blocks.filter((block) => block.type === "HERO");
      if (heroBlocks.length !== 1) {
        blockers.push({
          id: "hero",
          title: "Bloc Hero manquant",
          detail: "La page doit contenir exactement un bloc Hero.",
          blockType: "HERO",
        });
      }
      for (const block of blocks.filter((item) => item.type === "AVANT_APRES")) {
        const pairRoles = new Map<number, Set<string>>();
        for (const element of block.elements) {
          if (element.paire === undefined || element.role === "NORMAL") continue;
          const roles = pairRoles.get(element.paire) ?? new Set<string>();
          roles.add(element.role);
          pairRoles.set(element.paire, roles);
        }
        if ([...pairRoles.values()].some((roles) => !roles.has("AVANT") || !roles.has("APRES"))) {
          blockers.push({
            id: `before-after-${block.idBloc}`,
            title: "Comparaison Avant / Après incomplète",
            detail: "Chaque paire doit contenir une photo Avant et une photo Après.",
            blockId: block.idBloc,
          });
        }
      }
      setPublicationBlockers(blockers);
      setQualityAudit(result.data);
    } catch {
      toast.error("Erreur serveur pendant l'analyse.");
    } finally {
      setIsQualityAuditLoading(false);
    }
  };

  const handleFixPublicationBlocker = (blocker: { blockId?: string; blockType?: TypeBloc }) => {
    setIsQualityAuditOpen(false);
    if (blocker.blockId) {
      handleSelectBlock(blocker.blockId);
      setInspectorDrawerOpen(true);
    } else if (blocker.blockType) {
      handleAddBlock(blocker.blockType);
    }
  };

  const handleFixAuditCheck = (check: "CONSENT" | "ALT_TEXT" | "SEO" | "PROFILE_PHOTO") => {
    setIsQualityAuditOpen(false);
    if (check === "SEO") {
      setSelectedBlockId(null);
      setActiveTab("page");
      setInspectorDrawerOpen(true);
      return;
    }

    if (check === "PROFILE_PHOTO") {
      const about = blocks.find((block) => block.type === "A_PROPOS");
      if (about) {
        handleSelectBlock(about.idBloc);
        setInspectorDrawerOpen(true);
      } else {
        handleAddBlock("A_PROPOS");
      }
      return;
    }

    const targetBlock = blocks.find((block) =>
      block.elements.some((element) =>
        check === "CONSENT"
          ? element.source === "GALERIE_CLIENT" && element.statutConsentement !== "ACCORDE"
          : !element.texteAlt?.trim(),
      ),
    );
    if (targetBlock) {
      handleSelectBlock(targetBlock.idBloc);
      setInspectorDrawerOpen(true);
    }
  };

  const handleDeletePortfolio = () => {
    setIsDeletePortfolioDialogOpen(true);
  };

  const confirmDeletePortfolio = async () => {
    if (!portfolioId) return;
    setIsDeletingPortfolio(true);
    try {
      const res = await supprimerPortfolio({ portfolioId });
      if (res.ok) {
        setIsDeletePortfolioDialogOpen(false);
        toast.success("Portfolio supprimé avec succès.");
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(res.error || "Échec de la suppression.");
      }
    } catch {
      toast.error("Erreur serveur lors de la suppression.");
    } finally {
      setIsDeletingPortfolio(false);
    }
  };

  // Reset portfolio blocks with photographer's name
  const handleResetPortfolio = async () => {
    if (!window.confirm(`${editorFr.confirmResetPortfolio} ${displayName} ?`)) {
      return;
    }
    const freshBlocks = INITIAL_DEMO_BLOCKS.map((b) => {
      const cloned = structuredClone(b);
      cloned.idBloc = crypto.randomUUID().replaceAll("-", "").slice(0, 24);
      if (cloned.type === "HERO" || cloned.type === "A_PROPOS") {
        cloned.configuration.titre = displayName;
      }
      return cloned;
    });
    applyBlocksChange(freshBlocks);
    toast.success("Blocs réinitialisés avec succès.");
  };

  // Collision detection: pointerWithin for palette, closestCenter for canvas
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const hits = pointerWithin(args);
    return String(args.active.id).startsWith("palette:") && hits.length
      ? hits
      : closestCenter(args);
  }, []);

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const activeId = String(event.active.id);
    if (activeId.startsWith("palette:")) {
      const type = event.active.data.current?.type as TypeBloc;
      setDraggedType(type);
    } else {
      setDraggedBlockId(activeId);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setOverTargetId(null);
      return;
    }
    setOverTargetId(String(over.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = String(active.id);

    // 1. Dropping from Palette onto Canvas
    if (activeId.startsWith("palette:")) {
      const type = active.data.current?.type as TypeBloc;
      if (type && over) {
        let insertIndex = blocks.length;
        if (over.id !== "canvas-end") {
          const idx = blocks.findIndex((b) => b.idBloc === over.id);
          if (idx !== -1) insertIndex = idx;
        }
        handleAddBlock(type, insertIndex);
      }
    }
    // 2. Reordering blocks inside Canvas
    else if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.idBloc === active.id);
      const newIndex =
        over.id === "canvas-end"
          ? blocks.length - 1
          : blocks.findIndex((b) => b.idBloc === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(blocks, oldIndex, newIndex).map((b, idx) => ({
          ...b,
          ordre: idx,
        }));
        applyBlocksChange(reordered);
        toast.info("Bloc déplacé");
      }
    }

    setDraggedType(null);
    setDraggedBlockId(null);
    setOverTargetId(null);
  };

  const handleDragCancel = () => {
    setDraggedType(null);
    setDraggedBlockId(null);
    setOverTargetId(null);
  };

  const selectedBlock = blocks.find((b) => b.idBloc === selectedBlockId) ?? null;
  const completionSuggestions = [
    !blocks.some(
      (block) =>
        block.type === "HERO" &&
        (block.configuration.photoCouverture || block.configuration.videoFond),
    ) && "Ajoutez une image de couverture au Hero.",
    (portfolioData.bio || "").trim().length < 40 && "Rédigez une biographie de quelques phrases.",
    !blocks.some(
      (block) =>
        (block.type === "GALERIE" || block.type === "COLLECTION") && block.elements.length > 0,
    ) && "Ajoutez vos meilleures photos depuis la bibliothèque.",
    !blocks.some((block) => block.type === "SERVICES") && "Présentez vos prestations ou forfaits.",
    !blocks.some((block) => block.type === "CONTACT") && "Ajoutez un moyen de vous contacter.",
  ].filter((suggestion): suggestion is string => Boolean(suggestion));
  const profileCompletion = Math.round(((5 - completionSuggestions.length) / 5) * 100);

  const applySpecialtyStructure = () => {
    const remaining = [...blocks];
    const ordered: BlocPortfolio[] = [];
    const structure =
      structureSpecialite === "DEFAUT"
        ? STRUCTURE_PORTFOLIO_DEFAUT
        : STRUCTURE_PORTFOLIO_PAR_SPECIALITE[structureSpecialite];
    const requiredTypes = new Set<TypeBloc>([
      "HERO",
      "A_PROPOS",
      "GALERIE",
      "SERVICES",
      "PROCESSUS",
      "TEMOIGNAGES",
      "FAQ",
      "CONTACT",
    ]);
    for (const type of structure) {
      const matches = remaining.filter((block) => block.type === type);
      if (matches.length > 0) {
        ordered.push(...matches);
        for (const block of matches) {
          remaining.splice(remaining.findIndex((candidate) => candidate.idBloc === block.idBloc), 1);
        }
      } else if (requiredTypes.has(type)) {
        const idBloc = crypto.randomUUID().replaceAll("-", "").slice(0, 24);
        ordered.push({
          idBloc,
          type,
          ordre: ordered.length,
          visible: true,
          miseEnPage: type === "HERO" ? "PLEIN_ECRAN" : "GRILLE",
          configuration: structuredClone(defaultBlockConfigs[type]),
          elements: [],
        });
      }
    }
    applyBlocksChange([...ordered, ...remaining].map((block, ordre) => ({ ...block, ordre })));
    toast.success(
      structureSpecialite === "DEFAUT"
        ? "Structure professionnelle appliquée."
        : `Structure ${categoriePortfolioLabels[structureSpecialite].toLowerCase()} appliquée.`,
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="studioflow-editor fixed inset-0 z-50 flex h-dvh w-screen flex-col overflow-hidden bg-[#0f0905] text-[#f3ebdd] antialiased select-none">
        {/* 60px Fixed Atelier Topbar */}
        <EditorTopBar
          portfolioSlug={portfolioSlug}
          isSaving={isSaving}
          hasUnpublishedChanges={hasUnpublishedChanges}
          isPublished={isPublished}
          publicationStatus={portfolioStatus}
          visibility={portfolioData.visibilite}
          viewportMode={viewportMode}
          onViewportChange={setViewportMode}
          canUndo={history.past.length > 0}
          canRedo={history.future.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onPublish={handlePublish}
          onUnpublish={() => void handleUnpublish()}
          onPreview={() => void handlePreview()}
          onQualityAudit={() => void handleQualityAudit()}
          onOpenStatsInsights={() => setIsStatsInsightsOpen(true)}
          onTogglePaletteDrawer={() => setPaletteDrawerOpen((prev) => !prev)}
          onToggleInspectorDrawer={() => setInspectorDrawerOpen((prev) => !prev)}
        />

        <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-[#160d08] px-4 py-2 text-xs">
          <div className="min-w-40 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-[#f3ebdd]">Profil complet à {profileCompletion} %</span>
              <span className="text-[10px] text-[#c4ad98]">
                {completionSuggestions[0] || "Belle base, continuez à peaufiner les détails."}
              </span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#e8a34a] transition-[width]" style={{ width: `${profileCompletion}%` }} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-[10px] text-[#c4ad98]">
            Structure
            <select
              value={structureSpecialite}
              onChange={(event) =>
                setStructureSpecialite(
                  event.target.value === "DEFAUT"
                    ? "DEFAUT"
                    : (event.target.value as CategoriePortfolio),
                )
              }
              className="h-8 rounded-md border border-white/10 bg-[#0f0905] px-2 text-[#f3ebdd]"
            >
              <option value="DEFAUT">Recommandée</option>
              {CATEGORIES_PORTFOLIO.map((category) => (
                <option key={category} value={category}>{categoriePortfolioLabels[category]}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={applySpecialtyStructure}
            className="h-8 rounded-md border border-[#e8a34a]/40 px-3 text-[10px] font-semibold text-[#e8a34a] hover:bg-[#e8a34a]/10"
          >
            Appliquer le modèle
          </button>
        </div>

        {/* Main Workspace (3 fixed internal scrolling columns) */}
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {/* Left: Block Palette (Desktop: fixed 236px / 210px) */}
          <div className="hidden h-full min-[1100px]:block">
            <BlockPalette
              totalBlocksCount={blocks.length}
              blockUsageCounts={blockUsageCounts}
              onAddBlock={(type) => handleAddBlock(type)}
              onSuggestLayout={() => void handleSuggestLayout()}
              layoutSuggestion={layoutSuggestion}
              layoutSuggestionPending={isAiPending}
              onApplyLayoutSuggestion={() => {
                if (layoutSuggestion) applyBlocksChange(layoutSuggestion);
                setLayoutSuggestion(null);
              }}
              onDismissLayoutSuggestion={() => setLayoutSuggestion(null)}
            />
          </div>

          {/* Mobile/Tablet Drawer: Palette */}
          {paletteDrawerOpen && (
            <div className="fixed inset-0 z-40 flex min-[1100px]:hidden">
              <button
                type="button"
                aria-label={editorFr.closeBlockPalette}
                className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
                onClick={() => setPaletteDrawerOpen(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label={editorFr.drawerBlocks}
                className="relative z-50 h-full w-[260px] animate-in shadow-2xl duration-200 slide-in-from-left"
              >
                <BlockPalette
                  totalBlocksCount={blocks.length}
                  blockUsageCounts={blockUsageCounts}
                  onAddBlock={(type) => {
                    handleAddBlock(type);
                    setPaletteDrawerOpen(false);
                  }}
                  onSuggestLayout={() => void handleSuggestLayout()}
                  layoutSuggestion={layoutSuggestion}
                  layoutSuggestionPending={isAiPending}
                  onApplyLayoutSuggestion={() => {
                    if (layoutSuggestion) applyBlocksChange(layoutSuggestion);
                    setLayoutSuggestion(null);
                  }}
                  onDismissLayoutSuggestion={() => setLayoutSuggestion(null)}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Center: Canvas (1fr flexible, independent scrolling) */}
          <Canvas
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            overTargetId={overTargetId}
            portfolioTitle={portfolioData.titre}
            publicationStatus={
              isPublished
                ? hasUnpublishedChanges
                  ? editorFr.unpublishedChanges
                  : editorFr.statuses.PUBLIE
                : editorFr.statuses[portfolioStatus]
            }
            theme={portfolioData.theme}
            couleurAccent={portfolioData.couleurAccent}
            viewportMode={viewportMode}
            onSelectBlock={handleSelectBlock}
            onMoveBlock={handleMoveBlock}
            onToggleVisibility={handleToggleVisibility}
            onDuplicateBlock={handleDuplicateBlock}
            onDeleteBlock={handleDeleteBlock}
            onOpenPhotoPicker={handleOpenPhotoPicker}
            onDropAreaClick={() => handleAddBlock("GALERIE")}
          />

          {/* Right: Properties Inspector (Resizable with slide / drag) */}
          <div
            className="group/resizer relative hidden h-full shrink-0 min-[1100px]:flex"
            style={{ width: `${sidebarWidth}px` }}
          >
            {/* Draggable Divider Handle on the left border */}
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Redimensionner le panneau d'outils"
              title="Glisser pour agrandir ou réduire (Double-clic pour réinitialiser)"
              onPointerDown={handleStartSidebarResize}
              onDoubleClick={() => handleSidebarWidthChange(DEFAULT_SIDEBAR_WIDTH)}
              className={`absolute -left-1.5 top-0 bottom-0 z-30 flex w-3 cursor-col-resize items-center justify-center select-none transition-colors ${
                isResizingSidebar
                  ? "bg-amber-500/30"
                  : "hover:bg-amber-500/20 active:bg-amber-500/40"
              }`}
            >
              <div
                className={`h-12 w-1 rounded-full transition-colors ${
                  isResizingSidebar ? "bg-amber-400" : "bg-white/20 group-hover/resizer:bg-amber-400"
                }`}
              />
            </div>

            <div className="h-full w-full overflow-hidden">
              <PropertiesPanel
                sidebarWidth={sidebarWidth}
                onSidebarWidthChange={handleSidebarWidthChange}
                onResetSidebarWidth={() => handleSidebarWidthChange(DEFAULT_SIDEBAR_WIDTH)}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                selectedBlock={selectedBlock}
                onUpdateBlock={handleUpdateBlock}
                onUpdateConfiguration={handleUpdateConfiguration}
                onDuplicateBlock={handleDuplicateBlock}
                onDeleteBlock={handleDeleteBlock}
                onOpenPhotoPicker={handleOpenPhotoPicker}
                onRemoveElement={handleRemoveElement}
                onGeneratePhotoText={(elementId, kind) =>
                  void handleGeneratePhotoText(elementId, kind)
                }
                onGenerateBio={() => void handleGenerateBio()}
                onGenerateSeo={() => void handleGenerateSeo()}
                seoSuggestion={seoSuggestion}
                onApplySeoSuggestion={handleApplySeoSuggestion}
                onDismissSeoSuggestion={() => setSeoSuggestion(null)}
                onGenerateStory={(blockId) => void handleGenerateStory(blockId)}
                storySuggestion={storySuggestion}
                onApplyStorySuggestion={handleApplyStorySuggestion}
                onDismissStorySuggestion={() => setStorySuggestion(null)}
                aiPending={isAiPending}
                portfolioData={portfolioData}
                onUpdatePortfolioData={handleUpdatePortfolioData}
                portfolioSlug={portfolioSlug}
                onDeletePortfolio={handleDeletePortfolio}
                onResetPortfolio={handleResetPortfolio}
              />
            </div>
          </div>

          {/* Mobile/Tablet Drawer: Inspector */}
          {inspectorDrawerOpen && (
            <div className="fixed inset-0 z-40 flex justify-end min-[1100px]:hidden">
              <button
                type="button"
                aria-label={editorFr.closeInspector}
                className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
                onClick={() => setInspectorDrawerOpen(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label={editorFr.drawerInspector}
                className="relative z-50 h-full w-[330px] animate-in shadow-2xl duration-200 slide-in-from-right"
              >
                <PropertiesPanel
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  selectedBlock={selectedBlock}
                  onUpdateBlock={handleUpdateBlock}
                  onUpdateConfiguration={handleUpdateConfiguration}
                  onDuplicateBlock={handleDuplicateBlock}
                  onDeleteBlock={handleDeleteBlock}
                  onOpenPhotoPicker={handleOpenPhotoPicker}
                  onRemoveElement={handleRemoveElement}
                  onGeneratePhotoText={(elementId, kind) =>
                    void handleGeneratePhotoText(elementId, kind)
                  }
                  onGenerateBio={() => void handleGenerateBio()}
                  onGenerateSeo={() => void handleGenerateSeo()}
                  seoSuggestion={seoSuggestion}
                  onApplySeoSuggestion={handleApplySeoSuggestion}
                  onDismissSeoSuggestion={() => setSeoSuggestion(null)}
                  onGenerateStory={(blockId) => void handleGenerateStory(blockId)}
                  storySuggestion={storySuggestion}
                  onApplyStorySuggestion={handleApplyStorySuggestion}
                  onDismissStorySuggestion={() => setStorySuggestion(null)}
                  aiPending={isAiPending}
                  portfolioData={portfolioData}
                  onUpdatePortfolioData={handleUpdatePortfolioData}
                  portfolioSlug={portfolioSlug}
                  onDeletePortfolio={handleDeletePortfolio}
                  onResetPortfolio={handleResetPortfolio}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* Drag Overlay: lightweight ghost preview while dragging */}
        <DragOverlay>
          {draggedType ? (
            <div className="flex items-center gap-2 rounded-lg border border-[#e8a34a] bg-[#160e0a] p-3 text-white shadow-2xl">
              {(() => {
                const Icon = BLOCK_ICONS[draggedType];
                return (
                  <div className="flex size-7 items-center justify-center rounded bg-[#e8a34a]/20 text-[#e8a34a]">
                    <Icon className="size-4" />
                  </div>
                );
              })()}
              <span className="font-sans text-xs font-semibold">
                {editorFr.blockNames[draggedType]}
              </span>
            </div>
          ) : draggedBlockId ? (
            <div className="flex items-center gap-2 rounded-lg border border-[#e8a34a] bg-black/90 px-4 py-2 font-mono text-xs font-semibold text-[#e8a34a] shadow-2xl">
              <span>⠿ DÉPLACEMENT DU BLOC</span>
            </div>
          ) : null}
        </DragOverlay>

        {/* Photo Picker Modal */}
        <PhotoPicker
          isOpen={photoPickerBlocId !== null}
          destinationBlockName={selectedBlock ? editorFr.blockNames[selectedBlock.type] : "Gallery"}
          photos={photographerPhotos}
          isLoadingPhotos={isLoadingPhotos}
          maxPhotos={12}
          currentCount={
            blocks.find((b) => b.idBloc === photoPickerBlocId)?.elements.length ?? 0
          }
          onRefreshPhotos={refreshPhotographerPhotos}
          onClose={() => setPhotoPickerBlocId(null)}
          onAddPhotos={handleAddPhotosToBlock}
        />
      </div>
      {isStatsInsightsOpen && portfolioId && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Conseils IA sur les statistiques"
            className="w-full max-w-3xl rounded-2xl border border-violet-300/20 bg-[#1a100b] p-5 text-[#f3ebdd] shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-violet-200 uppercase">
                  Gemini · Portfolio
                </p>
                <h2 className="mt-1 text-lg font-semibold">Conseils sur vos statistiques</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsStatsInsightsOpen(false)}
                aria-label="Fermer les conseils statistiques"
                className="rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/10 hover:text-white"
              >
                Fermer
              </button>
            </div>
            <PortfolioStatsInsights portfolioId={portfolioId} />
          </section>
        </div>
      )}
      {isQualityAuditOpen && (
        <PortfolioQualityAudit
          audit={qualityAudit}
          publicationBlockers={publicationBlockers}
          isLoading={isQualityAuditLoading}
          onClose={() => setIsQualityAuditOpen(false)}
          onAddBlock={(type) => {
            handleAddBlock(type);
          }}
          onFixBlock={handleFixPublicationBlocker}
          onFixCheck={handleFixAuditCheck}
        />
      )}
      {publishSummary && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="publication-summary-title"
            className="w-full max-w-lg rounded-2xl border border-[#e8a34a]/25 bg-[#1a100b] p-6 text-[#f3ebdd] shadow-2xl"
          >
            <h2 id="publication-summary-title" className="text-xl font-semibold">
              {editorFr.publicationSummaryTitle}
            </h2>
            <p className="mt-3 text-sm text-white/70">
              {publishSummary.visibility === "PUBLIC"
                ? editorFr.publicationSummaryPublic
                : editorFr.publicationSummaryPrivate}
            </p>
            {publishSummary.visibility === "PUBLIC" && (
              <a
                href={publishSummary.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block rounded-lg border border-white/10 bg-black/30 p-3 text-sm break-all text-[#e8a34a] underline underline-offset-4"
              >
                {publishSummary.url}
              </a>
            )}
            <p className="mt-4 text-sm text-white/60">
              {publishSummary.removedCount > 0
                ? `${publishSummary.removedCount} ${editorFr.removedPhotos}`
                : editorFr.noRemovedPhotos}
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                autoFocus
                onClick={() => setPublishSummary(null)}
                className="rounded-full bg-[#e8a34a] px-4 py-2 text-sm font-semibold text-[#0f0905] hover:bg-[#f0b25e]"
              >
                {editorFr.closePublicationSummary}
              </button>
            </div>
          </section>
        </div>
      )}
      <ConfirmDialog
        open={isUnpublishDialogOpen}
        onOpenChange={setIsUnpublishDialogOpen}
        title="Dépublier ce portfolio ?"
        description="Sa page ne sera plus accessible publiquement. Vous pourrez le publier à nouveau plus tard."
        confirmLabel="Dépublier"
        cancelLabel="Garder publié"
        tone="destructive"
        pending={isUnpublishing}
        onConfirm={() => void confirmUnpublish()}
      />
      <ConfirmDialog
        open={isDeletePortfolioDialogOpen}
        onOpenChange={setIsDeletePortfolioDialogOpen}
        title="Supprimer définitivement ce portfolio ?"
        description="Cette action supprimera le portfolio, sa version publiée et les données associées. Elle est irréversible."
        confirmLabel="Supprimer définitivement"
        cancelLabel="Annuler"
        tone="destructive"
        pending={isDeletingPortfolio}
        onConfirm={() => void confirmDeletePortfolio()}
      />
    </DndContext>
  );
}
