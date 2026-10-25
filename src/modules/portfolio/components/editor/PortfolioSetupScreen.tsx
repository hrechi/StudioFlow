"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, FileText, LayoutTemplate, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { initialiserPortfolioAction } from "../../portfolio.actions";

type PortfolioSetupScreenProps = {
  photographerName: string;
  hasExistingPortfolio?: boolean;
};

const SPECIALTIES = [
  "Mariage",
  "Portrait",
  "Couple",
  "Mode",
  "Événement",
  "Commercial",
  "Architecture",
  "Voyage",
];

export function PortfolioSetupScreen({
  photographerName,
  hasExistingPortfolio = false,
}: PortfolioSetupScreenProps) {
  const router = useRouter();

  // Form states
  const [titre, setTitre] = useState(photographerName || "Mon Portfolio");
  const [slogan, setSlogan] = useState("Photographe de mariage & portraits intimes");
  const [ville, setVille] = useState("Paris");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([
    "Mariage",
    "Portrait",
  ]);
  const [structureInitiale, setStructureInitiale] = useState<"MODELE" | "VIDE">("MODELE");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleSpecialty = (sp: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(sp) ? prev.filter((s) => s !== sp) : [...prev, sp]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim()) {
      toast.error("Veuillez saisir votre nom ou le titre de votre portfolio.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await initialiserPortfolioAction({
        titre: titre.trim(),
        slogan: slogan.trim(),
        ville: ville.trim(),
        specialites: selectedSpecialties,
        structureInitiale,
      });

      if (res.ok) {
        toast.success(
          structureInitiale === "VIDE"
            ? "Portfolio vierge créé avec succès !"
            : "Portfolio configuré avec le template !"
        );
        router.push("/dashboard/portfolio");
        router.refresh();
      } else {
        toast.error(res.error || "Erreur lors de la création du portfolio.");
      }
    } catch {
      toast.error("Une erreur inattendue est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0905] text-[#f3ebdd] flex flex-col justify-between selection:bg-[#e8a34a] selection:text-black">
      {/* Top Header */}
      <header className="border-b border-white/[0.08] bg-[#140d08] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70 transition-colors hover:border-[#e8a34a]/40 hover:text-[#e8a34a]"
          >
            <ArrowLeft className="size-3.5" />
            <span>Tableau de bord</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#e8a34a] shadow-[0_0_8px_#e8a34a]" />
            <span className="font-sans text-sm font-semibold tracking-tight text-[#f3ebdd]">
              StudioFlow
            </span>
          </div>
        </div>

        {hasExistingPortfolio && (
          <Link
            href="/dashboard/portfolio"
            className="text-xs text-[#e8a34a] hover:underline"
          >
            Annuler et ouvrir mon portfolio existant →
          </Link>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#19110c] p-6 sm:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-200">
          {/* Eyebrow & Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e8a34a]/30 bg-[#e8a34a]/10 px-3 py-1 text-[#e8a34a] mb-3">
              <Sparkles className="size-3.5" />
              <span className="font-mono text-[10px] font-semibold tracking-wider uppercase">
                Configuration du Portfolio
              </span>
            </div>
            <h1 className="font-sans text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Bienvenue, {photographerName}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-[#9a8f82] max-w-md mx-auto">
              Renseignez vos coordonnées de base et choisissez votre point de départ pour votre portfolio professionnel.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. Name & Title */}
            <div>
              <label htmlFor="portfolio-title" className="block text-xs font-medium text-white/80 mb-1.5">
                Nom du photographe / Titre du portfolio
              </label>
              <input
                id="portfolio-title"
                type="text"
                required
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 font-sans text-sm text-white placeholder:text-white/30 focus:border-[#e8a34a] focus:outline-hidden transition-colors"
                placeholder="Ex: Anas Ben Ibrahim"
              />
            </div>

            {/* 2. Slogan */}
            <div>
              <label htmlFor="portfolio-slogan" className="block text-xs font-medium text-white/80 mb-1.5">
                Slogan / Accroche professionnelle
              </label>
              <input
                id="portfolio-slogan"
                type="text"
                value={slogan}
                onChange={(e) => setSlogan(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 font-sans text-sm text-white placeholder:text-white/30 focus:border-[#e8a34a] focus:outline-hidden transition-colors"
                placeholder="Ex: Photographe de mariage & portraits intimes"
              />
            </div>

            {/* 3. Ville & Spécialités */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="portfolio-city" className="block text-xs font-medium text-white/80 mb-1.5">
                  Ville / Région
                </label>
                <input
                  id="portfolio-city"
                  type="text"
                  value={ville}
                  onChange={(e) => setVille(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/40 px-3.5 py-2.5 font-sans text-sm text-white placeholder:text-white/30 focus:border-[#e8a34a] focus:outline-hidden transition-colors"
                  placeholder="Ex: Paris, Bordeaux, Tunis..."
                />
              </div>

              <div>
                <span className="block text-xs font-medium text-white/80 mb-1.5">
                  Spécialités
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SPECIALTIES.map((sp) => {
                    const active = selectedSpecialties.includes(sp);
                    return (
                      <button
                        key={sp}
                        type="button"
                        onClick={() => toggleSpecialty(sp)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                          active
                            ? "bg-[#e8a34a] text-black shadow-xs"
                            : "border border-white/10 bg-white/5 text-white/60 hover:text-white hover:border-white/20"
                        }`}
                      >
                        {sp}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 4. Choix : Blank page vs Template réglé */}
            <div className="pt-2">
              <label className="block text-xs font-medium text-white/80 mb-3">
                Choisissez votre point de départ :
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Option 1: Template pré-réglé */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setStructureInitiale("MODELE")}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setStructureInitiale("MODELE")}
                  className={`relative cursor-pointer rounded-xl border p-4 text-left transition-all ${
                    structureInitiale === "MODELE"
                      ? "border-[#e8a34a] bg-[#e8a34a]/10 ring-2 ring-[#e8a34a]/50 shadow-lg"
                      : "border-white/10 bg-black/30 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-[#e8a34a]">
                      <LayoutTemplate className="size-4" />
                      <span className="font-sans text-xs font-bold uppercase tracking-wider">
                        Template réglé
                      </span>
                    </div>
                    {structureInitiale === "MODELE" && (
                      <div className="flex size-5 items-center justify-center rounded-full bg-[#e8a34a] text-black">
                        <Check className="size-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-white/90 font-medium">
                    Template StudioFlow complet
                  </p>
                  <p className="mt-1 text-[11px] text-[#9a8f82] leading-relaxed">
                    Démarrez avec tous les blocs pré-remplis (Hero, À propos, Galerie, Étude de cas, Avant/Après, Témoignages, Forfaits, Contact). Vous pourrez tout modifier facilement.
                  </p>
                </div>

                {/* Option 2: Blank page (Créer à zéro) */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setStructureInitiale("VIDE")}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setStructureInitiale("VIDE")}
                  className={`relative cursor-pointer rounded-xl border p-4 text-left transition-all ${
                    structureInitiale === "VIDE"
                      ? "border-[#e8a34a] bg-[#e8a34a]/10 ring-2 ring-[#e8a34a]/50 shadow-lg"
                      : "border-white/10 bg-black/30 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-white/70">
                      <FileText className="size-4" />
                      <span className="font-sans text-xs font-bold uppercase tracking-wider">
                        Page blanche
                      </span>
                    </div>
                    {structureInitiale === "VIDE" && (
                      <div className="flex size-5 items-center justify-center rounded-full bg-[#e8a34a] text-black">
                        <Check className="size-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-white/90 font-medium">
                    Créer mon portfolio à zéro
                  </p>
                  <p className="mt-1 text-[11px] text-[#9a8f82] leading-relaxed">
                    Démarrez avec une page vierge épurée au nom d&apos;{photographerName}. Ajoutez vos blocs un par un depuis la palette selon votre propre vision.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#e8a34a] py-3.5 font-sans text-sm font-semibold text-[#0f0905] shadow-[0_4px_16px_rgba(232,163,74,0.3)] transition-all hover:bg-[#f0b25e] hover:shadow-[0_6px_20px_rgba(232,163,74,0.4)] disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Création du portfolio en cours...</span>
                  </>
                ) : (
                  <span>Ouvrir l&apos;atelier de création de portfolio →</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-4 text-center text-xs text-white/30">
        StudioFlow · Gestion du Portfolio professionnel
      </footer>
    </div>
  );
}

