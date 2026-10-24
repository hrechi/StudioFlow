/* Module : Gestion des Séances · Responsable : Yosser Rafrafi */
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { ReservationRequestForm } from "@/modules/seances/components/reservation-request-form";
import { listPublicCatalogue } from "@/modules/seances/pack.service";

export const metadata: Metadata = { title: "Book a session" };

export default async function ReserverSeancePage({
  searchParams,
}: {
  searchParams: Promise<{ pack?: string }>;
}) {
  await requireArea("espace-client");
  const { pack } = await searchParams;
  const catalogue = await listPublicCatalogue();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href="/espace-client/seances"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            My sessions
          </Link>
        }
        title="Book a session"
        description="Choose a pack and a date: the studio reviews your request and confirms it."
      />
      <ReservationRequestForm catalogue={catalogue} defaultPackId={pack} />
    </div>
  );
}
