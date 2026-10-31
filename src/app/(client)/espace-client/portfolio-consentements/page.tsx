import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/guards";
import { listPendingConsents } from "@/modules/portfolio/portfolio.service";
import { PortfolioConsentBoard } from "@/modules/portfolio/components/portfolio-consent-board";

export const metadata: Metadata = { title: "Photo consent" };

export default async function PortfolioConsentPage() {
  const client = await requireRole("CLIENT");
  const requests = await listPendingConsents(client.id);
  return <div className="space-y-6"><PageHeader title="Photo consent" description="Choose whether a photographer may display your gallery photos in their public portfolio." /><PortfolioConsentBoard requests={requests} /></div>;
}
