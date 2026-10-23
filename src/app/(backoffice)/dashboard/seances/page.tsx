/* Module : Gestion des Séances · Responsable : Yosser Rafrafi */
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/lib/guards";
import { SeancesBrowser } from "@/modules/seances/components/seances-browser";
import { listSeances } from "@/modules/seances/seance.service";
import { listTypesEvenement } from "@/modules/seances/type-evenement.service";

export const metadata: Metadata = { title: "Sessions" };

export default async function SeancesPage() {
  const user = await requireArea("seances");
  const isAdmin = user.role === "ADMIN";
  const [seances, types] = await Promise.all([
    listSeances(isAdmin ? {} : { employeId: user.id }),
    listTypesEvenement(),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Sessions"
        description={isAdmin ? "Plan, staff and follow every session." : "Your upcoming and past sessions."}
        actions={
          isAdmin ? (
            <Button asChild>
              <Link href="/dashboard/seances/nouveau">
                <Plus aria-hidden />
                New session
              </Link>
            </Button>
          ) : undefined
        }
      />
      <SeancesBrowser
        seances={seances}
        types={types.map((t) => ({ id: t.id, nom: t.nom }))}
        canEdit={isAdmin}
      />
    </div>
  );
}
