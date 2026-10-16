/* Module : Gestion du Portfolio · Responsable : Anas Ben Ibrahim */
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { PortfolioEditor } from "@/modules/portfolio/components/portfolio-editor";
import { CANDIDATS_IA, getPortfolio } from "@/modules/portfolio/mock-data";
import { categoriePortfolioLabels } from "@/modules/portfolio/portfolio.types";

export const metadata: Metadata = { title: "Portfolio collection" };

export default async function PortfolioDetailPage({
  params,
}: PageProps<"/dashboard/portfolio/[id]">) {
  await requireArea("portfolio");
  const { id } = await params;
  const portfolio = getPortfolio(id);
  if (!portfolio) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href="/dashboard/portfolio"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Portfolio · {categoriePortfolioLabels[portfolio.categorie]}
          </Link>
        }
        title={portfolio.titre}
        description={portfolio.description}
      />
      <PortfolioEditor portfolio={portfolio} candidats={CANDIDATS_IA} />
    </div>
  );
}
