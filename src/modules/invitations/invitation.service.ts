/**
 * Module : Gestion des Invitations. CRUD with access rights: a client only ever sees their own
 * invitations, and only once the editor is unlocked (invitation.acces.ts).
 */
import "server-only";
import { randomBytes } from "node:crypto";
import { Readable } from "node:stream";
import { nodeStreamToWeb } from "@/lib/streams";
import mongoose, { Types } from "mongoose";
import sharp from "sharp";
import { connectDB } from "@/lib/db";
import {
  BusinessRuleError,
  NotFoundError,
  toObjectId,
  ValidationError,
  type Actor,
} from "@/modules/facturation/devis.service";
import { assertDebloque } from "./invitation.acces";
import { appliquerDetails } from "./invitation.linked";
import { Invitation, type IInvitation } from "./invitation.model";
import { contenuSchema, type ContenuInvitation, type Langue } from "./invitation.schema";
import { adapterLangue, findTemplate } from "./invitation.templates";
import {
  IMAGE_TAILLE_MAX,
  IMAGE_TYPES,
  imageHref,
  MAX_IMAGES,
  MAX_INVITATIONS,
  type InvitationResume,
  type InvitationView,
} from "./invitation.types";

type Lean = IInvitation & { _id: Types.ObjectId };

function toResume(doc: Lean): InvitationResume {
  return {
    id: doc._id.toString(),
    titre: doc.titre,
    contenu: JSON.parse(JSON.stringify(doc.contenu)) as ContenuInvitation,
    partageActif: !!doc.partage?.actif,
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

function toView(doc: Lean): InvitationView {
  return { ...toResume(doc), partageToken: doc.partage?.token };
}

const proprietaire = (id: string, actor: Actor) => ({ _id: toObjectId(id), client: toObjectId(actor.id) });

async function assertPlace(actor: Actor) {
  const total = await Invitation.countDocuments({ client: toObjectId(actor.id) });
  if (total >= MAX_INVITATIONS) throw new BusinessRuleError(`You can keep up to ${MAX_INVITATIONS} invitations: delete one first.`);
}

export async function listInvitations(actor: Actor): Promise<InvitationResume[]> {
  await assertDebloque(actor);
  const docs = await Invitation.find({ client: toObjectId(actor.id) }).sort({ updatedAt: -1 }).lean<Lean[]>();
  return docs.map(toResume);
}

export async function loadInvitation(id: string, actor: Actor): Promise<InvitationView> {
  await assertDebloque(actor);
  const doc = await Invitation.findOne(proprietaire(id, actor)).lean<Lean>();
  if (!doc) throw new NotFoundError("Invitation not found.");
  return toView(doc);
}

export async function createInvitation(input: { titre: string; templateId: string; langue?: Langue }, actor: Actor): Promise<{ id: string }> {
  await assertDebloque(actor);
  const template = findTemplate(input.templateId);
  if (!template) throw new ValidationError("Choose a template.", "templateId");
  await assertPlace(actor);
  const doc = await Invitation.create({
    client: toObjectId(actor.id),
    titre: input.titre,
    contenu: appliquerDetails(contenuSchema.parse(input.langue ? adapterLangue(template.contenu, input.langue) : template.contenu)),
  });
  return { id: doc._id.toString() };
}

/** The linked texts are recomputed here too: the card can never disagree with the form. */
export async function saveInvitation(id: string, input: { titre: string; contenu: ContenuInvitation }, actor: Actor): Promise<{ updatedAt: string }> {
  await assertDebloque(actor);
  const doc = await Invitation.findOneAndUpdate(
    proprietaire(id, actor),
    { $set: { titre: input.titre, contenu: appliquerDetails(input.contenu) } },
    { returnDocument: "after" },
  ).lean<Lean>();
  if (!doc) throw new NotFoundError("Invitation not found.");
  return { updatedAt: new Date(doc.updatedAt).toISOString() };
}

export async function duplicateInvitation(id: string, actor: Actor): Promise<{ id: string }> {
  const original = await loadInvitation(id, actor);
  await assertPlace(actor);
  const doc = await Invitation.create({
    client: toObjectId(actor.id),
    titre: `${original.titre} (copy)`.slice(0, 80),
    contenu: original.contenu,
  });
  return { id: doc._id.toString() };
}

export async function deleteInvitation(id: string, actor: Actor) {
  await assertDebloque(actor);
  const doc = await Invitation.findOneAndDelete(proprietaire(id, actor)).lean<Lean>();
  if (!doc) throw new NotFoundError("Invitation not found.");
  await supprimerImagesOrphelines(doc.contenu, actor);
  if (doc.apercu) await (await bucket()).delete(doc.apercu).catch(() => undefined);
}

// ---------------------------------------------------------------------------
// Public page
// ---------------------------------------------------------------------------

/** Turns the link on or off. The token is kept, so a link shared earlier works again when re-enabled. */
export async function setPartage(id: string, actif: boolean, actor: Actor): Promise<{ token?: string; actif: boolean }> {
  await assertDebloque(actor);
  await connectDB();
  const doc = await Invitation.findOne(proprietaire(id, actor));
  if (!doc) throw new NotFoundError("Invitation not found.");
  doc.partage = { token: doc.partage?.token ?? randomBytes(16).toString("hex"), actif };
  await doc.save();
  return { token: doc.partage.token, actif };
}

/** What a guest sees: the card and its name, nothing about the account. */
export async function findInvitationPublique(token: string): Promise<{ titre: string; contenu: ContenuInvitation; aApercu: boolean } | null> {
  if (!/^[0-9a-f]{32}$/.test(token)) return null;
  await connectDB();
  const doc = await Invitation.findOne({ "partage.token": token, "partage.actif": true }).lean<Lean>();
  return doc ? { titre: doc.titre, contenu: JSON.parse(JSON.stringify(doc.contenu)) as ContenuInvitation, aApercu: !!doc.apercu } : null;
}

// ---------------------------------------------------------------------------
// Link preview (Open Graph picture of a shared card)
// ---------------------------------------------------------------------------

/** Open Graph size: WhatsApp, Messenger and the others crop around this 1.91:1 frame. */
const APERCU_LARGEUR = 1200;
const APERCU_HAUTEUR = 630;
const APERCU_TAILLE_MAX = 4 * 1024 * 1024;

/**
 * The editor sends a PNG of the card; it is decoded (so it really is an image), framed on the card's
 * background color and stored as a JPEG. The previous preview of the card is deleted.
 */
export async function saveApercu(id: string, file: { type: string; size: number; data: Buffer }, actor: Actor): Promise<void> {
  await assertDebloque(actor);
  if (file.type !== "image/png" || file.size > APERCU_TAILLE_MAX) throw new ValidationError("The preview must be a PNG of 4 MB or less.", "image");
  await connectDB();
  const doc = await Invitation.findOne(proprietaire(id, actor)).select("apercu contenu.background").lean<Lean>();
  if (!doc) throw new NotFoundError("Invitation not found.");

  let jpeg: Buffer;
  try {
    const fond = /^#[0-9a-f]{6}$/i.test(doc.contenu.background.color) ? doc.contenu.background.color : "#ffffff";
    jpeg = await sharp(file.data, { limitInputPixels: 20_000_000 })
      .resize({ width: APERCU_LARGEUR, height: APERCU_HAUTEUR, fit: "contain", background: fond })
      .flatten({ background: fond })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
  } catch {
    throw new ValidationError("This file is not a valid image.", "image");
  }

  const b = await bucket();
  const upload = b.openUploadStream("apercu.jpg", { metadata: { client: actor.id, invitation: id, apercu: true, contentType: "image/jpeg" } });
  await new Promise<void>((resolve, reject) => {
    Readable.from(jpeg).pipe(upload).on("finish", resolve).on("error", reject);
  });
  await Invitation.updateOne({ _id: doc._id }, { $set: { apercu: upload.id } });
  if (doc.apercu) await b.delete(doc.apercu).catch(() => undefined);
}

/** The preview of a card that is shared right now, for anyone (link previews have no session). */
export async function openApercu(token: string) {
  if (!/^[0-9a-f]{32}$/.test(token)) return null;
  await connectDB();
  const doc = await Invitation.findOne({ "partage.token": token, "partage.actif": true }).select("apercu").lean<Lean>();
  if (!doc?.apercu) return null;
  const b = await bucket();
  const [file] = await b.find({ _id: doc.apercu }).limit(1).toArray();
  if (!file) return null;
  return { stream: nodeStreamToWeb(b.openDownloadStream(doc.apercu)), length: file.length };
}

// ---------------------------------------------------------------------------
// Uploaded images (GridFS bucket `imagesInvitations`)
// ---------------------------------------------------------------------------

const BUCKET = "imagesInvitations";

async function bucket() {
  const conn = await connectDB();
  if (!conn.connection.db) throw new Error("MongoDB connection is not ready.");
  return new mongoose.mongo.GridFSBucket(conn.connection.db, { bucketName: BUCKET });
}

/** The bytes are decoded to check what the file really is, then re-encoded without metadata. */
export async function uploadImage(file: { type: string; size: number; data: Buffer }, actor: Actor): Promise<{ src: string; width: number; height: number }> {
  await assertDebloque(actor);
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) throw new ValidationError("The image must be a JPG, PNG or WEBP file.", "image");
  if (file.size > IMAGE_TAILLE_MAX) throw new ValidationError("The image must be 5 MB or less.", "image");
  const b = await bucket();
  const total = await b.find({ "metadata.client": actor.id, "metadata.apercu": { $ne: true } }).toArray();
  if (total.length >= MAX_IMAGES) throw new BusinessRuleError("You reached the limit of uploaded images: delete an invitation first.");

  let sortie: { data: Buffer; info: { width: number; height: number } };
  try {
    const image = sharp(file.data, { limitInputPixels: 40_000_000 });
    const { format } = await image.metadata();
    if (!["png", "jpeg", "webp"].includes(format)) throw new Error(`Unsupported format: ${format}`);
    sortie = await image.rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 88 }).toBuffer({ resolveWithObject: true });
  } catch {
    throw new ValidationError("This file is not a valid image.", "image");
  }
  const upload = b.openUploadStream("invitation.webp", { metadata: { client: actor.id, contentType: "image/webp" } });
  await new Promise<void>((resolve, reject) => {
    Readable.from(sortie.data).pipe(upload).on("finish", resolve).on("error", reject);
  });
  return { src: imageHref(upload.id.toString()), width: sortie.info.width, height: sortie.info.height };
}

/** Readable by the client who uploaded it, and by anyone once it sits on a shared card. */
export async function openImage(id: string, actor: Actor | null) {
  if (!Types.ObjectId.isValid(id)) return null;
  const b = await bucket();
  const _id = new Types.ObjectId(id);
  const [file] = await b.find({ _id }).limit(1).toArray();
  if (!file) return null;
  const src = imageHref(id);
  const autorise = file.metadata?.client === actor?.id && !!actor
    || !!(await Invitation.exists({
      "partage.actif": true,
      $or: [{ "contenu.elements.src": src }, { "contenu.background.image": src }],
    }));
  if (!autorise) return null;
  return {
    stream: nodeStreamToWeb(b.openDownloadStream(_id)),
    length: file.length,
    contentType: (file.metadata?.contentType as string | undefined) ?? "image/webp",
  };
}

const imagesDe = (contenu: ContenuInvitation) =>
  [contenu.background.image, ...contenu.elements.map((e) => (e.type === "image" ? e.src : undefined))]
    .filter((s): s is string => !!s?.startsWith("/api/invitations/images/"));

/** Duplicates share files, so a file only goes when no other invitation of the client uses it. */
async function supprimerImagesOrphelines(contenu: ContenuInvitation, actor: Actor) {
  const b = await bucket();
  for (const src of new Set(imagesDe(contenu))) {
    const encoreUtilisee = await Invitation.exists({
      client: toObjectId(actor.id),
      $or: [{ "contenu.elements.src": src }, { "contenu.background.image": src }],
    });
    if (!encoreUtilisee) {
      await b.delete(new Types.ObjectId(src.split("/").at(-1))).catch(() => undefined);
    }
  }
}
