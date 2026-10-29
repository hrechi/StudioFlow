import "server-only";
import { lirePrevisions } from "./meteo.rules";
import type { PrevisionHoraire } from "./meteo.types";

/**
 * Open-Meteo forecast client (https://open-meteo.com, no key on the free API).
 * Server only. The answer is untrusted: it is validated by lirePrevisions and cached 30 minutes
 * per place so several sessions at the same location cost one call.
 *
 * Open-Meteo's free API is meant for non-commercial use. For a commercial studio, take a
 * subscription and set OPEN_METEO_API_KEY (and OPEN_METEO_BASE_URL if the plan gives another
 * host): nothing else changes. Data credit: "Weather data by Open-Meteo.com" (CC BY 4.0).
 */

export class MeteoUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MeteoUnavailableError";
  }
}

const BASE_URL = process.env.OPEN_METEO_BASE_URL?.trim() || "https://api.open-meteo.com/v1/forecast";
const FORECAST_DAYS = 16; // the maximum: needed to look for a postponement date past the session
const TTL_MS = 30 * 60_000;
const TIMEOUT_MS = 10_000;

const cache = new Map<string, { at: number; data: PrevisionHoraire }>();

/** Rounded to 2 decimals (~1 km): sessions at the same venue share one forecast. */
const arrondir = (n: number) => Math.round(n * 100) / 100;

export async function fetchPrevisions(latitude: number, longitude: number): Promise<PrevisionHoraire> {
  const lat = arrondir(latitude);
  const lon = arrondir(longitude);
  const key = `${lat},${lon}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.data;

  const url = new URL(BASE_URL);
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("hourly", "temperature_2m,precipitation_probability,precipitation,wind_speed_10m");
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("timezone", "GMT"); // times come back in UTC: no timezone guessing
  url.searchParams.set("forecast_days", String(FORECAST_DAYS));
  const apiKey = process.env.OPEN_METEO_API_KEY?.trim();
  if (apiKey) url.searchParams.set("apikey", apiKey);

  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch {
    throw new MeteoUnavailableError("The weather service did not answer in time.");
  }
  if (!res.ok) throw new MeteoUnavailableError(`The weather service answered ${res.status}.`);

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new MeteoUnavailableError("The weather service returned an unreadable answer.");
  }
  const data = lirePrevisions(json);
  if (!data) throw new MeteoUnavailableError("The weather service returned an unexpected answer.");
  cache.set(key, { at: Date.now(), data });
  return data;
}
