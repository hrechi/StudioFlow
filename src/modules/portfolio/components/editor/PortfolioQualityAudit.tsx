"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Sparkles, TriangleAlert, X } from "lucide-react";
import type { PortfolioQualityAudit, TypeBloc } from "../../portfolio.types";

type PortfolioQualityAuditProps = {
  audit: PortfolioQualityAudit | null;
  isLoading: boolean;
  onClose: () => void;
  onAddBlock: (type: TypeBloc) => void;
};

export function PortfolioQualityAudit({
  audit,
  isLoading,
  onClose,
  onAddBlock,
}: PortfolioQualityAuditProps) {
  const [addedBlocks, setAddedBlocks] = useState<Set<TypeBloc>>(new Set());

  function addBlock(type: TypeBloc) {
    onAddBlock(type);
    setAddedBlocks((current) => new Set(current).add(type));
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-end bg-black/60 p-4 backdrop-blur-sm sm:p-6">
      <section
        aria-label="Audit IA du portfolio"
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1a100b] text-[#f3ebdd] shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
      >
        <header className="flex items-start justify-between border-b border-white/10 p-5 sm:p-6">
          <div>
            <div className="flex items-center gap-2 text-[#e8a34a]">
              <Sparkles className="size-4" aria-hidden="true" />
              <p className="font-mono text-[10px] font-semibold tracking-[0.16em] uppercase">
                Audit IA
              </p>
            </div>
            <h2 className="mt-2 text-xl font-semibold">Qualité de votre portfolio</h2>
            <p className="mt-1 text-sm text-white/55">
              Une analyse avant publication pour repérer les points forts et les améliorations.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer l'audit"
            className="rounded-lg p-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="overflow-y-auto p-5 sm:p-6">
          {isLoading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="size-7 animate-spin text-[#e8a34a]" />
              <p className="text-sm text-white/70">Analyse de votre portfolio en cours...</p>
            </div>
          ) : audit ? (
            <div className="space-y-7">
              <div className="flex items-center gap-5 rounded-xl border border-[#e8a34a]/20 bg-[#e8a34a]/[0.07] p-5">
                <div className="flex size-24 shrink-0 items-center justify-center rounded-full border-4 border-[#e8a34a]/30">
                  <span className="font-serif text-3xl font-bold text-[#e8a34a]">
                    {audit.score}
                  </span>
                </div>
                <div>
                  <p className="font-semibold">Score global</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/60">
                    {audit.score >= 80
                      ? "Votre portfolio est prêt à convaincre de nouveaux clients."
                      : audit.score >= 60
                        ? "Votre base est solide. Quelques ajustements peuvent améliorer son impact."
                        : "Quelques améliorations prioritaires sont recommandées avant publication."}
                  </p>
                </div>
              </div>

              {!audit.aiSuggestionsAvailable && (
                <p className="rounded-lg border border-[#e8a34a]/20 bg-[#e8a34a]/[0.06] p-3 text-xs leading-relaxed text-white/65">
                  Le score et la checklist sont disponibles. Les conseils Gemini n’ont pas pu être
                  chargés cette fois ; réessayez pour obtenir des recommandations IA.
                </p>
              )}

              <section>
                <h3 className="mb-3 text-sm font-semibold">Checklist avant publication</h3>
                <ul className="space-y-2">
                  {audit.checksPublication.map((check) => {
                    const ready = check.status === "READY";
                    const Icon = ready ? CheckCircle2 : TriangleAlert;
                    return (
                      <li
                        key={check.id}
                        className="flex gap-3 rounded-lg border border-white/[0.08] bg-white/[0.03] p-3"
                      >
                        <Icon
                          className={`mt-0.5 size-4 shrink-0 ${ready ? "text-emerald-400" : "text-[#e8a34a]"}`}
                          aria-hidden="true"
                        />
                        <div>
                          <p className="text-sm">{check.label}</p>
                          <p className="mt-1 text-xs leading-relaxed text-white/50">
                            {check.detail}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <div className="grid gap-6 sm:grid-cols-2">
                <AuditList title="Points forts" items={audit.strengths} positive />
                <AuditList title="À améliorer" items={audit.improvements} positive={false} />
              </div>

              <div className="rounded-xl border border-[#e8a34a]/20 bg-[#e8a34a]/[0.06] p-4">
                <h3 className="text-sm font-semibold">
                  Structure recommandée pour un portfolio performant
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-white/55">
                  Cette structure équilibre présentation, preuve sociale, contenu visuel et
                  conversion.
                </p>
                <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                  {audit.idealStructure.map((type, index) => (
                    <li key={type} className="flex items-center gap-2 text-xs text-white/75">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#e8a34a]/20 font-mono text-[10px] text-[#e8a34a]">
                        {index + 1}
                      </span>
                      {blockLabel(type)}
                    </li>
                  ))}
                </ol>
              </div>

              {audit.missingBlocks.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold">Blocs recommandés</h3>
                  <ul className="space-y-2">
                    {audit.missingBlocks.map((block) => (
                      <li
                        key={block.type}
                        className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-white/[0.03] p-3"
                      >
                        <div>
                          <p className="text-sm">{block.label}</p>
                          <p className="mt-1 text-xs leading-relaxed text-white/50">
                            {block.reason}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => addBlock(block.type)}
                          disabled={addedBlocks.has(block.type)}
                          className="shrink-0 rounded-lg bg-[#e8a34a] px-3 py-2 text-xs font-semibold text-[#0f0905] transition-colors hover:bg-[#f0b25e]"
                        >
                          {addedBlocks.has(block.type) ? "Ajouté" : "Ajouter"}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="mb-3 text-sm font-semibold">Détail des critères</h3>
                <ul className="space-y-2">
                  {audit.criteria.map((criterion) => (
                    <li
                      key={criterion.id}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm">{criterion.label}</span>
                        <span className="font-mono text-xs text-[#e8a34a]">
                          {criterion.score}/{criterion.maxScore}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full ${
                            criterion.status === "GOOD"
                              ? "bg-emerald-400"
                              : criterion.status === "WARNING"
                                ? "bg-[#e8a34a]"
                                : "bg-rose-400"
                          }`}
                          style={{ width: `${criterion.score * 10}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-white/50">
                        {criterion.detail}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-white/60">
              Lancez l&apos;analyse pour obtenir votre score.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function blockLabel(type: TypeBloc): string {
  const labels: Partial<Record<TypeBloc, string>> = {
    HERO: "Hero",
    A_PROPOS: "À propos",
    GALERIE: "Galerie",
    COLLECTION: "Collection",
    CASE_STUDY: "Étude de cas",
    AVANT_APRES: "Avant / Après",
    TEMOIGNAGES: "Témoignages",
    SERVICES: "Services",
    STATISTIQUES: "Statistiques",
    VIDEO: "Vidéo",
    CONTACT: "Contact",
  };
  return labels[type] ?? type;
}

function AuditList({
  title,
  items,
  positive,
}: {
  title: string;
  items: string[];
  positive: boolean;
}) {
  const Icon = positive ? CheckCircle2 : TriangleAlert;
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-xs leading-relaxed text-white/65">
            <Icon
              className={`mt-0.5 size-3.5 shrink-0 ${positive ? "text-emerald-400" : "text-[#e8a34a]"}`}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
