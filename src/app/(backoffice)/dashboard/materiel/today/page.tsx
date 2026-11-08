/* Module : Gestion du Matériel · Responsable : Amel Mediouni */
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { MaJournee } from "@/modules/materiel/components/ma-journee";
import { getMaJournee } from "@/modules/materiel/journee.service";

export const metadata: Metadata = { title: "My day" };

/** Phone-first "My day": today's sessions, the equipment to pack, overdue returns and tasks. */
export default async function MaJourneePage() {
  const user = await requireArea("materiel");
  const journee = await getMaJournee(user, "moi");
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={
          <Link href="/dashboard/materiel/reservations" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" aria-hidden />
            Reservations
          </Link>
        }
        title="My day"
        description="Your sessions and the equipment to take, at a glance."
      />
      <MaJournee initiale={journee} utilisateur={{ id: user.id, role: user.role }} />
    </div>
  );
}
