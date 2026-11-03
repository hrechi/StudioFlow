import { describe, expect, it } from "vitest";
import {
  candidatsReport,
  couvreFenetre,
  decrireDepassement,
  evaluer,
  lirePrevisions,
  resumerFenetre,
} from "../meteo.rules";
import { SEUILS_METEO_PAR_DEFAUT, type PrevisionHoraire } from "../meteo.types";

const H = 3_600_000;
const DAY = 24 * H;
const T0 = Date.parse("2026-11-02T00:00:00Z");

/** Forecast of `jours` days from T0, every hour built by `make(hourIndex)`. */
function prevision(
  jours: number,
  make: (i: number) => { t?: number | null; p?: number | null; mm?: number | null; v?: number | null },
): PrevisionHoraire {
  const n = jours * 24;
  const rows = Array.from({ length: n }, (_, i) => make(i));
  return {
    heures: rows.map((_, i) => T0 + i * H),
    temperatureC: rows.map((r) => (r.t === undefined ? 22 : r.t)),
    probabilitePluiePct: rows.map((r) => (r.p === undefined ? 10 : r.p)),
    pluieMm: rows.map((r) => (r.mm === undefined ? 0 : r.mm)),
    ventKmh: rows.map((r) => (r.v === undefined ? 12 : r.v)),
  };
}

describe("lirePrevisions", () => {
  const ok = {
    hourly: {
      time: ["2026-11-02T00:00", "2026-11-02T01:00"],
      temperature_2m: [18.2, 17.9],
      precipitation_probability: [5, null],
      precipitation: [0, 0.4],
      wind_speed_10m: [10, 11.5],
    },
  };

  it("reads times as UTC and keeps nulls as null", () => {
    const p = lirePrevisions(ok)!;
    expect(p.heures).toEqual([Date.parse("2026-11-02T00:00:00Z"), Date.parse("2026-11-02T01:00:00Z")]);
    expect(p.probabilitePluiePct).toEqual([5, null]);
  });

  it("tolerates a missing probability series", () => {
    const { precipitation_probability: _drop, ...hourly } = ok.hourly;
    expect(lirePrevisions({ hourly })!.probabilitePluiePct).toEqual([null, null]);
  });

  it("rejects wrong shapes", () => {
    expect(lirePrevisions(null)).toBe(null);
    expect(lirePrevisions({})).toBe(null);
    expect(lirePrevisions({ hourly: { ...ok.hourly, time: ["bad", "2026-11-02T01:00"] } })).toBe(null);
    expect(lirePrevisions({ hourly: { ...ok.hourly, wind_speed_10m: [1] } })).toBe(null);
  });
});

describe("resumerFenetre / evaluer", () => {
  const prev = prevision(2, (i) => ({
    p: i === 10 ? 80 : 10,
    mm: i === 10 ? 1.5 : i === 11 ? 1 : 0,
    v: i === 11 ? 55 : 12,
    t: i === 9 ? 3 : 22,
  }));

  it("covers the hours a session overlaps (max, sum, min)", () => {
    const r = resumerFenetre(prev, T0 + 9.5 * H, T0 + 11.5 * H)!; // hours 9, 10, 11
    expect(r).toEqual({
      probabilitePluiePct: 80,
      pluieMm: 2.5,
      ventKmh: 55,
      temperatureMinC: 3,
      temperatureMaxC: 22,
    });
  });

  it("returns null outside the forecast", () => {
    expect(resumerFenetre(prev, T0 + 3 * DAY, T0 + 3 * DAY + H)).toBe(null);
  });

  it("flags every crossed threshold and none of the others", () => {
    const r = resumerFenetre(prev, T0 + 9.5 * H, T0 + 11.5 * H)!;
    const crit = evaluer(r, SEUILS_METEO_PAR_DEFAUT).map((d) => d.critere);
    expect(crit).toEqual(["PLUIE_PROBABILITE", "PLUIE_MM", "VENT", "TEMPERATURE_BASSE"]);
  });

  it("does not flag a value equal to its limit, nor a missing value", () => {
    const limite = { probabilitePluiePct: 60, pluieMm: 2, ventKmh: 40, temperatureMinC: 5, temperatureMaxC: 38 };
    expect(evaluer(limite, SEUILS_METEO_PAR_DEFAUT)).toEqual([]);
    const vide = { probabilitePluiePct: null, pluieMm: null, ventKmh: null, temperatureMinC: null, temperatureMaxC: null };
    expect(evaluer(vide, SEUILS_METEO_PAR_DEFAUT)).toEqual([]);
  });

  it("describes a crossed threshold", () => {
    expect(decrireDepassement({ critere: "PLUIE_PROBABILITE", valeur: 80, seuil: 60 })).toBe(
      "Rain probability 80% (limit 60%)",
    );
  });
});

describe("couvreFenetre", () => {
  const prev = prevision(1, () => ({}));
  it("requires the whole window inside the forecast", () => {
    expect(couvreFenetre(prev, T0 + 2 * H, T0 + 5 * H)).toBe(true);
    expect(couvreFenetre(prev, T0 + 22 * H, T0 + 25 * H)).toBe(false);
  });
});

describe("candidatsReport", () => {
  const debut = T0 + 10 * H; // original session, day 0, 10:00 → 12:00
  const fin = T0 + 12 * H;
  // 6 days; day 1 rainy, day 2 windy, days 3+ fine
  const prev = prevision(6, (i) => {
    const jour = Math.floor(i / 24);
    return { p: jour === 1 ? 90 : 10, mm: jour === 1 ? 4 : 0, v: jour === 2 ? 60 : 12 };
  });

  it("keeps the same time of day on the next dry, calm days", () => {
    const c = candidatsReport({ prev, seuils: SEUILS_METEO_PAR_DEFAUT, debut, fin, maintenant: T0 });
    expect(c.map((x) => x.debut)).toEqual([debut + 3 * DAY, debut + 4 * DAY, debut + 5 * DAY]);
    expect(c[0].fin - c[0].debut).toBe(2 * H);
  });

  it("respects the notice period and the maximum", () => {
    const c = candidatsReport({
      prev,
      seuils: SEUILS_METEO_PAR_DEFAUT,
      debut,
      fin,
      maintenant: debut + 3 * DAY - 2 * H, // < 24 h before day 3
      max: 1,
    });
    expect(c.map((x) => x.debut)).toEqual([debut + 4 * DAY]);
  });

  it("never proposes a day the forecast does not fully cover, or without rainfall data", () => {
    const sansPluie = prevision(6, () => ({ mm: null }));
    expect(candidatsReport({ prev: sansPluie, seuils: SEUILS_METEO_PAR_DEFAUT, debut, fin, maintenant: T0 })).toEqual([]);
  });
});
