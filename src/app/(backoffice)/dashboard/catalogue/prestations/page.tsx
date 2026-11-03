/* Module : Gestion des Séances · Responsable : Yosser Rafrafi */
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/lib/guards";
import {
  PrestationDialog,
  PrestationManager,
} from "@/modules/seances/components/prestation-manager";
import { listPrestations } from "@/modules/seances/prestation.service";

export const metadata: Metadata = { title: "Services" };

export default async function PrestationsPage() {
  await requireArea("catalogue");
  const prestations = await listPrestations();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Services"
        description="The catalogue of services you can include in packs. Add new ones anytime — no code change needed."
        actions={
          <PrestationDialog
            trigger={
              <Button>
                <Plus aria-hidden />
                New service
              </Button>
            }
          />
        }
      />
      <PrestationManager prestations={prestations} />
    </div>
  );
}
