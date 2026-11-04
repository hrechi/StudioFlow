"use client";

import { useState } from "react";
import { Calendar, Clock, Images, Mail, MapPin, Quote, Star } from "lucide-react";
import {
  CATEGORIES_PORTFOLIO,
  categoriePortfolioLabels,
  type BlocPortfolio,
} from "../../../portfolio.types";
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
      const video = (conf.videoFond as string) || "";
      const cover = (conf.photoCouverture as string) || "";

      return (
        <div className="relative isolate flex min-h-[420px] w-full items-end justify-end overflow-hidden bg-[#120907] p-8 text-white sm:min-h-[480px] sm:p-12">
          {video && (
            <video
              aria-hidden="true"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="absolute inset-0 size-full object-cover"
            >
              <source src={video} type="video/mp4" />
            </video>
          )}
          {!video && cover && (
            <SafeImage
              src={cover}
              alt=""
              fill
              unoptimized
              sizes="100vw"
              className="absolute inset-0 size-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-[#120907]/60" />
          <div className="relative z-10 flex items-center gap-3 font-mono text-[9px] tracking-[0.18em] text-white/75 uppercase">
            Défiler
            <span className="h-8 w-px bg-white/70" />
          </div>
        </div>
      );
    }

    case "A_PROPOS": {
      const name = (conf.titre as string) || "";
      const text = (conf.texte as string) || "";
      const years = Number(conf.anneesExperience) || 0;
      const portrait = (conf.photoPortrait as string) || "";
      const facts = [
        ["Basée à", conf.lieuBase],
        ["Depuis", conf.depuis || (years > 0 ? `${years} ans` : "")],
        ["Matériel", conf.materiel],
        ["Langues", conf.langues],
      ].filter((fact): fact is [string, string] => typeof fact[1] === "string" && fact[1] !== "");

      return (
        <div className="bg-[#1a0705] p-6 text-[#f4e4de] sm:p-10">
          <div className="grid gap-8 min-[940px]:grid-cols-[0.9fr_1.1fr] min-[940px]:items-center">
            <figure className="group relative mx-auto w-full max-w-[360px] min-[940px]:mx-0">
              <div className="absolute inset-2 translate-x-4 -translate-y-3 rotate-[3deg] rounded-xl border border-white/10 bg-white/5" />
              <div className="absolute inset-1 translate-x-2 -translate-y-1.5 rotate-[1.5deg] rounded-xl border border-white/10 bg-[#281614]" />
              <div className="relative aspect-[4/5] overflow-hidden rounded-[10px] border border-white/10 bg-[#281614]">
                {portrait && (
                  <SafeImage src={portrait} alt={name} fill unoptimized className="object-cover" />
                )}
              </div>
              <figcaption className="mt-3 font-mono text-[8px] tracking-[0.16em] text-[#b78d82] uppercase">
                {(conf.legendePortrait as string) || name || "Portrait"}
              </figcaption>
            </figure>

            <div className="space-y-4">
              <div className="font-mono text-[9px] font-semibold tracking-[0.16em] text-[#b78d82] uppercase">
                01 — {editorFr.blockNames.A_PROPOS}
              </div>
              <h3 className="font-sans text-2xl font-semibold text-[#f4e4de] sm:text-4xl">
                {name}
              </h3>
              {text && <p className="text-sm leading-7 text-[#b78d82]">{text}</p>}
              {typeof conf.citation === "string" && conf.citation && (
                <blockquote className="border-l border-[#e0563b] pl-4 font-serif text-base text-[#f4e4de] italic">
                  {conf.citation}
                </blockquote>
              )}
              {facts.length > 0 && (
                <dl className="grid grid-cols-2 overflow-hidden rounded-lg border border-white/10 bg-white/[0.03]">
                  {facts.map(([label, value]) => (
                    <div key={label} className="border-r border-b border-white/10 px-3 py-2.5">
                      <dt className="font-mono text-[8px] tracking-[0.16em] text-[#b78d82] uppercase">
                        {label}
                      </dt>
                      <dd className="mt-1 text-[11px] text-[#f4e4de]">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>
        </div>
      );
    }

    case "GALERIE":
    case "COLLECTION": {
      const title = (conf.titre as string) || (conf.categorie as string) || "Galerie";
      const elements = bloc.elements || [];

      return (
        <div className="bg-white p-8 sm:p-12">
          <div className="flex items-end justify-between">
            <div>
              <div className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#6f655a] uppercase">
                {bloc.type === "COLLECTION" ? "COLLECTION" : "EXPOSITION 3D"}
              </div>
              <h3 className="mt-1 text-2xl font-bold tracking-wider text-[#1a120c] uppercase sm:text-3xl">
                {title}
              </h3>
            </div>
            <span className="font-mono text-[11px] text-[#6f655a]">{elements.length}/12 photos</span>
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
              <p className="mt-1 text-xs text-[#6f655a]">Cliquez pour choisir des photographies</p>
            </div>
          ) : (
            <div className="relative mt-8 h-[300px] overflow-hidden rounded-[14px] border border-white/10 bg-[#080504]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(232,163,74,.22),transparent_50%)]" />
              <div className="absolute inset-x-0 top-0 h-12 border-b border-white/10 bg-[#f0efe9]" />
              <div className="absolute inset-x-0 bottom-0 h-16 border-t border-white/10 bg-[#20201f] bg-[linear-gradient(90deg,#282827_1px,transparent_1px),linear-gradient(#282827_1px,transparent_1px)] bg-[size:32px_32px]" />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />

              {elements.slice(0, 3).map((elem, index) => (
                <div
                  key={elem.idElement || index}
                  className="absolute top-1/2 -translate-y-1/2 transition-all"
                  style={{
                    left: `${index === 0 ? 24 : index === 1 ? 50 : 76}%`,
                    transform: `translate(-50%, -50%) perspective(500px) rotateY(${index === 0 ? 12 : index === 2 ? -12 : 0}deg) scale(${index === 1 ? 1 : 0.82})`,
                    zIndex: index === 1 ? 4 : 2,
                  }}
                >
                  {index === 1 && (
                    <div className="pointer-events-none absolute -inset-4 rounded-full bg-[#e9b984]/20 blur-xl" />
                  )}
                  <div className="relative aspect-[4/5] w-[130px] rounded-[2px] border-[6px] border-[#241b16] bg-[#16100c] p-2.5 shadow-2xl outline-1 outline-white/10">
                    <div className="relative h-full w-full overflow-hidden rounded-[1px] bg-[#eee8df] shadow-inner">
                      <SafeImage
                        src={elem.media.urlMiniature || elem.media.url}
                        alt={elem.texteAlt || elem.titre || ""}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                      {elem.statutConsentement === "EN_ATTENTE" && (
                        <span className="absolute top-1 left-1 rounded bg-amber-500 px-1.5 py-0.5 font-mono text-[8px] font-semibold text-black">
                          En attente
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1">
                <div className="flex items-center gap-1 rounded-full border border-white/15 bg-[#120e0c]/90 px-2.5 py-1 backdrop-blur-md">
                  <span className="text-[10px] text-white/50">&lt;</span>
                  <span className="flex size-4 items-center justify-center rounded-full bg-[#e9b984] font-mono text-[9px] font-bold text-[#140d07]">
                    01
                  </span>
                  <span className="font-mono text-[9px] text-white/40">02</span>
                  <span className="text-[10px] text-white/50">&gt;</span>
                </div>
                <div className="flex items-center gap-1 font-mono text-[7.5px] tracking-wider text-[#bfa382] uppercase">
                  <span className="rounded border border-white/20 bg-white/5 px-1 py-0.5">←</span>
                  <span className="rounded border border-white/20 bg-white/5 px-1 py-0.5">→</span>
                  <span>VISITE GUIDÉE</span>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    case "CASE_STUDY": {
      const title = (conf.titre as string) || "";
      const text = (conf.texte as string) || "";
      const date = (conf.date as string) || "";
      const location = (conf.lieu as string) || "";
      const photo = (conf.photo as string) || bloc.elements?.[0]?.media?.url || "";

      return (
        <div className="border-b border-[#eee7db] bg-[#faf7f2] p-8 text-[#1a120c] sm:p-12">
          <div className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#6f655a] uppercase">
            CASE STUDY
          </div>
          {title && (
            <h3 className="mt-1 text-2xl font-bold tracking-tight text-[#1a120c] sm:text-3xl">
              {title}
            </h3>
          )}

          {(date || location) && (
            <div className="mt-3 flex items-center gap-4 font-mono text-xs text-[#6f655a]">
              {date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-[#e8a34a]" />
                  {date}
                </span>
              )}
              {location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-[#e8a34a]" />
                  {location}
                </span>
              )}
            </div>
          )}

          {text && (
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[#3d2f26] sm:text-base">
              {text}
            </p>
          )}

          {photo ? (
            <div className="relative mt-6 aspect-[16/9] w-full overflow-hidden rounded-xl shadow-md">
              <SafeImage src={photo} alt={title} fill unoptimized className="object-cover" />
            </div>
          ) : (
            <p className="mt-6 rounded-lg border border-dashed border-black/15 p-8 text-center text-xs text-[#6f655a]">
              Ajoutez une photo ou un récit à cette étude de cas.
            </p>
          )}
        </div>
      );
    }

    case "AVANT_APRES": {
      const title = (conf.titre as string) || "Avant / après";
      const desc = (conf.description as string) || "";
      const photoBefore =
        (conf.photoAvant as string) ||
        bloc.elements?.find((element) => element.role === "AVANT")?.media.url;
      const photoAfter =
        (conf.photoApres as string) ||
        bloc.elements?.find((element) => element.role === "APRES")?.media.url;

      return (
        <div className="border-b border-black/5 bg-white p-8 text-[#1a120c] sm:p-12">
          <div className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#6f655a] uppercase">
            BEFORE / AFTER
          </div>
          <h3 className="mt-1 text-2xl font-bold tracking-tight text-[#1a120c] sm:text-3xl">
            {title}
          </h3>
          {desc && <p className="mt-2 text-sm text-[#6f655a]">{desc}</p>}
          {photoBefore && photoAfter ? (
            <InteractiveBeforeAfter beforeUrl={photoBefore} afterUrl={photoAfter} />
          ) : (
            <p className="mt-6 rounded-lg border border-dashed border-black/15 p-8 text-center text-xs text-[#6f655a]">
              Ajoutez les images avant et après pour afficher la comparaison.
            </p>
          )}
        </div>
      );
    }

    case "TEMOIGNAGES": {
      const title = (conf.titre as string) || "Avis clients";
      type Testimonial = { id: string; auteur: string; role: string; note: number; texte: string };
      const list = (conf.temoignages as Testimonial[]) || [];

      return (
        <div className="border-b border-[#eee7db] bg-[#fbf9f5] p-8 text-[#1a120c] sm:p-12">
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
                  <p className="mt-1 text-xs leading-relaxed text-[#3d2f26] italic">
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
      const title = (conf.titre as string) || "Prestations & tarifs";
      type ServicePackage = {
        id: string;
        nom: string;
        prixAPartirDe?: number;
        delai?: string;
        description: string;
        inclus?: string[];
      };
      const packages = (conf.forfaits as ServicePackage[]) || [];

      return (
        <div className="border-b border-black/5 bg-white p-8 text-[#1a120c] sm:p-12">
          <div className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#6f655a] uppercase">
            PRESTATIONS
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
                    {pkg.prixAPartirDe !== undefined && (
                      <span className="font-sans text-2xl font-extrabold text-[#e8a34a]">
                        {new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                          maximumFractionDigits: 0,
                        }).format(pkg.prixAPartirDe)}
                      </span>
                    )}
                  </div>
                  {pkg.delai && (
                    <div className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-[#6f655a]">
                      <Clock className="size-3" />
                      {pkg.delai}
                    </div>
                  )}
                  {pkg.description && (
                    <p className="mt-3 text-xs leading-relaxed text-[#3d2f26]">{pkg.description}</p>
                  )}
                  {pkg.inclus && pkg.inclus.length > 0 && (
                    <ul className="mt-3 space-y-1 text-[11px] text-[#6f655a]">
                      {pkg.inclus.map((item) => (
                        <li key={item}>✓ {item}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-5 pt-3">
                  <span className="inline-block w-full rounded-md border border-black/10 bg-white py-2 text-center text-xs font-semibold text-[#1a120c]">
                    {editorFr.labels.enquiry}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "PROCESSUS": {
      const steps = Array.isArray(conf.etapes)
        ? (conf.etapes as { titre?: string; description?: string }[])
        : [];
      return (
        <div className="bg-[#1a0705] p-8 text-[#f4e4de] sm:p-12">
          <p className="font-mono text-[10px] tracking-[0.16em] text-[#caa27f] uppercase">Accompagnement</p>
          <h3 className="mt-2 font-serif text-2xl">{String(conf.titre || "Comment se déroule une séance")}</h3>
          <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.slice(0, 4).map((step, index) => (
              <li key={`${step.titre}-${index}`} className="rounded-lg border border-white/10 p-4">
                <span className="font-mono text-xs text-[#e8a34a]">0{index + 1}</span>
                <p className="mt-2 font-medium">{step.titre}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#c7b5a3]">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      );
    }

    case "FAQ": {
      const questions = Array.isArray(conf.questions)
        ? (conf.questions as { question?: string; reponse?: string }[])
        : [];
      return (
        <div className="bg-[#1a0705] p-8 text-[#f4e4de] sm:p-12">
          <p className="font-mono text-[10px] tracking-[0.16em] text-[#caa27f] uppercase">FAQ</p>
          <h3 className="mt-2 font-serif text-2xl">{String(conf.titre || "Questions fréquentes")}</h3>
          <div className="mt-5 divide-y divide-white/10">
            {questions.filter((item) => item.question).map((item, index) => (
              <div key={`${item.question}-${index}`} className="py-3">
                <p className="font-medium">{item.question}</p>
                {item.reponse && <p className="mt-1 text-xs leading-relaxed text-[#c7b5a3]">{item.reponse}</p>}
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "STATISTIQUES": {
      return (
        <div className="border-b border-white/5 bg-[#170e09] p-8 text-[#f3ebdd] sm:p-12">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div
                className="font-serif text-3xl font-bold sm:text-5xl"
                style={{ color: "var(--portfolio-accent)" }}
              >
                {(conf.stat1_valeur as string) || "—"}
              </div>
              <p className="mt-2 font-mono text-[10px] tracking-wider text-white/60 uppercase sm:text-[11px]">
                {(conf.stat1_label as string) || "Séances réalisées"}
              </p>
            </div>
            <div className="border-x border-white/10">
              <div
                className="font-serif text-3xl font-bold sm:text-5xl"
                style={{ color: "var(--portfolio-accent)" }}
              >
                {(conf.stat2_valeur as string) || "—"}
              </div>
              <p className="mt-2 font-mono text-[10px] tracking-wider text-white/60 uppercase sm:text-[11px]">
                {(conf.stat2_label as string) || "Clients accompagnés"}
              </p>
            </div>
            <div>
              <div
                className="font-serif text-3xl font-bold sm:text-5xl"
                style={{ color: "var(--portfolio-accent)" }}
              >
                {(conf.stat3_valeur as string) || "—"}
              </div>
              <p className="mt-2 font-mono text-[10px] tracking-wider text-white/60 uppercase sm:text-[11px]">
                {(conf.stat3_label as string) || "Note moyenne"}
              </p>
            </div>
          </div>
        </div>
      );
    }

    case "VIDEO": {
      return null;
    }

    case "CONTACT": {
      const title = (conf.titre as string) || "Parlons de votre projet";
      const intro = (conf.texteIntro as string) || "";
      const configured = Array.isArray(conf.typesSeanceProposes) ? conf.typesSeanceProposes : [];
      const types = CATEGORIES_PORTFOLIO.filter((category) => configured.includes(category)).map(
        (category) => categoriePortfolioLabels[category],
      );

      return (
        <div className="bg-[#f6f1e9] p-8 text-[#1a120c] sm:p-12">
          <div className="mx-auto max-w-xl text-center">
            <div className="font-mono text-[10px] font-semibold tracking-[0.16em] text-[#6f655a] uppercase">
              CONTACT
            </div>
            <h3 className="mt-1 text-2xl font-bold text-[#1a120c] sm:text-3xl">{title}</h3>
            {intro && <p className="mt-3 text-sm leading-relaxed text-[#3d2f26]">{intro}</p>}

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
      return <div className="p-8 text-center text-sm text-neutral-500">Bloc {bloc.type}</div>;
  }
}

function InteractiveBeforeAfter({ beforeUrl, afterUrl }: { beforeUrl: string; afterUrl: string }) {
  const [sliderPos, setSliderPos] = useState(50);

  return (
    <div className="mt-6 space-y-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-black/10 bg-neutral-100 shadow-md">
        {/* Before Image (underneath) */}
        <SafeImage src={beforeUrl} alt="Avant retouche" fill unoptimized className="object-cover" />

        {/* After Image (clipped) */}
        <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}>
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
          <div className="absolute top-1/2 left-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-black/20 bg-white text-[8px] font-bold text-black shadow-md">
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
        className="w-full cursor-pointer"
        style={{ accentColor: "var(--portfolio-accent)" }}
        aria-label="Comparer avant et après"
      />
    </div>
  );
}
