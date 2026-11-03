"use client";

/**
 * Module : Gestion des Séances · Responsable : Yosser Rafrafi
 * Interactive map picker — Leaflet + OpenStreetMap tiles + Nominatim geocoding.
 * No API key needed.
 *
 * Features:
 *   - Search bar (Nominatim autocomplete, debounced 400 ms)
 *   - Click-to-pin
 *   - Draggable marker
 *   - "Fly to" animation when a search result is chosen
 *
 * react-leaflet v5 uses hooks → must be rendered client-only.
 * Import via Next.js dynamic() with { ssr: false }.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, MapPin, Search, X } from "lucide-react";

// ─── Fix Leaflet default icon paths broken by bundlers ──────────────────────
// @ts-expect-error — Leaflet internal
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── Types ───────────────────────────────────────────────────────────────────
type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

// ─── Nominatim search (debounced) ────────────────────────────────────────────
async function nominatimSearch(query: string): Promise<NominatimResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    addressdetails: "0",
    limit: "6",
    // Slight bias toward Tunisia without restricting results globally
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

// ─── Sub-component: flies map to a target when asked ────────────────────────
function FlyToTarget({
  target,
}: {
  target: { lat: number; lng: number; zoom: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], target.zoom, { duration: 0.9 });
  }, [map, target]);
  return null;
}

// ─── Sub-component: click-to-pin ─────────────────────────────────────────────
function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(
        parseFloat(e.latlng.lat.toFixed(6)),
        parseFloat(e.latlng.lng.toFixed(6)),
      );
    },
  });
  return null;
}

// ─── Sub-component: draggable marker ─────────────────────────────────────────
function DraggableMarker({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  useEffect(() => {
    markerRef.current?.setLatLng([lat, lng]);
  }, [lat, lng]);

  return (
    <Marker
      draggable
      position={[lat, lng]}
      ref={markerRef}
      eventHandlers={{
        dragend() {
          const pos = markerRef.current?.getLatLng();
          if (pos)
            onChange(parseFloat(pos.lat.toFixed(6)), parseFloat(pos.lng.toFixed(6)));
        },
      }}
    />
  );
}

// ─── Public component ────────────────────────────────────────────────────────
export type MapPickerProps = {
  latitude: string;
  longitude: string;
  onChange: (lat: string, lng: string) => void;
};

const DEFAULT_LAT = 36.8529;
const DEFAULT_LNG = 10.3231;
const DEFAULT_ZOOM = 9;
const PINNED_ZOOM = 14;

export function MapPicker({ latitude, longitude, onChange }: MapPickerProps) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const hasPinned = Number.isFinite(lat) && Number.isFinite(lng);

  // ── search state ──────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Debounced Nominatim search
  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await nominatimSearch(q);
        setResults(data);
        setOpen(data.length > 0);
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    search(v);
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const selectResult = (r: NominatimResult) => {
    const rlat = parseFloat(parseFloat(r.lat).toFixed(6));
    const rlng = parseFloat(parseFloat(r.lon).toFixed(6));
    onChange(String(rlat), String(rlng));
    setFlyTarget({ lat: rlat, lng: rlng, zoom: PINNED_ZOOM });
    setQuery(r.display_name);
    setOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        listRef.current &&
        !listRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handlePin = (newLat: number, newLng: number) => {
    onChange(String(newLat), String(newLng));
  };

  return (
    <div className="overflow-hidden rounded-lg border">
      {/* ── Search bar ───────────────────────────────────────────────────── */}
      <div className="relative border-b bg-card">
        <div className="flex items-center gap-2 px-3 py-2">
          {searching ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
          ) : (
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <input
            ref={inputRef}
            type="search"
            autoComplete="off"
            spellCheck={false}
            placeholder="Search a place (Nominatim / OpenStreetMap)…"
            value={query}
            onChange={handleInput}
            onFocus={() => results.length > 0 && setOpen(true)}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            aria-label="Search location"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls="map-search-results"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {open && (
          <ul
            id="map-search-results"
            ref={listRef}
            role="listbox"
            className="absolute left-0 right-0 top-full z-[9999] max-h-56 overflow-y-auto rounded-b-lg border-t bg-card shadow-lg"
          >
            {results.map((r) => (
              <li key={r.place_id} role="option" aria-selected={false}>
                <button
                  type="button"
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/60 focus:bg-muted/60 focus:outline-none"
                  onMouseDown={(e) => {
                    // mousedown fires before blur — prevent input blur from closing dropdown first
                    e.preventDefault();
                    selectResult(r);
                  }}
                >
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="line-clamp-2 text-foreground">{r.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Map ──────────────────────────────────────────────────────────── */}
      <MapContainer
        center={hasPinned ? [lat, lng] : [DEFAULT_LAT, DEFAULT_LNG]}
        zoom={hasPinned ? PINNED_ZOOM : DEFAULT_ZOOM}
        style={{ height: 280, width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToTarget target={flyTarget} />
        <ClickHandler onChange={handlePin} />
        {hasPinned && (
          <DraggableMarker lat={lat} lng={lng} onChange={handlePin} />
        )}
      </MapContainer>

      {/* ── Footer coords ────────────────────────────────────────────────── */}
      <p className="bg-muted/50 px-3 py-1.5 text-[0.7rem] text-muted-foreground">
        {hasPinned
          ? `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)} — drag the pin or click to move it`
          : "Search a place above or click directly on the map to place a pin"}
      </p>
    </div>
  );
}
