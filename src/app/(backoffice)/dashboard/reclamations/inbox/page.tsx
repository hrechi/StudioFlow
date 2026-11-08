/* Module : Gestion des Avis & Réclamations · Responsable : Mohamed Yessine Nahdi */
import type { Metadata } from "next";
import { requireArea } from "@/lib/guards";
import { MessagesHeader } from "@/modules/avis-reclamations/components/messages-header";
import { ReclamationInbox } from "@/modules/avis-reclamations/components/reclamation-inbox";
import { listReclamationThreads } from "@/modules/avis-reclamations/reclamation.service";

export const metadata: Metadata = { title: "Complaint messages" };

export default async function StaffMessagesPage() {
  await requireArea("avis-reclamations");
  const threads = await listReclamationThreads();
  return (
    <div className="space-y-4">
      <MessagesHeader backHref="/dashboard/reclamations" backLabel="Complaints" />
      <ReclamationInbox threads={threads} selected={null} viewer="staff" />
    </div>
  );
}
