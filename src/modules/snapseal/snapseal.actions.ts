"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  failure,
  success,
  toFailure,
  validationFailure,
  type ActionResult,
} from "@/lib/action-result";
import { requireArea, requireUser } from "@/lib/guards";
import { can } from "@/lib/rbac";
import { getGalerieById } from "@/modules/photos-galeries/galerie.service";
import { createNotification } from "@/modules/utilisateurs/notification.service";
import { getUtilisateurWallet } from "@/modules/utilisateurs/utilisateur.service";
import { buildDeliveryPackage } from "./snapseal.delivery";
import { deleteSealsOfGalerie, loadProofContext, syncGalerieProof } from "./snapseal.guards";
import { computeGalerieHashes, getSnapSealConfig, verifyAndRecordSeal } from "./snapseal.service";
import { SNAPSEAL_MAX_PHOTOS, type LivraisonDTO, type SealedPhoto } from "./snapseal.types";

const recordSealSchema = z.object({
  galerieId: z.string().min(1),
  txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
});

/**
 * Admin: forgets a seal that isn't delivered yet (e.g. sealed with the wrong wallet), so the
 * gallery can be sealed again with the right photographer and client wallets. The old on-chain
 * record stays on the blockchain (it can't be erased) but no longer counts for this gallery;
 * its wallets are free to move again.
 */
export async function resetSealAction(galerieId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role !== "ADMIN") return failure("Only an admin can reset a seal.");
  try {
    const ctx = await loadProofContext(galerieId);
    if (!ctx?.seal) return failure("This gallery has no seal to reset.");
    let deliveredAt = ctx.seal.deliveredAt;
    try {
      deliveredAt = (await syncGalerieProof(ctx.galerie._id)).seal?.deliveredAt ?? deliveredAt;
    } catch {
      // Chain unreachable: decide on what was last recorded.
    }
    if (deliveredAt) {
      return failure(
        "The delivery is already published on the blockchain: this seal can't be reset.",
      );
    }
    await deleteSealsOfGalerie(ctx.galerie._id);
    revalidateProof(galerieId);
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

function revalidateProof(galerieId: string) {
  revalidatePath(`/dashboard/galeries/${galerieId}`, "layout");
  revalidatePath(`/espace-client/galeries/${galerieId}`, "layout");
  revalidatePath("/dashboard/galeries");
  revalidatePath("/espace-client/galeries");
}

/** Staff only: fingerprints to publish. The browser signs them with the photographer's wallet. */
export async function prepareSealAction(galerieId: string): Promise<ActionResult<SealedPhoto[]>> {
  await requireArea("photos-galeries");
  try {
    const galerie = await getGalerieById(galerieId);
    if (!galerie) return failure("Gallery not found.");
    if (galerie.preuveBlockchainRequise && !(await getUtilisateurWallet(galerie.client.id))) {
      return failure("The client hasn't linked a wallet to their account yet.");
    }
    return success(await computeGalerieHashes(galerie.id));
  } catch (error) {
    return toFailure(error);
  }
}

/**
 * Staff only: records the seal of a gallery. Nothing comes from the browser but the transaction
 * hash: the server reads its receipt and checks the event came from OUR registry, its client is
 * the gallery client's linked wallet (required galleries), and its fingerprints are exactly the
 * gallery's photos right now. The on-chain id is taken from the event.
 */
export async function recordSealAction(input: unknown): Promise<ActionResult> {
  await requireArea("photos-galeries");
  const parsed = recordSealSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const config = getSnapSealConfig();
  if (!config) return failure("SnapSeal is not configured.");

  try {
    await verifyAndRecordSeal(config, parsed.data.galerieId, parsed.data.txHash);
    revalidateProof(parsed.data.galerieId);
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

const buildDeliverySchema = z.object({
  galerieId: z.string().regex(/^[a-f\d]{24}$/i),
  photoIds: z
    .array(z.string().regex(/^[a-f\d]{24}$/i))
    .min(1, "Choose at least one photo")
    .max(SNAPSEAL_MAX_PHOTOS * 2),
});

/**
 * Staff only: builds the delivery package from photos CHOSEN IN THE GALLERY (no file from the
 * computer), stores it in Reframe and returns its server-computed fingerprint, which the
 * photographer then signs on-chain. The request is a list of ids, so a Server Action is enough.
 */
export async function buildDeliveryAction(input: unknown): Promise<ActionResult<LivraisonDTO>> {
  await requireArea("photos-galeries");
  const parsed = buildDeliverySchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  try {
    const livraison = await buildDeliveryPackage(parsed.data.galerieId, parsed.data.photoIds);
    revalidateProof(parsed.data.galerieId);
    return success(livraison);
  } catch (error) {
    return toFailure(error);
  }
}

/** Staff only: tells the client to link a wallet, which a required gallery needs to be sealed. */
export async function askClientWalletAction(galerieId: string): Promise<ActionResult> {
  await requireArea("photos-galeries");
  try {
    const galerie = await getGalerieById(galerieId);
    if (!galerie) return failure("Gallery not found.");
    await createNotification({
      utilisateurId: galerie.client.id,
      titre: "Link your wallet",
      message: `To receive “${galerie.titre}” with its blockchain proof, link your MetaMask wallet in your profile.`,
      type: "GALERIE",
      lienCible: "/espace-client/profil",
    });
    return success();
  } catch (error) {
    return toFailure(error);
  }
}

/**
 * Staff, or the gallery's client: asks the server to read the chain again after a transaction.
 * The server alone decides what changed (D7): nothing is taken from the caller.
 */
export async function syncProofAction(galerieId: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const ctx = await loadProofContext(galerieId);
    if (!ctx) return failure("Gallery not found.");
    const isStaff = can(user.role, "photos-galeries");
    const isOwner = user.role === "CLIENT" && ctx.galerie.client.toString() === user.id;
    if (!isStaff && !isOwner) return failure("Gallery not found.");
    await syncGalerieProof(ctx.galerie._id);
    revalidateProof(ctx.galerie._id.toString());
    return success();
  } catch (error) {
    return toFailure(error);
  }
}
