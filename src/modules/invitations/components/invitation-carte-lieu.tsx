"use client";

/**
 * Module : Gestion des Invitations. Map to place the venue (own component: the map of the Séances
 * module is not touched). Leaflet + OpenStreetMap tiles, no key.
 *
 * - Search box with suggestions: Nominatim (Tunisia first, then the world), with simpler variants
 *   of the text when nothing matches, then Photon, which forgives typos.
 * - A tap places the pin, the pin can be dragged, and the address of the pin is offered back.
 * - "Expand" opens a large map in a dialog, to place the pin precisely on a phone.
 *
 * Browser only: load it with next/dynamic.
 */
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Crosshair, Expand, Loader2, MapPin, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { lireNominatim, lirePhoton, variantesRecherche, type ResultatLieu } from "../invitation.lieu";
import type { Coordonnees } from "../invitation.schema";

/** Tunis, when nothing is placed yet. */
const CENTRE_DEFAUT: [number, number] = [36.8065, 10.1815];

/** A pin drawn in CSS: no image file to load, nothing breaks with the bundler. */
const epingle = L.divIcon({
  className: "",
  html: '<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;background:#c2410c;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.4)"></div>',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

const arrondir = (c: { lat: number; lng: number }): Coordonnees => ({
  lat: Math.round(c.lat * 1e6) / 1e6,
  lng: Math.round(L.Util.wrapNum(c.lng, [-180, 180], true) * 1e6) / 1e6,
});

// ── Geocoding (browser → OpenStreetMap services, no key) ─────────────────────

async function json(url: string, signal: AbortSignal): Promise<unknown> {
  const reponse = await fetch(url, { headers: { Accept: "application/json" }, signal });
  if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
  return reponse.json();
}

const nominatim = (q: string, pays: boolean, signal: AbortSignal) =>
  json(
    `https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q, format: "jsonv2", limit: "6", "accept-language": "fr,en,ar", ...(pays ? { countrycodes: "tn" } : {}) })}`,
    signal,
  ).then(lireNominatim);

const photon = (q: string, signal: AbortSignal) =>
  json(`https://photon.komoot.io/api/?${new URLSearchParams({ q, limit: "6", lat: String(CENTRE_DEFAUT[0]), lon: String(CENTRE_DEFAUT[1]) })}`, signal).then(lirePhoton);

/**
 * Tries the whole text in Tunisia, then in the world, then Photon, then simpler variants. Stops at
 * the first answer. `approche` tells the client the result matches part of the text only.
 */
async function chercher(texte: string, signal: AbortSignal): Promise<{ resultats: ResultatLieu[]; approche: boolean }> {
  const [entier, ...simples] = variantesRecherche(texte);
  if (!entier) return { resultats: [], approche: false };
  const essais: (() => Promise<ResultatLieu[]>)[] = [
    () => nominatim(entier, true, signal),
    () => nominatim(entier, false, signal),
    () => photon(entier, signal),
  ];
  for (const essai of essais) {
    const resultats = await essai().catch((e: unknown) => (signal.aborted ? Promise.reject(e) : []));
    if (resultats.length > 0) return { resultats, approche: false };
  }
  for (const variante of simples) {
    const resultats = await nominatim(variante, true, signal).catch(() => []);
    if (resultats.length > 0) return { resultats, approche: true };
  }
  return { resultats: [], approche: false };
}

async function adresseDuPoint(c: Coordonnees, signal: AbortSignal): Promise<string | null> {
  const brut = (await json(
    `https://nominatim.openstreetmap.org/reverse?${new URLSearchParams({ lat: String(c.lat), lon: String(c.lng), format: "jsonv2", zoom: "18", "accept-language": "fr,en,ar" })}`,
    signal,
  )) as { display_name?: string } | null;
  const parties = (brut?.display_name ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  // Street, area, city: enough for a guest, short enough for the card.
  return parties.length ? parties.filter((p) => !/^\d{4,5}$/.test(p)).slice(0, 4).join(", ") : null;
}

// ── Map pieces ───────────────────────────────────────────────────────────────

function Clic({ onPose }: { onPose: (c: Coordonnees) => void }) {
  useMapEvents({ click: (e) => onPose(arrondir(e.latlng)) });
  return null;
}

function Recentrer({ cible }: { cible: { c: Coordonnees; n: number } | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (cible) map.flyTo([cible.c.lat, cible.c.lng], Math.max(map.getZoom(), 16), { duration: 0.6 });
  }, [cible, map]);
  return null;
}

/** Leaflet measures its box once; a box that grows (dialog) needs a new measure. */
function Mesurer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function Carte({
  coordonnees,
  cible,
  grande,
  onPose,
}: {
  coordonnees: Coordonnees | undefined;
  cible: { c: Coordonnees; n: number } | undefined;
  grande?: boolean;
  onPose: (c: Coordonnees) => void;
}) {
  const centre: [number, number] = coordonnees ? [coordonnees.lat, coordonnees.lng] : CENTRE_DEFAUT;
  return (
    <MapContainer center={centre} zoom={coordonnees ? 16 : 11} scrollWheelZoom={!!grande} className="size-full" attributionControl>
      <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Clic onPose={onPose} />
      <Recentrer cible={cible} />
      {grande && <Mesurer />}
      {coordonnees && (
        <Marker
          position={[coordonnees.lat, coordonnees.lng]}
          icon={epingle}
          draggable
          eventHandlers={{ dragend: (e) => onPose(arrondir((e.target as L.Marker).getLatLng())) }}
        />
      )}
    </MapContainer>
  );
}

// ── The control ──────────────────────────────────────────────────────────────

export function CarteLieu({
  coordonnees,
  recherche,
  adresse,
  onChange,
  onAdresse,
}: {
  coordonnees: Coordonnees | undefined;
  /** Venue or address typed in the form: the first text of the search box. */
  recherche: string | undefined;
  /** Address typed in the form, to know whether the address of the pin can be offered. */
  adresse?: string;
  onChange: (coordonnees: Coordonnees | undefined) => void;
  onAdresse?: (adresse: string) => void;
}) {
  const [texte, setTexte] = useState<string | null>(null);
  const [cherche, setCherche] = useState(false);
  const [resultats, setResultats] = useState<{ liste: ResultatLieu[]; approche: boolean } | null>(null);
  const [cible, setCible] = useState<{ c: Coordonnees; n: number }>();
  const [grande, setGrande] = useState(false);
  const [adressePin, setAdressePin] = useState<string | null>(null);
  const requete = useRef<AbortController | null>(null);
  const inverse = useRef<AbortController | null>(null);
  const valeur = texte ?? recherche ?? "";

  useEffect(() => () => {
    requete.current?.abort();
    inverse.current?.abort();
  }, []);

  /** Pin placed by a tap, a drag, a result or the GPS: the map follows, and the address is looked up. */
  const poser = (c: Coordonnees, adresseConnue?: string) => {
    onChange(c);
    setCible((ancienne) => ({ c, n: (ancienne?.n ?? 0) + 1 }));
    inverse.current?.abort();
    if (adresseConnue) {
      setAdressePin(adresseConnue);
      return;
    }
    setAdressePin(null);
    const controle = new AbortController();
    inverse.current = controle;
    adresseDuPoint(c, controle.signal).then(setAdressePin).catch(() => undefined);
  };

  const lancer = async () => {
    const q = valeur.trim();
    if (q.length < 2) {
      toast.info("Type the venue, the street or the area first.");
      return;
    }
    requete.current?.abort();
    const controle = new AbortController();
    requete.current = controle;
    setCherche(true);
    try {
      const { resultats: liste, approche } = await chercher(q, controle.signal);
      setResultats({ liste, approche });
      if (liste.length === 1 && !approche) choisir(liste[0]);
    } catch {
      if (!controle.signal.aborted) toast.error("The map search is not reachable right now. Tap the map to place the pin.");
    } finally {
      if (requete.current === controle) setCherche(false);
    }
  };

  const choisir = (r: ResultatLieu) => {
    setResultats(null);
    poser(arrondir(r), [r.nom, r.detail].filter(Boolean).join(", "));
  };

  const maPosition = () => {
    if (!navigator.geolocation) {
      toast.error("This browser cannot give your position.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => poser(arrondir({ lat: p.coords.latitude, lng: p.coords.longitude })),
      () => toast.error("Your position is not available (permission refused or no GPS)."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const barre = (
    <div className="space-y-2">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void lancer();
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={valeur}
            onChange={(e) => {
              setTexte(e.target.value);
              setResultats(null);
            }}
            placeholder="Venue, street, area or city"
            aria-label="Search the map"
            dir="auto"
            className="pl-8"
            enterKeyHint="search"
          />
        </div>
        <Button type="submit" variant="secondary" disabled={cherche}>
          {cherche ? <Loader2 className="animate-spin" aria-hidden /> : <Search aria-hidden />}
          <span className="max-sm:sr-only">Search</span>
        </Button>
      </form>

      {resultats && (
        <div className="overflow-hidden rounded-lg border bg-popover shadow-sm" role="listbox" aria-label="Places found">
          {resultats.liste.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-muted-foreground">
              Nothing found for this text. Try the area or the city only (e.g. “Ennasr, Ariana”), then drag the pin to the exact door.
            </p>
          ) : (
            <>
              {resultats.approche && (
                <p className="border-b bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
                  The venue itself is not on the map: here is the area. Choose it, then tap the exact spot.
                </p>
              )}
              <ul className="max-h-56 divide-y overflow-y-auto">
                {resultats.liste.map((r) => (
                  <li key={`${r.lat},${r.lng},${r.nom}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => choisir(r)}
                      className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    >
                      <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium" dir="auto">{r.nom}</span>
                        {r.detail && <span className="block truncate text-xs text-muted-foreground" dir="auto">{r.detail}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );

  const boutons = (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={maPosition}>
        <Crosshair aria-hidden />
        My location
      </Button>
      {coordonnees && (
        <Button type="button" variant="ghost" size="sm" onClick={() => {
          onChange(undefined);
          setAdressePin(null);
        }}>
          <X aria-hidden />
          Remove the pin
        </Button>
      )}
    </div>
  );

  const proposition = coordonnees && adressePin && onAdresse && adressePin !== adresse && (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs">
      <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden />
      <span className="min-w-0 flex-1" dir="auto">{adressePin}</span>
      <Button type="button" size="sm" variant="secondary" className="h-7" onClick={() => onAdresse(adressePin)}>
        Use as address
      </Button>
    </div>
  );

  return (
    <div className="space-y-2">
      {barre}
      <div className="relative isolate h-56 overflow-hidden rounded-lg border sm:h-64">
        {!grande && <Carte coordonnees={coordonnees} cible={cible} onPose={(c) => poser(c)} />}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="absolute top-2 right-2 z-[500] shadow-md"
          onClick={() => setGrande(true)}
          aria-label="Expand the map"
        >
          <Expand aria-hidden />
          Expand
        </Button>
      </div>
      {boutons}
      {proposition}
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        {coordonnees
          ? `Pin at ${coordonnees.lat.toFixed(5)}, ${coordonnees.lng.toFixed(5)}. The QR code and the map buttons lead exactly there. Drag the pin to adjust.`
          : "Search, or tap the map to place a pin. Without a pin, the map link searches the address (or the venue name)."}
      </p>

      <Dialog open={grande} onOpenChange={setGrande}>
        <DialogContent className="flex h-[100dvh] max-w-none flex-col gap-3 rounded-none p-3 sm:h-[90dvh] sm:max-w-5xl sm:rounded-lg sm:p-5">
          <DialogHeader className="text-left">
            <DialogTitle>Place the venue</DialogTitle>
            <DialogDescription>Search, then tap the exact entrance. You can drag the pin and zoom with two fingers.</DialogDescription>
          </DialogHeader>
          {barre}
          <div className={cn("relative isolate min-h-0 flex-1 overflow-hidden rounded-lg border")}>
            {grande && <Carte coordonnees={coordonnees} cible={cible} grande onPose={(c) => poser(c)} />}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            {boutons}
            <Button type="button" onClick={() => setGrande(false)} disabled={!coordonnees}>
              {coordonnees ? "Done" : "Place a pin first"}
            </Button>
          </div>
          {proposition}
        </DialogContent>
      </Dialog>
    </div>
  );
}
