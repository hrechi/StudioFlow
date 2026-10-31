/* Module : Gestion des Séances · Responsable : Yosser Rafrafi */
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/lib/guards";
import {
  TypeEvenementDialog,
  TypeEvenementManager,
} from "@/modules/seances/components/type-evenement-manager";
import { listTypesEvenement } from "@/modules/seances/type-evenement.service";

export const metadata: Metadata = { title: "Event types" };

export default async function TypesEvenementPage() {
  await requireArea("catalogue");
  const types = await listTypesEvenement();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Event types"
        description="Wedding, henna, birthday… Each type has its own packs, capped by the limit you configure."
        actions={
          <TypeEvenementDialog
            trigger={
              <Button>
                <Plus aria-hidden />
                New event type
              </Button>
            }
          />
        }
      />
      <TypeEvenementManager types={types} />
    </div>
  );
}
