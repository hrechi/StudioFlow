import { describe, expect, it } from "vitest";
import { heuresEntre, largeurBarre, lirePeriode, listeMois, resoudrePeriode, taux } from "../stats.rules";

const NOW = new Date("2026-10-29T10:00:00Z"); // 11:00 in Tunis

describe("lirePeriode", () => {
  it("accepts known periods and falls back to 90 days", () => {
    expect(lirePeriode("12m")).toBe("12m");
    expect(lirePeriode(["30j", "x"])).toBe("30j");
    expect(lirePeriode("nope")).toBe("90j");
    expect(lirePeriode(undefined)).toBe("90j");
  });
});

describe("resoudrePeriode", () => {
  it("30 days = today and the 29 days before, in Tunis days", () => {
    const p = resoudrePeriode("30j", NOW);
    expect(p.from).toBe("2026-09-29T23:00:00.000Z"); // 30 Sep 00:00 Tunis
    expect(p.to).toBe("2026-10-29T23:00:00.000Z"); // 30 Oct 00:00 Tunis
  });
  it("12 months starts on the 1st, 11 months back", () => {
    expect(resoudrePeriode("12m", NOW).from).toBe("2025-10-31T23:00:00.000Z"); // 1 Nov 2025 Tunis
  });
  it("this year starts on 1 January", () => {
    expect(resoudrePeriode("annee", NOW).from).toBe("2025-12-31T23:00:00.000Z");
  });
  it("next 30 days starts today", () => {
    const p = resoudrePeriode("a-venir", NOW);
    expect(p.from).toBe("2026-10-28T23:00:00.000Z");
    expect(p.to).toBe("2026-11-27T23:00:00.000Z");
  });
});

describe("listeMois", () => {
  it("lists every Tunis month the period touches", () => {
    const p = resoudrePeriode("12m", NOW);
    const mois = listeMois(new Date(p.from), new Date(p.to));
    expect(mois).toHaveLength(12);
    expect(mois[0]).toBe("2025-11");
    expect(mois[11]).toBe("2026-10");
  });
});

describe("taux / largeurBarre / heuresEntre", () => {
  it("rates", () => {
    expect(taux(1, 3)).toBe(33.3);
    expect(taux(0, 0)).toBe(null);
  });
  it("bars keep a visible sliver for small non-zero values", () => {
    expect(largeurBarre(0, 10)).toBe(0);
    expect(largeurBarre(1, 1000)).toBe(2);
    expect(largeurBarre(5, 10)).toBe(50);
  });
  it("hours", () => {
    expect(heuresEntre(new Date("2026-01-01T10:00:00Z"), new Date("2026-01-01T12:30:00Z"))).toBe(2.5);
  });
});
