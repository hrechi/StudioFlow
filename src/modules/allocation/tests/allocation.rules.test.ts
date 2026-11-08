import { id as keccakText, verifyMessage, Wallet } from "ethers";
import { describe, expect, it } from "vitest";
import { peutPasser } from "@/modules/materiel/reservation-materiel.rules";
import {
  ACTION_OF_EVENT,
  CONDITION_FROM_INDEX,
  CONDITION_INDEX,
  EVENT_OF_ACTION,
  STATUS_FROM_INDEX,
  etatRetourFromIndex,
  fromChainTime,
  hashId,
  isLinkRequestFresh,
  toChainTime,
  walletLinkMessage,
} from "../allocation.rules";
import { ACTIONS_ALLOCATION, statutApres } from "../allocation.types";

describe("allocation rules", () => {
  it("hashes a Mongo id exactly like the contract tests (keccak256 of the string)", () => {
    const mongoId = "665f1a2b3c4d5e6f70818283";
    expect(hashId(mongoId)).toBe(keccakText(mongoId));
    expect(hashId(mongoId.toUpperCase())).toBe(hashId(mongoId));
    expect(hashId(mongoId)).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("maps conditions both ways like the Solidity enum", () => {
    for (const etat of CONDITION_FROM_INDEX) {
      expect(CONDITION_FROM_INDEX[CONDITION_INDEX[etat]]).toBe(etat);
    }
    expect(CONDITION_INDEX).toEqual({ NEUF: 0, BON: 1, USE: 2, EN_PANNE: 3 });
    expect(etatRetourFromIndex(1)).toBe("BON");
    expect(etatRetourFromIndex(2)).toBe("USE");
    expect(etatRetourFromIndex(0)).toBeUndefined();
    expect(etatRetourFromIndex(3)).toBeUndefined();
  });

  it("maps contract statuses to the materiel statuses (None = unknown)", () => {
    expect(STATUS_FROM_INDEX).toEqual([
      null,
      "EN_ATTENTE",
      "CONFIRMEE",
      "EN_COURS",
      "RETOURNEE",
      "ANNULEE",
    ]);
  });

  it("every step leads to a status the materiel transitions allow", () => {
    expect(peutPasser("EN_ATTENTE", statutApres.CONFIRM)).toBe(true);
    expect(peutPasser("CONFIRMEE", statutApres.CHECKOUT)).toBe(true);
    expect(peutPasser("EN_COURS", statutApres.RETURN)).toBe(true);
    expect(peutPasser("EN_ATTENTE", statutApres.CANCEL)).toBe(true);
    expect(peutPasser("EN_COURS", statutApres.CANCEL)).toBe(false);
  });

  it("has one event per action, both ways", () => {
    for (const action of ACTIONS_ALLOCATION) {
      expect(ACTION_OF_EVENT[EVENT_OF_ACTION[action]]).toBe(action);
    }
  });

  it("converts dates to whole Unix seconds and back", () => {
    expect(toChainTime("2026-11-05T10:00:00.999Z")).toBe(BigInt(1_793_872_800));
    expect(fromChainTime(BigInt(1_793_872_800))).toBe("2026-11-05T10:00:00.000Z");
  });

  it("accepts a link signature only while it is fresh", () => {
    const now = Date.parse("2026-11-05T10:00:00Z");
    expect(isLinkRequestFresh("2026-11-05T09:55:00Z", now)).toBe(true);
    expect(isLinkRequestFresh("2026-11-05T09:49:00Z", now)).toBe(false);
    expect(isLinkRequestFresh("2026-11-05T10:05:00Z", now)).toBe(false);
    expect(isLinkRequestFresh("not a date", now)).toBe(false);
  });

  it("binds the link message to the account: another account's message gives another signer", async () => {
    const wallet = Wallet.createRandom();
    const issuedAt = "2026-11-05T10:00:00.000Z";
    const signature = await wallet.signMessage(walletLinkMessage("user-a", issuedAt));
    expect(verifyMessage(walletLinkMessage("user-a", issuedAt), signature)).toBe(wallet.address);
    expect(verifyMessage(walletLinkMessage("user-b", issuedAt), signature)).not.toBe(
      wallet.address,
    );
  });
});
