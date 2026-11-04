"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Search, X } from "lucide-react";
import { SafeImage } from "@/components/shared/safe-image";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/utils";
import { PortfolioCardTransition } from "../transitions/PortfolioCardTransition";
import { rechercherPortfoliosPublics } from "../../portfolio.actions";
import type { PortfolioPublic } from "../../portfolio.service";
import {
  CATEGORIES_PORTFOLIO,
  SERVICES_PHOTOGRAPHIQUES,
  STYLES_PHOTOGRAPHIQUES,
  categoriePortfolioLabelsEn,
  servicePhotographiqueLabelsEn,
  stylePhotographiqueLabelsEn,
} from "../../portfolio.types";
import type { PublicPortfolioSearchInput } from "../../portfolio.schemas";

type SearchResult = {
  items: PortfolioPublic[];
  total: number;
  page: number;
  pageCount: number;
};

const EMPTY_FILTERS: PublicPortfolioSearchInput = {
  recherche: "",
  ville: "",
  categories: [],
  styles: [],
  services: [],
  disponible: false,
  page: 1,
};

export function PortfolioDirectory({ initialResult }: { initialResult: SearchResult }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [result, setResult] = useState(initialResult);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const isInitialRender = useRef(true);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    const currentRequest = ++requestId.current;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      void rechercherPortfoliosPublics(filters).then((response) => {
        if (currentRequest !== requestId.current) return;
        if (!response.ok) {
          setError(response.error);
          setLoading(false);
          return;
        }
        setResult(response.data);
        setLoading(false);
      }).catch(() => {
        if (currentRequest !== requestId.current) return;
        setError("Impossible d’actualiser les portfolios. Veuillez réessayer.");
        setLoading(false);
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [filters]);

  function updateFilters(update: Partial<PublicPortfolioSearchInput>) {
    setFilters((current) => ({ ...current, ...update, page: update.page ?? 1 }));
  }

  function toggleValue<K extends "categories" | "styles" | "services">(
    key: K,
    value: PublicPortfolioSearchInput[K][number],
  ) {
    const selected = filters[key] as string[];
    updateFilters({
      [key]: selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    });
  }

  function removeFilter(key: keyof PublicPortfolioSearchInput, value?: string) {
    if (key === "disponible") {
      updateFilters({ disponible: false });
    } else if (key === "recherche" || key === "ville") {
      updateFilters({ [key]: "" });
    } else if (key === "categories" || key === "styles" || key === "services") {
      updateFilters({ [key]: filters[key].filter((item) => item !== value) });
    }
  }

  const activeFilters = [
    ...(filters.recherche ? [{ key: "recherche" as const, label: `Search: ${filters.recherche}` }] : []),
    ...(filters.ville ? [{ key: "ville" as const, label: `Location: ${filters.ville}` }] : []),
    ...filters.categories.map((value) => ({
      key: "categories" as const,
      value,
      label: categoriePortfolioLabelsEn[value],
    })),
    ...filters.styles.map((value) => ({
      key: "styles" as const,
      value,
      label: stylePhotographiqueLabelsEn[value],
    })),
    ...filters.services.map((value) => ({
      key: "services" as const,
      value,
      label: servicePhotographiqueLabelsEn[value],
    })),
    ...(filters.disponible ? [{ key: "disponible" as const, label: "Available" }] : []),
  ];

  return (
    <div className="container-wide">
      <div className="mb-10 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
        <label className="flex items-center gap-3 rounded-xl border border-border bg-background px-4">
          <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          <input
            value={filters.recherche}
            onChange={(event) => updateFilters({ recherche: event.target.value })}
            maxLength={120}
            className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search for a studio, photographer or keyword…"
            aria-label="Search for a studio, photographer or keyword"
          />
        </label>

        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Location</span>
            <input
              value={filters.ville}
              onChange={(event) => updateFilters({ ville: event.target.value })}
              maxLength={120}
              className="h-10 rounded-lg border border-border bg-background px-3"
              placeholder="City or region"
            />
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input
              type="checkbox"
              checked={filters.disponible}
              onChange={(event) => updateFilters({ disponible: event.target.checked })}
              className="size-4 accent-primary"
            />
            Available for new bookings
          </label>
          <FilterOptions
            title="Categories"
            values={CATEGORIES_PORTFOLIO}
            selected={filters.categories}
            labels={categoriePortfolioLabelsEn}
            onToggle={(value) => toggleValue("categories", value)}
          />
          <FilterOptions
            title="Styles"
            values={STYLES_PHOTOGRAPHIQUES}
            selected={filters.styles}
            labels={stylePhotographiqueLabelsEn}
            onToggle={(value) => toggleValue("styles", value)}
          />
          <FilterOptions
            title="Services"
            values={SERVICES_PHOTOGRAPHIQUES}
            selected={filters.services}
            labels={servicePhotographiqueLabelsEn}
            onToggle={(value) => toggleValue("services", value)}
          />
        </div>

        {activeFilters.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <span className="mr-1 text-xs text-muted-foreground">Active filters:</span>
            {activeFilters.map((filter) => (
              <button
                type="button"
                key={`${filter.key}:${"value" in filter ? filter.value : filter.label}`}
                onClick={() => removeFilter(filter.key, "value" in filter ? filter.value : undefined)}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary-text transition hover:bg-primary/20"
              >
                {filter.label}
                <X className="size-3" aria-hidden />
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="ml-auto text-xs font-semibold underline underline-offset-4"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      <div className="mb-5 flex items-center justify-between gap-4">
        <p aria-live="polite" className="text-sm text-muted-foreground">
          <strong className="text-foreground">{result.total}</strong>{" "}
          {result.total > 1 ? "portfolios found" : "portfolio found"}
        </p>
        {loading && <span className="text-xs text-muted-foreground">Refreshing…</span>}
      </div>
      {error && <p role="alert" className="mb-5 text-sm text-destructive">{error}</p>}

      {result.items.length ? (
        <>
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {result.items.map((portfolio) => {
              const aboutBlock = portfolio.blocsPublies?.find(
                (block) => block.type === "A_PROPOS",
              );
              // Same resolution logic as the public portfolio (/portfolio/[slug])
              const portraitUrl =
                portfolio.photographe.photoProfil ||
                (typeof aboutBlock?.configuration?.photoPortrait === "string" &&
                aboutBlock.configuration.photoPortrait.trim()
                  ? aboutBlock.configuration.photoPortrait.trim()
                  : undefined) ||
                aboutBlock?.elements?.[0]?.media?.url ||
                null;

              const name = portfolio.photographe.prenom
                ? `${portfolio.photographe.prenom} ${portfolio.photographe.nom}`.trim()
                : portfolio.titre;

              const photographerInitials = initials(
                portfolio.photographe.prenom || portfolio.titre,
                portfolio.photographe.nom,
              );

              const location = [portfolio.ville, portfolio.region, portfolio.pays]
                .filter(Boolean)
                .join(", ");

              const accentColor = portfolio.couleurAccent || "#e0563b";

              const previews = (portfolio.blocsPublies ?? [])
                .filter((block) => block.visible && ["GALERIE", "COLLECTION"].includes(block.type))
                .flatMap((block) => block.elements)
                .slice(0, 3);

              return (
                <li
                  key={portfolio.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:shadow-lift hover:border-[var(--card-accent,#e0563b)]"
                  style={{
                    ["--card-accent" as string]: accentColor,
                  }}
                >
                  <PortfolioCardTransition
                    slug={portfolio.slug}
                    coverUrl={portraitUrl || portfolio.photoCouverture}
                    title={portfolio.titre}
                    photographerName={name}
                    location={location}
                    speciality={
                      portfolio.specialites[0]
                        ? categoriePortfolioLabelsEn[portfolio.specialites[0]]
                        : undefined
                    }
                  >
                    {/* 1. Image principale du photographe (Format 4:5, object-fit cover, object-position center 25%) */}
                    <Link href={`/portfolio/${portfolio.slug}`} className="block overflow-hidden">
                      {portraitUrl ? (
                        <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
                          <Image
                            src={portraitUrl}
                            alt={`Portrait of ${name}`}
                            fill
                            loading="lazy"
                            placeholder="blur"
                            blurDataURL="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0IDUiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjUiIGZpbGw9IiMxYzE0MTAiLz48L3N2Zz4="
                            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                            style={{ objectPosition: "center 25%" }}
                            unoptimized={
                              typeof portraitUrl === "string" && portraitUrl.startsWith("/api/")
                            }
                          />
                        </div>
                      ) : (
                        /* 2. Pas de photo de profil : fond dégradé élégant avec initiales en grand */
                        <div
                          className="relative aspect-[4/5] w-full flex items-center justify-center overflow-hidden transition-transform duration-700 ease-out group-hover:scale-105"
                          style={{
                            background: `radial-gradient(circle at 50% 38%, color-mix(in srgb, ${accentColor} 28%, #140d0a), #080504 90%)`,
                          }}
                        >
                          <div
                            className="absolute inset-0 flex items-center justify-center opacity-25 pointer-events-none"
                            aria-hidden="true"
                          >
                            <div
                              className="size-52 rounded-full border border-dashed"
                              style={{ borderColor: accentColor }}
                            />
                          </div>
                          <div
                            className="relative z-10 flex size-28 items-center justify-center rounded-full font-serif text-4xl sm:text-5xl font-bold tracking-wider shadow-2xl backdrop-blur-xs transition-transform duration-500 group-hover:scale-110"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${accentColor} 18%, transparent)`,
                              color: accentColor,
                              border: `2px solid color-mix(in srgb, ${accentColor} 45%, transparent)`,
                              boxShadow: `0 0 35px color-mix(in srgb, ${accentColor} 25%, transparent)`,
                            }}
                          >
                            {photographerInitials}
                          </div>
                        </div>
                      )}
                    </Link>

                    {/* 3. Contenu de la carte : spécialités, nom, ville, slogan, miniatures / état, bouton */}
                    <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
                      <div className="space-y-3">
                        {/* Spécialités (badges) */}
                        {portfolio.specialites.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {portfolio.specialites.map((item) => (
                              <span
                                key={item}
                                className="rounded-full border border-border/80 bg-background/60 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-foreground/80 uppercase"
                              >
                                {categoriePortfolioLabelsEn[item]}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Nom du photographe (sans doublon d'avatar rond) */}
                        <div>
                          <h2 className="font-serif text-xl font-medium tracking-tight text-foreground sm:text-2xl">
                            <Link
                              href={`/portfolio/${portfolio.slug}`}
                              className="hover:text-primary-text transition-colors"
                            >
                              {name}
                            </Link>
                          </h2>
                          {portfolio.titre && portfolio.titre !== name && (
                            <p className="mt-0.5 text-xs text-muted-foreground font-mono">
                              {portfolio.titre}
                            </p>
                          )}
                        </div>

                        {/* Ville */}
                        {location && (
                          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="size-3.5 shrink-0 text-muted-foreground/80" />
                            <span className="truncate">{location}</span>
                          </p>
                        )}

                        {/* Slogan */}
                        {portfolio.slogan && (
                          <p className="line-clamp-2 text-xs leading-relaxed text-foreground/75">
                            {portfolio.slogan}
                          </p>
                        )}
                      </div>

                      <div className="space-y-3 pt-1">
                        {/* 3 miniatures de galerie ou message si aucune photo publiée */}
                        {previews.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2" aria-label="Work previews">
                            {previews.map((photo) => (
                              <div
                                key={photo.idElement}
                                className="group/thumb relative aspect-square overflow-hidden rounded-lg bg-muted border border-border/40"
                              >
                                <SafeImage
                                  src={photo.media.urlMiniature || photo.media.url}
                                  alt={photo.texteAlt ?? "Photo preview"}
                                  fill
                                  unoptimized
                                  sizes="120px"
                                  className="object-cover transition-transform duration-500 group-hover/thumb:scale-110"
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-border/80 bg-muted/30 px-3 text-center">
                            <p className="font-mono text-[11px] text-muted-foreground">
                              Portfolio in progress
                            </p>
                          </div>
                        )}

                        {/* Bouton "Voir le portfolio" */}
                        <Button asChild className="w-full">
                          <Link href={`/portfolio/${portfolio.slug}`}>View Portfolio</Link>
                        </Button>

                        {/* Disponibilité */}
                        {portfolio.disponible && (
                          <p className="text-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            ● Available for new projects
                          </p>
                        )}
                      </div>
                    </div>
                  </PortfolioCardTransition>
                </li>
              );
            })}
          </ul>
          {result.pageCount > 1 && (
            <nav aria-label="Portfolio pagination" className="mt-10 flex items-center justify-center gap-4">
              <Button
                variant="outline"
                disabled={filters.page <= 1 || loading}
                onClick={() => updateFilters({ page: filters.page - 1 })}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {result.page} of {result.pageCount}</span>
              <Button
                variant="outline"
                disabled={filters.page >= result.pageCount || loading}
                onClick={() => updateFilters({ page: filters.page + 1 })}
              >
                Next
              </Button>
            </nav>
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <h2 className="text-xl font-semibold">No portfolios match these criteria</h2>
          <p className="mt-2 text-sm text-muted-foreground">Try adjusting your search or clearing some filters.</p>
          <Button variant="outline" className="mt-5" onClick={() => setFilters(EMPTY_FILTERS)}>
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  );
}

function FilterOptions<T extends string>({
  title,
  values,
  selected,
  labels,
  onToggle,
}: {
  title: string;
  values: readonly T[];
  selected: readonly T[];
  labels: Record<T, string>;
  onToggle: (value: T) => void;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium">{title}</legend>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <label
            key={value}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs transition has-[:checked]:border-primary has-[:checked]:bg-primary/10"
          >
            <input
              type="checkbox"
              checked={selected.includes(value)}
              onChange={() => onToggle(value)}
              className="sr-only"
            />
            {labels[value]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
