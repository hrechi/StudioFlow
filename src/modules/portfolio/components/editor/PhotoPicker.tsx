"use client";

import { useEffect, useState } from "react";
import { Check, Images, Loader2, Sparkles, Upload, X } from "lucide-react";
import { SafeImage } from "@/components/shared/safe-image";
import { lancerSelectionIA } from "../../portfolio.actions";
import {
  PHOTO_QUALITY_SELECTION_THRESHOLD,
  MAX_AUTOMATIC_PORTFOLIO_PHOTOS,
  type CategoriePortfolio,
  type ElementBlocPortfolio,
  type PhotoQualityReport,
} from "../../portfolio.types";

export type PhotoItem = {
  id: string;
  url: string;
  urlMiniature?: string;
  titre: string;
  client?: string;
  clientId?: string;
  dateAjout?: string;
  scoreQualite?: number;
};

type PhotoPickerProps = {
  isOpen: boolean;
  destinationBlockName?: string;
  photos?: PhotoItem[];
  isLoadingPhotos?: boolean;
  onClose: () => void;
  onAddPhotos: (newElements: ElementBlocPortfolio[]) => void;
};

export function PhotoPicker({
  isOpen,
  destinationBlockName = "Gallery",
  photos = [],
  isLoadingPhotos = false,
  onClose,
  onAddPhotos,
}: PhotoPickerProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customUrl, setCustomUrl] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [analysis, setAnalysis] = useState<{
    recommendedIds: string[];
    similarIds: string[];
    lowQualityIds: string[];
    scores: Record<string, number>;
    reports: Record<string, PhotoQualityReport>;
  } | null>(null);
  const [category, setCategory] = useState<CategoriePortfolio | "">("");
  const [aiConsent, setAiConsent] = useState(false);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setErrorMessage(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const analysePhotos = async () => {
    setIsAnalysing(true);
    setErrorMessage(null);
    const result = await lancerSelectionIA(category || undefined);
    setIsAnalysing(false);
    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }
    const recommendedIdSet = new Set(result.data.photoIds.map((id) => id.toString()));
    const scores = result.data.scores as Record<string, number>;
    const recommendedPhotos =
      result.data.selectionValidated === false
        ? []
        : photos.filter((photo) => recommendedIdSet.has(photo.id.toString()));
    const uniquePhotoUrls = new Set<string>();
    const uniqueRecommendedPhotos = recommendedPhotos
      .filter((photo) => {
        if (uniquePhotoUrls.has(photo.url)) return false;
        uniquePhotoUrls.add(photo.url);
        return true;
      })
      .slice(0, MAX_AUTOMATIC_PORTFOLIO_PHOTOS);
    const recommendedPhotoIds = uniqueRecommendedPhotos.map((photo) => photo.id);
    setAnalysis({
      recommendedIds: recommendedPhotoIds,
      similarIds: result.data.similarPhotoIds.filter((id) => !recommendedPhotoIds.includes(id)),
      lowQualityIds: result.data.lowQualityPhotoIds.filter(
        (id) => !recommendedPhotoIds.includes(id),
      ),
      scores,
      reports: result.data.reports ?? {},
    });
    const recommendedElements: ElementBlocPortfolio[] = uniqueRecommendedPhotos.map((photo) => ({
      idElement: crypto.randomUUID().replaceAll("-", "").slice(0, 24),
      photoId: photo.id.length === 24 ? photo.id : undefined,
      source: "UPLOAD_PERSONNEL",
      media: {
        url: photo.url,
        urlMiniature: photo.urlMiniature || photo.url,
        largeur: 1600,
        hauteur: 1060,
        publicId: photo.id,
      },
      titre: photo.titre,
      ordreAffichage: 0,
      estMisEnAvant: false,
      role: "NORMAL",
      statutConsentement: "NON_REQUIS",
      nombreLikes: 0,
      dateAjout: photo.dateAjout || new Date().toISOString(),
    }));

    if (recommendedElements.length > 0) {
      onAddPhotos(recommendedElements);
      onClose();
      return;
    }

    setSelectedIds(new Set());
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/portfolio/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Échec du téléversement");
      }
      const uploadedMedia = data.data;
      const newElem: ElementBlocPortfolio = {
        idElement: crypto.randomUUID().replaceAll("-", "").slice(0, 24),
        source: "UPLOAD_PERSONNEL",
        media: {
          url: uploadedMedia.url,
          urlMiniature: uploadedMedia.urlMiniature || uploadedMedia.url,
          largeur: uploadedMedia.largeur || 1600,
          hauteur: uploadedMedia.hauteur || 1060,
          publicId: uploadedMedia.publicId || `upload-${Date.now()}`,
        },
        titre: file.name.replace(/\.[^/.]+$/, ""),
        ordreAffichage: 0,
        estMisEnAvant: false,
        role: "NORMAL",
        statutConsentement: "NON_REQUIS", // UPLOAD_PERSONNEL n'exige pas de consentement client
        nombreLikes: 0,
        dateAjout: new Date().toISOString(),
      };
      onAddPhotos([newElem]);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Erreur de téléversement");
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirm = () => {
    const selectedElements: ElementBlocPortfolio[] = [];

    // From connected photographer's MongoDB library (table photos / galeries)
    photos.forEach((photo) => {
      if (selectedIds.has(photo.id)) {
        selectedElements.push({
          idElement: crypto.randomUUID().replaceAll("-", "").slice(0, 24),
          photoId: photo.id.length === 24 ? photo.id : undefined,
          source: "UPLOAD_PERSONNEL",
          media: {
            url: photo.url,
            urlMiniature: photo.urlMiniature || photo.url,
            largeur: 1600,
            hauteur: 1060,
            publicId: photo.id,
          },
          titre: photo.titre,
          ordreAffichage: 0,
          estMisEnAvant: false,
          role: "NORMAL",
          statutConsentement: "NON_REQUIS", // UPLOAD_PERSONNEL n'exige pas de consentement client
          nombreLikes: 0,
          dateAjout: photo.dateAjout || new Date().toISOString(),
        });
      }
    });

    // Custom URL if provided
    if (customUrl.trim()) {
      if (!customUrl.startsWith("https://")) {
        setErrorMessage("L'URL personnalisée doit obligatoirement commencer par https://");
        return;
      }
      selectedElements.push({
        idElement: crypto.randomUUID().replaceAll("-", "").slice(0, 24),
        source: "UPLOAD_PERSONNEL",
        media: {
          url: customUrl.trim(),
          urlMiniature: customUrl.trim(),
          largeur: 1600,
          hauteur: 1060,
          publicId: `upload-${Date.now()}`,
        },
        titre: customTitle.trim() || "Importation personnalisée",
        ordreAffichage: 0,
        estMisEnAvant: false,
        role: "NORMAL",
        statutConsentement: "NON_REQUIS", // UPLOAD_PERSONNEL n'exige pas de consentement client
        nombreLikes: 0,
        dateAjout: new Date().toISOString(),
      });
    }

    if (selectedElements.length === 0) {
      setErrorMessage("Veuillez sélectionner au moins une photo ou saisir une URL valide.");
      return;
    }

    onAddPhotos(selectedElements);
    setSelectedIds(new Set());
    setCustomUrl("");
    setCustomTitle("");
    setErrorMessage(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="photo-picker-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none"
    >
      {/* Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Window: max 760px */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-[760px] animate-in flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1c1410] shadow-[0_24px_64px_rgba(0,0,0,0.85)] duration-200 zoom-in-95 fade-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] p-5">
          <div>
            <h2 id="photo-picker-title" className="font-sans text-lg font-bold text-white">
              Add photographs
            </h2>
            <p className="font-mono text-xs text-[#e8a34a]">Into {destinationBlockName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex size-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {/* Photographer's MongoDB library grid */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-[10px] font-semibold tracking-wider text-[#9a8f82] uppercase">
                Vos photos de galeries ({photos.length})
              </p>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/80 transition-colors hover:border-[#e8a34a] hover:text-[#e8a34a]">
                {isUploading ? (
                  <Loader2 className="size-3 animate-spin text-[#e8a34a]" />
                ) : (
                  <Upload className="size-3" />
                )}
                <span>Téléverser</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={isUploading}
                  onChange={handleFileUpload}
                />
              </label>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#e8a34a]/20 bg-[#e8a34a]/[0.06] p-3">
              <Sparkles className="size-4 text-[#e8a34a]" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white">Sélection intelligente</p>
                <p className="mt-0.5 text-[11px] text-white/50">
                  Les photos à partir de {PHOTO_QUALITY_SELECTION_THRESHOLD}/100 sont recommandées.
                  Vous gardez le choix de les ajouter.
                </p>
              </div>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as CategoriePortfolio | "")}
                className="h-8 rounded-lg border border-white/10 bg-black/20 px-2 text-xs text-white"
                aria-label="Spécialité pour l'analyse"
              >
                <option value="">Toutes les spécialités</option>
                <option value="MARIAGE">Mariage</option>
                <option value="PORTRAIT">Portrait</option>
                <option value="PRODUIT">Produit</option>
                <option value="EVENEMENT">Événement</option>
              </select>
              <button
                type="button"
                onClick={() => void analysePhotos()}
                disabled={isAnalysing || photos.length === 0 || !aiConsent}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#e8a34a] px-3 text-xs font-semibold text-[#0f0905] disabled:opacity-50"
              >
                {isAnalysing ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Sparkles className="size-3" />
                )}
                Analyser et ajouter
              </button>
            </div>
            <label className="mb-4 flex cursor-pointer items-start gap-2 text-[11px] leading-relaxed text-white/55">
              <input
                type="checkbox"
                checked={aiConsent}
                onChange={(event) => setAiConsent(event.target.checked)}
                className="mt-0.5 accent-[#e8a34a]"
              />
              <span>
                J’accepte l’envoi des photos de ma bibliothèque à Gemini pour une analyse visuelle
                afin de recevoir des recommandations. Aucune photo n’est ajoutée sans mon action.
              </span>
            </label>
            {analysis && (
              <div className="mb-4 grid gap-2 text-[11px] text-white/65 sm:grid-cols-3">
                <p className="rounded-lg bg-emerald-400/10 p-2">
                  <strong className="text-emerald-300">{analysis.recommendedIds.length}</strong>{" "}
                  recommandées
                </p>
                <p className="rounded-lg bg-[#e8a34a]/10 p-2">
                  <strong className="text-[#e8a34a]">{analysis.similarIds.length}</strong>{" "}
                  similaires
                </p>
                <p className="rounded-lg bg-rose-400/10 p-2">
                  <strong className="text-rose-300">{analysis.lowQualityIds.length}</strong> qualité
                  faible
                </p>
              </div>
            )}
            {analysis && analysis.recommendedIds.length === 0 && (
              <p className="mb-4 rounded-lg border border-rose-400/20 bg-rose-400/10 p-3 text-xs leading-relaxed text-rose-200">
                Aucune photo n&apos;atteint le seuil de qualité de{" "}
                {PHOTO_QUALITY_SELECTION_THRESHOLD}/100. Aucune image n&apos;a été sélectionnée
                automatiquement.
              </p>
            )}

            {isLoadingPhotos ? (
              <div className="flex items-center justify-center py-12 text-white/40">
                <Loader2 className="size-6 animate-spin text-[#e8a34a]" />
              </div>
            ) : photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
                <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-[#e8a34a]/10 text-[#e8a34a]">
                  <Images className="size-6" />
                </div>
                <p className="font-sans text-sm font-medium text-white">
                  Aucune photo dans vos galeries
                </p>
                <p className="mt-1 max-w-sm text-xs text-white/50">
                  Seules les photos de votre compte photographe sont disponibles. Vous pouvez
                  téléverser un fichier ou utiliser une URL externe ci-dessous.
                </p>
              </div>
            ) : (
              <div className="grid max-h-[380px] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
                {photos.map((photo) => {
                  const isSelected = selectedIds.has(photo.id);
                  return (
                    <div
                      key={photo.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleSelect(photo.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleSelect(photo.id);
                        }
                      }}
                      className={`group relative aspect-square cursor-pointer overflow-hidden rounded-xl border transition-all ${
                        isSelected
                          ? "border-[#e8a34a] shadow-md ring-2 ring-[#e8a34a]/60"
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <SafeImage
                        src={photo.urlMiniature || photo.url}
                        alt={photo.titre}
                        fill
                        unoptimized
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                      {analysis?.recommendedIds.includes(photo.id) && (
                        <span className="absolute top-2 left-2 rounded-full bg-emerald-500/90 px-2 py-0.5 font-mono text-[9px] font-semibold text-black">
                          Recommandée {analysis?.scores[photo.id] ?? photo.scoreQualite}/100
                        </span>
                      )}
                      {analysis?.similarIds.includes(photo.id) && (
                        <span className="absolute top-9 left-2 rounded-full bg-[#e8a34a]/90 px-2 py-0.5 font-mono text-[9px] font-semibold text-black">
                          Similaire
                        </span>
                      )}
                      {analysis?.lowQualityIds.includes(photo.id) && (
                        <span className="absolute top-2 left-2 rounded-full bg-rose-400/90 px-2 py-0.5 font-mono text-[9px] font-semibold text-black">
                          Qualité faible
                        </span>
                      )}
                      {analysis?.reports[photo.id]?.raison && (
                        <span className="absolute inset-x-0 bottom-0 line-clamp-2 bg-black/75 px-2 py-1 text-[9px] leading-snug text-white">
                          {analysis.reports[photo.id].raison}
                        </span>
                      )}

                      {/* Check indicator */}
                      <div
                        className={`absolute top-2 right-2 flex size-6 items-center justify-center rounded-full border transition-all ${
                          isSelected
                            ? "border-[#e8a34a] bg-[#e8a34a] text-black shadow-xs"
                            : "border-white/40 bg-black/50 text-transparent"
                        }`}
                      >
                        <Check className="size-3.5 stroke-[3]" />
                      </div>

                      {/* Metadata badge at bottom */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-2 text-left">
                        <p className="truncate text-xs font-medium text-white">{photo.titre}</p>
                        {photo.client && (
                          <p className="truncate font-mono text-[9px] text-[#e8a34a]">
                            {photo.client}
                          </p>
                        )}
                        {analysis?.recommendedIds.includes(photo.id) && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleSelect(photo.id);
                            }}
                            className="mt-1 text-[10px] font-semibold text-white/80 underline underline-offset-2 hover:text-white"
                          >
                            {isSelected ? "Ignorer" : "Ajouter au portfolio"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Custom URL upload */}
          <div className="border-t border-white/[0.08] pt-5">
            <p className="mb-2 font-mono text-[10px] font-semibold tracking-wider text-[#9a8f82] uppercase">
              Ou importer depuis une URL externe (https)
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <input
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                  value={customUrl}
                  onChange={(e) => {
                    setErrorMessage(null);
                    setCustomUrl(e.target.value);
                  }}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-sans text-xs text-white placeholder:text-white/30 focus:border-[#e8a34a] focus:outline-hidden"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Titre de la photo"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-sans text-xs text-white placeholder:text-white/30 focus:border-[#e8a34a] focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="rounded-lg border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#120b07] p-4">
          <span className="font-mono text-xs text-[#9a8f82]">
            {selectedIds.size + (customUrl.trim() ? 1 : 0)} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-4 py-2 font-sans text-xs font-medium text-white/70 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-full bg-[#e8a34a] px-5 py-2 font-sans text-xs font-semibold text-[#0f0905] shadow-md transition-transform hover:scale-105"
            >
              Add photographs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
