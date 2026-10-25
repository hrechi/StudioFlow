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
} from "lucide-react";
import { SafeImage } from "@/components/shared/safe-image";
import { toast } from "sonner";
import type { BlocPortfolio, MiseEnPage } from "../../portfolio.types";
import { editorFr } from "./fr";
import { BLOCK_ICONS } from "./paletteData";

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
    bio?: string;
    specialites?: string[];
    theme?: string;
    couleurAccent?: string;
    seo?: { metaTitre?: string; metaDescription?: string };
  };
  onUpdatePortfolioData?: (field: string, value: unknown) => void;
  portfolioSlug?: string;
  onDeletePortfolio?: () => void;
  onResetPortfolio?: () => void;
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
    titre: "Aurélie Morales",
    slogan: "Photographe de mariage & portraits intimes",
    ville: "Bordeaux",
    bio: "Capturing delicate, candid memories in natural light for more than a decade.",
    specialites: ["Mariage", "Portrait"],
    theme: "Minimal",
    couleurAccent: "#e8a34a",
  },
  onUpdatePortfolioData,
  portfolioSlug = "portfolio",
  onDeletePortfolio,
  onResetPortfolio,
  className = "",
}: PropertiesPanelProps) {
  const conf = selectedBlock?.configuration || {};
  const blockType = selectedBlock?.type;
  const BlockIcon = blockType ? BLOCK_ICONS[blockType] : Images;
  const blockName = blockType ? editorFr.blockNames[blockType] : "";

  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPortrait, setUploadingPortrait] = useState(false);
  const [newSocialReseau, setNewSocialReseau] = useState<string>("INSTAGRAM");
  const [newSocialUrl, setNewSocialUrl] = useState<string>("");
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const portraitFileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFileUpload(
    file: File,
    onDone: (url: string) => void,
    setLoading: (b: boolean) => void,
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
        toast.success("Image importée avec succès !");
      } else {
        toast.error(json.message || "Échec de l'importation de l'image.");
      }
    } catch {
      toast.error("Erreur lors de l'importation de l'image.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside
      aria-label="Panneau des propriétés"
      className={`flex h-full w-[330px] flex-col border-l border-white/[0.08] bg-[#1c1410] select-none max-[1240px]:w-[300px] ${className}`}
    >
      {/* Sticky Tabs on Top */}
      <div className="sticky top-0 z-10 flex border-b border-white/[0.08] bg-[#1c1410]/95 px-3 py-2.5 backdrop-blur-md">
        <div
          role="tablist"
          aria-label="Onglets d'inspection"
          className="grid w-full grid-cols-2 gap-1 rounded-[8px] bg-black/40 p-1"
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
                      {editorFr.fields.sousTitre}
                    </label>
                    <input
                      type="text"
                      value={(conf.sousTitre as string) || ""}
                      onChange={(e) =>
                        onUpdateConfiguration(selectedBlock.idBloc, "sousTitre", e.target.value)
                      }
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#9a8f82]">
                      {editorFr.fields.texteBouton}
                    </label>
                    <input
                      type="text"
                      value={(conf.texteBouton as string) || ""}
                      onChange={(e) =>
                        onUpdateConfiguration(selectedBlock.idBloc, "texteBouton", e.target.value)
                      }
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#9a8f82]">Tagline / Spécialités</label>
                    <input
                      type="text"
                      value={(conf.tagline as string) || ""}
                      onChange={(e) =>
                        onUpdateConfiguration(selectedBlock.idBloc, "tagline", e.target.value)
                      }
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>

                  {/* Cover Photo: URL + Upload */}
                  <div className="space-y-2 rounded-[8px] border border-white/[0.06] bg-black/30 p-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-medium text-[#f3ebdd]">
                        Photo de couverture (Cover photo)
                      </label>
                      <button
                        type="button"
                        disabled={uploadingCover}
                        onClick={() => coverFileInputRef.current?.click()}
                        className="flex items-center gap-1.5 rounded-full border border-[#e8a34a]/30 bg-[#e8a34a]/10 px-2.5 py-1 font-sans text-[10px] font-semibold text-[#e8a34a] transition-colors hover:bg-[#e8a34a]/20 disabled:opacity-50"
                      >
                        {uploadingCover ? (
                          <>
                            <Loader2 className="size-3 animate-spin" />
                            <span>Envoi…</span>
                          </>
                        ) : (
                          <>
                            <Upload className="size-3" />
                            <span>Uploader photo</span>
                          </>
                        )}
                      </button>
                    </div>

                    <input
                      ref={coverFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(
                            file,
                            (url) =>
                              onUpdateConfiguration(selectedBlock.idBloc, "photoCouverture", url),
                            setUploadingCover,
                          );
                        }
                      }}
                    />

                    <input
                      type="text"
                      placeholder="https://... ou chemin de l'image"
                      value={(conf.photoCouverture as string) || ""}
                      onChange={(e) =>
                        onUpdateConfiguration(
                          selectedBlock.idBloc,
                          "photoCouverture",
                          e.target.value,
                        )
                      }
                      className="w-full rounded-[6px] border border-white/[0.08] bg-black/40 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />

                    {typeof conf.photoCouverture === "string" && conf.photoCouverture && (
                      <div className="relative mt-2 aspect-[16/9] w-full overflow-hidden rounded-md border border-white/10">
                        <SafeImage
                          src={conf.photoCouverture}
                          alt="Aperçu couverture"
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>

                  {/* Social Networks in Hero */}
                  <div className="space-y-3 rounded-[8px] border border-white/[0.06] bg-black/30 p-3">
                    <label className="block text-[11px] font-medium text-[#f3ebdd]">
                      Réseaux sociaux (Social links)
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
                          toast.success("Réseau social ajouté au Hero !");
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
                  <div>
                    <label className="text-[11px] text-[#9a8f82]">{editorFr.fields.colonnes}</label>
                    <div className="mt-1 grid grid-cols-3 gap-1.5">
                      {[2, 3, 4].map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() =>
                            onUpdateConfiguration(selectedBlock.idBloc, "colonnes", col)
                          }
                          className={`rounded-[6px] border py-1.5 font-mono text-xs font-semibold ${
                            Number(conf.colonnes || 3) === col
                              ? "border-[#e8a34a] bg-[#e8a34a]/15 text-[#e8a34a]"
                              : "border-white/[0.08] bg-white/[0.02] text-white/60"
                          }`}
                        >
                          {col}
                        </button>
                      ))}
                    </div>
                  </div>
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
                      <option value="MARIAGE">Mariage</option>
                      <option value="PORTRAIT">Portrait</option>
                      <option value="PRODUIT">Produit</option>
                      <option value="EVENEMENT">Événement</option>
                    </select>
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
                  <div>
                    <label className="text-[11px] text-[#9a8f82]">Photo Avant (URL)</label>
                    <input
                      type="text"
                      value={(conf.photoAvant as string) || ""}
                      onChange={(e) =>
                        onUpdateConfiguration(selectedBlock.idBloc, "photoAvant", e.target.value)
                      }
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#9a8f82]">Photo Après (URL)</label>
                    <input
                      type="text"
                      value={(conf.photoApres as string) || ""}
                      onChange={(e) =>
                        onUpdateConfiguration(selectedBlock.idBloc, "photoApres", e.target.value)
                      }
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>
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

              {/* VIDEO */}
              {selectedBlock.type === "VIDEO" && (
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
                    <label className="text-[11px] text-[#9a8f82]">{editorFr.fields.urlVideo}</label>
                    <input
                      type="text"
                      value={(conf.urlVideo as string) || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        onUpdateConfiguration(selectedBlock.idBloc, "urlVideo", val);
                      }}
                      className={`mt-1 w-full rounded-[6px] border bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:outline-hidden ${
                        (conf.urlVideo as string)?.startsWith("https://")
                          ? "border-white/[0.08] focus:border-[#e8a34a]"
                          : "border-red-500/60 text-red-200"
                      }`}
                    />
                    {!(conf.urlVideo as string)?.startsWith("https://") && (
                      <p className="mt-1 text-[10px] text-red-400">
                        {"L'URL de la vidéo doit commencer par https://"}
                      </p>
                    )}
                  </div>
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
                    {editorFr.photos} ({selectedBlock.elements?.length || 0})
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenPhotoPicker?.(selectedBlock.idBloc)}
                    className="flex items-center gap-1 rounded-full border border-[#e8a34a]/30 bg-[#e8a34a]/10 px-2.5 py-0.5 font-sans text-[11px] font-medium text-[#e8a34a] transition-colors hover:bg-[#e8a34a]/20"
                  >
                    <Plus className="size-3" />
                    <span>{editorFr.addPhotos}</span>
                  </button>
                </div>

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
                          <p className="truncate text-xs font-medium text-white/90">
                            {elem.titre || "Photograph"}
                          </p>
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
                {(["Mariage", "Portrait", "Produit", "Événement"] as const).map((spec) => {
                  const isSelected = portfolioData.specialites?.includes(spec);
                  return (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => {
                        const current = portfolioData.specialites || [];
                        const next = current.includes(spec)
                          ? current.filter((s) => s !== spec)
                          : [...current, spec];
                        onUpdatePortfolioData?.("specialites", next);
                      }}
                      className={`rounded-full px-2.5 py-1 font-sans text-xs transition-colors ${
                        isSelected
                          ? "border border-[#e8a34a]/40 bg-[#e8a34a]/15 text-[#e8a34a]"
                          : "border border-white/10 bg-white/[0.03] text-white/50 hover:text-white"
                      }`}
                    >
                      {spec}
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
                {(["Minimal", "Dark", "Editorial", "Colour"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onUpdatePortfolioData?.("theme", t)}
                    className={`rounded-[6px] border p-2 text-center text-xs font-medium transition-all ${
                      portfolioData.theme === t
                        ? "border-[#e8a34a] bg-[#e8a34a]/15 text-[#e8a34a]"
                        : "border-white/[0.08] bg-white/[0.02] text-white/60 hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Accent colours */}
              <div className="flex items-center gap-2 pt-2">
                {[
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
                    className={`size-5 rounded-full border transition-transform hover:scale-110 ${
                      portfolioData.couleurAccent === c.color
                        ? "border-white ring-2 ring-[#e8a34a]/50"
                        : "border-white/20"
                    }`}
                    style={{ backgroundColor: c.color }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {/* Publication details */}
            <div className="space-y-3 border-t border-white/[0.08] pt-4">
              <div className="font-mono text-[9px] font-semibold tracking-[0.16em] text-[#6f655a] uppercase">
                {editorFr.pageSections.publication}
              </div>
              <div className="space-y-2 rounded-[8px] border border-white/[0.06] bg-black/40 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-white/40">URL PUBLIQUE</span>
                  <ExternalLink className="size-3 text-white/30" />
                </div>
                <div className="truncate font-mono text-[11px] text-[#e8a34a]">
                  studioflow.app/portfolio/{portfolioSlug || "portfolio"}
                </div>
              </div>
              <p className="text-[10px] leading-relaxed text-[#9a8f82]">
                La page publique ne lit que la version publiée. Les brouillons ne sont jamais
                visibles.
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
              <p className="text-[10px] text-[#9a8f82]">
                {t.role} · {"★".repeat(t.note)}
              </p>
              <p className="line-clamp-2 text-[11px] leading-relaxed text-white/70 italic">
                «&nbsp;{t.texte}&nbsp;»
              </p>
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
  prixAPartirDe: number;
  duree: string;
  description: string;
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
  const [newDuree, setNewDuree] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const save = (next: ServicePackage[]) => onUpdateConfiguration(blocId, "forfaits", next);

  const add = () => {
    if (!newNom.trim()) return;
    save([
      ...list,
      {
        id: crypto.randomUUID().slice(0, 16),
        nom: newNom.trim(),
        prixAPartirDe: newPrix,
        duree: newDuree.trim(),
        description: newDesc.trim(),
      },
    ]);
    setNewNom("");
    setNewPrix(0);
    setNewDuree("");
    setNewDesc("");
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
              className="space-y-0.5 rounded-[6px] border border-white/[0.06] bg-white/[0.02] p-2.5"
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
              <p className="font-mono text-[10px] text-[#e8a34a]">
                À partir de {pkg.prixAPartirDe} €{pkg.duree ? ` · ${pkg.duree}` : ""}
              </p>
              {pkg.description && (
                <p className="line-clamp-1 text-[10px] text-white/50">{pkg.description}</p>
              )}
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
            <label className="text-[10px] text-[#9a8f82]">Durée</label>
            <input
              type="text"
              placeholder="2h30"
              value={newDuree}
              onChange={(e) => setNewDuree(e.target.value)}
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
