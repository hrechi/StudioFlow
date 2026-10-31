/* Module : Gestion des Séances · Responsable : Yosser Rafrafi */
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/lib/guards";
import { PacksBrowser } from "@/modules/seances/components/packs-browser";
import { listPacks } from "@/modules/seances/pack.service";
import { listTypesEvenement } from "@/modules/seances/type-evenement.service";

export const metadata: Metadata = { title: "Packs" };

export default async function PacksPage() {
  await requireArea("catalogue");
  const [packs, types] = await Promise.all([listPacks(), listTypesEvenement()]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Packs"
        description="Offers by event type. Only published packs of active types appear on the showcase site."
        actions={
          <Button asChild>
            <Link href="/dashboard/catalogue/packs/nouveau">
              <Plus aria-hidden />
              New pack
            </Link>
          </Button>
        }
      />
      <PacksBrowser packs={packs} types={types} />
    </div>
  );
}
