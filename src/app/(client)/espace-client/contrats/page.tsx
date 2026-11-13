/* Module : Contrats & Blockchain · Responsable : Yosser Rafrafi */
import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/lib/guards";
import { ContratsList } from "@/modules/contrats/components/contrats-list";
import { listContrats } from "@/modules/contrats/contrat.service";

export const metadata: Metadata = { title: "My Contracts" };

export default async function ClientContratsPage() {
  const actor = await requireArea("espace-client");
  const contrats = await listContrats(actor);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My contracts"
        description="Contracts sent by the studio for your signature."
        actions={
          <Button asChild variant="outline">
            <Link href="/verifier-contrat">
              <ShieldCheck aria-hidden />
              Verify a contract
            </Link>
          </Button>
        }
      />
      <ContratsList contrats={contrats} basePath="/espace-client/contrats" />
    </div>
  );
}
