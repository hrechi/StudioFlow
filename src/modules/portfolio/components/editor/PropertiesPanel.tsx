"use client";

import { useState, useRef, type ChangeEvent } from "react";
import {
  Copy,
  ExternalLink,
  Images,
  Trash2,
  X,
  Plus,
  Upload,
  Loader2,
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
  portfolioData?: {
    titre?: string;
    slogan?: string;
    ville?: string;
    bio?: string;
    specialites?: string[];
    theme?: string;
    couleurAccent?: string;
  };
  onUpdatePortfolioData?: (field: string, value: unknown) => void;
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
    setLoading: (b: boolean) => void
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
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
                onClick={() => onUpdateBlock(selectedBlock.idBloc, { visible: !selectedBlock.visible })}
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
                  {(["GRILLE", "MASONRY", "CARROUSEL", "PLEIN_ECRAN"] as MiseEnPage[]).map((mode) => (
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
                  ))}
                </div>
              </div>
            )}

            {/* 4. CONTENT FIELDS ADAPTED BY TYPE */}
            <div className="border-t border-white/[0.08] pt-4 space-y-4">
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
                      onChange={(e) => onUpdateConfiguration(selectedBlock.idBloc, "titre", e.target.value)}
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#9a8f82]">{editorFr.fields.sousTitre}</label>
                    <input
                      type="text"
                      value={(conf.sousTitre as string) || ""}
                      onChange={(e) => onUpdateConfiguration(selectedBlock.idBloc, "sousTitre", e.target.value)}
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#9a8f82]">{editorFr.fields.texteBouton}</label>
                    <input
                      type="text"
                      value={(conf.texteBouton as string) || ""}
                      onChange={(e) => onUpdateConfiguration(selectedBlock.idBloc, "texteBouton", e.target.value)}
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#9a8f82]">Tagline / Spécialités</label>
                    <input
                      type="text"
                      value={(conf.tagline as string) || ""}
                      onChange={(e) => onUpdateConfiguration(selectedBlock.idBloc, "tagline", e.target.value)}
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>

                  {/* Cover Photo: URL + Upload */}
                  <div className="rounded-[8px] border border-white/[0.06] bg-black/30 p-3 space-y-2">
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
                            (url) => onUpdateConfiguration(selectedBlock.idBloc, "photoCouverture", url),
                            setUploadingCover
                          );
                        }
                      }}
                    />

                    <input
                      type="text"
                      placeholder="https://... ou chemin de l'image"
                      value={(conf.photoCouverture as string) || ""}
                      onChange={(e) => onUpdateConfiguration(selectedBlock.idBloc, "photoCouverture", e.target.value)}
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
                  <div className="rounded-[8px] border border-white/[0.06] bg-black/30 p-3 space-y-3">
                    <label className="block text-[11px] font-medium text-[#f3ebdd]">
                      Réseaux sociaux (Social links)
                    </label>

                    {/* Current list */}
                    {Array.isArray(conf.liensSociaux) && conf.liensSociaux.length > 0 ? (
                      <div className="space-y-1.5">
                        {(conf.liensSociaux as { reseau: string; url: string }[]).map((link, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 rounded border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-xs text-white/90"
                          >
                            <span className="font-mono text-[10px] text-[#e8a34a]">
                              {link.reseau}
                            </span>
                            <span className="truncate flex-1 text-[11px] text-white/60">
                              {link.url}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const next = (conf.liensSociaux as { reseau: string; url: string }[]).filter(
                                  (_, i) => i !== idx
                                );
                                onUpdateConfiguration(selectedBlock.idBloc, "liensSociaux", next);
                              }}
                              className="text-white/40 hover:text-red-400"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-[#9a8f82]">Aucun réseau social configuré.</p>
                    )}

                    {/* Add new social link */}
                    <div className="pt-2 border-t border-white/[0.06] space-y-2">
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
                          const next = [...current, { reseau: newSocialReseau, url: newSocialUrl.trim() }];
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
                      onChange={(e) => onUpdateConfiguration(selectedBlock.idBloc, "titre", e.target.value)}
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
                      onChange={(e) => onUpdateConfiguration(selectedBlock.idBloc, "texte", e.target.value)}
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 p-2 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#9a8f82]">{editorFr.fields.anneesExperience}</label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={Number(conf.anneesExperience ?? 0)}
                      onChange={(e) => onUpdateConfiguration(selectedBlock.idBloc, "anneesExperience", Number(e.target.value))}
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>

                  {/* Profile / Portrait: URL + Upload */}
                  <div className="rounded-[8px] border border-white/[0.06] bg-black/30 p-3 space-y-2">
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
                            (url) => onUpdateConfiguration(selectedBlock.idBloc, "photoPortrait", url),
                            setUploadingPortrait
                          );
                        }
                      }}
                    />

                    <input
                      type="text"
                      placeholder="https://... ou chemin de l'image"
                      value={(conf.photoPortrait as string) || ""}
                      onChange={(e) => onUpdateConfiguration(selectedBlock.idBloc, "photoPortrait", e.target.value)}
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
                    <label className="text-[11px] text-[#9a8f82]">{editorFr.fields.titre} (Heading)</label>
                    <input
                      type="text"
                      placeholder={(conf.categorie as string) || "MARIAGE"}
                      value={(conf.titre as string) || ""}
                      onChange={(e) => onUpdateConfiguration(selectedBlock.idBloc, "titre", e.target.value)}
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
                          onClick={() => onUpdateConfiguration(selectedBlock.idBloc, "colonnes", col)}
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
                    <label className="text-[11px] text-[#9a8f82]">{editorFr.fields.categorie}</label>
                    <select
                      value={(conf.categorie as string) || "MARIAGE"}
                      onChange={(e) => onUpdateConfiguration(selectedBlock.idBloc, "categorie", e.target.value)}
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
                      onChange={(e) => onUpdateConfiguration(selectedBlock.idBloc, "titre", e.target.value)}
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-[#9a8f82]">{editorFr.fields.date}</label>
                      <input
                        type="text"
                        value={(conf.date as string) || ""}
                        onChange={(e) => onUpdateConfiguration(selectedBlock.idBloc, "date", e.target.value)}
                        className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#9a8f82]">{editorFr.fields.lieu}</label>
                      <input
                        type="text"
                        value={(conf.lieu as string) || ""}
                        onChange={(e) => onUpdateConfiguration(selectedBlock.idBloc, "lieu", e.target.value)}
                        className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-[#9a8f82]">Récit / Narrative</label>
                    <textarea
                      rows={3}
                      value={(conf.texte as string) || ""}
                      onChange={(e) => onUpdateConfiguration(selectedBlock.idBloc, "texte", e.target.value)}
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 p-2 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>
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
                      onChange={(e) => onUpdateConfiguration(selectedBlock.idBloc, "titre", e.target.value)}
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#9a8f82]">Description</label>
                    <input
                      type="text"
                      value={(conf.description as string) || ""}
                      onChange={(e) => onUpdateConfiguration(selectedBlock.idBloc, "description", e.target.value)}
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#9a8f82]">Photo Avant (URL)</label>
                    <input
                      type="text"
                      value={(conf.photoAvant as string) || ""}
                      onChange={(e) => onUpdateConfiguration(selectedBlock.idBloc, "photoAvant", e.target.value)}
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#9a8f82]">Photo Après (URL)</label>
                    <input
                      type="text"
                      value={(conf.photoApres as string) || ""}
                      onChange={(e) => onUpdateConfiguration(selectedBlock.idBloc, "photoApres", e.target.value)}
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>
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
                      onChange={(e) => onUpdateConfiguration(selectedBlock.idBloc, "titre", e.target.value)}
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
                      onChange={(e) => onUpdateConfiguration(selectedBlock.idBloc, "titre", e.target.value)}
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 px-2.5 py-1.5 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#9a8f82]">{editorFr.fields.texteIntro}</label>
                    <textarea
                      rows={3}
                      value={(conf.texteIntro as string) || ""}
                      onChange={(e) => onUpdateConfiguration(selectedBlock.idBloc, "texteIntro", e.target.value)}
                      className="mt-1 w-full rounded-[6px] border border-white/[0.08] bg-black/30 p-2 font-sans text-xs text-[#f3ebdd] focus:border-[#e8a34a] focus:outline-hidden"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 5. PHOTOGRAPHS LIST (IF APPLICABLE) */}
            {(selectedBlock.type === "GALERIE" || selectedBlock.type === "COLLECTION") && (
              <div className="border-t border-white/[0.08] pt-4 space-y-3">
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
                            className={`inline-block rounded-full px-1.5 py-0.2 font-mono text-[8px] uppercase ${
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
                        <button
                          type="button"
                          onClick={() => onRemoveElement?.(selectedBlock.idBloc, elem.idElement)}
                          aria-label="Retirer la photo"
                          className="flex size-6 shrink-0 items-center justify-center rounded text-white/30 hover:text-red-400 hover:bg-red-950/40"
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
            <div className="border-t border-white/[0.08] pt-4 space-y-2">
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
                </div>
              </div>
            </div>

            {/* Specialities */}
            <div className="border-t border-white/[0.08] pt-4 space-y-2">
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
            <div className="border-t border-white/[0.08] pt-4 space-y-2.5">
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
            <div className="border-t border-white/[0.08] pt-4 space-y-3">
              <div className="font-mono text-[9px] font-semibold tracking-[0.16em] text-[#6f655a] uppercase">
                {editorFr.pageSections.publication}
              </div>
              <div className="rounded-[8px] border border-white/[0.06] bg-black/40 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-white/40">URL PUBLIQUE</span>
                  <ExternalLink className="size-3 text-white/30" />
                </div>
                <div className="truncate font-mono text-[11px] text-[#e8a34a]">
                  studioflow.app/portfolio/aurelie-morales
                </div>
              </div>
              <p className="text-[10px] leading-relaxed text-[#9a8f82]">
                La page publique ne lit que la version publiée. Les brouillons ne sont jamais visibles.
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
