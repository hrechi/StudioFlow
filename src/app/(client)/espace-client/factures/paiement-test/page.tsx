/* Module : Gestion de la Facturation · Responsable : Aya Flah */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireArea } from "@/lib/guards";
import { PaiementSimulateur } from "@/modules/facturation/components/paiement-simulateur";
import { getPaiementSimule } from "@/modules/facturation/paiement.service";

export const metadata: Metadata = { title: "Test payment" };

/**
 * Stand-in for the Konnect checkout while KONNECT_API_KEY / KONNECT_WALLET_ID are not set.
 * Only exists outside production (getPaiementSimule returns null otherwise).
 */
export default async function PaiementTestPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const user = await requireArea("espace-client");
  const { ref } = await searchParams;
  const paiement = ref ? await getPaiementSimule(ref, user) : null;
  if (!paiement) notFound();
  return <PaiementSimulateur paiement={paiement} />;
}
