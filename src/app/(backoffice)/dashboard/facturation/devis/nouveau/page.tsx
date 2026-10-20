/* Module : Gestion de la Facturation · Responsable : Aya Flah */
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { listFacturationClients, listFacturationSessions } from "@/modules/facturation/facturation.integrations";
import { DevisEditor } from "@/modules/facturation/components/devis-editor";
import { LIGNES_IA } from "@/modules/facturation/facturation.integrations";

export const metadata: Metadata = { title: "New quote" };

export default async function NouveauDevisPage() {
  await requireArea("facturation");
  const [clients, seances] = await Promise.all([listFacturationClients(), listFacturationSessions()]);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href="/dashboard/facturation/devis"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Quotes
          </Link>
        }
        title="New quote"
        description="Add the services or let the AI suggest a quote from the session type and past pricing."
      />
      <DevisEditor clients={clients} seances={seances} lignesIA={LIGNES_IA} />
    </div>
  );
}
