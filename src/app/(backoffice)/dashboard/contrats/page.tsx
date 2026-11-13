/* Module : Contrats & Blockchain · Responsable : Yosser Rafrafi */
import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/lib/guards";
import { ContratsList } from "@/modules/contrats/components/contrats-list";
import { listContrats } from "@/modules/contrats/contrat.service";

export const metadata: Metadata = { title: "Contracts" };

export default async function ContratsPage() {
  const actor = await requireArea("contrats");
  const contrats = await listContrats(actor);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contracts"
        description="Create, send and track blockchain-certified contracts."
        actions={
          <Button asChild variant="outline">
            <Link href="/verifier-contrat">
              <ShieldCheck aria-hidden />
              Verify a contract
            </Link>
          </Button>
        }
      />
      <ContratsList
        contrats={contrats}
        basePath="/dashboard/contrats"
        showCreateButton
      />
    </div>
  );
}
