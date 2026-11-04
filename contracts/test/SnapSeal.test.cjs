const { expect } = require("chai");
const { ethers } = require("hardhat");

const photo = (name) => ethers.sha256(ethers.toUtf8Bytes(name));
const HASHES = ["1", "2", "3", "4", "5", "6"].map((n) => photo(`IMG_0${n}`));
const OUTSIDE = photo("not-in-gallery");
const DELIVERY = photo("livraison_1.zip");

describe("SnapSeal", () => {
  let registry, receipt, photographer, client, stranger;

  beforeEach(async () => {
    [photographer, client, stranger] = await ethers.getSigners();
    registry = await (await ethers.getContractFactory("SelectionRegistry")).deploy();
    receipt = await (
      await ethers.getContractFactory("DeliveryReceipt")
    ).deploy(await registry.getAddress());
  });

  const createGallery = () => registry.connect(photographer).createGallery(client.address, HASHES);
  const select = () => registry.connect(client).submitSelection(1, HASHES.slice(0, 3));

  describe("createGallery", () => {
    it("stores the gallery and numbers it from 1", async () => {
      await expect(createGallery())
        .to.emit(registry, "GalleryCreated")
        .withArgs(1, photographer.address, client.address, HASHES);
      const gallery = await registry.getGallery(1);
      expect(gallery.photographer).to.equal(photographer.address);
      expect(gallery.client).to.equal(client.address);
      expect(gallery.photoCount).to.equal(6n);
      expect(await registry.isPhotoInGallery(1, HASHES[0])).to.equal(true);
      expect(await registry.isPhotoInGallery(1, OUTSIDE)).to.equal(false);
    });

    it("refuses invalid galleries", async () => {
      const as = registry.connect(photographer);
      await expect(as.createGallery(ethers.ZeroAddress, HASHES)).to.be.revertedWith(
        "Invalid client address",
      );
      await expect(as.createGallery(photographer.address, HASHES)).to.be.revertedWith(
        "Photographer and client must differ",
      );
      await expect(as.createGallery(client.address, [])).to.be.revertedWith("Gallery is empty");
      await expect(as.createGallery(client.address, [HASHES[0], HASHES[0]])).to.be.revertedWith(
        "Duplicate photo",
      );
      const tooMany = Array.from({ length: 301 }, (_, i) => photo(`p${i}`));
      await expect(as.createGallery(client.address, tooMany)).to.be.revertedWith("Too many photos");
    });

    it("fits the maximum gallery size in one transaction", async () => {
      const max = Array.from({ length: 300 }, (_, i) => photo(`p${i}`));
      const tx = await registry.connect(photographer).createGallery(client.address, max);
      const { gasUsed } = await tx.wait();
      console.log(`      gas for 300 photos: ${gasUsed}`);
      expect(gasUsed).to.be.lessThan(16_000_000n);
    });
  });

  describe("submitSelection", () => {
    beforeEach(() => createGallery());

    it("records the selection of the designated client", async () => {
      await expect(select()).to.emit(registry, "SelectionSubmitted");
      const selection = await registry.getSelection(1);
      expect([...selection.hashes]).to.deep.equal(HASHES.slice(0, 3));
      expect(selection.submittedAt).to.be.greaterThan(0n);
      expect(await registry.isPhotoSelected(1, HASHES[0])).to.equal(true);
      expect(await registry.isPhotoSelected(1, HASHES[5])).to.equal(false);
    });

    it("refuses anyone but the designated client", async () => {
      for (const signer of [photographer, stranger]) {
        await expect(registry.connect(signer).submitSelection(1, [HASHES[0]])).to.be.revertedWith(
          "Only the designated client",
        );
      }
    });

    it("makes the selection final", async () => {
      await select();
      await expect(registry.connect(client).submitSelection(1, [HASHES[5]])).to.be.revertedWith(
        "Selection is final",
      );
    });

    it("refuses an empty selection, an outside photo, duplicates and an unknown gallery", async () => {
      const as = registry.connect(client);
      await expect(as.submitSelection(1, [])).to.be.revertedWith("Selection is empty");
      await expect(as.submitSelection(1, [OUTSIDE])).to.be.revertedWith("Photo not in gallery");
      await expect(as.submitSelection(1, [HASHES[0], HASHES[0]])).to.be.revertedWith(
        "Duplicate photo",
      );
      await expect(as.submitSelection(99, [HASHES[0]])).to.be.revertedWith("Unknown gallery");
    });
  });

  describe("publishDelivery", () => {
    beforeEach(() => createGallery());

    it("refuses to deliver without a validated selection", async () => {
      await expect(receipt.connect(photographer).publishDelivery(1, DELIVERY)).to.be.revertedWith(
        "No validated selection",
      );
    });

    it("lets only the gallery's photographer deliver, and only once", async () => {
      await select();
      await expect(receipt.connect(stranger).publishDelivery(1, DELIVERY)).to.be.revertedWith(
        "Only the photographer",
      );
      await expect(receipt.connect(photographer).publishDelivery(1, DELIVERY))
        .to.emit(receipt, "DeliveryPublished")
        .withArgs(1, photographer.address, DELIVERY);
      await expect(
        receipt.connect(photographer).publishDelivery(1, photo("v2")),
      ).to.be.revertedWith("Already delivered");
    });

    it("refuses an unknown gallery and an empty hash", async () => {
      await expect(receipt.connect(photographer).publishDelivery(99, DELIVERY)).to.be.revertedWith(
        "Unknown gallery",
      );
      await select();
      await expect(
        receipt.connect(photographer).publishDelivery(1, ethers.ZeroHash),
      ).to.be.revertedWith("Invalid hash");
    });
  });

  describe("confirmReception", () => {
    beforeEach(async () => {
      await createGallery();
      await select();
    });

    it("refuses before the delivery", async () => {
      await expect(receipt.connect(client).confirmReception(1)).to.be.revertedWith(
        "Nothing delivered yet",
      );
    });

    it("lets only the client confirm, and only once", async () => {
      await receipt.connect(photographer).publishDelivery(1, DELIVERY);
      for (const signer of [photographer, stranger]) {
        await expect(receipt.connect(signer).confirmReception(1)).to.be.revertedWith(
          "Only the designated client",
        );
      }
      await expect(receipt.connect(client).confirmReception(1)).to.emit(
        receipt,
        "ReceptionConfirmed",
      );
      const delivery = await receipt.getDelivery(1);
      expect(delivery.hash).to.equal(DELIVERY);
      expect(delivery.confirmed).to.equal(true);
      await expect(receipt.connect(client).confirmReception(1)).to.be.revertedWith(
        "Already confirmed",
      );
    });
  });
});
