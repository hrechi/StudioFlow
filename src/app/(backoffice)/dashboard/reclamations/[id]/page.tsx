/* Module : Gestion des Avis & Réclamations · Responsable : Mohamed Yessine Nahdi */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireArea } from "@/lib/guards";
import { MessagesHeader } from "@/modules/avis-reclamations/components/messages-header";
import { ReclamationDetails } from "@/modules/avis-reclamations/components/reclamation-details";
import { ReclamationInbox } from "@/modules/avis-reclamations/components/reclamation-inbox";
import {
  getReclamationForViewer,
  listReclamationThreads,
} from "@/modules/avis-reclamations/reclamation.service";

export const metadata: Metadata = { title: "Complaint messages" };

export default async function StaffConversationPage({
  params,
}: PageProps<"/dashboard/reclamations/[id]">) {
  const user = await requireArea("avis-reclamations");
  const { id } = await params;
  const [selected, threads] = await Promise.all([
    getReclamationForViewer(id, user),
    listReclamationThreads(),
  ]);
  if (!selected) notFound();
  return (
    <div className="space-y-4">
      <MessagesHeader backHref="/dashboard/reclamations" backLabel="Complaints" />
      <ReclamationInbox
        threads={threads}
        selected={selected}
        viewer="staff"
        details={<ReclamationDetails reclamation={selected} />}
      />
    </div>
  );
}
