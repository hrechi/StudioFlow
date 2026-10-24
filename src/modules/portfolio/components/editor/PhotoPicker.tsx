"use client";

import { useEffect, useState } from "react";
import { Check, Images, Loader2, Upload, X } from "lucide-react";
import { SafeImage } from "@/components/shared/safe-image";
import type { ElementBlocPortfolio } from "../../portfolio.types";

export type PhotoItem = {
  id: string;
  url: string;
  urlMiniature?: string;
  titre: string;
  client?: string;
  clientId?: string;
  dateAjout?: string;
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
        statutConsentement: "NON_REQUIS",  // UPLOAD_PERSONNEL n'exige pas de consentement client
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
          statutConsentement: "NON_REQUIS",  // UPLOAD_PERSONNEL n'exige pas de consentement client
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
        statutConsentement: "NON_REQUIS",  // UPLOAD_PERSONNEL n'exige pas de consentement client
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
      <div className="relative flex max-h-[90vh] w-full max-w-[760px] flex-col rounded-2xl border border-white/10 bg-[#1c1410] shadow-[0_24px_64px_rgba(0,0,0,0.85)] z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] p-5">
          <div>
            <h2 id="photo-picker-title" className="font-sans text-lg font-bold text-white">
              Add photographs
            </h2>
            <p className="font-mono text-xs text-[#e8a34a]">
              Into {destinationBlockName}
            </p>
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
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
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
                  Seules les photos de votre compte photographe sont disponibles. Vous pouvez téléverser un fichier ou utiliser une URL externe ci-dessous.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 max-h-[380px] overflow-y-auto pr-1">
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
                          ? "border-[#e8a34a] ring-2 ring-[#e8a34a]/60 shadow-md"
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
                          <p className="truncate font-mono text-[9px] text-[#e8a34a]">{photo.client}</p>
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
