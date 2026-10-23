/* Module : Gestion des Séances · Responsable : Yosser Rafrafi */
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { PlanningCalendar } from "@/modules/seances/components/planning-calendar";
import { listSeances } from "@/modules/seances/seance.service";

export const metadata: Metadata = { title: "Planning" };
export const dynamic = "force-dynamic";

export default async function PlanningPage() {
  const user = await requireArea("seances");
  const isAdmin = user.role === "ADMIN";
  const seances = await listSeances(isAdmin ? {} : { employeId: user.id });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Planning"
        description={isAdmin ? "All sessions by day, week or month." : "Your assigned sessions by day, week or month."}
      />
      <PlanningCalendar seances={seances} nowIso={new Date().toISOString()} canEdit={isAdmin} />
    </div>
  );
}
