/* Module : Contrats & Blockchain · Responsable : Yosser Rafrafi */
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { ContratForm } from "@/modules/contrats/components/contrat-form";
import { listClientRefs } from "@/modules/utilisateurs/utilisateur.service";

export const metadata: Metadata = { title: "New Contract" };

export default async function NouveauContratPage() {
  await requireArea("contrats");

  const clients = await listClientRefs();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href="/dashboard/contrats"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Contracts
          </Link>
        }
        title="New contract"
        description="Choose a creation mode, fill in the details and send to the client."
      />
      <ContratForm
        clients={clients.map((u) => ({
          id: u.id,
          prenom: u.prenom,
          nom: u.nom,
          email: "",
        }))}
      />
    </div>
  );
}
