"use server";

import { getAddress, isAddress, verifyMessage } from "ethers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { failure, success, toFailure, validationFailure, type ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/guards";
import {
  getUtilisateurWallet,
  setUtilisateurWallet,
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
export async function linkWalletAction(input: unknown): Promise<ActionResult<{ address: string }>> {
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
    await setUtilisateurWallet(user.id, address);
    revalidatePath("/dashboard/profil");
    revalidatePath("/espace-client/profil");
    return success({ address: getAddress(address) });
  } catch (error) {
    return toFailure(error);
  }
}
