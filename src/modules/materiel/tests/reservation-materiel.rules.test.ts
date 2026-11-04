import { describe, expect, it } from "vitest";
import {
  estBloquante,
  peutPasser,
  seChevauchent,
  STATUTS_BLOQUANTS,
} from "../reservation-materiel.rules";

const period = (start: string, end: string) => ({
  dateDebut: `2026-01-01T${start}:00.000Z`,
  dateFin: `2026-01-01T${end}:00.000Z`,
});

describe("material reservation rules", () => {
  it("detects overlap but not periods that only touch", () => {
    expect(seChevauchent(period("09:00", "10:00"), period("09:30", "11:00"))).toBe(true);
    expect(seChevauchent(period("09:00", "10:00"), period("10:00", "11:00"))).toBe(false);
    expect(seChevauchent(period("09:00", "10:00"), period("08:00", "09:00"))).toBe(false);
  });

  it("marks only holding statuses as blocking", () => {
    expect(STATUTS_BLOQUANTS).toEqual(["EN_ATTENTE", "CONFIRMEE", "EN_COURS"]);
    expect(estBloquante("EN_ATTENTE")).toBe(true);
    expect(estBloquante("CONFIRMEE")).toBe(true);
    expect(estBloquante("EN_COURS")).toBe(true);
    expect(estBloquante("RETOURNEE")).toBe(false);
    expect(estBloquante("ANNULEE")).toBe(false);
  });

  it("allows the documented lifecycle transitions", () => {
    expect(peutPasser("EN_ATTENTE", "CONFIRMEE")).toBe(true);
    expect(peutPasser("CONFIRMEE", "EN_COURS")).toBe(true);
    expect(peutPasser("EN_COURS", "RETOURNEE")).toBe(true);
    expect(peutPasser("EN_ATTENTE", "ANNULEE")).toBe(true);
    expect(peutPasser("CONFIRMEE", "ANNULEE")).toBe(true);
  });

  it("rejects forbidden transitions", () => {
    expect(peutPasser("EN_COURS", "ANNULEE")).toBe(false);
    expect(peutPasser("RETOURNEE", "EN_COURS")).toBe(false);
    expect(peutPasser("ANNULEE", "CONFIRMEE")).toBe(false);
    expect(peutPasser("EN_ATTENTE", "EN_COURS")).toBe(false);
  });
});
