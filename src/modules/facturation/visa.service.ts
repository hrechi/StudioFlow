import "server-only";
import sharp from "sharp";
import { connectDB } from "@/lib/db";
import { ForbiddenError, NotFoundError, toObjectId, ValidationError, type Actor } from "./devis.service";
import { SIGNATURE_TAILLE_MAX, SIGNATURE_TYPES, type ChampVisa, type VisaStudioView } from "./facturation.types";
import { deleteSignatureImage, readSignatureImage, saveSignatureImage } from "./signature.storage";
import { VisaStudio, type IVisaStudio } from "./visa.model";

export type SignatureFile = { name: string; type: string; data: Buffer };

const FORMATS_ACCEPTES = ["png", "jpeg", "webp"];
const LABELS: Record<ChampVisa, string> = { signature: "signature", cachet: "stamp" };

/**
 * The declared type comes from the browser: the bytes are decoded to check what the file really
 * is, then re-encoded as a small PNG without metadata (pdf-lib cannot embed WEBP).
 */
export async function prepareSignatureImage(file: SignatureFile, champ: ChampVisa): Promise<Buffer> {
  const label = LABELS[champ];
  if (!(SIGNATURE_TYPES as readonly string[]).includes(file.type)) throw new ValidationError(`The ${label} must be a JPG, PNG or WEBP image.`, champ);
  if (file.data.length > SIGNATURE_TAILLE_MAX) throw new ValidationError(`The ${label} must be 2 MB or less.`, champ);

  let png: Buffer;
  let vide: boolean;
  try {
    const image = sharp(file.data, { limitInputPixels: 24_000_000 });
    const { format } = await image.metadata();
    if (!FORMATS_ACCEPTES.includes(format)) throw new Error(`Unsupported format: ${format}`);
    png = await image.rotate().resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true }).png().toBuffer();
    // stats() reads its input and ignores the pipeline, so the flattened image is rendered first.
    const { channels } = await sharp(await sharp(png).flatten({ background: "#ffffff" }).toBuffer()).stats();
    vide = channels.every((c) => c.min > 245);
  } catch {
    throw new ValidationError(`The ${label} file is not a valid image.`, champ);
  }
  if (vide) throw new ValidationError(`The ${label} image is blank.`, champ);
  return png;
}

function assertAdmin(actor: Actor) {
  if (actor.role !== "ADMIN") throw new ForbiddenError("Only administrators can manage the studio signature and stamp.");
}

async function loadVisa() {
  await connectDB();
  return VisaStudio.findOne({ cle: "STUDIO" }).lean<IVisaStudio>();
}

/** What the profile page shows. */
export async function getVisaStudio(actor: Actor): Promise<VisaStudioView> {
  assertAdmin(actor);
  const visa = await loadVisa();
  return { signature: visa?.signature?.toString(), cachet: visa?.cachet?.toString() };
}

/** Admin: adds or replaces the studio signature or stamp; every PDF uses it from then on. */
export async function setVisaImage(champ: ChampVisa, file: SignatureFile | null, actor: Actor) {
  assertAdmin(actor);
  if (!file) throw new ValidationError(champ === "signature" ? "Add your signature." : "Add your company stamp.", champ);
  const image = await prepareSignatureImage(file, champ);
  await connectDB();
  const fichier = await saveSignatureImage(image, `studio-${champ}.png`);
  try {
    const avant = await VisaStudio.findOneAndUpdate(
      { cle: "STUDIO" },
      { $set: { [champ]: fichier, modifiePar: toObjectId(actor.id) } },
      { upsert: true, returnDocument: "before" },
    ).lean<IVisaStudio>();
    const ancien = avant?.[champ];
    if (ancien) await deleteSignatureImage(ancien);
  } catch (error) {
    await deleteSignatureImage(fichier);
    throw error;
  }
}

/** Admin: removes the studio signature or stamp; the PDFs stop printing it. */
export async function deleteVisaImage(champ: ChampVisa, actor: Actor) {
  assertAdmin(actor);
  await connectDB();
  const avant = await VisaStudio.findOneAndUpdate(
    { cle: "STUDIO" },
    { $unset: { [champ]: "" }, $set: { modifiePar: toObjectId(actor.id) } },
    { returnDocument: "before" },
  ).lean<IVisaStudio>();
  const ancien = avant?.[champ];
  if (!ancien) throw new NotFoundError("Nothing to delete.");
  await deleteSignatureImage(ancien);
}

/** Preview for the profile page. */
export async function readVisaImage(champ: ChampVisa, actor: Actor) {
  assertAdmin(actor);
  const fichier = (await loadVisa())?.[champ];
  return fichier ? readSignatureImage(fichier) : null;
}

/** The images every PDF prints, whoever downloads it. */
export async function readVisaImages() {
  const visa = await loadVisa();
  const [studioSignature, studioCachet] = await Promise.all([
    visa?.signature ? readSignatureImage(visa.signature) : null,
    visa?.cachet ? readSignatureImage(visa.cachet) : null,
  ]);
  return { studioSignature: studioSignature ?? undefined, studioCachet: studioCachet ?? undefined };
}
