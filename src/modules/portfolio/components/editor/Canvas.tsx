"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { BlocPortfolio } from "../../portfolio.types";
import { editorFr } from "./fr";
import type { ViewportMode } from "./EditorTopBar";
import { SortableBlock } from "./SortableBlock";

type CanvasProps = {
  blocks: BlocPortfolio[];
  selectedBlockId: string | null;
  overTargetId?: string | null;
  portfolioTitle?: string;
  publicationStatus?: string;
  viewportMode: ViewportMode;
  onSelectBlock: (id: string | null) => void;
  onMoveBlock: (index: number, direction: "up" | "down") => void;
  onToggleVisibility: (id: string) => void;
  onDuplicateBlock: (id: string) => void;
  onDeleteBlock: (id: string) => void;
  onOpenPhotoPicker?: (id: string) => void;
  onDropAreaClick?: () => void;
};

export function Canvas({
  blocks,
  selectedBlockId,
  overTargetId,
  portfolioTitle = "Aurélie Morales",
  publicationStatus = editorFr.neverPublished,
  viewportMode,
  onSelectBlock,
  onMoveBlock,
  onToggleVisibility,
  onDuplicateBlock,
  onDeleteBlock,
  onOpenPhotoPicker,
  onDropAreaClick,
}: CanvasProps) {
  const visibleCount = blocks.filter((b) => b.visible).length;

  const { setNodeRef: setEndDropRef, isOver: isEndOver } = useDroppable({
    id: "canvas-end",
  });

  return (
    <main
      aria-label="Zone de travail du portfolio"
      onClick={() => onSelectBlock(null)}
      className="sf-canvas-area relative flex-1 overflow-y-auto px-4 py-8 md:px-8 select-none"
    >
      <div className="mx-auto flex max-w-[1020px] flex-col items-center">
        {/* Canvas Header (Above the Sheet) */}
        <header
          onClick={(e) => e.stopPropagation()}
          className="mb-6 flex w-full max-w-[900px] flex-wrap items-end justify-between gap-3 px-2"
        >
          {/* Eyebrow & Title */}
          <div>
            <div className="flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[0.16em] text-[#e8a34a] uppercase">
              <span className="size-2 rounded-full bg-[#e8a34a] shadow-[0_0_8px_#e8a34a] animate-pulse" />
              <span>{editorFr.workingDraft}</span>
            </div>
            <h1 className="mt-1 font-sans text-[19px] font-semibold tracking-tight text-[#f3ebdd]">
              {portfolioTitle}
            </h1>
          </div>

          {/* Technical stats line on right */}
          <div className="font-mono text-[11px] tracking-wider text-white/40">
            <span>
              {blocks.length} {editorFr.blocksCountSuffix}
            </span>
            <span className="mx-1.5 opacity-40">·</span>
            <span>
              {visibleCount} {editorFr.visibleCountSuffix}
            </span>
            <span className="mx-1.5 opacity-40">·</span>
            <span>{publicationStatus}</span>
          </div>
        </header>

        {/* The White Sheet (La feuille blanche) */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`sf-sheet-transition relative w-full overflow-hidden rounded-[12px] border border-black/10 bg-white text-[#1a120c] shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${
            viewportMode === "mobile" ? "max-w-[390px]" : "max-w-[900px]"
          }`}
        >
          {/* Sortable blocks container */}
          <SortableContext
            items={blocks.map((b) => b.idBloc)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col divide-y divide-black/5">
              {blocks.map((bloc, index) => (
                <SortableBlock
                  key={bloc.idBloc}
                  bloc={bloc}
                  isSelected={selectedBlockId === bloc.idBloc}
                  canMoveUp={index > 0}
                  canMoveDown={index < blocks.length - 1}
                  isDropTarget={overTargetId === bloc.idBloc}
                  onSelect={(id) => onSelectBlock(id)}
                  onMoveUp={() => onMoveBlock(index, "up")}
                  onMoveDown={() => onMoveBlock(index, "down")}
                  onToggleVisibility={() => onToggleVisibility(bloc.idBloc)}
                  onDuplicate={() => onDuplicateBlock(bloc.idBloc)}
                  onOpenPhotos={() => onOpenPhotoPicker?.(bloc.idBloc)}
                  onDelete={() => onDeleteBlock(bloc.idBloc)}
                />
              ))}
            </div>
          </SortableContext>

          {/* End of page drop area */}
          <div ref={setEndDropRef} className="p-6">
            <button
              type="button"
              onClick={onDropAreaClick}
              className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] border-2 border-dashed py-4 text-center font-mono text-xs font-semibold tracking-wider transition-all ${
                isEndOver
                  ? "border-[#e8a34a] bg-[#e8a34a]/15 text-[#e8a34a] scale-[1.01]"
                  : "border-[#e8a34a]/30 bg-[#e8a34a]/[0.02] text-[#e8a34a]/75 hover:border-[#e8a34a]/60 hover:bg-[#e8a34a]/[0.06] hover:text-[#e8a34a]"
              }`}
            >
              <Plus className="size-4" aria-hidden="true" />
              <span>{editorFr.dropBlockHere}</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
