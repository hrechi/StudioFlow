"use client";
/**
 * Module : Gestion des Séances · Responsable : Yosser Rafrafi
 * Champ de recherche de lieu combinant :
 *   1. Les lieux déjà enregistrés en DB (badge "Saved") — affichés en premier si le nom correspond
 *   2. Nominatim/OpenStreetMap pour les lieux du monde entier
 * Si le lieu sélectionné n'est pas en DB → bouton "Save as location" (redirection vers /dashboard/lieux/nouveau)
 */
import { BookmarkCheck, ExternalLink, Loader2, MapPin, Plus, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { LieuDTO } from "../lieu.types";

// ── Nominatim ────────────────────────────────────────────────────────────────

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    country?: string;
  };
};

async function searchNominatim(query: string): Promise<NominatimResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    addressdetails: "1",
    limit: "6",
    viewbox: "7.5,37.5,11.6,30.2",
    bounded: "0",
  });
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    { headers: { "Accept-Language": "fr,en" } },
  );
  if (!res.ok) return [];
  return res.json() as Promise<NominatimResult[]>;
}

/** Extrait une adresse courte depuis le display_name Nominatim */
function shortAddress(displayName: string): string {
  return displayName.split(",").slice(0, 3).map((s) => s.trim()).join(", ");
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type LocationValue = {
  /** Lieu enregistré en DB (peut être null si OpenStreetMap uniquement) */
  lieuId: string;
  /** Nom du lieu — remplit le champ "lieu" libre de la séance */
  nom: string;
  /** Adresse complète */
  adresse: string;
  /** Coordonnées extraites de Nominatim ou de la DB */
  latitude: string;
  longitude: string;
};

export type LocationPickerProps = {
  /** Lieux déjà enregistrés en DB (pour la comparaison et le badge "Saved") */
  lieux: Pick<LieuDTO, "id" | "nom" | "adresse" | "coordonnees" | "exterieur" | "disponible">[];
  value: LocationValue | null;
  onChange: (value: LocationValue | null) => void;
};

// ── Composant ─────────────────────────────────────────────────────────────────

export function LocationPicker({ lieux, value, onChange }: LocationPickerProps) {
  const [query, setQuery] = useState(value?.nom ?? "");
  const [nominatimResults, setNominatimResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync query si la valeur change de l'extérieur
  useEffect(() => {
    if (value?.nom) setQuery(value.nom);
  }, [value?.nom]);

  // Recherche debounced
  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setNominatimResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchNominatim(q);
        setNominatimResults(data);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    setOpen(true);
    search(v);
    // Efface la sélection si l'utilisateur retape
    if (value) onChange(null);
  };

  // Lieux DB qui correspondent à la recherche
  const dbMatches = query.trim().length >= 1
    ? lieux.filter(
        (l) =>
          l.nom.toLowerCase().includes(query.toLowerCase()) ||
          l.adresse?.toLowerCase().includes(query.toLowerCase()),
      )
    : lieux.filter((l) => l.disponible).slice(0, 4);

  // Résultats Nominatim qui NE correspondent PAS déjà à un lieu DB (évite les doublons)
  const osmOnly = nominatimResults.filter(
    (r) =>
      !dbMatches.some(
        (l) =>
          l.adresse?.toLowerCase().includes(r.display_name.split(",")[0].toLowerCase()) ||
          l.nom.toLowerCase().includes(r.display_name.split(",")[0].toLowerCase()),
      ),
  );

  const handleSelectDb = (lieu: typeof lieux[number]) => {
    const val: LocationValue = {
      lieuId: lieu.id,
      nom: lieu.nom,
      adresse: lieu.adresse,
      latitude: lieu.coordonnees ? String(lieu.coordonnees.latitude) : "",
      longitude: lieu.coordonnees ? String(lieu.coordonnees.longitude) : "",
    };
    setQuery(lieu.nom);
    setOpen(false);
    onChange(val);
  };

  const handleSelectOsm = (r: NominatimResult) => {
    const addr = shortAddress(r.display_name);
    const val: LocationValue = {
      lieuId: "",
      nom: addr.split(",")[0] ?? addr,
      adresse: addr,
      latitude: parseFloat(r.lat).toFixed(6),
      longitude: parseFloat(r.lon).toFixed(6),
    };
    setQuery(val.nom);
    setOpen(false);
    onChange(val);
  };

  const handleClear = () => {
    setQuery("");
    setOpen(false);
    setNominatimResults([]);
    onChange(null);
    inputRef.current?.focus();
  };

  // Fermer sur clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        listRef.current && !listRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const hasResults = dbMatches.length > 0 || osmOnly.length > 0;
  const isFromOsm = value && !value.lieuId;

  // Paramètres pré-remplis pour le formulaire de création
  const createParams = value
    ? new URLSearchParams({
        nom: value.nom,
        adresse: value.adresse,
        latitude: value.latitude,
        longitude: value.longitude,
      }).toString()
    : "";

  return (
    <div className="space-y-2">
      {/* ── Input ──────────────────────────────────────────────────────── */}
      <div className="relative">
        <div className={cn(
          "flex h-10 items-center rounded-md border bg-card px-3 focus-within:ring-3 focus-within:ring-ring/50",
          value?.lieuId ? "border-success/40 bg-success/5" : "border-input",
        )}>
          {searching ? (
            <Loader2 className="mr-2 size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
          ) : (
            <Search className="mr-2 size-4 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={handleInput}
            onFocus={() => setOpen(true)}
            placeholder="Search a location (OpenStreetMap)…"
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            aria-label="Search location"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls="location-picker-list"
          />
          {value?.lieuId && (
            <span className="mr-2 flex shrink-0 items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[0.65rem] font-semibold text-success-text">
              <BookmarkCheck className="size-3" aria-hidden />
              Saved
            </span>
          )}
          {(query || value) && (
            <button type="button" onClick={handleClear} aria-label="Clear" className="shrink-0 text-muted-foreground hover:text-foreground">
              <X className="size-3.5" aria-hidden />
            </button>
          )}
        </div>

        {/* ── Dropdown ─────────────────────────────────────────────────── */}
        {open && (query.trim().length >= 1 || dbMatches.length > 0) && (
          <div
            ref={listRef}
            id="location-picker-list"
            className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border bg-card shadow-lg"
          >
            {/* Lieux DB */}
            {dbMatches.length > 0 && (
              <>
                <p className="bg-muted/40 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  Saved locations
                </p>
                <ul role="listbox">
                  {dbMatches.map((lieu) => (
                    <li key={lieu.id} role="option" aria-selected={value?.lieuId === lieu.id}>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleSelectDb(lieu); }}
                        className={cn(
                          "flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/60",
                          value?.lieuId === lieu.id && "bg-success/5",
                          !lieu.disponible && "opacity-50",
                        )}
                        disabled={!lieu.disponible}
                      >
                        <BookmarkCheck className="mt-0.5 size-3.5 shrink-0 text-success-text" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">{lieu.nom}</p>
                          <p className="truncate text-xs text-muted-foreground">{lieu.adresse}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-0.5">
                          {lieu.exterieur && <span className="text-[0.65rem] text-muted-foreground">Outdoor</span>}
                          {!lieu.disponible && <span className="text-[0.65rem] text-warning-text">Unavailable</span>}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Résultats OpenStreetMap */}
            {osmOnly.length > 0 && (
              <>
                <p className={cn(
                  "bg-muted/40 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground",
                  dbMatches.length > 0 && "border-t",
                )}>
                  OpenStreetMap
                </p>
                <ul role="listbox">
                  {osmOnly.map((r) => (
                    <li key={r.place_id} role="option" aria-selected={false}>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleSelectOsm(r); }}
                        className="flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/60"
                      >
                        <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="line-clamp-2 text-foreground">{r.display_name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Aucun résultat */}
            {!hasResults && !searching && query.trim().length >= 2 && (
              <p className="px-3 py-3 text-sm text-muted-foreground">
                No result for &ldquo;{query}&rdquo;
              </p>
            )}

            {searching && (
              <p className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Searching…
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── "Save as location" si sélection OSM ───────────────────────── */}
      {isFromOsm && (
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2.5">
          <MapPin className="size-4 shrink-0 text-primary-text" aria-hidden />
          <div className="min-w-0 flex-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{value.nom}</span>
            {value.adresse && ` · ${value.adresse}`}
            <span className="block text-[0.65rem]">
              {value.latitude && value.longitude
                ? `📍 ${value.latitude}, ${value.longitude}`
                : "No coordinates"}
            </span>
          </div>
          <a
            href={`/dashboard/lieux/nouveau?${createParams}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-3" aria-hidden />
            Save as location
            <ExternalLink className="size-3 opacity-70" aria-hidden />
          </a>
        </div>
      )}
    </div>
  );
}
