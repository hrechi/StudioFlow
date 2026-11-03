import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { Types } from "mongoose";

const mocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
  read: vi.fn(),
  connectDB: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ connectDB: mocks.connectDB }));
vi.mock("@/modules/utilisateurs/notification.service", () => ({ createNotification: vi.fn() }));
vi.mock("../facturation.integrations", () => ({ getFacturationReferences: vi.fn(), getFacturationSession: vi.fn() }));
vi.mock("../devis.model", () => ({ Devis: {} }));
vi.mock("../visa.model", () => ({ VisaStudio: { findOne: mocks.findOne, findOneAndUpdate: mocks.findOneAndUpdate } }));
vi.mock("../signature.storage", () => ({
  saveSignatureImage: mocks.save,
  deleteSignatureImage: mocks.remove,
  readSignatureImage: mocks.read,
}));

import { ForbiddenError } from "../devis.service";
import { deleteVisaImage, getVisaStudio, prepareSignatureImage, readVisaImage, readVisaImages, setVisaImage, type SignatureFile } from "../visa.service";

const admin = { id: "0123456789abcdef01234567", role: "ADMIN" as const };

const fichier = async () => ({
  name: "c.png",
  type: "image/png",
  data: await sharp({ create: { width: 60, height: 60, channels: 3, background: "#123456" } }).png().toBuffer(),
});

describe("studio signature and stamp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.save.mockImplementation(async () => new Types.ObjectId());
    mocks.findOne.mockReturnValue({ lean: async () => null });
    mocks.findOneAndUpdate.mockReturnValue({ lean: async () => null });
  });

  it("is managed by administrators only", async () => {
    for (const role of ["CLIENT", "PHOTOGRAPHE"] as const) {
      const actor = { id: admin.id, role };
      await expect(getVisaStudio(actor)).rejects.toBeInstanceOf(ForbiddenError);
      await expect(setVisaImage("cachet", await fichier(), actor)).rejects.toBeInstanceOf(ForbiddenError);
      await expect(deleteVisaImage("cachet", actor)).rejects.toBeInstanceOf(ForbiddenError);
      await expect(readVisaImage("cachet", actor)).rejects.toBeInstanceOf(ForbiddenError);
    }
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("saves the first image in the single studio document", async () => {
    await setVisaImage("cachet", await fichier(), admin);
    const [filter, update, options] = mocks.findOneAndUpdate.mock.calls[0] as [unknown, { $set: { cachet: unknown } }, unknown];
    expect(filter).toEqual({ cle: "STUDIO" });
    expect(update.$set.cachet).toBeInstanceOf(Types.ObjectId);
    expect(options).toMatchObject({ upsert: true });
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("deletes the previous file when an image is replaced", async () => {
    const ancien = new Types.ObjectId();
    mocks.findOneAndUpdate.mockReturnValue({ lean: async () => ({ cachet: ancien }) });
    await setVisaImage("cachet", await fichier(), admin);
    expect(mocks.remove).toHaveBeenCalledWith(ancien);
  });

  it("requires a valid image", async () => {
    await expect(setVisaImage("signature", null, admin)).rejects.toThrow("Add your signature.");
    await expect(setVisaImage("cachet", { name: "x.png", type: "image/png", data: Buffer.from("nope") }, admin)).rejects.toThrow("not a valid image");
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("deletes one image without touching the other", async () => {
    const signature = new Types.ObjectId();
    mocks.findOneAndUpdate.mockReturnValue({ lean: async () => ({ signature, cachet: new Types.ObjectId() }) });
    await deleteVisaImage("signature", admin);
    expect(mocks.findOneAndUpdate.mock.calls[0]?.[1]).toMatchObject({ $unset: { signature: "" } });
    expect(mocks.remove.mock.calls).toEqual([[signature]]);
  });

  it("reports when there is nothing to delete", async () => {
    await expect(deleteVisaImage("cachet", admin)).rejects.toThrow("Nothing to delete.");
  });

  it("gives the PDFs what exists, without needing a user", async () => {
    const bytes = new Uint8Array([1]);
    mocks.read.mockResolvedValue(bytes);
    mocks.findOne.mockReturnValue({ lean: async () => ({ cachet: new Types.ObjectId() }) });
    await expect(readVisaImages()).resolves.toEqual({ studioSignature: undefined, studioCachet: bytes });
  });
});

const dessin = () =>
  sharp({ create: { width: 200, height: 80, channels: 3, background: "#ffffff" } })
    .composite([{ input: { create: { width: 100, height: 4, channels: 3, background: "#000000" } }, top: 40, left: 50 }])
    .png()
    .toBuffer();

const png = async (data?: Buffer): Promise<SignatureFile> => ({ name: "s.png", type: "image/png", data: data ?? (await dessin()) });

describe("signature image validation", () => {
  it("rejects a type outside the allowed list", async () => {
    await expect(prepareSignatureImage({ name: "a.pdf", type: "application/pdf", data: await dessin() }, "signature")).rejects.toThrow("JPG, PNG or WEBP");
  });

  it("rejects a file over 2 MB", async () => {
    await expect(prepareSignatureImage({ name: "a.png", type: "image/png", data: Buffer.alloc(2 * 1024 * 1024 + 1) }, "cachet")).rejects.toThrow("2 MB");
  });

  it("checks the real content, not the declared type", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="5" height="5"/></svg>');
    await expect(prepareSignatureImage(await png(Buffer.from("not an image")), "signature")).rejects.toThrow("not a valid image");
    await expect(prepareSignatureImage(await png(svg), "signature")).rejects.toThrow("not a valid image");
  });

  it("rejects a blank image", async () => {
    const blanc = await sharp({ create: { width: 100, height: 40, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    await expect(prepareSignatureImage(await png(blanc), "signature")).rejects.toThrow("blank");
  });

  it("converts to a bounded PNG without metadata", async () => {
    const grand = await sharp({ create: { width: 3000, height: 1000, channels: 3, background: "#123456" } })
      .withExif({ IFD0: { Copyright: "secret" } })
      .jpeg()
      .toBuffer();
    const meta = await sharp(await prepareSignatureImage({ name: "c.jpg", type: "image/jpeg", data: grand }, "cachet")).metadata();
    expect(meta).toMatchObject({ format: "png", width: 800 });
    expect(meta.exif).toBeUndefined();
  });
});
