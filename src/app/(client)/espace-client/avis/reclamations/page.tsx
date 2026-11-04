/* Module : Gestion des Avis & Réclamations · Responsable : Mohamed Yessine Nahdi */
import type { Metadata } from "next";
import { requireArea } from "@/lib/guards";
import { MessagesHeader } from "@/modules/avis-reclamations/components/messages-header";
import { ReclamationInbox } from "@/modules/avis-reclamations/components/reclamation-inbox";
import { listReclamationThreads } from "@/modules/avis-reclamations/reclamation.service";

export const metadata: Metadata = { title: "Messages" };

export default async function ClientMessagesPage() {
  const user = await requireArea("espace-client");
  const threads = await listReclamationThreads(user.id);
  return (
    <div className="space-y-4">
      <MessagesHeader backHref="/espace-client/avis" backLabel="Reviews & complaints" />
      <ReclamationInbox threads={threads} selected={null} viewer="client" />
    </div>
  );
}
