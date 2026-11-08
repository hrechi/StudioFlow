import "server-only";
import { Types } from "mongoose";
import { ServiceError } from "@/lib/action-result";
import { connectDB } from "@/lib/db";
import { Galerie } from "@/modules/photos-galeries/galerie.model";
import type { StatutGalerie } from "@/modules/photos-galeries/galerie.types";
import { deleteFiles } from "@/modules/photos-galeries/photo.storage";
import { createNotification } from "@/modules/utilisateurs/notification.service";
import type { ChainState } from "./snapseal.chain";
import { getSnapSealConfig } from "./snapseal.config";
import { GalerieSeal, type IGalerieSeal } from "./snapseal.model";
import { ChainUnavailableError, readGalleryState } from "./snapseal.server-chain";

/**
 * Every SnapSeal gate decision, on the server (D4: hiding a button is not security).
 *
 * Imports only models, file storage, notifications and the read-only chain reader — never
 * photo.service or snapseal.service, because photo.service calls these guards (import cycle).
 *
 * Every check starts from "is this gallery required?": a gallery without the option (and every
 * old document, which has no field) follows today's rules, untouched.
 */

type SealLean = IGalerieSeal & { _id: Types.ObjectId };
type GalerieProofLean = {
  _id: Types.ObjectId;
  titre: string;
  client: Types.ObjectId;
  statut: StatutGalerie;
  preuveBlockchainRequise?: boolean;
};

export type ProofContext = {
  galerie: GalerieProofLean;
  required: boolean;
  seal: SealLean | null;
};

function toId(id: string | Types.ObjectId): Types.ObjectId | null {
  if (id instanceof Types.ObjectId) return id;
  return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;
}

/** The gallery's option and its seal on the configured contract (null if none). */
export async function loadProofContext(
  galerieId: string | Types.ObjectId,
): Promise<ProofContext | null> {
  const _id = toId(galerieId);
  if (!_id) return null;
  await connectDB();
  const galerie = await Galerie.findById(_id)
    .select("titre client statut preuveBlockchainRequise")
    .lean<GalerieProofLean>();
  if (!galerie) return null;
  const config = getSnapSealConfig();
  const seal = config
    ? await GalerieSeal.findOne({
        galerie: _id,
        registryAddress: config.registryAddress.toLowerCase(),
      }).lean<SealLean>()
    : null;
  return { galerie, required: galerie.preuveBlockchainRequise === true, seal };
}

// ── Chain facts → saved facts and status (pure, unit-tested) ────────────────

export type ProofFacts = Pick<
  IGalerieSeal,
  "selectionAt" | "selectedHashes" | "deliveredAt" | "deliveryHash" | "confirmedAt"
>;

export type ProofSyncPlan = {
  /** New facts to save (only those not saved yet: saved facts are final, D6). */
  facts: Partial<ProofFacts>;
  /** Next status, or null to leave it. Only ever moves forward. */
  statut: StatutGalerie | null;
};

const fromChainTime = (seconds: number) => new Date(seconds * 1000);

/**
 * What the chain says, compared with what is saved. The status moves only for required
 * galleries, only forward (PARTAGEE → VALIDEE → LIVREE), and the delivery counts only when its
 * on-chain fingerprint equals the package stored in Reframe.
 */
export function planProofSync(input: {
  required: boolean;
  statut: StatutGalerie;
  saved: ProofFacts;
  livraisonHash?: string;
  chain: ChainState;
}): ProofSyncPlan {
  const { chain, saved } = input;
  const facts: Partial<ProofFacts> = {};
  if (chain.selectedAt && !saved.selectionAt) {
    facts.selectionAt = fromChainTime(chain.selectedAt);
    facts.selectedHashes = chain.selectionHashes.map((h) => h.toLowerCase());
  }
  if (chain.deliveredAt && chain.deliveryHash && !saved.deliveredAt) {
    facts.deliveredAt = fromChainTime(chain.deliveredAt);
    facts.deliveryHash = chain.deliveryHash.toLowerCase();
  }
  if (chain.confirmedAt && !saved.confirmedAt) {
    facts.confirmedAt = fromChainTime(chain.confirmedAt);
  }

  const selected = !!(saved.selectionAt ?? facts.selectionAt);
  const deliveryHash = saved.deliveryHash ?? facts.deliveryHash;
  const delivered =
    !!(saved.deliveredAt ?? facts.deliveredAt) &&
    !!input.livraisonHash &&
    deliveryHash === input.livraisonHash.toLowerCase();

  let statut: StatutGalerie | null = null;
  if (input.required) {
    let next = input.statut;
    if (next === "PARTAGEE" && selected) next = "VALIDEE";
    if (next === "VALIDEE" && delivered) next = "LIVREE";
    if (next !== input.statut) statut = next;
  }
  return { facts, statut };
}

/** True when the delivery on-chain is the package stored here (what the client may download). */
export function deliveryVerified(seal: Pick<IGalerieSeal, "deliveredAt" | "deliveryHash" | "livraison">) {
  return (
    !!seal.deliveredAt &&
    !!seal.livraison &&
    !!seal.deliveryHash &&
    seal.deliveryHash === seal.livraison.hash.toLowerCase()
  );
}

/**
 * Reads the chain, saves the new facts (D6) and moves the status forward (D7). Takes no state
 * from the caller: the browser may only ask the server to look again. A chain failure throws
 * ChainUnavailableError and changes nothing.
 */
export async function syncGalerieProof(galerieId: string | Types.ObjectId): Promise<ProofContext> {
  const ctx = await loadProofContext(galerieId);
  const config = getSnapSealConfig();
  if (!ctx || !ctx.seal || !config) throw new ServiceError("This gallery is not sealed.");

  const chain = await readGalleryState(config, ctx.seal.onChainId);
  const plan = planProofSync({
    required: ctx.required,
    statut: ctx.galerie.statut,
    saved: ctx.seal,
    livraisonHash: ctx.seal.livraison?.hash,
    chain,
  });

  if (Object.keys(plan.facts).length) {
    await GalerieSeal.updateOne({ _id: ctx.seal._id }, { $set: plan.facts });
  }
  if (plan.statut) {
    // The filter on the old status makes two simultaneous syncs harmless.
    await Galerie.updateOne(
      { _id: ctx.galerie._id, statut: ctx.galerie.statut },
      { $set: { statut: plan.statut } },
    );
    if (plan.statut === "LIVREE") {
      await createNotification({
        utilisateurId: ctx.galerie.client.toString(),
        titre: "Your photos are delivered",
        message: `The final delivery of “${ctx.galerie.titre}” is ready to download, with its blockchain proof.`,
        type: "GALERIE",
        lienCible: `/espace-client/galeries/${ctx.galerie._id.toString()}/snapseal`,
      });
    }
  }
  return {
    galerie: { ...ctx.galerie, statut: plan.statut ?? ctx.galerie.statut },
    required: ctx.required,
    seal: { ...ctx.seal, ...plan.facts },
  };
}

/** The saved selection first; the chain only when it is not saved yet (then saved for next time). */
async function withSelectionChecked(ctx: ProofContext): Promise<ProofContext> {
  if (!ctx.seal || ctx.seal.selectionAt) return ctx;
  return syncGalerieProof(ctx.galerie._id);
}

// ── Gates used by the gallery and photo services ────────────────────────────

/** Share gate (D3): a required gallery can't leave culling before it is sealed. */
export async function assertMayShare(galerieId: string | Types.ObjectId): Promise<void> {
  const ctx = await loadProofContext(galerieId);
  if (ctx?.required && !ctx.seal) {
    throw new ServiceError(
      "This gallery requires a blockchain proof: seal it on its Blockchain proof page before sharing it.",
    );
  }
}

/** True when the gallery is required and sealed: its photos, client and status are locked (D11). */
export async function isLocked(galerieId: string | Types.ObjectId): Promise<boolean> {
  const ctx = await loadProofContext(galerieId);
  return !!ctx?.required && !!ctx.seal;
}

const LOCKED = "This gallery is sealed on the blockchain: ";

/** Edit dialog: client, status and the option can't change on a sealed required gallery. */
export async function assertGalerieEditAllowed(
  galerieId: string | Types.ObjectId,
  change: { client: boolean; statut: boolean },
): Promise<void> {
  if (!change.client && !change.statut) return;
  if (!(await isLocked(galerieId))) return;
  throw new ServiceError(
    change.client
      ? `${LOCKED}its client can't change anymore.`
      : `${LOCKED}its step now follows the blockchain (selection, then delivery).`,
  );
}

/**
 * Uploads to a sealed required gallery. New photos would differ from what is on-chain, so they
 * are refused — except edited copies of sealed photos once the client's selection is verified:
 * those are the retouched files the studio delivers, never shown to the client as gallery photos.
 */
export async function assertUploadAllowed(
  galerieId: string | Types.ObjectId,
  rootOriginalId?: Types.ObjectId,
): Promise<void> {
  const ctx = await loadProofContext(galerieId);
  if (!ctx?.required || !ctx.seal) return;
  if (!rootOriginalId) {
    throw new ServiceError(`${LOCKED}photos can't be added anymore. Retouch them in Photo Editing instead.`);
  }
  if (!ctx.seal.photos.some((p) => p.photo.equals(rootOriginalId))) {
    throw new ServiceError(`${LOCKED}only edited copies of its sealed photos can be added.`);
  }
  const fresh = await withSelectionChecked(ctx);
  if (!fresh.seal?.selectionAt) {
    throw new ServiceError(
      `${LOCKED}edited copies can be added once the client has validated their selection.`,
    );
  }
}

/** Deleting or culling: refused for photos that are sealed in a required gallery. */
export async function assertPhotosChangeAllowed(
  photos: { _id: Types.ObjectId; galerie: Types.ObjectId }[],
  action: "delete" | "culling",
): Promise<void> {
  const galleries = [...new Set(photos.map((p) => p.galerie.toString()))];
  for (const id of galleries) {
    const ctx = await loadProofContext(id);
    if (!ctx?.required || !ctx.seal) continue;
    const sealed = new Set(ctx.seal.photos.map((p) => p.photo.toString()));
    if (photos.some((p) => p.galerie.toString() === id && sealed.has(p._id.toString()))) {
      throw new ServiceError(
        action === "delete"
          ? `${LOCKED}its sealed photos can't be deleted.`
          : `${LOCKED}its sealed photos can't be kept or rejected anymore.`,
      );
    }
  }
}

/**
 * A client can't change wallet while one of their sealed required galleries isn't finished
 * (reception not confirmed): the contract only accepts the wallet it was sealed for.
 */
export async function assertWalletChangeAllowed(
  userId: string,
  currentWallet: string | null,
  nextWallet: string,
): Promise<void> {
  if (!currentWallet || currentWallet.toLowerCase() === nextWallet.toLowerCase()) return;
  const _id = toId(userId);
  const config = getSnapSealConfig();
  if (!_id || !config) return;
  await connectDB();
  const galleries = await Galerie.find({ client: _id, preuveBlockchainRequise: true })
    .select("_id")
    .lean<{ _id: Types.ObjectId }[]>();
  if (!galleries.length) return;
  const open = await GalerieSeal.exists({
    galerie: { $in: galleries.map((g) => g._id) },
    registryAddress: config.registryAddress.toLowerCase(),
    confirmedAt: { $exists: false },
  });
  if (open) {
    throw new ServiceError(
      "One of your galleries is sealed with your current wallet and isn't finished yet. Keep this wallet until you confirm the reception.",
    );
  }
}

/** Deleting a gallery: its seal and stored delivery go too. The on-chain record stays forever. */
export async function deleteSealsOfGalerie(galerieId: Types.ObjectId): Promise<void> {
  await connectDB();
  const seals = await GalerieSeal.find({ galerie: galerieId })
    .select("livraison")
    .lean<Pick<SealLean, "_id" | "livraison">[]>();
  await deleteFiles(seals.flatMap((s) => (s.livraison ? [s.livraison.fichier] : [])));
  await GalerieSeal.deleteMany({ galerie: galerieId });
}

// ── Gates used by the file routes (client side of Section 3) ────────────────

export type ClientGate = "ok" | "refused" | "unavailable";

/**
 * Originals and the ZIP, for the CLIENT of a required gallery: only once the selection is
 * verified on-chain. Other galleries: "ok" (the route's existing rules still apply).
 */
export async function clientOriginalsGate(galerieId: string | Types.ObjectId): Promise<ClientGate> {
  const ctx = await loadProofContext(galerieId);
  if (!ctx?.required) return "ok";
  if (!ctx.seal) return "refused";
  if (ctx.seal.selectionAt) return "ok";
  try {
    const fresh = await syncGalerieProof(ctx.galerie._id);
    return fresh.seal?.selectionAt ? "ok" : "refused";
  } catch (error) {
    if (error instanceof ChainUnavailableError) return "unavailable";
    throw error;
  }
}

/**
 * True when the client may see this photo: on required galleries, only the sealed ones —
 * plus, once the delivery is verified on-chain, the photos inside it (the retouched copies).
 */
export async function clientMaySeePhoto(
  galerieId: string | Types.ObjectId,
  photoId: string,
): Promise<boolean> {
  const ctx = await loadProofContext(galerieId);
  if (!ctx?.required) return true;
  if (ctx.seal?.photos.some((p) => p.photo.toString() === photoId)) return true;
  return !!ctx.seal && isInVerifiedDelivery(ctx.seal, photoId);
}

function isInVerifiedDelivery(seal: SealLean, photoId: string): boolean {
  return deliveryVerified(seal) && !!seal.livraison?.photos.some((id) => id.toString() === photoId);
}

/**
 * A photo of the verified delivery may be downloaded one by one by the client, even when the
 * gallery's "downloads allowed" switch is off: it is the final product, like the delivery ZIP.
 */
export async function clientMayDownloadDelivered(
  galerieId: string | Types.ObjectId,
  photoId: string,
): Promise<boolean> {
  const ctx = await loadProofContext(galerieId);
  return !!ctx?.seal && isInVerifiedDelivery(ctx.seal, photoId);
}

/** The delivery package, for the gallery's client: only once its on-chain hash is verified. */
export async function clientDeliveryGate(galerieId: string | Types.ObjectId): Promise<ClientGate> {
  const ctx = await loadProofContext(galerieId);
  if (!ctx?.seal?.livraison) return "refused";
  if (deliveryVerified(ctx.seal)) return "ok";
  try {
    const fresh = await syncGalerieProof(ctx.galerie._id);
    return fresh.seal && deliveryVerified(fresh.seal) ? "ok" : "refused";
  } catch (error) {
    if (error instanceof ChainUnavailableError) return "unavailable";
    throw error;
  }
}
