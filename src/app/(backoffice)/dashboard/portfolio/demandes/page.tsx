import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/guards";
import { ContactRequestsBoard } from "@/modules/portfolio/components/contact-requests-board";
import { listContactRequests } from "@/modules/portfolio/portfolio.service";

export const metadata: Metadata = { title: "Portfolio contact requests" };

export default async function PortfolioContactRequestsPage() {
  const user = await requireRole("PHOTOGRAPHE");
  const requests = await listContactRequests(user.id);
  return <div className="space-y-6"><PageHeader title="Contact requests" description="Track inquiries from your public portfolio." /><ContactRequestsBoard requests={requests} /></div>;
}
