"use client";

import { useState, useRef, type ChangeEvent } from "react";
import {
  Copy,
  ExternalLink,
  Images,
  RotateCcw,
  Trash2,
  X,
  Plus,
  Upload,
  Loader2,
  Sparkles,
  Check,
  Star,
  SlidersHorizontal,
} from "lucide-react";
import { SafeImage } from "@/components/shared/safe-image";
import { toast } from "sonner";
import {
  CATEGORIES_PORTFOLIO,
  categoriePortfolioLabels,
  SERVICES_PHOTOGRAPHIQUES,
  servicePhotographiqueLabels,
  STYLES_PHOTOGRAPHIQUES,
  stylePhotographiqueLabels,
  type BlocPortfolio,
  type MiseEnPage,
  type PlancheContactData,
} from "../../portfolio.types";
import { editorFr } from "./fr";
import { BLOCK_ICONS } from "./paletteData";
import { PlancheContactEditor } from "./PlancheContactEditor";
import { GALLERY_DISPLAY_MODES, resolveGalleryDisplayMode } from "../../lib/galleryDisplayModes";

export type InspectorTab = "block" | "page";

type PropertiesPanelProps = {
  activeTab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  selectedBlock: BlocPortfolio | null;
  onUpdateBlock: (id: string, update: Partial<BlocPortfolio>) => void;
  onUpdateConfiguration: (id: string, key: string, value: unknown) => void;
  onDuplicateBlock: (id: string) => void;
  onDeleteBlock: (id: string) => void;
  onOpenPhotoPicker?: (blocId: string) => void;
  onRemoveElement?: (blocId: string, elementId: string) => void;
  onGeneratePhotoText?: (elementId: string, kind: "caption" | "alt") => void;
  onGenerateBio?: () => void;
  onGenerateSeo?: () => void;
  seoSuggestion?: { metaTitre: string; metaDescription: string } | null;
  onApplySeoSuggestion?: () => void;
  onDismissSeoSuggestion?: () => void;
  onGenerateStory?: (blockId: string) => void;
  storySuggestion?: { blockId: string; titre: string; texte: string } | null;
  onApplyStorySuggestion?: () => void;
  onDismissStorySuggestion?: () => void;
  aiPending?: boolean;
  portfolioData?: {
    titre?: string;
    slogan?: string;
    ville?: string;
    region?: string;
    pays?: string;
    bio?: string;
    specialites?: string[];
    styles?: string[];
    services?: string[];
    disponible?: boolean;
    visibilite?: "PUBLIC" | "PRIVE";
    theme?: string;
    couleurAccent?: string;
    seo?: { metaTitre?: string; metaDescription?: string };
    plancheContact?: PlancheContactData;
  };
  onUpdatePortfolioData?: (field: string, value: unknown) => void;
  portfolioSlug?: string;
  onDeletePortfolio?: () => void;
  onResetPortfolio?: () => void;
  sidebarWidth?: number;
  onSidebarWidthChange?: (width: number) => void;
  onResetSidebarWidth?: () => void;
  className?: string;
};

export function PropertiesPanel({
  activeTab,
  onTabChange,
  selectedBlock,
  onUpdateBlock,
  onUpdateConfiguration,
  onDuplicateBlock,
  onDeleteBlock,
  onOpenPhotoPicker,
  onRemoveElement,
  onGeneratePhotoText,
  onGenerateBio,
  onGenerateSeo,
  seoSuggestion,
  onApplySeoSuggestion,
  onDismissSeoSuggestion,
  onGenerateStory,
  storySuggestion,
  onApplyStorySuggestion,
  onDismissStorySuggestion,
  aiPending = false,
  portfolioData = {
    titre: "",
    slogan: "",
    ville: "",
    region: "",
    pays: "",
    bio: "",
    specialites: [],
    styles: [],
    services: [],
    disponible: false,
    theme: "SOMBRE",
    couleurAccent: "#e0563b",
  },
  onUpdatePortfolioData,
  portfolioSlug = "portfolio",
  onDeletePortfolio,
  onResetPortfolio,
  sidebarWidth,
  onSidebarWidthChange,
  onResetSidebarWidth,
  className = "",
}: PropertiesPanelProps) {
  const conf = selectedBlock?.configuration || {};
  const blockType = selectedBlock?.type;
  const BlockIcon = blockType ? BLOCK_ICONS[blockType] : Images;
  const blockName = blockType ? editorFr.blockNames[blockType] : "";

  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingPortrait, setUploadingPortrait] = useState(false);
  const [uploadingComparisonImage, setUploadingComparisonImage] = useState<
    "photoAvant" | "photoApres" | null
  >(null);
  const [newSocialReseau, setNewSocialReseau] = useState<string>("INSTAGRAM");
  const [newSocialUrl, setNewSocialUrl] = useState<string>("");
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const portraitFileInputRef = useRef<HTMLInputElement | null>(null);
  const photoAvantInputRef = useRef<HTMLInputElement | null>(null);
  const photoApresInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFileUpload(
    file: File,
    onDone: (url: string) => void,
    setLoading: (b: boolean) => void,
    mediaType: "image" | "video" = "image",
  ) {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/portfolio/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.ok && json.data?.url) {
        onDone(json.data.url);
        toast.success(
          mediaType === "video" ? "Vidéo importée avec succès !" : "Image importée avec succès !",
        );
      } else {
        toast.error(
          json.message ||
            (mediaType === "video"
              ? "Échec de l'importation de la vidéo."
              : "Échec de l'importation de l'image."),
        );
      }
    } catch {
      toast.error(
        mediaType === "video"
          ? "Erreur lors de l'importation de la vidéo."
          : "Erreur lors de l'importation de l'image.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside
      aria-label="Panneau des propriétés"
      style={sidebarWidth ? { width: `${sidebarWidth}px` } : undefined}
      className={`flex h-full flex-col border-l border-white/[0.08] bg-[#1c1410] select-none ${
        sidebarWidth ? "" : "w-[330px] max-[1240px]:w-[300px]"
      } ${className}`}
    >
      {/* Sticky Tabs & Width Slide Control on Top */}
      <div className="sticky top-0 z-10 flex flex-col gap-2 border-b border-white/[0.08] bg-[#1c1410]/95 px-3 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div
            role="tablist"
            aria-label="Onglets d'inspection"
            className="grid flex-1 grid-cols-2 gap-1 rounded-[8px] bg-black/40 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "block"}
              onClick={() => onTabChange("block")}
              className={`rounded-[6px] py-1.5 font-sans text-xs font-medium transition-all ${
                activeTab === "block"
                  ? "border border-white/10 bg-white/15 text-white shadow-xs"
                  : "text-white/40 hover:text-white/75"
              }`}
            >
              {editorFr.block}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "page"}
              onClick={() => onTabChange("page")}
              className={`rounded-[6px] py-1.5 font-sans text-xs font-medium transition-all ${
                activeTab === "page"
                  ? "border border-white/10 bg-white/15 text-white shadow-xs"
                  : "text-white/40 hover:text-white/75"
              }`}
            >
              {editorFr.page}
            </button>
          </div>

          {onSidebarWidthChange && sidebarWidth !== undefined && (
            <div
              className="flex items-center gap-1.5 rounded-[8px] border border-white/10 bg-black/40 px-2 py-1"
              title="Faire glisser pour agrandir ou réduire le panneau latéral (Double-clic pour réinitialiser)"
              onDoubleClick={onResetSidebarWidth}
            >
              <SlidersHorizontal className="size-3 text-[#e8a34a]" aria-hidden="true" />
              <input
                type="range"
                min={300}
                max={680}
                step={10}
                value={sidebarWidth}
                onChange={(e) => onSidebarWidthChange(Number(e.target.value))}
                className="h-1.5 w-14 cursor-ew-resize accent-[#e8a34a]"
                aria-label="Largeur du panneau latéral"
              />
              <span className="font-mono text-[9px] text-white/60">
                {sidebarWidth}px
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Panel Scrollable Content */}
      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {activeTab === "block" && selectedBlock ? (
          /* TAB: BLOCK */
          <div className="space-y-5">
            {/* 1. Block Header */}
            <div className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-[6px] border border-[#e8a34a]/30 bg-[#e8a34a]/10 text-[#e8a34a]">
                <BlockIcon className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[9px] font-semibold tracking-[0.16em] text-[#e8a34a] uppercase">
                  {blockType}
                </div>
                <h3 className="truncate font-sans text-sm font-semibold text-[#f3ebdd]">
                  {blockName}
                </h3>
              </div>
            </div>

            {/* 2. Toggle: Visible on the page */}
            <div className="flex items-center justify-between rounded-[8px] border border-white/[0.06] bg-white/[0.02] p-2.5">
              <span className="font-sans text-xs text-[#f3ebdd]">{editorFr.visible}</span>
              <button
                type="button"
                role="switch"
                aria-checked={selectedBlock.visible}
                onClick={() =>
                  onUpdateBlock(selectedBlock.idBloc, { visible: !selectedBlock.visible })
                }
                className={`sf-switch-toggle relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border p-0.5 transition-colors ${
                  selectedBlock.visible
                    ? "border-[#e8a34a]/40 bg-[#e8a34a]"
                    : "border-white/20 bg-white/10"
                }`}
              >
                <span
                  className={`inline-block size-3.5 rounded-full transition-transform ${
                    selectedBlock.visible
                      ? "translate-x-4 bg-[#120b07]"
                      : "translate-x-0 bg-white/60"
                  }`}
                />
              </button>
            </div>

            {/* 3. Layout (Grid 2x2) — Hidden for Hero */}
            {selectedBlock.type !== "HERO" && (
              <div className="space-y-2">
                <div className="font-mono text-[9px] font-semibold tracking-[0.16em] text-[#6f655a] uppercase">
                  {editorFr.layout}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["GRILLE", "MASONRY", "CARROUSEL", "PLEIN_ECRAN"] as MiseEnPage[]).map(
                    (mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => onUpdateBlock(selectedBlock.idBloc, { miseEnPage: mode })}
                        className={`rounded-[6px] border px-3 py-2 text-left text-xs font-medium transition-all ${
                          selectedBlock.miseEnPage === mode
                            ? "border-[#e8a34a] bg-[#e8a34a]/15 text-[#e8a34a]"
                            : "border-white/[0.08] bg-white/[0.02] text-white/60 hover:bg-white/[0.05] hover:text-white"
                        }`}
                      >
                        {editorFr.layouts[mode]}
                      </button>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* 4. CONTENT FIELDS ADAPTED BY TYPE */}
            <div className="space-y-4 border-t border-white/[0.08] pt-4">
              <div className="font-mono text-[9px] font-semibold tracking-[0.16em] text-[#6f655a] uppercase">
                {editorFr.content}
              </div>

              {/* HERO */}
              {selectedBlock.type === "HERO" && (
                <div className="space-y-4">
                  <p className="text-[10px] leading-relaxed text-[#9a8f82]">
                    La vidéo d’arrière-plan est facultative. Sans vidéo, la photo de couverture du
                    portfolio est affichée.
                  </p>

                  <div className="space-y-2 rounded-[8px] border border-white/[0.06] bg-black/30 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-medium text-[#f3ebdd]">
                        Vidéo d’arrière-plan (facultative)
                      </label>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          disabled={uploadingVideo}
                          onClick={() => videoFileInputRef.current?.click()}
                          className="flex items-center gap-1 rounded-full border border-[#e8a34a]/30 bg-[#e8a34a]/10 px-2 py-1 font-sans text-[10px] font-semibold text-[#e8a34a] transition-colors hover:bg-[#e8a34a]/20 disabled:opacity-50"
                        >
                          {uploadingVideo ? (
                            <>
                              <Loader2 className="size-3 animate-spin" />
                              <span>Envoi…</span>
                            </>
                          ) : (
                            <>
                              <Upload className="size-3" />
                              <span>Importer</span>
                            </>
                          )}
                        </button>
                        {typeof conf.videoFond === "string" && conf.videoFond && (
                          <button
                            type="button"
                            aria-label="Retirer la vidéo du Hero"
                            onClick={() =>
                              onUpdateConfiguration(selectedBlock.idBloc, "videoFond", "")
                            }
                            className="flex size-7 items-center justify-center rounded-full border border-white/10 text-white/60 transition-colors hover:border-red-400/40 hover:text-red-300"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      ref={videoFileInputRef}
                      type="file"
                      accept="video/mp4,video/webm"
                      className="hidden"
                      onChange={(event: ChangeEvent<HTMLInputElement>) => {
                        const file = event.currentTarget.files?.[0];
                        event.currentTarget.value = "";
                        if (file) {
                          void handleFileUpload(
                            file,
                            (url) => onUpdateConfiguration(selectedBlock.idBloc, "videoFond", url),
                            setUploadingVideo,
                            "video",
                          );
                        }
                      }}
                    />
                    <input
                      type="text"
                      placeholder="URL HTTPS ou chemin /api/..."
                      value={(conf.videoFond as string) || ""}
                      onChange={(event) =>
                        onUpdateConfiguration(selectedBlock.idBloc, "videoFond", event.target.value)
                      }
                      className="w-full rounded-[6px] border border-white/[0.08] bg-black/40 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                    <p className="text-[10px] leading-relaxed text-[#9a8f82]">
                      Importez un fichier MP4 ou WebM (100 Mo maximum), ou indiquez une URL HTTPS.
                      La photo de couverture est utilisée si aucune vidéo n’est définie.
                    </p>
                    {typeof conf.videoFond === "string" && conf.videoFond && (
                      <video
                        controls
                        muted
                        playsInline
                        preload="metadata"
                        className="mt-2 aspect-video w-full rounded-md border border-white/10 bg-black object-cover"
                      >
                        <source src={conf.videoFond} />
                      </video>
                    )}
                  </div>

                  {/* Social Networks in Hero */}
                  <div className="space-y-3 rounded-[8px] border border-white/[0.06] bg-black/30 p-3">
                    <label className="block text-[11px] font-medium text-[#f3ebdd]">
                      Réseaux sociaux du portfolio
                    </label>

                    {/* Current list */}
                    {Array.isArray(conf.liensSociaux) && conf.liensSociaux.length > 0 ? (
                      <div className="space-y-1.5">
                        {(conf.liensSociaux as { reseau: string; url: string }[]).map(
                          (link, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-2 rounded border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-xs text-white/90"
                            >
                              <span className="font-mono text-[10px] text-[#e8a34a]">
                                {link.reseau}
                              </span>
                              <span className="flex-1 truncate text-[11px] text-white/60">
                                {link.url}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = (
                                    conf.liensSociaux as { reseau: string; url: string }[]
                                  ).filter((_, i) => i !== idx);
                                  onUpdateConfiguration(selectedBlock.idBloc, "liensSociaux", next);
                                }}
                                className="text-white/40 hover:text-red-400"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="text-[10px] text-[#9a8f82]">Aucun réseau social configuré.</p>
                    )}

                    {/* Add new social link */}
                    <div className="space-y-2 border-t border-white/[0.06] pt-2">
                      <div className="grid grid-cols-3 gap-1.5">
                        <select
                          value={newSocialReseau}
                          onChange={(e) => setNewSocialReseau(e.target.value)}
                          className="rounded-[6px] border border-white/[0.08] bg-[#160e0a] px-2 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                        >
                          <option value="INSTAGRAM">Instagram</option>
                          <option value="FACEBOOK">Facebook</option>
                          <option value="TIKTOK">TikTok</option>
                          <option value="YOUTUBE">YouTube</option>
                          <option value="SITE_WEB">Site Web</option>
                        </select>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={newSocialUrl}
                          onChange={(e) => setNewSocialUrl(e.target.value)}
                          className="col-span-2 rounded-[6px] border border-white/[0.08] bg-black/40 px-2 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!newSocialUrl.trim()) {
                            toast.error("Veuillez renseigner l'URL du réseau.");
                            return;
                          }
                          const current = Array.isArray(conf.liensSociaux) ? conf.liensSociaux : [];
                          const next = [
                            ...current,
                            { reseau: newSocialReseau, url: newSocialUrl.trim() },
                          ];
                          onUpdateConfiguration(selectedBlock.idBloc, "liensSociaux", next);
                          setNewSocialUrl("");
                          toast.success("Réseau social ajouté au portfolio !");
                        }}
                        className="flex w-full items-center justify-center gap-1.5 rounded-[6px] border border-white/10 bg-white/[0.04] py-1.5 font-sans text-xs font-medium text-white hover:border-[#e8a34a]/40 hover:bg-[#e8a34a]/10"
                      >
                        <Plus className="size-3 text-[#e8a34a]" />
                        <span>Ajouter le réseau</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* A_PROPOS */}
              {selectedBlock.type === "A_PROPOS" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] text-[#9a8f82]">Nom affiché</label>
                    <input
                      type="text"
                      value={(conf.titre as string) || ""}
                      onChange={(e) =>
                        onUpdateConfiguration(selectedBlock.idBloc, "titre", e.target.value)
                      }
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] text-[#9a8f82]">{editorFr.fields.texte}</label>
                      <span className="font-mono text-[9px] text-[#6f655a]">
                        {((conf.texte as string) || "").length} / 600
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      maxLength={600}
                      value={(conf.texte as string) || ""}
                      onChange={(e) =>
                        onUpdateConfiguration(selectedBlock.idBloc, "texte", e.target.value)
                      }
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 p-2 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#9a8f82]">
                      {editorFr.fields.anneesExperience}
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={Number(conf.anneesExperience ?? 0)}
                      onChange={(e) =>
                        onUpdateConfiguration(
                          selectedBlock.idBloc,
                          "anneesExperience",
                          Number(e.target.value),
                        )
                      }
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#9a8f82]">Citation (facultatif)</label>
                    <textarea
                      rows={2}
                      maxLength={500}
                      value={(conf.citation as string) || ""}
                      onChange={(e) =>
                        onUpdateConfiguration(selectedBlock.idBloc, "citation", e.target.value)
                      }
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 p-2 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                      placeholder="Une phrase qui résume votre approche."
                    />
                  </div>

                  <div className="space-y-3 rounded-[8px] border border-white/[0.06] bg-black/30 p-3">
                    <p className="font-mono text-[9px] font-semibold tracking-[0.16em] text-[#e8a34a] uppercase">
                      Fiche profil
                    </p>
                    {(
                      [
                        ["legendePortrait", "Légende de la photo"],
                        ["lieuBase", "Basée à"],
                        ["depuis", "Depuis"],
                        ["materiel", "Matériel"],
                        ["langues", "Langues"],
                        ["delaiReponse", "Délai de réponse"],
                        ["zoneDeplacement", "Zone de déplacement"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="block text-[11px] text-[#9a8f82]">
                        {label}
                        <input
                          type="text"
                          value={(conf[key] as string) || ""}
                          onChange={(event) =>
                            onUpdateConfiguration(selectedBlock.idBloc, key, event.target.value)
                          }
                          className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/40 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                        />
                      </label>
                    ))}
                    <p className="text-[10px] leading-relaxed text-[#9a8f82]">
                      Ces valeurs sont enregistrées avec le bloc et affichées dans la fiche de la
                      page publiée.
                    </p>
                  </div>

                  {/* Profile / Portrait: URL + Upload */}
                  <div className="space-y-2 rounded-[8px] border border-white/[0.06] bg-black/30 p-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-medium text-[#f3ebdd]">
                        Photo de profil / portrait
                      </label>
                      <button
                        type="button"
                        disabled={uploadingPortrait}
                        onClick={() => portraitFileInputRef.current?.click()}
                        className="flex items-center gap-1.5 rounded-full border border-[#e8a34a]/30 bg-[#e8a34a]/10 px-2.5 py-1 font-sans text-[10px] font-semibold text-[#e8a34a] transition-colors hover:bg-[#e8a34a]/20 disabled:opacity-50"
                      >
                        {uploadingPortrait ? (
                          <>
                            <Loader2 className="size-3 animate-spin" />
                            <span>Envoi…</span>
                          </>
                        ) : (
                          <>
                            <Upload className="size-3" />
                            <span>Uploader portrait</span>
                          </>
                        )}
                      </button>
                    </div>

                    <input
                      ref={portraitFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(
                            file,
                            (url) =>
                              onUpdateConfiguration(selectedBlock.idBloc, "photoPortrait", url),
                            setUploadingPortrait,
                          );
                        }
                      }}
                    />

                    <input
                      type="text"
                      placeholder="https://... ou chemin de l'image"
                      value={(conf.photoPortrait as string) || ""}
                      onChange={(e) =>
                        onUpdateConfiguration(selectedBlock.idBloc, "photoPortrait", e.target.value)
                      }
                      className="w-full rounded-[6px] border border-white/[0.08] bg-black/40 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />

                    <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#e8a34a]/90 font-medium">
                      <span>💡</span>
                      <span>Ajoute ta photo de profil pour être mieux visible dans l&apos;annuaire.</span>
                    </p>

                    {typeof conf.photoPortrait === "string" && conf.photoPortrait && (
                      <div className="relative mt-2 size-20 overflow-hidden rounded-xl border border-white/10">
                        <SafeImage
                          src={conf.photoPortrait}
                          alt="Aperçu portrait"
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <label className="flex items-center gap-2 rounded-[6px] border border-white/[0.08] bg-black/20 px-2.5 py-2 text-[11px] text-[#c8b9a7]">
                    <input
                      type="checkbox"
                      checked={portfolioData.disponible ?? false}
                      onChange={(event) =>
                        onUpdatePortfolioData?.("disponible", event.target.checked)
                      }
                      className="accent-[#e8a34a]"
                    />
                    Séances ouvertes aux réservations
                  </label>
                </div>
              )}

              {/* GALERIE & COLLECTION */}
              {(selectedBlock.type === "GALERIE" || selectedBlock.type === "COLLECTION") && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-[#9a8f82]">
                      {editorFr.fields.titre} (Heading)
                    </label>
                    <input
                      type="text"
                      placeholder={(conf.categorie as string) || "MARIAGE"}
                      value={(conf.titre as string) || ""}
                      onChange={(e) =>
                        onUpdateConfiguration(selectedBlock.idBloc, "titre", e.target.value)
                      }
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="portfolio-gallery-display-mode"
                      className="text-[11px] text-[#9a8f82]"
                    >
                      {editorFr.fields.modeAffichage}
                    </label>
                    <select
                      id="portfolio-gallery-display-mode"
                      value={resolveGalleryDisplayMode(conf.modeAffichage)}
                      onChange={(event) =>
                        onUpdateConfiguration(
                          selectedBlock.idBloc,
                          "modeAffichage",
                          event.target.value,
                        )
                      }
                      className="w-full rounded-[6px] border border-white/[0.08] bg-[#140d08] px-2.5 py-2 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    >
                      {GALLERY_DISPLAY_MODES.map((mode) => (
                        <option key={mode} value={mode}>
                          {editorFr.galleryModes[mode]}
                        </option>
                      ))}
                    </select>
                    <p className="rounded-lg border border-[#e8a34a]/20 bg-[#e8a34a]/5 p-3 text-[10px] leading-relaxed text-white/65">
                      {editorFr.galleryModeDescriptions[
                        resolveGalleryDisplayMode(conf.modeAffichage)
                      ]} Toutes les photos sélectionnées sont publiées progressivement au défilement.
                    </p>
                  </div>
                  {(
                    [
                      ["sousTitre", "Sous-titre"],
                      ["lieu", "Lieu"],
                      ["date", "Date ou période"],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="block text-[11px] text-[#c8b9a7]">
                      {label}
                      <input
                        type="text"
                        value={(conf[key] as string) || ""}
                        onChange={(event) =>
                          onUpdateConfiguration(selectedBlock.idBloc, key, event.target.value)
                        }
                        className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd]"
                      />
                    </label>
                  ))}
                  <div>
                    <label className="text-[11px] text-[#9a8f82]">
                      {editorFr.fields.categorie}
                    </label>
                    <select
                      value={(conf.categorie as string) || "MARIAGE"}
                      onChange={(e) =>
                        onUpdateConfiguration(selectedBlock.idBloc, "categorie", e.target.value)
                      }
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-[#140d08] px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    >
                      {CATEGORIES_PORTFOLIO.map((category) => (
                        <option key={category} value={category}>
                          {categoriePortfolioLabels[category]}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Raccourci vers Planche Contact 35mm */}
                  <div className="space-y-2 rounded-[8px] border border-[#e8a34a]/25 bg-[#e8a34a]/5 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-semibold text-[#e8a34a] uppercase">
                        ● Planche contact 35mm
                      </span>
                      <span className="font-mono text-[9px] text-[#e8a34a]/80">Vidéo animée</span>
                    </div>
                    <p className="text-[10px] text-white/60">
                      Générez automatiquement la pellicule Kodak Tri-X 400 interactive avec lecture
                      au survol à partir d&apos;une vidéo.
                    </p>
                    <button
                      type="button"
                      onClick={() => onTabChange("page")}
                      className="w-full rounded-[6px] border border-[#e8a34a]/30 bg-[#e8a34a]/15 py-1.5 font-sans text-xs font-medium text-[#e8a34a] transition-colors hover:bg-[#e8a34a]/25"
                    >
                      Configurer la pellicule vidéo →
                    </button>
                  </div>
                </div>
              )}

              {/* CASE_STUDY */}
              {selectedBlock.type === "CASE_STUDY" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-[#9a8f82]">{editorFr.fields.titre}</label>
                    <input
                      type="text"
                      value={(conf.titre as string) || ""}
                      onChange={(e) =>
                        onUpdateConfiguration(selectedBlock.idBloc, "titre", e.target.value)
                      }
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-[#9a8f82]">{editorFr.fields.date}</label>
                      <input
                        type="text"
                        value={(conf.date as string) || ""}
                        onChange={(e) =>
                          onUpdateConfiguration(selectedBlock.idBloc, "date", e.target.value)
                        }
                        className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#9a8f82]">{editorFr.fields.lieu}</label>
                      <input
                        type="text"
                        value={(conf.lieu as string) || ""}
                        onChange={(e) =>
                          onUpdateConfiguration(selectedBlock.idBloc, "lieu", e.target.value)
                        }
                        className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-[#9a8f82]">Récit / Narrative</label>
                    <textarea
                      rows={3}
                      value={(conf.texte as string) || ""}
                      onChange={(e) =>
                        onUpdateConfiguration(selectedBlock.idBloc, "texte", e.target.value)
                      }
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 p-2 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>
                  {onGenerateStory && (
                    <button
                      type="button"
                      disabled={aiPending}
                      onClick={() => onGenerateStory(selectedBlock.idBloc)}
                      className="flex w-full items-center justify-center gap-2 rounded-md border border-violet-400/25 bg-violet-400/[0.08] px-3 py-2 text-xs font-semibold text-violet-100 hover:bg-violet-400/[0.14] disabled:opacity-50"
                    >
                      <Sparkles className="size-3.5" aria-hidden="true" />
                      Suggérer un récit avec l’IA
                    </button>
                  )}
                  {storySuggestion?.blockId === selectedBlock.idBloc && (
                    <div className="space-y-2 rounded-md border border-violet-400/20 bg-violet-400/[0.05] p-3 text-xs">
                      <p className="font-semibold text-violet-100">
                        Suggestion IA — vérifie les faits
                      </p>
                      <p className="font-medium">{storySuggestion.titre}</p>
                      <p className="whitespace-pre-wrap text-white/60">{storySuggestion.texte}</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={onApplyStorySuggestion}
                          className="flex items-center gap-1 rounded bg-violet-300/15 px-2.5 py-1.5 font-semibold text-violet-100 hover:bg-violet-300/25"
                        >
                          <Check className="size-3" aria-hidden="true" /> Appliquer
                        </button>
                        <button
                          type="button"
                          onClick={onDismissStorySuggestion}
                          className="rounded px-2.5 py-1.5 text-white/55 hover:bg-white/5 hover:text-white"
                        >
                          Ignorer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AVANT_APRES */}
              {selectedBlock.type === "AVANT_APRES" && (
                <div className="space-y-3">
                  <p className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-[10px] leading-relaxed text-[#e2c29a]">
                    Pour une comparaison crédible, utilisez la même photo avant et après retouche.
                    Les deux vues sont cadrées au même ratio.
                  </p>
                  <div>
                    <label className="text-[11px] text-[#9a8f82]">{editorFr.fields.titre}</label>
                    <input
                      type="text"
                      value={(conf.titre as string) || ""}
                      onChange={(e) =>
                        onUpdateConfiguration(selectedBlock.idBloc, "titre", e.target.value)
                      }
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#9a8f82]">Description</label>
                    <input
                      type="text"
                      value={(conf.description as string) || ""}
                      onChange={(e) =>
                        onUpdateConfiguration(selectedBlock.idBloc, "description", e.target.value)
                      }
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>
                  {(
                    [
                      ["photoAvant", "Avant", photoAvantInputRef],
                      ["photoApres", "Après", photoApresInputRef],
                    ] as const
                  ).map(([key, label, inputRef]) => {
                    const imageUrl = typeof conf[key] === "string" ? (conf[key] as string) : "";
                    return (
                      <div
                        key={key}
                        className="space-y-2 rounded-lg border border-white/[0.08] bg-black/10 p-2.5"
                      >
                        <span className="block text-[11px] font-medium text-[#c8b9a7]">
                          Photo {label}
                        </span>
                        {imageUrl ? (
                          <div className="relative aspect-[4/3] overflow-hidden rounded-md">
                            <SafeImage
                              src={imageUrl}
                              alt={`Photo ${label.toLowerCase()}`}
                              fill
                              unoptimized
                              sizes="280px"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <p className="text-[11px] text-[#9a8f82]">
                            Importez la photo {label.toLowerCase()}.
                          </p>
                        )}
                        <input
                          ref={inputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            if (file) {
                              void handleFileUpload(
                                file,
                                (url) => onUpdateConfiguration(selectedBlock.idBloc, key, url),
                                (loading) => setUploadingComparisonImage(loading ? key : null),
                              );
                            }
                            event.currentTarget.value = "";
                          }}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={uploadingComparisonImage !== null}
                            onClick={() => inputRef.current?.click()}
                            className="flex items-center gap-1.5 rounded-md border border-[#e8a34a]/30 bg-[#e8a34a]/10 px-2.5 py-1.5 text-[11px] font-medium text-[#e8a34a] transition-colors hover:bg-[#e8a34a]/20 disabled:opacity-50"
                          >
                            {uploadingComparisonImage === key ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Upload className="size-3" />
                            )}
                            {imageUrl ? "Remplacer l’image" : "Importer une image"}
                          </button>
                          {imageUrl && (
                            <button
                              type="button"
                              disabled={uploadingComparisonImage !== null}
                              onClick={() => onUpdateConfiguration(selectedBlock.idBloc, key, "")}
                              className="text-[11px] text-[#9a8f82] hover:text-white disabled:opacity-50"
                            >
                              Retirer
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TEMOIGNAGES */}
              {selectedBlock.type === "TEMOIGNAGES" && (
                <TestimonialsPanel
                  blocId={selectedBlock.idBloc}
                  conf={conf}
                  onUpdateConfiguration={onUpdateConfiguration}
                />
              )}

              {/* SERVICES */}
              {selectedBlock.type === "SERVICES" && (
                <ServicesPanel
                  blocId={selectedBlock.idBloc}
                  conf={conf}
                  onUpdateConfiguration={onUpdateConfiguration}
                />
              )}

              {selectedBlock.type === "PROCESSUS" && (
                <div className="space-y-3">
                  <label className="block text-[11px] text-[#9a8f82]">
                    Titre
                    <input
                      value={(conf.titre as string) || ""}
                      onChange={(event) =>
                        onUpdateConfiguration(selectedBlock.idBloc, "titre", event.target.value)
                      }
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 text-xs text-[#f3ebdd]"
                    />
                  </label>
                  {Array.from({ length: 4 }, (_, index) => {
                    const steps = Array.isArray(conf.etapes)
                      ? (conf.etapes as { titre: string; description: string }[])
                      : [];
                    const step = steps[index] ?? { titre: "", description: "" };
                    const updateStep = (key: "titre" | "description", value: string) => {
                      const next = Array.from({ length: 4 }, (_, stepIndex) => ({
                        titre: steps[stepIndex]?.titre ?? "",
                        description: steps[stepIndex]?.description ?? "",
                      }));
                      next[index] = { ...next[index], [key]: value };
                      onUpdateConfiguration(selectedBlock.idBloc, "etapes", next);
                    };
                    return (
                      <fieldset key={index} className="space-y-2 rounded-lg border border-white/10 p-2.5">
                        <legend className="px-1 text-[10px] text-[#e8a34a]">Étape {index + 1}</legend>
                        <input
                          aria-label={`Titre étape ${index + 1}`}
                          placeholder="Titre"
                          value={step.titre}
                          onChange={(event) => updateStep("titre", event.target.value)}
                          className="w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-[#f3ebdd]"
                        />
                        <textarea
                          aria-label={`Description étape ${index + 1}`}
                          placeholder="Décrivez cette étape"
                          value={step.description}
                          onChange={(event) => updateStep("description", event.target.value)}
                          className="w-full rounded border border-white/10 bg-black/30 p-2 text-xs text-[#f3ebdd]"
                        />
                      </fieldset>
                    );
                  })}
                </div>
              )}

              {selectedBlock.type === "FAQ" && (
                <div className="space-y-3">
                  <label className="block text-[11px] text-[#9a8f82]">
                    Titre
                    <input
                      value={(conf.titre as string) || ""}
                      onChange={(event) =>
                        onUpdateConfiguration(selectedBlock.idBloc, "titre", event.target.value)
                      }
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 text-xs text-[#f3ebdd]"
                    />
                  </label>
                  {Array.from({ length: 6 }, (_, index) => {
                    const questions = Array.isArray(conf.questions)
                      ? (conf.questions as { question: string; reponse: string }[])
                      : [];
                    const item = questions[index] ?? { question: "", reponse: "" };
                    const updateQuestion = (key: "question" | "reponse", value: string) => {
                      const next = Array.from({ length: 6 }, (_, itemIndex) => ({
                        question: questions[itemIndex]?.question ?? "",
                        reponse: questions[itemIndex]?.reponse ?? "",
                      }));
                      next[index] = { ...next[index], [key]: value };
                      onUpdateConfiguration(selectedBlock.idBloc, "questions", next);
                    };
                    return (
                      <fieldset key={index} className="space-y-2 rounded-lg border border-white/10 p-2.5">
                        <legend className="px-1 text-[10px] text-[#e8a34a]">Question {index + 1}</legend>
                        <input
                          aria-label={`Question FAQ ${index + 1}`}
                          placeholder="Question"
                          value={item.question}
                          onChange={(event) => updateQuestion("question", event.target.value)}
                          className="w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-[#f3ebdd]"
                        />
                        <textarea
                          aria-label={`Réponse FAQ ${index + 1}`}
                          placeholder="Réponse"
                          value={item.reponse}
                          onChange={(event) => updateQuestion("reponse", event.target.value)}
                          className="w-full rounded border border-white/10 bg-black/30 p-2 text-xs text-[#f3ebdd]"
                        />
                      </fieldset>
                    );
                  })}
                </div>
              )}

              {/* STATISTIQUES */}
              {selectedBlock.type === "STATISTIQUES" && (
                <div className="space-y-3">
                  {(["1", "2", "3"] as const).map((n) => (
                    <div key={n} className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-[#9a8f82]">Stat {n} — Valeur</label>
                        <input
                          type="text"
                          value={(conf[`stat${n}_valeur`] as string) || ""}
                          onChange={(e) =>
                            onUpdateConfiguration(
                              selectedBlock.idBloc,
                              `stat${n}_valeur`,
                              e.target.value,
                            )
                          }
                          className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-[#9a8f82]">Stat {n} — Label</label>
                        <input
                          type="text"
                          value={(conf[`stat${n}_label`] as string) || ""}
                          onChange={(e) =>
                            onUpdateConfiguration(
                              selectedBlock.idBloc,
                              `stat${n}_label`,
                              e.target.value,
                            )
                          }
                          className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* CONTACT */}
              {selectedBlock.type === "CONTACT" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-[#9a8f82]">{editorFr.fields.titre}</label>
                    <input
                      type="text"
                      value={(conf.titre as string) || ""}
                      onChange={(e) =>
                        onUpdateConfiguration(selectedBlock.idBloc, "titre", e.target.value)
                      }
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#9a8f82]">
                      {editorFr.fields.texteIntro}
                    </label>
                    <textarea
                      rows={3}
                      value={(conf.texteIntro as string) || ""}
                      onChange={(e) =>
                        onUpdateConfiguration(selectedBlock.idBloc, "texteIntro", e.target.value)
                      }
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 p-2 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>
                  <fieldset className="space-y-2 rounded-[8px] border border-white/[0.06] bg-black/30 p-3">
                    <legend className="px-1 text-[11px] font-medium text-[#f3ebdd]">
                      Types de séance proposés
                    </legend>
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORIES_PORTFOLIO.map((category) => {
                        const selectedCategories = Array.isArray(conf.typesSeanceProposes)
                          ? (conf.typesSeanceProposes as string[])
                          : [];
                        const checked = selectedCategories.includes(category);
                        return (
                          <label
                            key={category}
                            className="flex items-center gap-2 text-[11px] text-[#c8b9a7]"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                onUpdateConfiguration(
                                  selectedBlock.idBloc,
                                  "typesSeanceProposes",
                                  checked
                                    ? selectedCategories.filter((item) => item !== category)
                                    : [...selectedCategories, category],
                                )
                              }
                              className="accent-[#e8a34a]"
                            />
                            {categoriePortfolioLabels[category]}
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-[10px] leading-relaxed text-[#9a8f82]">
                      Si aucun type n’est sélectionné, le formulaire reprend les spécialités du
                      portfolio.
                    </p>
                  </fieldset>
                </div>
              )}
            </div>

            {/* 5. PHOTOGRAPHS LIST (IF APPLICABLE) */}
            {(selectedBlock.type === "GALERIE" ||
              selectedBlock.type === "COLLECTION" ||
              selectedBlock.type === "CASE_STUDY" ||
              selectedBlock.type === "AVANT_APRES") && (
              <div className="space-y-3 border-t border-white/[0.08] pt-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] font-semibold tracking-[0.16em] text-[#6f655a] uppercase">
                    {editorFr.photos} ({selectedBlock.elements?.length || 0}/12)
                  </span>
                  <button
                    type="button"
                    disabled={(selectedBlock.elements?.length || 0) >= 12}
                    onClick={() => onOpenPhotoPicker?.(selectedBlock.idBloc)}
                    className="flex items-center gap-1 rounded-full border border-[#e8a34a]/30 bg-[#e8a34a]/10 px-2.5 py-0.5 font-sans text-[11px] font-medium text-[#e8a34a] transition-colors hover:bg-[#e8a34a]/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="size-3" />
                    <span>{editorFr.addPhotos}</span>
                  </button>
                </div>

                {(selectedBlock.elements?.length || 0) >= 12 && (
                  <p className="rounded-md border border-[#e8a34a]/20 bg-[#e8a34a]/5 px-2.5 py-1.5 font-sans text-[11px] text-[#e8a34a]">
                    Limite maximale de 12 photos atteinte pour cette galerie.
                  </p>
                )}

                {selectedBlock.elements?.length === 0 ? (
                  <p className="text-xs text-[#9a8f82]">{editorFr.noPhotos}</p>
                ) : (
                  <div className="space-y-2">
                    {selectedBlock.elements?.map((elem) => (
                      <div
                        key={elem.idElement}
                        className="group flex items-center gap-2.5 rounded-[6px] border border-white/[0.06] bg-white/[0.02] p-2"
                      >
                        <div className="relative size-10 shrink-0 overflow-hidden rounded">
                          <SafeImage
                            src={elem.media.urlMiniature || elem.media.url}
                            alt=""
                            fill
                            unoptimized
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <input
                            aria-label="Titre de la photo (facultatif)"
                            placeholder="Titre facultatif"
                            value={elem.titre || ""}
                            maxLength={160}
                            onChange={(event) =>
                              onUpdateBlock(selectedBlock.idBloc, {
                                elements: selectedBlock.elements.map((element) =>
                                  element.idElement === elem.idElement
                                    ? { ...element, titre: event.target.value }
                                    : element,
                                ),
                              })
                            }
                            className="w-full truncate rounded border border-white/10 bg-black/30 px-2 py-1 text-xs text-white/90 placeholder:text-white/50"
                          />
                          <span
                            className={`py-0.2 inline-block rounded-full px-1.5 font-mono text-[8px] uppercase ${
                              elem.statutConsentement === "ACCORDE"
                                ? "bg-emerald-500/15 text-emerald-400"
                                : elem.statutConsentement === "EN_ATTENTE"
                                  ? "bg-amber-500/15 text-amber-400"
                                  : "bg-red-500/15 text-red-400"
                            }`}
                          >
                            {elem.statutConsentement === "ACCORDE"
                              ? "Accordé"
                              : elem.statutConsentement === "EN_ATTENTE"
                                ? "En attente"
                                : "Refusé"}
                          </span>
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          {(selectedBlock.type === "GALERIE" || selectedBlock.type === "COLLECTION") && (
                            <button
                              type="button"
                              aria-pressed={elem.estMisEnAvant}
                              disabled={!elem.estMisEnAvant && selectedBlock.elements.filter((element) => element.estMisEnAvant).length >= 8}
                              onClick={() =>
                                onUpdateBlock(selectedBlock.idBloc, {
                                  elements: selectedBlock.elements.map((element) =>
                                    element.idElement === elem.idElement
                                      ? { ...element, estMisEnAvant: !element.estMisEnAvant }
                                      : element,
                                  ),
                                })
                              }
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-1 text-[9px] ${elem.estMisEnAvant ? "text-[#e8a34a]" : "text-white/50"} disabled:opacity-30`}
                              title="Afficher dans la sélection Meilleures photos"
                            >
                              <Star className={`size-3 ${elem.estMisEnAvant ? "fill-current" : ""}`} />
                              À la une
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={aiPending || !onGeneratePhotoText}
                            onClick={() => onGeneratePhotoText?.(elem.idElement, "caption")}
                            className="rounded border border-violet-300/20 px-1.5 py-1 text-[9px] font-medium text-violet-100 hover:bg-violet-300/10 disabled:opacity-50"
                            title="Générer une légende avec Gemini"
                          >
                            ✨ Légende
                          </button>
                          <button
                            type="button"
                            disabled={aiPending || !onGeneratePhotoText}
                            onClick={() => onGeneratePhotoText?.(elem.idElement, "alt")}
                            className="rounded border border-violet-300/20 px-1.5 py-1 text-[9px] font-medium text-violet-100 hover:bg-violet-300/10 disabled:opacity-50"
                            title="Générer un texte alternatif avec Gemini"
                          >
                            ✨ Texte alt
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveElement?.(selectedBlock.idBloc, elem.idElement)}
                          aria-label="Retirer la photo"
                          className="flex size-6 shrink-0 items-center justify-center rounded text-white/30 hover:bg-red-950/40 hover:text-red-400"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 6. DANGER ACTIONS */}
            <div className="space-y-2 border-t border-white/[0.08] pt-4">
              <button
                type="button"
                onClick={() => onDuplicateBlock(selectedBlock.idBloc)}
                className="flex w-full items-center justify-center gap-2 rounded-[6px] border border-white/[0.08] bg-white/[0.02] py-2 text-xs font-medium text-[#f3ebdd] transition-colors hover:bg-white/[0.06]"
              >
                <Copy className="size-3.5 text-[#e8a34a]" aria-hidden="true" />
                <span>{editorFr.duplicate}</span>
              </button>
              <button
                type="button"
                onClick={() => onDeleteBlock(selectedBlock.idBloc)}
                className="flex w-full items-center justify-center gap-2 rounded-[6px] border border-[var(--sf-danger-border)] bg-[var(--sf-danger-bg)] py-2 text-xs font-medium text-[var(--sf-danger)] transition-colors hover:bg-red-950/80"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                <span>{editorFr.delete}</span>
              </button>
            </div>
          </div>
        ) : (
          /* TAB: PAGE (OR NO BLOCK SELECTED) */
          <div className="space-y-6">
            {/* Identity */}
            <div className="space-y-3">
              <div className="font-mono text-[9px] font-semibold tracking-[0.16em] text-[#6f655a] uppercase">
                {editorFr.pageSections.identity}
              </div>
              <div className="rounded-lg border border-[#e8a34a]/20 bg-[#e8a34a]/[0.06] p-2.5 text-xs">
                <p className="flex items-center gap-1.5 font-medium text-[#e8a34a]">
                  <span>💡</span>
                  <span>Photo de profil pour l&apos;annuaire</span>
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-white/60">
                  Ajoute ta photo de profil pour être mieux visible dans l&apos;annuaire des photographes (depuis la section <strong>À propos</strong>).
                </p>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] text-[#9a8f82]">{editorFr.labels.title}</label>
                  <input
                    type="text"
                    value={portfolioData.titre || ""}
                    onChange={(e) => onUpdatePortfolioData?.("titre", e.target.value)}
                    className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#9a8f82]">{editorFr.labels.slogan}</label>
                  <input
                    type="text"
                    value={portfolioData.slogan || ""}
                    onChange={(e) => onUpdatePortfolioData?.("slogan", e.target.value)}
                    className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#9a8f82]">{editorFr.labels.city}</label>
                  <input
                    type="text"
                    value={portfolioData.ville || ""}
                    onChange={(e) => onUpdatePortfolioData?.("ville", e.target.value)}
                    className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] text-[#9a8f82]">
                    Région
                    <input
                      type="text"
                      value={portfolioData.region || ""}
                      onChange={(event) => onUpdatePortfolioData?.("region", event.target.value)}
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </label>
                  <label className="text-[11px] text-[#9a8f82]">
                    Pays
                    <input
                      type="text"
                      value={portfolioData.pays || ""}
                      onChange={(event) => onUpdatePortfolioData?.("pays", event.target.value)}
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </label>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-[#9a8f82]">{editorFr.labels.bio}</label>
                    <span className="font-mono text-[9px] text-[#6f655a]">
                      {(portfolioData.bio || "").length} / 500
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={portfolioData.bio || ""}
                    onChange={(e) => onUpdatePortfolioData?.("bio", e.target.value)}
                    className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 p-2 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                  />
                  {onGenerateBio && (
                    <button
                      type="button"
                      disabled={aiPending}
                      onClick={onGenerateBio}
                      className="flex w-full items-center justify-center gap-2 rounded-md border border-violet-400/25 bg-violet-400/[0.08] px-3 py-2 text-xs font-semibold text-violet-100 hover:bg-violet-400/[0.14] disabled:opacity-50"
                    >
                      <Sparkles className="size-3.5" aria-hidden="true" />
                      Suggérer une biographie avec l’IA
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* SEO */}
            <div className="space-y-3 border-t border-white/[0.08] pt-4">
              <div className="font-mono text-[9px] font-semibold tracking-[0.16em] text-[#6f655a] uppercase">
                Référencement SEO
              </div>
              {onGenerateSeo && (
                <button
                  type="button"
                  disabled={aiPending}
                  onClick={onGenerateSeo}
                  className="flex w-full items-center justify-center gap-2 rounded-md border border-violet-400/25 bg-violet-400/[0.08] px-3 py-2 text-xs font-semibold text-violet-100 hover:bg-violet-400/[0.14] disabled:opacity-50"
                >
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  Suggérer les métadonnées SEO
                </button>
              )}
              {seoSuggestion && (
                <div className="space-y-2 rounded-md border border-violet-400/20 bg-violet-400/[0.05] p-3 text-xs">
                  <p className="font-semibold text-violet-100">
                    Suggestion Gemini — relis avant application
                  </p>
                  <p className="font-medium">{seoSuggestion.metaTitre}</p>
                  <p className="text-white/60">{seoSuggestion.metaDescription}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={onApplySeoSuggestion}
                      className="flex items-center gap-1 rounded bg-violet-300/15 px-2.5 py-1.5 font-semibold text-violet-100 hover:bg-violet-300/25"
                    >
                      <Check className="size-3" aria-hidden="true" /> Appliquer
                    </button>
                    <button
                      type="button"
                      onClick={onDismissSeoSuggestion}
                      className="rounded px-2.5 py-1.5 text-white/55 hover:bg-white/5 hover:text-white"
                    >
                      Ignorer
                    </button>
                  </div>
                </div>
              )}
              <label className="block text-[11px] text-[#9a8f82]">
                Titre SEO
                <input
                  value={portfolioData.seo?.metaTitre ?? ""}
                  maxLength={160}
                  onChange={(event) =>
                    onUpdatePortfolioData?.("seo", {
                      ...portfolioData.seo,
                      metaTitre: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                />
              </label>
              <label className="block text-[11px] text-[#9a8f82]">
                Description SEO
                <textarea
                  value={portfolioData.seo?.metaDescription ?? ""}
                  maxLength={320}
                  rows={3}
                  onChange={(event) =>
                    onUpdatePortfolioData?.("seo", {
                      ...portfolioData.seo,
                      metaDescription: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 p-2 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                />
              </label>
            </div>

            {/* Specialities */}
            <div className="space-y-2 border-t border-white/[0.08] pt-4">
              <div className="font-mono text-[9px] font-semibold tracking-[0.16em] text-[#6f655a] uppercase">
                {editorFr.pageSections.specialities}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES_PORTFOLIO.map((specialite) => {
                  const isSelected = portfolioData.specialites?.includes(specialite);
                  return (
                    <button
                      key={specialite}
                      type="button"
                      onClick={() => {
                        const current = portfolioData.specialites || [];
                        const next = current.includes(specialite)
                          ? current.filter((value) => value !== specialite)
                          : [...current, specialite];
                        onUpdatePortfolioData?.("specialites", next);
                      }}
                      className={`rounded-full px-2.5 py-1 font-sans text-xs transition-colors ${
                        isSelected
                          ? "border border-[#e8a34a]/40 bg-[#e8a34a]/15 text-[#e8a34a]"
                          : "border border-white/10 bg-white/[0.03] text-white/50 hover:text-white"
                      }`}
                    >
                      {categoriePortfolioLabels[specialite]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 border-t border-white/[0.08] pt-4">
              <div className="font-mono text-[9px] font-semibold tracking-[0.16em] text-[#6f655a] uppercase">
                Styles photographiques
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STYLES_PHOTOGRAPHIQUES.map((style) => {
                  const selected = portfolioData.styles?.includes(style);
                  return (
                    <button
                      key={style}
                      type="button"
                      onClick={() => {
                        const current = portfolioData.styles || [];
                        onUpdatePortfolioData?.(
                          "styles",
                          selected
                            ? current.filter((value) => value !== style)
                            : [...current, style],
                        );
                      }}
                      className={`rounded-full px-2.5 py-1 font-sans text-xs transition-colors ${
                        selected
                          ? "border border-[#e8a34a]/40 bg-[#e8a34a]/15 text-[#e8a34a]"
                          : "border border-white/10 bg-white/[0.03] text-white/50 hover:text-white"
                      }`}
                    >
                      {stylePhotographiqueLabels[style]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 border-t border-white/[0.08] pt-4">
              <div className="font-mono text-[9px] font-semibold tracking-[0.16em] text-[#6f655a] uppercase">
                Services proposés
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SERVICES_PHOTOGRAPHIQUES.map((service) => {
                  const selected = portfolioData.services?.includes(service);
                  return (
                    <button
                      key={service}
                      type="button"
                      onClick={() => {
                        const current = portfolioData.services || [];
                        onUpdatePortfolioData?.(
                          "services",
                          selected
                            ? current.filter((value) => value !== service)
                            : [...current, service],
                        );
                      }}
                      className={`rounded-full px-2.5 py-1 font-sans text-xs transition-colors ${
                        selected
                          ? "border border-[#e8a34a]/40 bg-[#e8a34a]/15 text-[#e8a34a]"
                          : "border border-white/10 bg-white/[0.03] text-white/50 hover:text-white"
                      }`}
                    >
                      {servicePhotographiqueLabels[service]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Theme */}
            <div className="space-y-2.5 border-t border-white/[0.08] pt-4">
              <div className="font-mono text-[9px] font-semibold tracking-[0.16em] text-[#6f655a] uppercase">
                {editorFr.pageSections.theme}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    ["MINIMAL", "Minimal"],
                    ["SOMBRE", "Dark"],
                    ["EDITORIAL", "Editorial"],
                    ["COLORE", "Colour"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onUpdatePortfolioData?.("theme", value)}
                    className={`rounded-[6px] border p-2 text-center text-xs font-medium transition-all ${
                      portfolioData.theme === value
                        ? "border-[#e8a34a] bg-[#e8a34a]/15 text-[#e8a34a]"
                        : "border-white/[0.08] bg-white/[0.02] text-white/60 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Accent colours */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {[
                  { name: "cramoisi labo (Chambre Noire)", color: "#e0563b" },
                  { name: "ambre", color: "#e8a34a" },
                  { name: "terracotta", color: "#d97746" },
                  { name: "olive", color: "#848e42" },
                  { name: "clay rose", color: "#c98f82" },
                  { name: "encre", color: "#2d3748" },
                ].map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => onUpdatePortfolioData?.("couleurAccent", c.color)}
                    className={`size-6 rounded-full border transition-transform hover:scale-110 ${
                      portfolioData.couleurAccent === c.color
                        ? "scale-110 border-white ring-2 ring-[#e0563b]/60"
                        : "border-white/20"
                    }`}
                    style={{ backgroundColor: c.color }}
                    title={c.name}
                  />
                ))}

                {/* Sélecteur de couleur personnalisée */}
                <label
                  className="flex size-6 cursor-pointer items-center justify-center rounded-full border border-dashed border-white/40 transition-transform hover:scale-110"
                  title="Choisir une couleur personnalisée"
                >
                  <input
                    type="color"
                    value={portfolioData.couleurAccent || "#e0563b"}
                    onChange={(e) => onUpdatePortfolioData?.("couleurAccent", e.target.value)}
                    className="sr-only"
                  />
                  <span className="font-mono text-[9px] text-white/70">+</span>
                </label>
              </div>
            </div>

            {/* Planche contact 35mm (Vidéo -> Pellicule) */}
            <div className="space-y-3 border-t border-white/[0.08] pt-4">
              <div className="flex items-center justify-between">
                <div className="font-mono text-[9px] font-semibold tracking-[0.16em] text-[#6f655a] uppercase">
                  Planche contact 35mm
                </div>
                <span className="font-mono text-[9px] text-[#e8a34a]">Animation vidéo</span>
              </div>
              <PlancheContactEditor
                plancheContact={portfolioData.plancheContact}
                accentColor={portfolioData.couleurAccent || "#e8a34a"}
                onChange={(nextData) => onUpdatePortfolioData?.("plancheContact", nextData)}
              />
            </div>

            {/* Publication details */}
            <div className="space-y-3 border-t border-white/[0.08] pt-4">
              <div className="font-mono text-[9px] font-semibold tracking-[0.16em] text-[#6f655a] uppercase">
                {editorFr.pageSections.publication}
              </div>
              <div className="space-y-2 rounded-[8px] border border-white/[0.06] bg-black/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-white/40">
                    {portfolioData.visibilite === "PRIVE" ? "APERÇU PRIVÉ" : "URL PUBLIQUE"}
                  </span>
                  <ExternalLink className="size-3 text-white/30" />
                </div>
                <div className="truncate font-mono text-[11px] text-[#e8a34a]">
                  studioflow.app/portfolio/{portfolioSlug || "portfolio"}
                </div>
              </div>
              <label className="block text-[11px] text-[#9a8f82]" htmlFor="portfolio-visibility">
                {editorFr.labels.visibility}
                <select
                  id="portfolio-visibility"
                  value={portfolioData.visibilite ?? "PUBLIC"}
                  onChange={(event) => onUpdatePortfolioData?.("visibilite", event.target.value)}
                  className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-2 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                >
                  <option value="PUBLIC">{editorFr.visibility.PUBLIC}</option>
                  <option value="PRIVE">{editorFr.visibility.PRIVE}</option>
                </select>
                <span className="mt-1 block text-[10px] leading-relaxed">
                  {portfolioData.visibilite === "PRIVE"
                    ? editorFr.privateVisibilityHelp
                    : editorFr.publicVisibilityHelp}
                </span>
              </label>
              <p className="text-[10px] leading-relaxed text-[#9a8f82]">
                Seule une version publiée et réglée sur Public est accessible sans connexion.
                L’aperçu du brouillon reste réservé au propriétaire connecté.
              </p>
            </div>

            {/* Danger Zone: Delete / Reset Portfolio */}
            <div className="space-y-3 border-t border-red-500/20 pt-4">
              <div className="font-mono text-[9px] font-semibold tracking-[0.16em] text-red-400 uppercase">
                Zone de danger
              </div>
              <div className="flex flex-col gap-2">
                {onResetPortfolio && (
                  <button
                    type="button"
                    onClick={onResetPortfolio}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] py-2 font-sans text-xs font-medium text-white/80 transition-colors hover:border-[#e8a34a] hover:text-[#e8a34a]"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Réinitialiser les blocs par défaut</span>
                  </button>
                )}
                {onDeletePortfolio && (
                  <button
                    type="button"
                    onClick={onDeletePortfolio}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-950/20 py-2 font-sans text-xs font-semibold text-red-400 transition-colors hover:bg-red-950/40 hover:text-red-300"
                  >
                    <Trash2 className="size-3.5" />
                    <span>Supprimer le portfolio (MongoDB)</span>
                  </button>
                )}
              </div>
              <p className="text-[10px] leading-relaxed text-white/40">
                La suppression effacera définitivement ce portfolio et ses données de la base de
                données.
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

// ─── Sub-panel: Témoignages ───────────────────────────────────────────────────
type Testimonial = { id: string; auteur: string; role: string; note: number; texte: string };

function TestimonialsPanel({
  blocId,
  conf,
  onUpdateConfiguration,
}: {
  blocId: string;
  conf: Record<string, unknown>;
  onUpdateConfiguration: (id: string, key: string, value: unknown) => void;
}) {
  const list: Testimonial[] = Array.isArray(conf.temoignages)
    ? (conf.temoignages as Testimonial[])
    : [];
  const [newAuteur, setNewAuteur] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newNote, setNewNote] = useState(5);
  const [newTexte, setNewTexte] = useState("");

  const save = (next: Testimonial[]) => onUpdateConfiguration(blocId, "temoignages", next);

  const add = () => {
    if (!newAuteur.trim() || !newTexte.trim()) return;
    save([
      ...list,
      {
        id: crypto.randomUUID().slice(0, 16),
        auteur: newAuteur.trim(),
        role: newRole.trim() || "Client",
        note: newNote,
        texte: newTexte.trim(),
      },
    ]);
    setNewAuteur("");
    setNewRole("");
    setNewNote(5);
    setNewTexte("");
  };

  return (
    <div className="space-y-4">
      {list.length === 0 ? (
        <p className="text-[10px] text-[#9a8f82]">Aucun témoignage. Ajoutez-en un ci-dessous.</p>
      ) : (
        <div className="space-y-2">
          {list.map((t, idx) => (
            <div
              key={t.id}
              className="space-y-1 rounded-[6px] border border-white/[0.06] bg-white/[0.02] p-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-white/90">{t.auteur}</span>
                <button
                  type="button"
                  onClick={() => save(list.filter((_, i) => i !== idx))}
                  className="text-white/30 hover:text-red-400"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <input
                type="text"
                aria-label="Nom de l’auteur"
                value={t.auteur}
                onChange={(event) =>
                  save(
                    list.map((item, itemIndex) =>
                      itemIndex === idx ? { ...item, auteur: event.target.value } : item,
                    ),
                  )
                }
                className="w-full rounded-[6px] border border-white/[0.08] bg-black/40 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd]"
              />
              <input
                type="text"
                aria-label="Contexte du témoignage"
                value={t.role}
                onChange={(event) =>
                  save(
                    list.map((item, itemIndex) =>
                      itemIndex === idx ? { ...item, role: event.target.value } : item,
                    ),
                  )
                }
                className="w-full rounded-[6px] border border-white/[0.08] bg-black/40 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd]"
              />
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((note) => (
                  <button
                    key={note}
                    type="button"
                    aria-label={`${note} étoile${note > 1 ? "s" : ""}`}
                    onClick={() =>
                      save(
                        list.map((item, itemIndex) =>
                          itemIndex === idx ? { ...item, note } : item,
                        ),
                      )
                    }
                    className={`text-sm ${note <= t.note ? "text-[#e8a34a]" : "text-white/20"}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                rows={3}
                aria-label="Texte du témoignage"
                value={t.texte}
                onChange={(event) =>
                  save(
                    list.map((item, itemIndex) =>
                      itemIndex === idx ? { ...item, texte: event.target.value } : item,
                    ),
                  )
                }
                className="w-full rounded-[6px] border border-white/[0.08] bg-black/40 p-2 font-sans text-xs text-[#f3ebdd]"
              />
            </div>
          ))}
        </div>
      )}

      {/* Add new testimonial */}
      <div className="space-y-2 rounded-[8px] border border-white/[0.08] bg-black/30 p-3">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-[#e8a34a] uppercase">
          Nouveau témoignage
        </p>
        <input
          type="text"
          placeholder="Nom du client"
          value={newAuteur}
          onChange={(e) => setNewAuteur(e.target.value)}
          className="w-full rounded-[6px] border border-white/[0.08] bg-black/40 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
        />
        <input
          type="text"
          placeholder="Rôle (ex: Couple marié)"
          value={newRole}
          onChange={(e) => setNewRole(e.target.value)}
          className="w-full rounded-[6px] border border-white/[0.08] bg-black/40 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
        />
        <div className="flex items-center gap-2">
          <label className="text-[10px] whitespace-nowrap text-[#9a8f82]">Note :</label>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNewNote(n)}
              className={`font-mono text-sm transition-colors ${n <= newNote ? "text-[#e8a34a]" : "text-white/20"}`}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          rows={3}
          placeholder="Texte du témoignage…"
          value={newTexte}
          onChange={(e) => setNewTexte(e.target.value)}
          className="w-full rounded-[6px] border border-white/[0.08] bg-black/40 p-2 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
        />
        <button
          type="button"
          onClick={add}
          disabled={!newAuteur.trim() || !newTexte.trim()}
          className="flex w-full items-center justify-center gap-1.5 rounded-[6px] border border-white/10 bg-white/[0.04] py-1.5 font-sans text-xs font-medium text-white hover:border-[#e8a34a]/40 hover:bg-[#e8a34a]/10 disabled:opacity-40"
        >
          <Plus className="size-3 text-[#e8a34a]" />
          Ajouter le témoignage
        </button>
      </div>
    </div>
  );
}

// ─── Sub-panel: Services / Forfaits ──────────────────────────────────────────
type ServicePackage = {
  id: string;
  nom: string;
  prixAPartirDe?: number;
  delai?: string;
  description: string;
  inclus?: string[];
};

function ServicesPanel({
  blocId,
  conf,
  onUpdateConfiguration,
}: {
  blocId: string;
  conf: Record<string, unknown>;
  onUpdateConfiguration: (id: string, key: string, value: unknown) => void;
}) {
  const list: ServicePackage[] = Array.isArray(conf.forfaits)
    ? (conf.forfaits as ServicePackage[])
    : [];
  const [newNom, setNewNom] = useState("");
  const [newPrix, setNewPrix] = useState(0);
  const [newDelai, setNewDelai] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newInclus, setNewInclus] = useState("");

  const save = (next: ServicePackage[]) => onUpdateConfiguration(blocId, "forfaits", next);
  const updatePackage = (index: number, patch: Partial<ServicePackage>) => {
    save(list.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const add = () => {
    if (!newNom.trim()) return;
    save([
      ...list,
      {
        id: crypto.randomUUID().slice(0, 16),
        nom: newNom.trim(),
        prixAPartirDe: newPrix,
        delai: newDelai.trim(),
        description: newDesc.trim(),
        inclus: newInclus
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      },
    ]);
    setNewNom("");
    setNewPrix(0);
    setNewDelai("");
    setNewDesc("");
    setNewInclus("");
  };

  return (
    <div className="space-y-4">
      {list.length === 0 ? (
        <p className="text-[10px] text-[#9a8f82]">Aucun forfait. Ajoutez-en un ci-dessous.</p>
      ) : (
        <div className="space-y-2">
          {list.map((pkg, idx) => (
            <div
              key={pkg.id}
              className="space-y-2 rounded-[6px] border border-white/[0.06] bg-white/[0.02] p-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-white/90">{pkg.nom}</span>
                <button
                  type="button"
                  onClick={() => save(list.filter((_, i) => i !== idx))}
                  className="text-white/30 hover:text-red-400"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <input
                type="text"
                aria-label="Nom de la formule"
                value={pkg.nom}
                onChange={(event) => updatePackage(idx, { nom: event.target.value })}
                className="w-full rounded-[6px] border border-white/[0.08] bg-black/40 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd]"
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[10px] text-[#9a8f82]">
                  Prix de départ (€)
                  <input
                    type="number"
                    min={0}
                    value={pkg.prixAPartirDe ?? ""}
                    onChange={(event) =>
                      updatePackage(idx, {
                        prixAPartirDe:
                          event.target.value === "" ? undefined : Number(event.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/40 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd]"
                  />
                </label>
                <label className="text-[10px] text-[#9a8f82]">
                  Délai
                  <input
                    type="text"
                    value={pkg.delai ?? ""}
                    onChange={(event) => updatePackage(idx, { delai: event.target.value })}
                    className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/40 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd]"
                  />
                </label>
              </div>
              <textarea
                rows={2}
                aria-label="Description de la formule"
                value={pkg.description}
                onChange={(event) => updatePackage(idx, { description: event.target.value })}
                className="w-full rounded-[6px] border border-white/[0.08] bg-black/40 p-2 font-sans text-xs text-[#f3ebdd]"
              />
              <textarea
                rows={3}
                aria-label="Éléments inclus, un par ligne"
                value={(pkg.inclus ?? []).join("\n")}
                onChange={(event) =>
                  updatePackage(idx, {
                    inclus: event.target.value
                      .split("\n")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="Éléments inclus, un par ligne"
                className="w-full rounded-[6px] border border-white/[0.08] bg-black/40 p-2 font-sans text-xs text-[#f3ebdd]"
              />
            </div>
          ))}
        </div>
      )}

      {/* Add new package */}
      <div className="space-y-2 rounded-[8px] border border-white/[0.08] bg-black/30 p-3">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-[#e8a34a] uppercase">
          Nouveau forfait
        </p>
        <input
          type="text"
          placeholder="Nom du forfait"
          value={newNom}
          onChange={(e) => setNewNom(e.target.value)}
          className="w-full rounded-[6px] border border-white/[0.08] bg-black/40 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-[#9a8f82]">Prix (€)</label>
            <input
              type="number"
              min={0}
              value={newPrix}
              onChange={(e) => setNewPrix(Number(e.target.value))}
              className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/40 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#9a8f82]">Délai</label>
            <input
              type="text"
              placeholder="Livraison sous 3 semaines"
              value={newDelai}
              onChange={(e) => setNewDelai(e.target.value)}
              className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/40 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
            />
          </div>
        </div>
        <textarea
          rows={2}
          placeholder="Description courte…"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          className="w-full rounded-[6px] border border-white/[0.08] bg-black/40 p-2 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
        />
        <textarea
          rows={3}
          placeholder="Éléments inclus, un par ligne"
          value={newInclus}
          onChange={(e) => setNewInclus(e.target.value)}
          className="w-full rounded-[6px] border border-white/[0.08] bg-black/40 p-2 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
        />
        <button
          type="button"
          onClick={add}
          disabled={!newNom.trim()}
          className="flex w-full items-center justify-center gap-1.5 rounded-[6px] border border-white/10 bg-white/[0.04] py-1.5 font-sans text-xs font-medium text-white hover:border-[#e8a34a]/40 hover:bg-[#e8a34a]/10 disabled:opacity-40"
        >
          <Plus className="size-3 text-[#e8a34a]" />
          Ajouter le forfait
        </button>
      </div>
    </div>
  );
}
