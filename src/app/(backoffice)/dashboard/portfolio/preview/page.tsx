import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireArea } from "@/lib/guards";
import { getPortfolioDraftPreview } from "@/modules/portfolio/portfolio.service";
import { PortfolioPublicContent } from "@/modules/portfolio/components/portfolio-public-content";

export const metadata: Metadata = {
  title: "Aperçu du brouillon · StudioFlow",
  robots: { index: false, follow: false },
};

export default async function PortfolioDraftPreviewPage() {
  const user = await requireArea("portfolio");
  const portfolio = await getPortfolioDraftPreview(user.id);
  if (!portfolio) notFound();

  return (
    <>
      <div className="sticky top-0 z-[100] flex flex-wrap items-center justify-between gap-3 border-b border-amber-300/20 bg-[#140d08] px-4 py-3 text-sm text-[#f3ebdd]">
        <p>
          <strong>Aperçu privé du brouillon.</strong> Seul le propriétaire connecté peut consulter
          cette page. Les formulaires et avis sont désactivés.
        </p>
        <Link
          href="/dashboard/portfolio"
          className="rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium hover:border-amber-300 hover:text-amber-200"
        >
          Retour à l’éditeur
        </Link>
      </div>
      <PortfolioPublicContent portfolio={portfolio} isPreview />
    </>
  );
}
