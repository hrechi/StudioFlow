"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { SafeImage } from "@/components/shared/safe-image";
import type { ElementBlocPortfolio } from "../../portfolio.types";

const AVAILABLE_PHOTOS = [
  {
    id: "lib-1",
    url: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80",
    titre: "Château de la Rivière - Domaine",
    client: "Claire & Julien",
  },
  {
    id: "lib-2",
    url: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80",
    titre: "Arche fleurie et allée",
    client: "Claire & Julien",
  },
  {
    id: "lib-3",
    url: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=800&q=80",
    titre: "Échange des alliances en plein air",
    client: "Élodie & Paul",
  },
  {
    id: "lib-4",
    url: "https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800&q=80",
    titre: "Danse dorée au crépuscule",
    client: "Camille & Thomas",
  },
  {
    id: "lib-5",
    url: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=800&q=80",
    titre: "Détails de table rustique",
    client: "Claire & Julien",
  },
  {
    id: "lib-6",
    url: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=800&q=80",
    titre: "Chemin des cyprès toscans",
    client: "Sophie & Mathieu",
  },
];

type PhotoPickerProps = {
  isOpen: boolean;
  destinationBlockName?: string;
  onClose: () => void;
  onAddPhotos: (newElements: ElementBlocPortfolio[]) => void;
};

export function PhotoPicker({
  isOpen,
  destinationBlockName = "Gallery",
  onClose,
  onAddPhotos,
}: PhotoPickerProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customUrl, setCustomUrl] = useState("");
  const [customTitle, setCustomTitle] = useState("");
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

  const handleConfirm = () => {
    const selectedElements: ElementBlocPortfolio[] = [];

    // From library
    AVAILABLE_PHOTOS.forEach((photo) => {
      if (selectedIds.has(photo.id)) {
        selectedElements.push({
          idElement: `elem-${crypto.randomUUID().slice(0, 8)}`,
          source: "GALERIE_CLIENT",
          media: {
            url: photo.url,
            urlMiniature: photo.url,
            largeur: 800,
            hauteur: 600,
            publicId: photo.id,
          },
          titre: photo.titre,
          ordreAffichage: 0,
          estMisEnAvant: false,
          role: "NORMAL",
          statutConsentement: "ACCORDE",
          nombreLikes: 0,
          dateAjout: new Date().toISOString(),
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
        idElement: `elem-${crypto.randomUUID().slice(0, 8)}`,
        source: "UPLOAD_PERSONNEL",
        media: {
          url: customUrl.trim(),
          urlMiniature: customUrl.trim(),
          largeur: 800,
          hauteur: 600,
          publicId: `upload-${Date.now()}`,
        },
        titre: customTitle.trim() || "Importation personnalisée",
        ordreAffichage: 0,
        estMisEnAvant: false,
        role: "NORMAL",
        statutConsentement: "ACCORDE",
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
      {/* Blurred dark backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal 760px */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-[760px] flex-col rounded-2xl border border-white/10 bg-[#160e0a] text-[#f3ebdd] shadow-2xl animate-in zoom-in-95 duration-200">
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
          {/* Photo library grid */}
          <div>
            <p className="mb-3 font-mono text-[10px] font-semibold tracking-wider text-[#9a8f82] uppercase">
              From client galleries
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {AVAILABLE_PHOTOS.map((photo) => {
                const isSelected = selectedIds.has(photo.id);
                return (
                  <div
                    key={photo.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleSelect(photo.id)}
                    className={`group relative aspect-square cursor-pointer overflow-hidden rounded-xl border transition-all ${
                      isSelected
                        ? "border-[#e8a34a] ring-2 ring-[#e8a34a]/60 shadow-md"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <SafeImage
                      src={photo.url}
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
                      <p className="font-mono text-[9px] text-[#e8a34a]">{photo.client}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom URL upload */}
          <div className="border-t border-white/[0.08] pt-5">
            <p className="mb-2 font-mono text-[10px] font-semibold tracking-wider text-[#9a8f82] uppercase">
              Or import from external URL (https)
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
