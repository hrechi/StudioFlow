"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  Camera,
  Images,
  Mail,
  MessageSquareQuote,
  Package,
  Plus,
  Scaling,
  UserRound,
  Video,
  ChartNoAxesColumn,
  type LucideIcon,
} from "lucide-react";
import type { BlocPortfolio, TypeBloc } from "../portfolio.types";
import { editorFr } from "./editor/fr";

const groups: { name: keyof typeof editorFr.groups; types: TypeBloc[] }[] = [
  { name: "OPENING", types: ["HERO"] },
  { name: "STORY", types: ["A_PROPOS"] },
  { name: "WORK", types: ["GALERIE", "COLLECTION", "CASE_STUDY", "AVANT_APRES", "VIDEO"] },
  { name: "TRUST", types: ["TEMOIGNAGES", "SERVICES", "STATISTIQUES"] },
  { name: "CLOSING", types: ["CONTACT"] },
];

const icons: Record<TypeBloc, LucideIcon> = {
  HERO: Camera,
  A_PROPOS: UserRound,
  GALERIE: Images,
  COLLECTION: Package,
  CASE_STUDY: Images,
  AVANT_APRES: Scaling,
  TEMOIGNAGES: MessageSquareQuote,
  SERVICES: Package,
  STATISTIQUES: ChartNoAxesColumn,
  VIDEO: Video,
  CONTACT: Mail,
};

export function PortfolioBlockPalette({
  blocks,
  selectedBlockId,
  disabled,
  onAdd,
}: {
  blocks: BlocPortfolio[];
  selectedBlockId: string | null;
  disabled?: boolean;
  onAdd: (type: TypeBloc, index: number) => void;
}) {
  const insertAt = selectedBlockId
    ? blocks.findIndex((block) => block.idBloc === selectedBlockId) + 1
    : blocks.length;
  return (
    <div className="space-y-4">
      <div className="paletteHead">
        <h2>{editorFr.blocks}</h2>
        <span>{blocks.length}</span>
      </div>
      <p className="-mt-3 text-[11px] leading-relaxed text-muted-foreground">
        {editorFr.addBlockHint}
      </p>
      {groups.map((group) => (
        <section key={group.name} aria-label={`${editorFr.groups[group.name]} — blocs`}>
          <h3 className="mb-2 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            {editorFr.groups[group.name]}
          </h3>
          <div className="grid gap-2">
            {group.types.map((type) => {
              const count = blocks.filter((block) => block.type === type).length;
              return (
                <PaletteCard
                  key={type}
                  type={type}
                  count={count}
                  disabled={disabled || (type === "HERO" && count > 0)}
                  onAdd={(selectedType) => onAdd(selectedType, insertAt)}
                />
              );
            })}
          </div>
        </section>
      ))}
      <p className="paletteConsent">
        <span aria-hidden="true">♧</span>
        {editorFr.consentNote}
      </p>
    </div>
  );
}

function PaletteCard({
  type,
  count,
  disabled,
  onAdd,
}: {
  type: TypeBloc;
  count: number;
  disabled?: boolean;
  onAdd: (type: TypeBloc) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${type}`,
    data: { kind: "palette", type },
    disabled,
  });
  const Icon = icons[type];
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      type="button"
      disabled={disabled}
      title={type === "HERO" && disabled ? editorFr.oneHero : undefined}
      onClick={() => onAdd(type)}
      className={`paletteCard ${isDragging ? "paletteDragging" : ""}`}
    >
      <span className="paletteIcon">
        <Icon aria-hidden="true" />
      </span>
      <span className="paletteBody">
        <span className="paletteName">
          {editorFr.blockNames[type]} {count > 0 && <em>{count}</em>}
        </span>
        <span className="paletteHint">{editorFr.blockHints[type]}</span>
      </span>
      <Plus className="palettePlus" aria-hidden="true" />
    </button>
  );
}

export function CanvasEndDrop({ empty }: { empty: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas-end" });
  return (
    <div
      ref={setNodeRef}
      className={`canvasEndDrop ${isOver ? "canvasEndDropActive" : ""}`}
      aria-label={empty ? editorFr.emptyPage : editorFr.dragEnd}
    >
      {empty ? editorFr.emptyPage : editorFr.dragEnd}
    </div>
  );
}
