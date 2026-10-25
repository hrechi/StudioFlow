"use client";

import { useState } from "react";
import { Star, CheckCircle2, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { noterPortfolioAction } from "../../portfolio.actions";

type PortfolioRatingWidgetProps = {
  slug: string;
  noteMoyenne?: number;
  nombreAvis?: number;
  accentColor?: string;
};

export function PortfolioRatingWidget({
  slug,
  noteMoyenne = 5,
  nombreAvis = 0,
  accentColor = "#e8a34a",
}: PortfolioRatingWidgetProps) {
  const [currentRating, setCurrentRating] = useState(noteMoyenne);
  const [totalReviews, setTotalReviews] = useState(nombreAvis);
  const [selectedStars, setSelectedStars] = useState<number>(5);
  const [hoveredStars, setHoveredStars] = useState<number | null>(null);
  const [authorName, setAuthorName] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStars < 1 || selectedStars > 5) {
      toast.error("Veuillez sélectionner entre 1 et 5 étoiles.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await noterPortfolioAction({
        slug,
        note: selectedStars,
        auteur: authorName.trim() || undefined,
        commentaire: comment.trim() || undefined,
      });

      if (res.ok && res.data) {
        setCurrentRating(res.data.noteMoyenne);
        setTotalReviews(res.data.nombreAvis);
        setHasSubmitted(true);
        toast.success("Merci ! Votre avis a bien été enregistré.");
      } else {
        toast.error(!res.ok ? res.error : "Impossible d'enregistrer la note.");
      }
    } catch {
      toast.error("Erreur de connexion.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeStars = hoveredStars !== null ? hoveredStars : selectedStars;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-xs sm:p-8">
      {/* Header with average and total */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-white/[0.06] pb-6 sm:flex-row sm:items-center">
        <div>
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-[#9a8f82]">
            Avis des visiteurs
          </span>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="font-serif text-3xl font-bold tracking-tight" style={{ color: accentColor }}>
              {currentRating.toFixed(1)}
            </span>
            <div className="flex items-center gap-1 text-[#e8a34a]">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`size-4 ${
                    star <= Math.round(currentRating)
                      ? "fill-[#e8a34a] text-[#e8a34a]"
                      : "text-white/20"
                  }`}
                  aria-hidden="true"
                />
              ))}
            </div>
            <span className="text-xs text-[#9a8f82]">
              ({totalReviews} {totalReviews > 1 ? "avis" : "avis"})
            </span>
          </div>
        </div>

        {!hasSubmitted && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 font-sans text-xs font-medium text-[#f3ebdd] transition-all hover:border-[#e8a34a]/40 hover:bg-[#e8a34a]/10 hover:text-[#e8a34a]"
          >
            <MessageSquarePlus className="size-3.5 text-[#e8a34a]" />
            <span>Noter ce portfolio (max 5★)</span>
          </button>
        )}
      </div>

      {/* Success feedback */}
      {hasSubmitted && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-400">
          <CheckCircle2 className="size-5 shrink-0" />
          <p className="text-xs leading-relaxed">
            Votre note de <strong className="font-semibold">{selectedStars} / 5 étoiles</strong> a été publiée avec succès !
          </p>
        </div>
      )}

      {/* Interactive rating form */}
      {showForm && !hasSubmitted && (
        <form onSubmit={handleSubmitRating} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#9a8f82]">
              Votre évaluation
            </label>
            <div className="mt-2 flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedStars(star)}
                  onMouseEnter={() => setHoveredStars(star)}
                  onMouseLeave={() => setHoveredStars(null)}
                  className="p-1 transition-transform hover:scale-125 focus:outline-hidden"
                  aria-label={`${star} étoile${star > 1 ? "s" : ""}`}
                >
                  <Star
                    className={`size-6 transition-colors ${
                      star <= activeStars
                        ? "fill-[#e8a34a] text-[#e8a34a]"
                        : "text-white/20"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 font-mono text-xs font-semibold" style={{ color: accentColor }}>
                {activeStars} / 5 étoiles
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="visitor-name" className="block text-xs text-[#9a8f82]">
                Votre nom ou prénom (optionnel)
              </label>
              <input
                id="visitor-name"
                type="text"
                placeholder="Ex. Sophie L."
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                maxLength={80}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-sans text-xs text-[#f3ebdd] placeholder:text-white/20 focus:border-[#e8a34a] focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label htmlFor="visitor-comment" className="block text-xs text-[#9a8f82]">
              Votre ressenti / commentaire (optionnel)
            </label>
            <textarea
              id="visitor-comment"
              rows={3}
              placeholder="Des photos magnifiques, travail de haute voltige !"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={600}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-3 font-sans text-xs text-[#f3ebdd] placeholder:text-white/20 focus:border-[#e8a34a] focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-[#e8a34a] px-5 py-2 font-sans text-xs font-semibold text-[#0f0905] transition-all hover:bg-[#d69238] active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? "Publication..." : "Envoyer ma note"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="font-sans text-xs text-[#9a8f82] hover:text-[#f3ebdd]"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
