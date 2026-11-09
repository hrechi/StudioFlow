"use server";

import { getAddress, isAddress, verifyMessage } from "ethers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  failure,
  success,
  toFailure,
  validationFailure,
  type ActionResult,
} from "@/lib/action-result";
import { requireUser } from "@/lib/guards";
import {
  findWalletOwner,
  getUtilisateurWallet,
  setUtilisateurWallet,
  unsetUtilisateurWallet,
} from "@/modules/utilisateurs/utilisateur.service";
import { assertWalletChangeAllowed } from "./snapseal.guards";
import { WALLET_LINK_MAX_AGE_MS, walletLinkMessage } from "./snapseal.wallet";

const linkWalletSchema = z.object({
  address: z.string().refine((value) => isAddress(value), "Invalid wallet address"),
  signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/, "Invalid signature"),
  issuedAt: z.iso.datetime(),
});

/** Clock difference tolerated between the browser and the server. */
const CLOCK_SKEW_MS = 60 * 1000;

/**
 * Links a wallet to the signed-in account. Proof of ownership: the wallet signed a message that
 * names THIS session's user and a time under 5 minutes old (the server rebuilds the message, so
 * a signature made for another account or replayed later never matches).
 */
export async function linkWalletAction(
  input: unknown,
): Promise<ActionResult<{ address: string; movedFromAnotherAccount: boolean }>> {
  const user = await requireUser();
  const parsed = linkWalletSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);
  const { address, signature, issuedAt } = parsed.data;

  const age = Date.now() - Date.parse(issuedAt);
  if (age > WALLET_LINK_MAX_AGE_MS || age < -CLOCK_SKEW_MS) {
    return failure("This signature has expired. Sign again to link your wallet.");
  }

  let signer: string;
  try {
    signer = verifyMessage(walletLinkMessage(user.id, issuedAt), signature);
  } catch {
    return failure("This signature is not valid.");
  }
  if (signer.toLowerCase() !== address.toLowerCase()) {
    return failure("This signature was not made by this wallet.");
  }

  try {
    await assertWalletChangeAllowed(user.id, await getUtilisateurWallet(user.id), address);
    // Linked to another account: it moves here, unless that account still needs it for a seal.
    const previousOwner = await findWalletOwner(address, user.id);
    if (previousOwner) await assertWalletChangeAllowed(previousOwner, address, "", true);
    const { movedFromAnotherAccount } = await setUtilisateurWallet(user.id, address);
    revalidatePath("/dashboard/profil");
    revalidatePath("/espace-client/profil");
    return success({ address: getAddress(address), movedFromAnotherAccount });
  } catch (error) {
    return toFailure(error);
  }
}

/** Removes the signed-in account's wallet (same rule: not while a seal still needs it). */
export async function unlinkWalletAction(): Promise<ActionResult<null>> {
  const user = await requireUser();
  try {
    const current = await getUtilisateurWallet(user.id);
    if (!current) return success(null);
    await assertWalletChangeAllowed(user.id, current, "");
    await unsetUtilisateurWallet(user.id);
    revalidatePath("/dashboard/profil");
    revalidatePath("/espace-client/profil");
    return success(null);
  } catch (error) {
    return toFailure(error);
  }
}
