/**
 * Integration test against the running Ganache (`npm run ganache` + `npm run deploy` in
 * StudioFlow-Blockchain). Skipped when Ganache is not reachable. It uses random ids, so it
 * never touches the allocations of real StudioFlow documents.
 */
import { Contract, JsonRpcProvider, Network, Wallet, type JsonRpcSigner } from "ethers";
import { beforeAll, describe, expect, it } from "vitest";
import { ServiceError } from "@/lib/action-result";
import { hashId, toChainTime } from "../allocation.rules";
import {
  checkChain,
  readAllocationEvents,
  readChainAllocation,
  readRoles,
  verifyTransaction,
} from "../blockchain.server";
import deployment from "../contract/EquipmentAllocation.json";

const status = await checkChain();
const randomId = () => Wallet.createRandom().address.slice(2, 26).toLowerCase(); // 24 hex chars

describe.skipIf(!status.deployed)("blockchain.server against Ganache", () => {
  const provider = new JsonRpcProvider(
    process.env.GANACHE_RPC_URL ?? process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545",
    Network.from(1337),
    {
      staticNetwork: true,
    },
  );
  let admin: JsonRpcSigner;
  let photographer: JsonRpcSigner;
  let asAdmin: Contract;
  let asPhotographer: Contract;
  const equipment = randomId();
  const allocation = randomId();
  const seance = randomId();
  const start = toChainTime("2030-01-01T09:00:00Z");
  const end = toChainTime("2030-01-01T12:00:00Z");
  let requestTx: string;

  beforeAll(async () => {
    admin = await provider.getSigner(0); // Ganache unlocks its accounts: no key needed here
    photographer = await provider.getSigner(1);
    asAdmin = new Contract(deployment.address, deployment.abi, admin);
    asPhotographer = asAdmin.connect(photographer) as Contract;
    if (!(await readRoles(photographer.address)).staff) {
      await (await asAdmin.getFunction("addStaff")(photographer.address)).wait();
    }
    await (await asAdmin.getFunction("registerEquipment")(hashId(equipment), 1)).wait();
    const tx = await asPhotographer.getFunction("requestAllocation")(
      hashId(allocation),
      hashId(equipment),
      hashId(seance),
      start,
      end,
    );
    requestTx = (await tx.wait()).hash;
  });

  const expected = () => ({
    allocationId: hashId(allocation),
    equipmentId: hashId(equipment),
    seanceId: hashId(seance),
    bookedBy: photographer.address,
    start,
    end,
  });

  it("accepts the genuine transaction", async () => {
    const tx = await verifyTransaction({
      txHash: requestTx,
      expectedFrom: photographer.address,
      event: "AllocationRequested",
      expected: expected(),
    });
    expect(tx.blockNumber).toBeGreaterThan(0);
    expect(tx.at.getTime()).toBeGreaterThan(0);
  });

  it("rejects it when claimed by another wallet", async () => {
    await expect(
      verifyTransaction({
        txHash: requestTx,
        expectedFrom: admin.address,
        event: "AllocationRequested",
        expected: expected(),
      }),
    ).rejects.toThrow(/another wallet/);
  });

  it("rejects it for another allocation id or other dates", async () => {
    await expect(
      verifyTransaction({
        txHash: requestTx,
        expectedFrom: photographer.address,
        event: "AllocationRequested",
        expected: { ...expected(), allocationId: hashId(randomId()) },
      }),
    ).rejects.toThrow(/expected AllocationRequested/);
    await expect(
      verifyTransaction({
        txHash: requestTx,
        expectedFrom: photographer.address,
        event: "AllocationRequested",
        expected: { ...expected(), end: end + BigInt(1) },
      }),
    ).rejects.toThrow(ServiceError);
  });

  it("rejects it as proof of another action", async () => {
    await expect(
      verifyTransaction({
        txHash: requestTx,
        expectedFrom: photographer.address,
        event: "AllocationConfirmed",
        expected: { allocationId: hashId(allocation) },
      }),
    ).rejects.toThrow(/expected AllocationConfirmed/);
  });

  it("rejects a transaction that did not go to the contract", async () => {
    const transfer = await (
      await admin.sendTransaction({ to: photographer.address, value: BigInt(1) })
    ).wait();
    await expect(
      verifyTransaction({
        txHash: transfer!.hash,
        expectedFrom: admin.address,
        event: "AllocationRequested",
        expected: {},
      }),
    ).rejects.toThrow(/not sent to the StudioFlow contract/);
  });

  it("rejects an unknown transaction hash", async () => {
    await expect(
      verifyTransaction({
        txHash: `0x${"ab".repeat(32)}`,
        expectedFrom: admin.address,
        event: "AllocationRequested",
        expected: {},
      }),
    ).rejects.toThrow(/not found on the blockchain/);
  });

  it("reads the allocation and its history back from the chain", async () => {
    await (await asAdmin.getFunction("confirmAllocation")(hashId(allocation))).wait();
    const onChain = await readChainAllocation(hashId(allocation));
    expect(onChain).toMatchObject({
      statut: "CONFIRMEE",
      bookedBy: photographer.address.toLowerCase(),
      dateDebut: "2030-01-01T09:00:00.000Z",
      dateFin: "2030-01-01T12:00:00.000Z",
    });
    const events = await readAllocationEvents(hashId(allocation));
    expect(events.map((e) => e.action)).toEqual(["REQUEST", "CONFIRM"]);
    expect(events[0].txHash).toBe(requestTx.toLowerCase());
    expect(events[0].wallet).toBe(photographer.address.toLowerCase());
    expect(events[1].wallet).toBe(admin.address.toLowerCase());
    expect(await readChainAllocation(hashId(randomId()))).toBeNull();
  });
});
