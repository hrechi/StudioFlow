/* Module : Gestion des Séances · Responsable : Yosser Rafrafi */
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { MOCK_CLIENTS, MOCK_PHOTOGRAPHES } from "@/lib/mock-data-helpers";
import { SeanceForm } from "@/modules/seances/components/seance-form";
import { CRENEAUX_SUGGERES, LIEUX } from "@/modules/seances/mock-data";

export const metadata: Metadata = { title: "New session" };

export default async function NouvelleSeancePage() {
  await requireArea("seances");
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href="/dashboard/seances"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Sessions
          </Link>
        }
        title="New session"
        description="Fill in the session or apply a slot suggested by the AI."
      />
      <SeanceForm
        clients={MOCK_CLIENTS}
        photographes={MOCK_PHOTOGRAPHES}
        lieux={LIEUX}
        creneaux={CRENEAUX_SUGGERES}
      />
    </div>
  );
}
