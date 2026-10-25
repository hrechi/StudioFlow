"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EyeOff } from "lucide-react";
import type { BlocPortfolio } from "../../portfolio.types";
import { editorFr } from "./fr";
import { BlockToolbar } from "./BlockToolbar";
import { RenderBlockContent } from "./block-renderers";

type SortableBlockProps = {
  bloc: BlocPortfolio;
  isSelected: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  isDropTarget?: boolean;
  onSelect: (id: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleVisibility: () => void;
  onDuplicate: () => void;
  onOpenPhotos?: () => void;
  onDelete: () => void;
};

export function SortableBlock({
  bloc,
  isSelected,
  canMoveUp,
  canMoveDown,
  isDropTarget = false,
  onSelect,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  onDuplicate,
  onOpenPhotos,
  onDelete,
}: SortableBlockProps) {
  const [isHovered, setIsHovered] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: bloc.idBloc });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const name = editorFr.blockNames[bloc.type] || bloc.type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(bloc.idBloc)}
      className={`group relative transition-all ${
        isDragging ? "opacity-40 z-50 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Amber drop line indicator on top if this is the target */}
      {isDropTarget && (
        <div className="absolute -top-1 inset-x-0 z-40 h-1 rounded-full bg-[#e8a34a] shadow-[0_0_8px_#e8a34a]" />
      )}

      {/* Floating Toolbar (appears in top right on hover or selection) */}
      {(isHovered || isSelected) && (
        <BlockToolbar
          blockType={bloc.type}
          isVisible={bloc.visible}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onToggleVisibility={onToggleVisibility}
          onDuplicate={onDuplicate}
          onOpenPhotos={onOpenPhotos}
          onDelete={onDelete}
          dragHandleProps={{ ...attributes, ...listeners }}
        />
      )}

      {/* Amber border wrapper */}
      <div
        className={`relative transition-all duration-150 ${
          isSelected
            ? "ring-2 ring-[#e8a34a] shadow-lg"
            : isHovered
              ? "ring-1 ring-[#e8a34a]/60"
              : "ring-0"
        }`}
      >
        {/* Hidden block banner if not visible */}
        {!bloc.visible && (
          <div className="flex items-center justify-center gap-2 border-b border-amber-900/30 bg-[#241710] py-1.5 text-center font-mono text-[10px] font-semibold tracking-wider text-[#e8a34a] uppercase">
            <EyeOff className="size-3" />
            <span>Hidden — not on the published page</span>
          </div>
        )}

        {/* Content with 42% opacity when hidden */}
        <div className={`transition-opacity ${!bloc.visible ? "opacity-40" : "opacity-100"}`}>
          <RenderBlockContent bloc={bloc} onOpenPhotoPicker={onOpenPhotos} />
        </div>

        {/* Type label badge in bottom-left when selected */}
        {isSelected && (
          <div className="absolute bottom-2 left-2 z-20 rounded bg-black/90 px-2 py-0.5 font-mono text-[9px] font-semibold tracking-[0.16em] text-[#e8a34a] uppercase shadow-md select-none border border-white/10">
            {name}
          </div>
        )}
      </div>
    </div>
  );
}

