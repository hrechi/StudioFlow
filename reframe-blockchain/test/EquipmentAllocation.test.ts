import { expect } from "chai";
import hre from "hardhat";

// Default import: the Hardhat config loads the shared .env with import.meta, so files run as ES modules.
const { ethers } = hre;

/** The rules of src/modules/allocation/README.md, enforced by the contract itself. */

const id = (s: string) => ethers.id(s); // keccak256 of a string, like hashId() in the app
const H = 3600n;
const Status = { Pending: 1n, Confirmed: 2n, InUse: 3n, Returned: 4n, Cancelled: 5n };
const Condition = { New: 0, Good: 1, Worn: 2, OutOfOrder: 3 };

async function setup() {
  const [admin, photographer, other] = await ethers.getSigners();
  const c = await ethers.deployContract("EquipmentAllocation");
  await c.addStaff(photographer.address);
  await c.registerEquipment(id("camera"), Condition.Good);
  const book = (alloc: string, start: bigint, end: bigint, as = photographer) =>
    c.connect(as).requestAllocation(id(alloc), id("camera"), id("seance"), start, end);
  return { c, admin, photographer, other, book };
}

describe("EquipmentAllocation", () => {
  it("makes the deployer the owner and staff", async () => {
    const { c, admin } = await setup();
    expect(await c.owner()).to.equal(admin.address);
    expect(await c.staff(admin.address)).to.equal(true);
  });

  it("runs the full lifecycle and records the return condition on the equipment", async () => {
    const { c, photographer, book } = await setup();
    await expect(book("a1", 10n * H, 12n * H))
      .to.emit(c, "AllocationRequested")
      .withArgs(id("a1"), id("camera"), id("seance"), photographer.address, 10n * H, 12n * H);
    await expect(c.confirmAllocation(id("a1"))).to.emit(c, "AllocationConfirmed");
    await expect(c.connect(photographer).checkout(id("a1"))).to.emit(c, "EquipmentCheckedOut");
    await expect(c.returnEquipment(id("a1"), Condition.Worn)).to.emit(c, "EquipmentReturned");
    const a = await c.getAllocation(id("a1"));
    expect(a.status).to.equal(Status.Returned);
    expect(a.returnCondition).to.equal(BigInt(Condition.Worn));
    expect((await c.equipments(id("camera"))).condition).to.equal(BigInt(Condition.Worn));
    expect(await c.getEquipmentHistory(id("camera"))).to.deep.equal([id("a1")]);
  });

  it("refuses an overlap while the other allocation holds the equipment, not after it ends", async () => {
    const { c, book } = await setup();
    await book("a1", 10n * H, 12n * H);
    expect(await c.isAvailable(id("camera"), 11n * H, 13n * H)).to.equal(false);
    await expect(book("a2", 11n * H, 13n * H))
      .to.be.revertedWithCustomError(c, "Overlap")
      .withArgs(id("a1"));
    // Back to back is fine (end is exclusive), and a cancelled allocation frees the slot.
    await book("a3", 12n * H, 14n * H);
    await c.cancelAllocation(id("a1"));
    expect(await c.isAvailable(id("camera"), 10n * H, 12n * H)).to.equal(true);
  });

  it("enforces who may do what", async () => {
    const { c, photographer, other, book } = await setup();
    await expect(book("a1", 1n, 2n, other)).to.be.revertedWithCustomError(c, "NotStaff");
    await book("a1", 10n * H, 12n * H);
    await expect(c.connect(photographer).confirmAllocation(id("a1"))).to.be.revertedWithCustomError(c, "NotOwner");
    await c.confirmAllocation(id("a1"));
    await expect(c.connect(other).checkout(id("a1"))).to.be.revertedWithCustomError(c, "NotOwnerOrBooker");
    await expect(c.connect(photographer).registerEquipment(id("x"), 0)).to.be.revertedWithCustomError(c, "NotOwner");
    await expect(c.addStaff(ethers.ZeroAddress)).to.be.revertedWithCustomError(c, "ZeroAddress");
  });

  it("refuses wrong transitions, periods and return conditions", async () => {
    const { c, photographer, book } = await setup();
    await expect(book("bad", 12n * H, 10n * H)).to.be.revertedWithCustomError(c, "InvalidPeriod");
    await book("a1", 10n * H, 12n * H);
    await expect(book("a1", 20n * H, 21n * H)).to.be.revertedWithCustomError(c, "AllocationAlreadyExists");
    await expect(c.connect(photographer).checkout(id("a1")))
      .to.be.revertedWithCustomError(c, "InvalidTransition")
      .withArgs(Status.Pending, Status.InUse);
    await c.confirmAllocation(id("a1"));
    await c.checkout(id("a1"));
    await expect(c.cancelAllocation(id("a1"))).to.be.revertedWithCustomError(c, "InvalidTransition");
    await expect(c.returnEquipment(id("a1"), Condition.OutOfOrder))
      .to.be.revertedWithCustomError(c, "InvalidReturnCondition")
      .withArgs(Condition.OutOfOrder);
    await expect(c.getAllocation(id("missing"))).to.be.revertedWithCustomError(c, "AllocationNotFound");
  });

  it("blocks unknown, inactive and broken equipment", async () => {
    const { c, photographer, book } = await setup();
    await expect(
      c.connect(photographer).requestAllocation(id("a"), id("nope"), id("s"), 1n, 2n),
    ).to.be.revertedWithCustomError(c, "EquipmentNotFound");
    await expect(c.registerEquipment(id("camera"), 1)).to.be.revertedWithCustomError(c, "EquipmentAlreadyRegistered");
    await c.setEquipmentActive(id("camera"), false);
    await expect(book("a1", 1n, 2n)).to.be.revertedWithCustomError(c, "EquipmentInactive");
    await c.setEquipmentActive(id("camera"), true);
    await expect(c.connect(photographer).reportBreakdown(id("camera"))).to.emit(c, "BreakdownReported");
    await expect(book("a1", 1n, 2n)).to.be.revertedWithCustomError(c, "EquipmentOutOfOrder");
  });
});
