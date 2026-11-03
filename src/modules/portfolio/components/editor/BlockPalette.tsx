"use client";

import { Check, Loader2, ShieldCheck, Sparkles, X } from "lucide-react";
import type { BlocPortfolio, TypeBloc } from "../../portfolio.types";
import { editorFr } from "./fr";
import { PaletteCard } from "./PaletteCard";
import { PALETTE_GROUPS, type BlockGroup } from "./paletteData";

type BlockPaletteProps = {
  totalBlocksCount?: number;
  blockUsageCounts?: Partial<Record<TypeBloc, number>>;
  onAddBlock?: (type: TypeBloc) => void;
  onSuggestLayout?: () => void;
  layoutSuggestion?: BlocPortfolio[] | null;
  layoutSuggestionPending?: boolean;
  onApplyLayoutSuggestion?: () => void;
  onDismissLayoutSuggestion?: () => void;
  className?: string;
};

export function BlockPalette({
  totalBlocksCount = 10,
  blockUsageCounts = {},
  onAddBlock,
  onSuggestLayout,
  layoutSuggestion,
  layoutSuggestionPending = false,
  onApplyLayoutSuggestion,
  onDismissLayoutSuggestion,
  className = "",
}: BlockPaletteProps) {
  return (
    <aside
      aria-label="Palette de blocs"
      className={`flex h-full w-[236px] flex-col border-r border-white/[0.08] bg-[#160e0a] select-none max-[1240px]:w-[210px] ${className}`}
    >
      {/* Scrollable items list */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4">
        {/* Header: Blocks + amber counter */}
        <div className="flex items-center justify-between">
          <h2 className="font-sans text-[15px] font-semibold tracking-tight text-[#f3ebdd]">
            {editorFr.blocks}
          </h2>
          <span className="rounded bg-[#e8a34a]/15 px-1.5 py-0.5 font-mono text-xs font-semibold text-[#e8a34a]">
            {totalBlocksCount}
          </span>
        </div>

        {/* Catchphrase */}
        <p className="mt-1 text-[11px] leading-relaxed text-[#9a8f82]">{editorFr.addBlockHint}</p>

        {onSuggestLayout && (
          <div className="mt-3 rounded-lg border border-violet-400/20 bg-violet-400/[0.06] p-2.5">
            <button
              type="button"
              onClick={onSuggestLayout}
              disabled={layoutSuggestionPending}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-violet-300/20 px-2 py-2 text-xs font-semibold text-violet-100 transition-colors hover:bg-violet-300/10 disabled:opacity-50"
            >
              {layoutSuggestionPending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="size-3.5" aria-hidden="true" />
              )}
              Suggérer l’ordre des blocs
            </button>
            {layoutSuggestion && (
              <div className="mt-2 space-y-2">
                <p className="text-[10px] leading-relaxed text-white/60">
                  Ordre proposé :{" "}
                  {layoutSuggestion.map((block) => editorFr.blockNames[block.type]).join(" → ")}
                </p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={onApplyLayoutSuggestion}
                    className="flex flex-1 items-center justify-center gap-1 rounded bg-violet-300/15 px-2 py-1.5 text-[10px] font-semibold text-violet-100 hover:bg-violet-300/25"
                  >
                    <Check className="size-3" aria-hidden="true" /> Appliquer
                  </button>
                  <button
                    type="button"
                    onClick={onDismissLayoutSuggestion}
                    className="flex items-center justify-center gap-1 rounded px-2 py-1.5 text-[10px] text-white/55 hover:bg-white/5 hover:text-white"
                  >
                    <X className="size-3" aria-hidden="true" /> Ignorer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Groups */}
        <div className="mt-5 space-y-5">
          {PALETTE_GROUPS.map((group: BlockGroup) => (
            <section key={group.id} aria-label={`${group.name} — blocs`}>
              <h3 className="mb-2 font-mono text-[9px] font-semibold tracking-[0.16em] text-[#6f655a] uppercase">
                {group.name}
              </h3>
              <div className="space-y-1.5">
                {group.types.map((type: TypeBloc) => {
                  const count = blockUsageCounts[type] || 0;
                  const isHeroDisabled = type === "HERO" && count > 0;

                  return (
                    <PaletteCard
                      key={type}
                      type={type}
                      count={count}
                      disabled={isHeroDisabled}
                      onAdd={(addedType) => onAddBlock?.(addedType)}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Footer rule pinned at bottom: Consent rule */}
      <div className="shrink-0 border-t border-white/[0.08] bg-[#140d08] p-3">
        <div className="flex items-start gap-2">
          <ShieldCheck className="size-3.5 shrink-0 text-[#e8a34a]" aria-hidden="true" />
          <p className="text-[10px] leading-tight text-white/50">{editorFr.consentRuleNote}</p>
        </div>
      </div>
    </aside>
  );
}
