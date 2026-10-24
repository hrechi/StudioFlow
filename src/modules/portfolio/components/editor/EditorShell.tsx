"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { toast } from "sonner";
import { EditorTopBar, type ViewportMode } from "./EditorTopBar";
import { BlockPalette } from "./BlockPalette";
import { Canvas } from "./Canvas";
import { PropertiesPanel, type InspectorTab } from "./PropertiesPanel";
import { PhotoPicker } from "./PhotoPicker";
import { INITIAL_DEMO_BLOCKS } from "./demoData";
import { BLOCK_ICONS } from "./paletteData";
import type { BlocPortfolio, ElementBlocPortfolio, TypeBloc } from "../../portfolio.types";
import type { PortfolioEditorData } from "../../portfolio.service";
import {
  savePortfolio,
  mettreAJourPortfolio,
  publierPortfolio,
} from "../../portfolio.actions";
import { editorFr } from "./fr";
import "./editor.css";

const defaultBlockConfigs: Record<TypeBloc, Record<string, unknown>> = {
  HERO: {
    titre: "Aurélie & Marc",
    sousTitre: "A late-summer wedding at Château de la Rivière",
    texteBouton: "Enquire about your date →",
    lienBouton: "#contact",
    tagline: "BORDEAUX · MARIAGE · PORTRAIT",
    photoCouverture: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80",
    liensSociaux: [
      { reseau: "INSTAGRAM", url: "https://instagram.com" },
      { reseau: "SITE_WEB", url: "https://studioflow.app" },
    ],
  },
  A_PROPOS: {
    titre: "Aurélie Morales",
    texte: "Capturing delicate, candid memories in natural light for more than a decade. Based in south-west France, traveling worldwide for destinations that speak of love and grace.",
    anneesExperience: 11,
    photoPortrait: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
  },
  GALERIE: { titre: "MARIAGE", colonnes: 3, categorie: "MARIAGE", espacement: 10 },
  COLLECTION: { titre: "PORTRAIT SESSION", colonnes: 3, categorie: "PORTRAIT", espacement: 10 },
  CASE_STUDY: {
    titre: "Market morning, Saint-Michel",
    texte: "An early dawn session catching the vendors setting their stalls...",
    date: "14 Septembre",
    lieu: "Bordeaux, Saint-Michel",
    photo: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80",
  },
  AVANT_APRES: {
    titre: "Color grading & retouching",
    description: "Subtle film toning and shadow recovery preserving natural skin tones.",
    photoAvant: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1000&q=80",
    photoApres: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=80",
  },
  TEMOIGNAGES: {
    titre: "Words from couples & families",
    temoignages: [
      {
        id: "t1",
        auteur: "Claire & Julien",
        role: "Mariage en Dordogne",
        note: 5,
        texte: "Aurélie a su capturer l’essence même de notre journée...",
      },
    ],
  },
  SERVICES: {
    titre: "Collections & Investment",
    forfaits: [
      {
        nom: "Mariage Héritage",
        prixAPartirDe: 2400,
        duree: "Journée entière",
        description: "Présence des préparatifs jusqu'à la pièce montée...",
      },
    ],
  },
  STATISTIQUES: {
    stat1_valeur: "148",
    stat1_label: "Séances réalisées",
    stat2_valeur: "96",
    stat2_label: "Clients accompagnés",
    stat3_valeur: "4.9",
    stat3_label: "Note moyenne vérifiée",
  },
  VIDEO: {
    titre: "Summer Highlights Teaser",
    urlVideo: "https://vimeo.com/76979871",
    affiche: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1200&q=80",
  },
  CONTACT: {
    titre: "Let's connect",
    texteIntro: "Tell me about your date, your venue or your project...",
    typesSeance: ["Mariage", "Séance couple", "Portrait"],
  },
};

type EditorShellProps = {
  initialPortfolio?: PortfolioEditorData;
  portfolioSlug?: string;
  portfolioTitle?: string;
};

export function EditorShell({
  initialPortfolio,
  portfolioSlug = initialPortfolio?.slug || "aurelie-morales",
  portfolioTitle = initialPortfolio?.titre || "Aurélie Morales",
}: EditorShellProps) {
  const portfolioId = initialPortfolio?.id;

  // Core blocks state loaded from MongoDB
  const [blocks, setBlocks] = useState<BlocPortfolio[]>(
    initialPortfolio?.blocs && initialPortfolio.blocs.length > 0
      ? initialPortfolio.blocs
      : INITIAL_DEMO_BLOCKS
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(
    initialPortfolio?.blocs?.[0]?.idBloc ?? "000000000000000000000001"
  );

  // History stack for Undo / Redo
  const [history, setHistory] = useState<{
    past: BlocPortfolio[][];
    future: BlocPortfolio[][];
  }>({ past: [], future: [] });

  // Viewport & Saving status
  const [viewportMode, setViewportMode] = useState<ViewportMode>("desktop");
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(
    initialPortfolio?.statut !== "PUBLIE"
  );
  const [isPublished, setIsPublished] = useState(initialPortfolio?.statut === "PUBLIE");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Responsive drawers
  const [paletteDrawerOpen, setPaletteDrawerOpen] = useState(false);
  const [inspectorDrawerOpen, setInspectorDrawerOpen] = useState(false);

  // Inspector tab
  const [activeTab, setActiveTab] = useState<InspectorTab>("block");

  // Photo picker state
  const [photoPickerBlocId, setPhotoPickerBlocId] = useState<string | null>(null);

  // Drag and Drop state
  const [draggedType, setDraggedType] = useState<TypeBloc | null>(null);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [overTargetId, setOverTargetId] = useState<string | null>(null);

  // Portfolio page settings from MongoDB
  const [portfolioData, setPortfolioData] = useState({
    titre: initialPortfolio?.titre || portfolioTitle,
    slogan: initialPortfolio?.slogan || "Photographe de mariage & portraits intimes",
    ville: initialPortfolio?.ville || "Bordeaux",
    bio: initialPortfolio?.bio || "Capturing delicate, candid memories in natural light for more than a decade.",
    specialites: (initialPortfolio?.specialites as string[]) || ["Mariage", "Portrait"],
    theme: (initialPortfolio?.theme as string) || "Minimal",
    couleurAccent: initialPortfolio?.couleurAccent || "#e8a34a",
  });

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Auto-save blocks to MongoDB with debounce
  const applyBlocksChange = useCallback((nextBlocks: BlocPortfolio[]) => {
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
          }
        } catch (err) {
          console.error("Save portfolio exception:", err);
        }
      }
      setIsSaving(false);
    }, 1000);
  }, [blocks, portfolioId]);

  // Update Page Settings and persist to MongoDB
  const handleUpdatePortfolioData = async (field: string, val: unknown) => {
    setPortfolioData((prev) => {
      const updated = { ...prev, [field]: val };
      if (portfolioId) {
        void mettreAJourPortfolio(portfolioId, { [field]: val }).catch(console.error);
      }
      return updated;
    });
    setHasUnpublishedChanges(true);
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
        setActiveTab("page");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Block counts calculation for palette
  const blockUsageCounts = blocks.reduce((acc, b) => {
    acc[b.type] = (acc[b.type] || 0) + 1;
    return acc;
  }, {} as Partial<Record<TypeBloc, number>>);

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

    const newBlock: BlocPortfolio = {
      idBloc: newBlockId,
      type,
      ordre: insertAt,
      visible: true,
      miseEnPage: type === "HERO" ? "PLEIN_ECRAN" : "GRILLE",
      configuration: structuredClone(defaultBlockConfigs[type]),
      elements: [],
    };

    const nextBlocks = [
      ...blocks.slice(0, insertAt),
      newBlock,
      ...blocks.slice(insertAt),
    ].map((b, idx) => ({ ...b, ordre: idx }));

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
    const nextBlocks = blocks.map((b) =>
      b.idBloc === id ? { ...b, visible: !b.visible } : b
    );
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
    const nextBlocks = blocks.map((b) =>
      b.idBloc === id ? { ...b, ...update } : b
    );
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
      return {
        ...b,
        elements: b.elements.filter((el) => el.idElement !== elementId),
      };
    });
    applyBlocksChange(nextBlocks);
    toast.success("Photo retirée du bloc");
  };

  // Add photos from PhotoPicker
  const handleAddPhotosToBlock = (newElements: ElementBlocPortfolio[]) => {
    if (!photoPickerBlocId) return;
    const nextBlocks = blocks.map((b) => {
      if (b.idBloc !== photoPickerBlocId) return b;
      return {
        ...b,
        elements: [...b.elements, ...newElements],
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
      await savePortfolio({ portfolioId, blocs: blocks });
      const res = await publierPortfolio({ portfolioId });
      if (res.ok) {
        setIsPublished(true);
        setHasUnpublishedChanges(false);
        toast.success("Portfolio publié en direct !");
      } else {
        toast.error(res.error || "Erreur de publication.");
      }
    } catch {
      toast.error("Erreur serveur lors de la publication.");
    } finally {
      setIsSaving(false);
    }
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
          viewportMode={viewportMode}
          onViewportChange={setViewportMode}
          canUndo={history.past.length > 0}
          canRedo={history.future.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onPublish={handlePublish}
          onTogglePaletteDrawer={() => setPaletteDrawerOpen((prev) => !prev)}
          onToggleInspectorDrawer={() => setInspectorDrawerOpen((prev) => !prev)}
        />

        {/* Main Workspace (3 fixed internal scrolling columns) */}
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {/* Left: Block Palette (Desktop: fixed 236px / 210px) */}
          <div className="hidden h-full min-[1100px]:block">
            <BlockPalette
              totalBlocksCount={blocks.length}
              blockUsageCounts={blockUsageCounts}
              onAddBlock={(type) => handleAddBlock(type)}
            />
          </div>

          {/* Mobile/Tablet Drawer: Palette */}
          {paletteDrawerOpen && (
            <div className="fixed inset-0 z-40 flex min-[1100px]:hidden">
              <div
                className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
                onClick={() => setPaletteDrawerOpen(false)}
                aria-hidden="true"
              />
              <div className="relative z-50 h-full w-[260px] shadow-2xl animate-in slide-in-from-left duration-200">
                <BlockPalette
                  totalBlocksCount={blocks.length}
                  blockUsageCounts={blockUsageCounts}
                  onAddBlock={(type) => {
                    handleAddBlock(type);
                    setPaletteDrawerOpen(false);
                  }}
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
                  ? "unpublished changes"
                  : "published"
                : editorFr.neverPublished
            }
            viewportMode={viewportMode}
            onSelectBlock={handleSelectBlock}
            onMoveBlock={handleMoveBlock}
            onToggleVisibility={handleToggleVisibility}
            onDuplicateBlock={handleDuplicateBlock}
            onDeleteBlock={handleDeleteBlock}
            onOpenPhotoPicker={(id) => setPhotoPickerBlocId(id)}
            onDropAreaClick={() => handleAddBlock("GALERIE")}
          />

          {/* Right: Properties Inspector (Desktop: fixed 330px / 300px) */}
          <div className="hidden h-full min-[1100px]:block">
            <PropertiesPanel
              activeTab={activeTab}
              onTabChange={setActiveTab}
              selectedBlock={selectedBlock}
              onUpdateBlock={handleUpdateBlock}
              onUpdateConfiguration={handleUpdateConfiguration}
              onDuplicateBlock={handleDuplicateBlock}
              onDeleteBlock={handleDeleteBlock}
              onOpenPhotoPicker={(id) => setPhotoPickerBlocId(id)}
              onRemoveElement={handleRemoveElement}
              portfolioData={portfolioData}
              onUpdatePortfolioData={handleUpdatePortfolioData}
            />
          </div>

          {/* Mobile/Tablet Drawer: Inspector */}
          {inspectorDrawerOpen && (
            <div className="fixed inset-0 z-40 flex justify-end min-[1100px]:hidden">
              <div
                className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
                onClick={() => setInspectorDrawerOpen(false)}
                aria-hidden="true"
              />
              <div className="relative z-50 h-full w-[330px] shadow-2xl animate-in slide-in-from-right duration-200">
                <PropertiesPanel
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  selectedBlock={selectedBlock}
                  onUpdateBlock={handleUpdateBlock}
                  onUpdateConfiguration={handleUpdateConfiguration}
                  onDuplicateBlock={handleDuplicateBlock}
                  onDeleteBlock={handleDeleteBlock}
                  onOpenPhotoPicker={(id) => setPhotoPickerBlocId(id)}
                  onRemoveElement={handleRemoveElement}
                  portfolioData={portfolioData}
                  onUpdatePortfolioData={handleUpdatePortfolioData}
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
            <div className="flex items-center gap-2 rounded-lg border border-[#e8a34a] bg-black/90 px-4 py-2 text-xs font-mono font-semibold text-[#e8a34a] shadow-2xl">
              <span>⠿ DÉPLACEMENT DU BLOC</span>
            </div>
          ) : null}
        </DragOverlay>

        {/* Photo Picker Modal */}
        <PhotoPicker
          isOpen={photoPickerBlocId !== null}
          destinationBlockName={
            selectedBlock ? editorFr.blockNames[selectedBlock.type] : "Gallery"
          }
          onClose={() => setPhotoPickerBlocId(null)}
          onAddPhotos={handleAddPhotosToBlock}
        />
      </div>
    </DndContext>
  );
}
