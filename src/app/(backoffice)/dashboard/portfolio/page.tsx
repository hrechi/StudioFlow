/* Module : Gestion du Portfolio · Responsable : Anas Ben Ibrahim */
import { Eye, FolderPlus, Images } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ComingSoonButton } from "@/components/shared/coming-soon-button";
import { PageHeader } from "@/components/shared/page-header";
import { SafeImage } from "@/components/shared/safe-image";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireArea } from "@/lib/guards";
import { formatNumber } from "@/lib/utils";
import { PORTFOLIOS } from "@/modules/portfolio/mock-data";
import { categoriePortfolioLabels, visibiliteConfig } from "@/modules/portfolio/portfolio.types";

export const metadata: Metadata = { title: "Portfolio" };

export default async function PortfolioAdminPage() {
  await requireArea("portfolio");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Portfolio"
        description="The studio's public collections: order, featured photos, captions and client consent."
        actions={
          <ComingSoonButton feature="Create a collection">
            <FolderPlus aria-hidden />
            New collection
          </ComingSoonButton>
        }
      />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {PORTFOLIOS.map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/portfolio/${p.id}`}
            className="group overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-border transition-shadow hover:shadow-lift"
          >
            <div className="relative aspect-[16/10] bg-muted">
              <SafeImage
                src={p.photoCouverture}
                alt=""
                fill
                sizes="(min-width: 1280px) 33vw, 50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute top-3 left-3">
                <StatusBadge value={p.visibilite} config={visibiliteConfig} className="bg-white" />
              </div>
            </div>
            <div className="space-y-1.5 p-4">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {categoriePortfolioLabels[p.categorie]}
              </p>
              <h2 className="font-semibold text-charcoal group-hover:text-primary-text">
                {p.titre}
              </h2>
              <p className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Images className="size-3.5" aria-hidden />
                  {p.elements.length} photos
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="size-3.5" aria-hidden />
                  {formatNumber(p.nombreVues)} views
                </span>
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
