"use client";

import { useDraggable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import type { TypeBloc } from "../../portfolio.types";
import { editorFr } from "./fr";
import { BLOCK_ICONS } from "./paletteData";

type PaletteCardProps = {
  type: TypeBloc;
  count: number;
  disabled?: boolean;
  onAdd: (type: TypeBloc) => void;
};

export function PaletteCard({ type, count, disabled = false, onAdd }: PaletteCardProps) {
  const Icon = BLOCK_ICONS[type];
  const name = editorFr.blockNames[type] || type;
  const hint = editorFr.blockHints[type] || "";

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${type}`,
    data: { kind: "palette", type },
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && onAdd(type)}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !disabled) {
          e.preventDefault();
          onAdd(type);
        }
      }}
      className={`group relative flex cursor-grab items-center gap-2.5 rounded-[8px] border border-white/[0.04] bg-white/[0.02] p-2 transition-all hover:border-[#e8a34a]/40 hover:bg-white/[0.04] active:cursor-grabbing select-none ${
        disabled ? "cursor-not-allowed opacity-45 pointer-events-none" : ""
      } ${isDragging ? "opacity-30 border-[#e8a34a]" : ""}`}
      title={disabled && type === "HERO" ? editorFr.oneHero : undefined}
    >
      {/* Icon inside translucent amber square */}
      <div className="flex size-7 shrink-0 items-center justify-center rounded-[6px] border border-[#e8a34a]/20 bg-[#e8a34a]/10 text-[#e8a34a]">
        <Icon className="size-3.5" aria-hidden="true" />
      </div>

      {/* Name, count & subtitle */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-sans text-xs font-medium text-[#f3ebdd] group-hover:text-white">
            {name}
          </span>
          {count > 0 && (
            <span className="rounded-full bg-white/10 px-1.5 py-0.2 font-mono text-[9px] text-[#f3ebdd]/80">
              {count}
            </span>
          )}
        </div>
        <p className="truncate text-[10px] text-[#9a8f82]">{hint}</p>
      </div>

      {/* Plus icon on right */}
      <button
        type="button"
        aria-label={`Ajouter ${name}`}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onAdd(type);
        }}
        className="flex size-5 shrink-0 items-center justify-center rounded text-white/30 transition-colors group-hover:text-[#e8a34a]"
      >
        <Plus className="size-3" aria-hidden="true" />
      </button>
    </div>
  );
}
