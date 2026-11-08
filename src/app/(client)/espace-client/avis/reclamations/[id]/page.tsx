/* Module : Gestion des Avis & Réclamations · Responsable : Mohamed Yessine Nahdi */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireArea } from "@/lib/guards";
import { MessagesHeader } from "@/modules/avis-reclamations/components/messages-header";
import { ReclamationInbox } from "@/modules/avis-reclamations/components/reclamation-inbox";
import {
  getReclamationForViewer,
  listReclamationThreads,
} from "@/modules/avis-reclamations/reclamation.service";

export const metadata: Metadata = { title: "Messages" };

export default async function ClientConversationPage({
  params,
}: PageProps<"/espace-client/avis/reclamations/[id]">) {
  const user = await requireArea("espace-client");
  const { id } = await params;
  // A client only opens their own complaints.
  const [selected, threads] = await Promise.all([
    getReclamationForViewer(id, user),
    listReclamationThreads(user.id),
  ]);
  if (!selected) notFound();
  return (
    <div className="space-y-4">
      <MessagesHeader backHref="/espace-client/avis" backLabel="Reviews & complaints" />
      <ReclamationInbox threads={threads} selected={selected} viewer="client" />
    </div>
  );
}
