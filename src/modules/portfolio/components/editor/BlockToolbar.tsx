"use client";

import type { HTMLAttributes } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  ImagePlus,
  Trash2,
} from "lucide-react";
import type { TypeBloc } from "../../portfolio.types";
import { editorFr } from "./fr";

type BlockToolbarProps = {
  blockType: TypeBloc;
  isVisible: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleVisibility: () => void;
  onDuplicate: () => void;
  onOpenPhotos?: () => void;
  onDelete: () => void;
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>;
};

export function BlockToolbar({
  blockType,
  isVisible,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  onDuplicate,
  onOpenPhotos,
  onDelete,
  dragHandleProps,
}: BlockToolbarProps) {
  const name = editorFr.blockNames[blockType] || blockType;
  const supportsPhotos = ["GALERIE", "COLLECTION", "HERO", "A_PROPOS", "AVANT_APRES"].includes(blockType);

  return (
    <div
      role="toolbar"
      aria-label={`Actions du bloc ${name}`}
      onClick={(e) => e.stopPropagation()}
      className="absolute top-3 right-3 z-30 flex items-center gap-1 rounded-[8px] border border-white/15 bg-black/90 p-1 text-white shadow-2xl backdrop-blur-md transition-opacity select-none"
    >
      {/* 1. Drag Handle + Block Name */}
      <button
        type="button"
        title="Glisser pour réordonner"
        aria-label="Glisser pour réordonner"
        className="flex cursor-grab items-center gap-1.5 rounded px-2 py-1 text-xs font-mono font-semibold tracking-wider text-[#e8a34a] hover:bg-white/10 active:cursor-grabbing"
        {...dragHandleProps}
      >
        <GripVertical className="size-3.5 text-[#e8a34a]/80" aria-hidden="true" />
        <span className="text-[10px] tracking-[0.14em] uppercase">{name}</span>
      </button>

      <div className="h-3.5 w-px bg-white/20" />

      {/* 2. Arrow Up */}
      <button
        type="button"
        disabled={!canMoveUp}
        onClick={onMoveUp}
        title="Monter le bloc"
        aria-label="Monter le bloc"
        className="flex size-7 items-center justify-center rounded text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30"
      >
        <ArrowUp className="size-3.5" aria-hidden="true" />
      </button>

      {/* 3. Arrow Down */}
      <button
        type="button"
        disabled={!canMoveDown}
        onClick={onMoveDown}
        title="Descendre le bloc"
        aria-label="Descendre le bloc"
        className="flex size-7 items-center justify-center rounded text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-30"
      >
        <ArrowDown className="size-3.5" aria-hidden="true" />
      </button>

      <div className="h-3.5 w-px bg-white/20" />

      {/* 4. Eye (toggle visibility) */}
      <button
        type="button"
        onClick={onToggleVisibility}
        title={isVisible ? "Masquer sur la page" : "Afficher sur la page"}
        aria-label={isVisible ? "Masquer sur la page" : "Afficher sur la page"}
        className="flex size-7 items-center justify-center rounded text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        {isVisible ? (
          <Eye className="size-3.5" aria-hidden="true" />
        ) : (
          <EyeOff className="size-3.5 text-[#e8a34a]" aria-hidden="true" />
        )}
      </button>

      {/* 5. Duplicate */}
      <button
        type="button"
        onClick={onDuplicate}
        title="Dupliquer le bloc"
        aria-label="Dupliquer le bloc"
        className="flex size-7 items-center justify-center rounded text-white/70 transition-colors hover:bg-white/10 hover:text-[#e8a34a]"
      >
        <Copy className="size-3.5" aria-hidden="true" />
      </button>

      {/* 6. Photo picker */}
      {supportsPhotos && (
        <button
          type="button"
          onClick={onOpenPhotos}
          title="Ajouter / Gérer les photos"
          aria-label="Ajouter / Gérer les photos"
          className="flex size-7 items-center justify-center rounded text-white/70 transition-colors hover:bg-white/10 hover:text-[#e8a34a]"
        >
          <ImagePlus className="size-3.5" aria-hidden="true" />
        </button>
      )}

      {/* 7. Trash / Delete */}
      <button
        type="button"
        onClick={onDelete}
        title="Supprimer le bloc"
        aria-label="Supprimer le bloc"
        className="flex size-7 items-center justify-center rounded text-white/70 transition-colors hover:bg-red-950/80 hover:text-red-400"
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

