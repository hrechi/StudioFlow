import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireArea } from "@/lib/guards";
import { PortfolioEditor } from "@/modules/portfolio/components/portfolio-editor";
import { getPortfolioForEditor } from "@/modules/portfolio/portfolio.service";
import { PortfolioAdminReview } from "@/modules/portfolio/components/portfolio-admin-review";

export const metadata: Metadata = { title: "Portfolio editor" };

export default async function PortfolioDetailPage({ params }: PageProps<"/dashboard/portfolio/[id]">) {
  const user = await requireArea("portfolio");
  const { id } = await params;
  const portfolio = await getPortfolioForEditor(id, user.id, user.role === "ADMIN");
  if (!portfolio) notFound();
  const isOwner = portfolio.proprietaire === user.id;

  if (isOwner) return <PortfolioEditor portfolio={portfolio} />;
  if (user.role === "ADMIN") {
    return <PortfolioAdminReview portfolio={portfolio} />;
  }
  notFound();
}
