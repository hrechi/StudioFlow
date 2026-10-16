/* Module : Gestion des Séances · Responsable : Yosser Rafrafi */
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { ReservationRequestForm } from "@/modules/seances/components/reservation-request-form";
import { CRENEAUX_SUGGERES } from "@/modules/seances/mock-data";

export const metadata: Metadata = { title: "Book a session" };

export default async function ReserverSeancePage() {
  await requireArea("espace-client");
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
        description="Tell us what you have in mind: the studio replies with a date and a quote."
      />
      <ReservationRequestForm creneaux={CRENEAUX_SUGGERES} />
    </div>
  );
}
