"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Clock,
  ExternalLink,
  Loader2,
  Monitor,
  Redo2,
  RefreshCw,
  Smartphone,
  Sparkles,
  Undo2,
  SlidersHorizontal,
  LayoutGrid,
} from "lucide-react";
import { editorFr } from "./fr";

export type SaveStatus = "saved" | "saving" | "error";
export type ViewportMode = "desktop" | "mobile";

type EditorTopBarProps = {
  portfolioSlug?: string;
  isSaving?: boolean;
  hasUnpublishedChanges?: boolean;
  isPublished?: boolean;
  viewportMode: ViewportMode;
  onViewportChange: (mode: ViewportMode) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onPublish?: () => void;
  onTogglePaletteDrawer?: () => void;
  onToggleInspectorDrawer?: () => void;
};

export function EditorTopBar({
  portfolioSlug = "portfolio",
  isSaving = false,
  hasUnpublishedChanges = true,
  isPublished = false,
  viewportMode,
  onViewportChange,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onPublish,
  onTogglePaletteDrawer,
  onToggleInspectorDrawer,
}: EditorTopBarProps) {
  return (
    <header className="relative z-30 flex h-[60px] w-full flex-shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#140d08] px-4 select-none">
      {/* Left side: StudioFlow brand + Breadcrumb */}
      <div className="flex items-center gap-3">
        {/* Mobile drawer button: Palette */}
        {onTogglePaletteDrawer && (
          <button
            type="button"
            onClick={onTogglePaletteDrawer}
            aria-label={editorFr.drawerBlocks}
            className="flex size-8 items-center justify-center rounded-md border border-white/10 text-white/60 hover:text-white min-[1100px]:hidden"
          >
            <LayoutGrid className="size-4 text-[#e8a34a]" />
          </button>
        )}

        {/* StudioFlow brand with glowing amber dot */}
        <Link
          href="/dashboard"
          className="group flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <span
            className="size-2 rounded-full bg-[#e8a34a] shadow-[0_0_8px_#e8a34a]"
            aria-hidden="true"
          />
          <span className="font-sans text-[15px] font-semibold tracking-tight text-[#f3ebdd]">
            {editorFr.appName}
          </span>
        </Link>

        {/* Return to Dashboard link */}
        <Link
          href="/dashboard"
          title="Retour au tableau de bord"
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white/70 transition-all hover:border-[#e8a34a]/40 hover:bg-[#e8a34a]/10 hover:text-[#e8a34a]"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          <span className="font-sans text-[11px] font-medium hidden sm:inline">Tableau de bord</span>
        </Link>
      </div>

      {/* Center status: Saved badge + Unpublished changes */}
      <div className="flex items-center gap-2.5">
        {/* Saved / Saving Badge */}
        <div
          className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1"
          role="status"
          aria-live="polite"
        >
          {isSaving ? (
            <>
              <Loader2 className="size-3 animate-spin text-[#e8a34a]" aria-hidden="true" />
              <span className="font-mono text-[9px] font-medium tracking-[0.16em] text-[#e8a34a] uppercase">
                {editorFr.saving}
              </span>
            </>
          ) : (
            <>
              <Check className="size-3 text-[#e8a34a]" aria-hidden="true" />
              <span className="font-mono text-[9px] font-medium tracking-[0.16em] text-white/70 uppercase">
                {editorFr.saved}
              </span>
            </>
          )}
        </div>

        {/* Unpublished changes pill: only if draft is newer than published or never published */}
        {hasUnpublishedChanges && (
          <div
            className="hidden items-center gap-1.5 rounded-full border border-[#e8a34a]/30 bg-[#e8a34a]/10 px-2.5 py-1 text-[#e8a34a] sm:flex"
            role="status"
          >
            <Clock className="size-3 shrink-0" aria-hidden="true" />
            <span className="font-mono text-[9px] font-medium tracking-[0.16em] uppercase">
              {editorFr.unpublishedChanges}
            </span>
          </div>
        )}
      </div>

      {/* Right controls: Undo/Redo + Viewport toggle + View page + Publish button */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Undo / Redo */}
        <div className="flex items-center gap-1" role="group" aria-label="Historique">
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            title={editorFr.undo}
            aria-label={editorFr.undo}
            className="flex size-[30px] items-center justify-center rounded-[6px] border border-white/10 text-white/70 transition-colors hover:border-white/25 hover:text-white disabled:pointer-events-none disabled:opacity-30"
          >
            <Undo2 className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={onRedo}
            title={editorFr.redo}
            aria-label={editorFr.redo}
            className="flex size-[30px] items-center justify-center rounded-[6px] border border-white/10 text-white/70 transition-colors hover:border-white/25 hover:text-white disabled:pointer-events-none disabled:opacity-30"
          >
            <Redo2 className="size-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* Viewport switch: Desktop / Mobile */}
        <div
          className="flex items-center rounded-full border border-white/10 bg-black/40 p-0.5"
          role="radiogroup"
          aria-label="Mode d'affichage"
        >
          <button
            type="button"
            role="radio"
            aria-checked={viewportMode === "desktop"}
            onClick={() => onViewportChange("desktop")}
            className={`flex size-7 items-center justify-center rounded-full transition-all ${
              viewportMode === "desktop"
                ? "bg-white/15 text-white shadow-xs"
                : "text-white/40 hover:text-white/75"
            }`}
            title={editorFr.desktop}
            aria-label={editorFr.desktop}
          >
            <Monitor className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={viewportMode === "mobile"}
            onClick={() => onViewportChange("mobile")}
            className={`flex size-7 items-center justify-center rounded-full transition-all ${
              viewportMode === "mobile"
                ? "bg-white/15 text-white shadow-xs"
                : "text-white/40 hover:text-white/75"
            }`}
            title={editorFr.mobile}
            aria-label={editorFr.mobile}
          >
            <Smartphone className="size-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* Reconfigure / Change template button */}
        <Link
          href="/dashboard/portfolio?setup=true"
          title="Reconfigurer (Page blanche ou Template)"
          className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white/70 transition-colors hover:border-[#e8a34a]/50 hover:bg-[#e8a34a]/10 hover:text-[#e8a34a] sm:flex"
        >
          <Sparkles className="size-3 text-[#e8a34a]" />
          <span className="font-sans text-[11px]">Modèle</span>
        </Link>

        {/* View page button: visible once published */}
        {isPublished && (
          <a
            href={`/portfolio/${portfolioSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/80 transition-colors hover:border-white/30 hover:text-white md:flex"
          >
            <span>{editorFr.viewPage}</span>
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        )}

        {/* Publish button */}
        <button
          type="button"
          onClick={onPublish}
          className="flex items-center gap-1.5 rounded-full bg-[#e8a34a] px-4 py-1.5 font-sans text-xs font-semibold text-[#0f0905] shadow-[0_2px_8px_rgba(232,163,74,0.25)] transition-all hover:-translate-y-0.5 hover:bg-[#f0b25e] active:translate-y-0"
        >
          {isPublished ? (
            <>
              <RefreshCw className="size-3" aria-hidden="true" />
              <span>{editorFr.publishUpdate}</span>
            </>
          ) : (
            <span>{editorFr.publish}</span>
          )}
        </button>

        {/* Mobile drawer button: Inspector */}
        {onToggleInspectorDrawer && (
          <button
            type="button"
            onClick={onToggleInspectorDrawer}
            aria-label={editorFr.drawerInspector}
            className="flex size-8 items-center justify-center rounded-md border border-white/10 text-white/60 hover:text-white min-[1100px]:hidden"
          >
            <SlidersHorizontal className="size-4 text-[#e8a34a]" />
          </button>
        )}
      </div>
    </header>
  );
}

