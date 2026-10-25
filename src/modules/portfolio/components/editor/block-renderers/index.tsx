"use client";

import { useState } from "react";
import {
  Calendar,
  Clock,
  Globe,
  Images,
  Mail,
  MapPin,
  Play,
  Quote,
  Star,
  Video,
} from "lucide-react";

function SocialIcon({ reseau }: { reseau: string }) {
  switch (reseau) {
    case "INSTAGRAM":
      return (
        <svg className="size-3.5 fill-current text-[#e8a34a]" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      );
    case "FACEBOOK":
      return (
        <svg className="size-3.5 fill-current text-[#e8a34a]" viewBox="0 0 24 24">
          <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.678 5H18V0h-3.808C10.597 0 9 1.583 9 4.615V8z" />
        </svg>
      );
    case "YOUTUBE":
      return (
        <svg className="size-3.5 fill-current text-[#e8a34a]" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );
    case "TIKTOK":
      return <Video className="size-3.5 text-[#e8a34a]" />;
    default:
      return <Globe className="size-3.5 text-[#e8a34a]" />;
  }
}
import type { BlocPortfolio } from "../../../portfolio.types";
import { editorFr } from "../fr";
import { SafeImage } from "@/components/shared/safe-image";

export function RenderBlockContent({
  bloc,
  onOpenPhotoPicker,
}: {
  bloc: BlocPortfolio;
  onOpenPhotoPicker?: (blocId: string) => void;
}) {
  const conf = bloc.configuration || {};

  switch (bloc.type) {
    case "HERO": {
      const heading = (conf.titre as string) || "Portfolio";
      const subHeading = (conf.sousTitre as string) || "A late-summer wedding at Château de la Rivière";
      const buttonLabel = (conf.texteBouton as string) || editorFr.labels.enquiry;
      const tagline = (conf.tagline as string) || "BORDEAUX · MARIAGE · PORTRAIT";
      const cover =
        (conf.photoCouverture as string) ||
        bloc.elements?.[0]?.media?.url ||
        "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80";

      return (
        <div className="relative isolate flex min-h-[420px] w-full flex-col justify-end overflow-hidden p-8 text-white sm:min-h-[480px] sm:p-12">
          {/* Cover image with subtle gradient overlay */}
          <div className="absolute inset-0 z-0 bg-neutral-900">
            <SafeImage
              src={cover}
              alt={heading}
              fill
              unoptimized
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
          </div>

          <div className="relative z-10 max-w-2xl">
            <div className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#e8a34a] uppercase">
              {tagline}
            </div>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-5xl">
              {heading}
            </h2>
            <p className="mt-3 text-sm text-white/80 sm:text-base leading-relaxed">
              {subHeading}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#e8a34a] px-6 py-2.5 font-sans text-xs font-semibold text-[#0f0905] shadow-lg transition-transform hover:scale-105">
                {buttonLabel}
              </span>

              {/* Social networks in Hero */}
              {Array.isArray(conf.liensSociaux) && conf.liensSociaux.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {(conf.liensSociaux as { reseau: string; url: string }[]).map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/50 px-3 py-1 font-mono text-[10px] text-white/90 backdrop-blur-xs transition-colors hover:border-[#e8a34a] hover:text-[#e8a34a]"
                    >
                      <SocialIcon reseau={link.reseau} />
                      <span className="capitalize">{link.reseau.toLowerCase()}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    case "A_PROPOS": {
      const name = (conf.titre as string) || "À propos";
      const text = (conf.texte as string) || "Capturing delicate, candid memories in natural light...";
      const years = (conf.anneesExperience as number) ?? 11;
      const portrait =
        (conf.photoPortrait as string) ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80";

      return (
        <div className="border-b border-[#e7dfcf] bg-[#f6f1e9] p-8 text-[#1a120c] sm:p-12">
          <div className="grid gap-8 md:grid-cols-3 md:items-center">
            <div className="md:col-span-2">
              <div className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#6f655a] uppercase">
                {editorFr.blockNames.A_PROPOS}
              </div>
              <h3 className="mt-1 font-sans text-2xl font-bold text-[#1a120c] sm:text-3xl">
                {name}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-[#3d2f26] sm:text-base">
                {text}
              </p>
              <div className="mt-6 flex items-baseline gap-3">
                <span className="font-serif text-4xl font-bold italic text-[#e8a34a]">
                  {years}
                </span>
                <span className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#6f655a] uppercase">
                  {editorFr.labels.aboutExperience}
                </span>
              </div>
            </div>

            <div className="flex justify-center md:justify-end">
              <div className="relative size-36 overflow-hidden rounded-2xl border border-black/10 bg-[#e8decd] shadow-md sm:size-44">
                <SafeImage
                  src={portrait}
                  alt={name}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      );
    }

    case "GALERIE":
    case "COLLECTION": {
      const title = (conf.titre as string) || (conf.categorie as string) || "MARIAGE";
      const cols = Number(conf.colonnes) || 3;
      const elements = bloc.elements || [];

      return (
        <div className="bg-white p-8 sm:p-12">
          <div className="flex items-end justify-between">
            <div>
              <div className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#6f655a] uppercase">
                {bloc.type === "COLLECTION" ? "COLLECTION" : "GALLERY"}
              </div>
              <h3 className="mt-1 text-2xl font-bold tracking-wider text-[#1a120c] uppercase sm:text-3xl">
                {title}
              </h3>
            </div>
            <span className="font-mono text-[11px] text-[#6f655a]">
              {elements.length} photos
            </span>
          </div>

          {elements.length === 0 ? (
            /* État vide en pointillés ambre */
            <div
              role="button"
              tabIndex={0}
              onClick={() => onOpenPhotoPicker?.(bloc.idBloc)}
              className="mt-8 flex cursor-pointer flex-col items-center justify-center rounded-[12px] border-2 border-dashed border-[#e8a34a]/40 bg-[#e8a34a]/[0.03] p-12 text-center transition-colors hover:border-[#e8a34a] hover:bg-[#e8a34a]/[0.06]"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-[#e8a34a]/15 text-[#e8a34a]">
                <Images className="size-6" />
              </div>
              <p className="mt-3 font-sans text-sm font-semibold text-[#1a120c]">
                {editorFr.labels.emptyGallery}
              </p>
              <p className="mt-1 text-xs text-[#6f655a]">
                Cliquez pour choisir des photographies
              </p>
            </div>
          ) : (
            <div
              className={`mt-8 grid gap-2.5 sm:gap-3.5 ${
                cols === 2 ? "grid-cols-2" : cols === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"
              }`}
            >
              {elements.map((elem, idx) => (
                <div
                  key={elem.idElement || idx}
                  className="group relative aspect-[4/5] overflow-hidden rounded-[6px] bg-[#f0eae1] shadow-xs"
                >
                  <SafeImage
                    src={elem.media.url}
                    alt={elem.texteAlt || elem.titre || ""}
                    fill
                    unoptimized
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {elem.statutConsentement === "EN_ATTENTE" && (
                    <div className="absolute top-2 left-2 z-10 rounded-full border border-amber-500/30 bg-amber-500/90 px-2 py-0.5 font-mono text-[9px] font-semibold text-black uppercase shadow-xs">
                      En attente
                    </div>
                  )}
                  {elem.titre && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-left opacity-0 transition-opacity group-hover:opacity-100">
                      <p className="truncate text-[11px] font-medium text-white">
                        {elem.titre}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    case "CASE_STUDY": {
      const title = (conf.titre as string) || "Market morning, Saint-Michel";
      const text = (conf.texte as string) || "An early dawn session...";
      const date = (conf.date as string) || "14 Septembre";
      const location = (conf.lieu as string) || "Bordeaux, Saint-Michel";
      const photo =
        (conf.photo as string) ||
        "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80";

      return (
        <div className="bg-[#faf7f2] p-8 sm:p-12 text-[#1a120c] border-b border-[#eee7db]">
          <div className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#6f655a] uppercase">
            CASE STUDY
          </div>
          <h3 className="mt-1 text-2xl font-bold tracking-tight text-[#1a120c] sm:text-3xl">
            {title}
          </h3>

          <div className="mt-3 flex items-center gap-4 font-mono text-xs text-[#6f655a]">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5 text-[#e8a34a]" />
              {date}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5 text-[#e8a34a]" />
              {location}
            </span>
          </div>

          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#3d2f26] sm:text-base">
            {text}
          </p>

          <div className="relative mt-6 aspect-[16/9] w-full overflow-hidden rounded-xl shadow-md">
            <SafeImage src={photo} alt={title} fill unoptimized className="object-cover" />
          </div>
        </div>
      );
    }

    case "AVANT_APRES": {
      const title = (conf.titre as string) || "Color grading & retouching";
      const desc = (conf.description as string) || "Subtle film toning and shadow recovery preserving natural skin tones.";
      const photoBefore =
        (conf.photoAvant as string) ||
        "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1000&q=80";
      const photoAfter =
        (conf.photoApres as string) ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=80";

      return (
        <div className="bg-white p-8 sm:p-12 text-[#1a120c] border-b border-black/5">
          <div className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#6f655a] uppercase">
            BEFORE / AFTER
          </div>
          <h3 className="mt-1 text-2xl font-bold tracking-tight text-[#1a120c] sm:text-3xl">
            {title}
          </h3>
          <p className="mt-2 text-sm text-[#6f655a]">{desc}</p>

          <InteractiveBeforeAfter beforeUrl={photoBefore} afterUrl={photoAfter} />
        </div>
      );
    }

    case "TEMOIGNAGES": {
      const title = (conf.titre as string) || "Words from couples & families";
      type Testimonial = { id: string; auteur: string; role: string; note: number; texte: string };
      const list = (conf.temoignages as Testimonial[]) || [];

      return (
        <div className="bg-[#fbf9f5] p-8 sm:p-12 text-[#1a120c] border-b border-[#eee7db]">
          <div className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#6f655a] uppercase">
            TESTIMONIALS
          </div>
          <h3 className="mt-1 text-2xl font-bold text-[#1a120c] sm:text-3xl">{title}</h3>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {list.map((item, idx) => (
              <div
                key={item.id || idx}
                className="flex flex-col justify-between rounded-xl border border-black/5 bg-white p-5 shadow-xs"
              >
                <div>
                  <div className="flex items-center gap-1 text-[#e8a34a]">
                    {[...Array(item.note || 5)].map((_, i) => (
                      <Star key={i} className="size-3.5 fill-[#e8a34a]" />
                    ))}
                  </div>
                  <Quote className="mt-3 size-5 text-[#e8a34a]/30" />
                  <p className="mt-1 text-xs italic leading-relaxed text-[#3d2f26]">
                    &ldquo;{item.texte}&rdquo;
                  </p>
                </div>
                <div className="mt-4 border-t border-black/5 pt-3">
                  <p className="font-sans text-xs font-semibold text-[#1a120c]">{item.auteur}</p>
                  <p className="font-mono text-[10px] text-[#6f655a]">{item.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "SERVICES": {
      const title = (conf.titre as string) || "Collections & Investment";
      type ServicePackage = { id: string; nom: string; prix: number; duree: string; description: string };
      const packages = (conf.forfaits as ServicePackage[]) || [];

      return (
        <div className="bg-white p-8 sm:p-12 text-[#1a120c] border-b border-black/5">
          <div className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#6f655a] uppercase">
            SERVICES & PACKAGES
          </div>
          <h3 className="mt-1 text-2xl font-bold text-[#1a120c] sm:text-3xl">{title}</h3>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {packages.map((pkg, idx) => (
              <div
                key={pkg.id || idx}
                className="flex flex-col justify-between rounded-xl border border-black/10 bg-[#faf7f2] p-5 shadow-xs transition-shadow hover:shadow-md"
              >
                <div>
                  <h4 className="font-sans text-base font-bold text-[#1a120c]">{pkg.nom}</h4>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-xs text-[#6f655a]">À partir de</span>
                    <span className="font-sans text-2xl font-extrabold text-[#e8a34a]">
                      {pkg.prix} €
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-[#6f655a]">
                    <Clock className="size-3" />
                    {pkg.duree}
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-[#3d2f26]">
                    {pkg.description}
                  </p>
                </div>

                <div className="mt-5 pt-3">
                  <span className="inline-block w-full rounded-md border border-black/10 bg-white py-2 text-center text-xs font-semibold text-[#1a120c]">
                    Enquire
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "STATISTIQUES": {
      return (
        <div className="bg-[#170e09] p-8 sm:p-12 text-[#f3ebdd] border-b border-white/5">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="font-serif text-3xl sm:text-5xl font-bold text-[#e8a34a]">
                {(conf.stat1_valeur as string) || "148"}
              </div>
              <p className="mt-2 font-mono text-[10px] sm:text-[11px] tracking-wider text-white/60 uppercase">
                {(conf.stat1_label as string) || "Séances réalisées"}
              </p>
            </div>
            <div className="border-x border-white/10">
              <div className="font-serif text-3xl sm:text-5xl font-bold text-[#e8a34a]">
                {(conf.stat2_valeur as string) || "96"}
              </div>
              <p className="mt-2 font-mono text-[10px] sm:text-[11px] tracking-wider text-white/60 uppercase">
                {(conf.stat2_label as string) || "Clients accompagnés"}
              </p>
            </div>
            <div>
              <div className="font-serif text-3xl sm:text-5xl font-bold text-[#e8a34a]">
                {(conf.stat3_valeur as string) || "4.9"}
              </div>
              <p className="mt-2 font-mono text-[10px] sm:text-[11px] tracking-wider text-white/60 uppercase">
                {(conf.stat3_label as string) || "Note moyenne"}
              </p>
            </div>
          </div>
        </div>
      );
    }

    case "VIDEO": {
      const title = (conf.titre as string) || "Summer Highlights Teaser";
      const poster =
        (conf.affiche as string) ||
        "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=1200&q=80";

      return (
        <div className="bg-[#0f0905] p-8 sm:p-12 text-[#f3ebdd]">
          <div className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#e8a34a] uppercase">
            FILM / VIDEO
          </div>
          <h3 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{title}</h3>

          <div className="group relative mt-6 aspect-[16/9] w-full overflow-hidden rounded-xl border border-white/10 bg-neutral-900 shadow-2xl">
            <SafeImage src={poster} alt={title} fill unoptimized className="object-cover" />
            <div className="absolute inset-0 bg-black/40 transition-colors group-hover:bg-black/30" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-[#e8a34a] text-[#0f0905] shadow-xl transition-transform group-hover:scale-110">
                <Play className="ml-1 size-7 fill-[#0f0905]" />
              </div>
            </div>
          </div>
        </div>
      );
    }

    case "CONTACT": {
      const title = (conf.titre as string) || "Let's connect";
      const intro = (conf.texteIntro as string) || "Tell me about your date, your venue or your project...";
      const types = (conf.typesSeance as string[]) || ["Mariage", "Séance couple", "Portrait"];

      return (
        <div className="bg-[#f6f1e9] p-8 sm:p-12 text-[#1a120c]">
          <div className="max-w-xl mx-auto text-center">
            <div className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#6f655a] uppercase">
              GET IN TOUCH
            </div>
            <h3 className="mt-1 text-2xl sm:text-3xl font-bold text-[#1a120c]">{title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-[#3d2f26]">{intro}</p>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {types.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-black/10 bg-white px-3.5 py-1 text-xs font-medium text-[#1a120c]"
                >
                  {t}
                </span>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#1a120c] px-7 py-3 text-xs font-semibold text-white shadow-md">
                <Mail className="size-3.5 text-[#e8a34a]" />
                Send enquiry
              </span>
            </div>
          </div>
        </div>
      );
    }

    default:
      return (
        <div className="p-8 text-center text-sm text-neutral-500">
          Bloc {bloc.type}
        </div>
      );
  }
}

function InteractiveBeforeAfter({
  beforeUrl,
  afterUrl,
}: {
  beforeUrl: string;
  afterUrl: string;
}) {
  const [sliderPos, setSliderPos] = useState(50);

  return (
    <div className="mt-6 space-y-3">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-black/10 bg-neutral-100 shadow-md">
        {/* Before Image (underneath) */}
        <SafeImage
          src={beforeUrl}
          alt="Avant retouche"
          fill
          unoptimized
          className="object-cover"
        />

        {/* After Image (clipped) */}
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
        >
          <SafeImage
            src={afterUrl}
            alt="Après retouche"
            fill
            unoptimized
            className="object-cover"
          />
        </div>

        {/* Badges */}
        <span className="absolute top-3 left-3 rounded-md bg-black/60 px-2.5 py-1 font-mono text-[10px] font-semibold text-white uppercase backdrop-blur-xs">
          Before
        </span>
        <span className="absolute top-3 right-3 rounded-md bg-black/60 px-2.5 py-1 font-mono text-[10px] font-semibold text-white uppercase backdrop-blur-xs">
          After
        </span>

        {/* Divider bar */}
        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.5)]"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-6 rounded-full border border-black/20 bg-white shadow-md flex items-center justify-center text-[8px] font-bold text-black">
            ↔
          </div>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={sliderPos}
        onChange={(e) => setSliderPos(Number(e.target.value))}
        className="w-full accent-[#e8a34a] cursor-pointer"
        aria-label="Comparer avant et après"
      />
    </div>
  );
}
