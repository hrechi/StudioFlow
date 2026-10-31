import { describe, expect, it } from "vitest";
import { debutJourTunis, joursOccupes, lireCoordonnee, verifierAlternatives } from "../lieu.rules";

const DAY = 86_400_000;

describe("debutJourTunis", () => {
  it("returns Tunis midnight, even when UTC is still the previous day", () => {
    // 23:30 UTC on 10 Jan = 00:30 on 11 Jan in Tunis (UTC+1)
    const d = debutJourTunis(new Date("2026-01-10T23:30:00Z"));
    expect(new Date(d).toISOString()).toBe("2026-01-10T23:00:00.000Z");
  });
});

describe("joursOccupes", () => {
  const start = debutJourTunis(new Date("2026-03-02T10:00:00Z"));
  const at = (offsetDays: number, hour: number) => new Date(start + offsetDays * DAY + hour * 3_600_000);

  it("marks the days a session overlaps, including multi-day sessions", () => {
    const res = joursOccupes(
      [
        { dateDebut: at(1, 10), dateFin: at(1, 12) },
        { dateDebut: at(3, 20), dateFin: at(4, 2) },
      ],
      start,
      7,
    );
    expect(res).toEqual([false, true, false, true, true, false, false]);
  });

  it("does not mark a day when a session ends exactly at midnight", () => {
    const res = joursOccupes([{ dateDebut: at(0, 20), dateFin: at(1, 0) }], start, 2);
    expect(res).toEqual([true, false]);
  });
});

describe("verifierAlternatives", () => {
  it("accepts distinct alternatives", () => {
    expect(verifierAlternatives(["a", "b"], "c")).toEqual({ ok: true });
  });
  it("rejects itself, duplicates and too many", () => {
    expect(verifierAlternatives(["a", "c"], "c").ok).toBe(false);
    expect(verifierAlternatives(["a", "a"]).ok).toBe(false);
    expect(verifierAlternatives(["1", "2", "3", "4", "5", "6"]).ok).toBe(false);
  });
});

describe("lireCoordonnee", () => {
  it("reads numbers with a comma or a dot, empty as null, and flags the rest", () => {
    expect(lireCoordonnee("36,85", -90, 90)).toBe(36.85);
    expect(lireCoordonnee(" 10.32 ", -180, 180)).toBe(10.32);
    expect(lireCoordonnee("", -90, 90)).toBe(null);
    expect(lireCoordonnee("91", -90, 90)).toBe("invalid");
    expect(lireCoordonnee("abc", -90, 90)).toBe("invalid");
  });
});
