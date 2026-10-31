import type { Metadata } from "next";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { requireArea } from "@/lib/guards";
import { Portfolio } from "@/modules/portfolio/portfolio.model";
import {
  getOrCreatePortfolioForUser,
  listerPhotosPhotographePourPortfolio,
} from "@/modules/portfolio/portfolio.service";
import { EditorShell } from "@/modules/portfolio/components/editor/EditorShell";
import { PortfolioSetupScreen } from "@/modules/portfolio/components/editor/PortfolioSetupScreen";

export const metadata: Metadata = { title: "Portfolio · StudioFlow Editor" };

type PageProps = {
  searchParams?: Promise<{ nouveau?: string; setup?: string }>;
};

export default async function PortfolioAdminPage({ searchParams }: PageProps) {
  const user = await requireArea("portfolio");
  const photographerFullName = `${user.prenom} ${user.nom}`.trim();
  const query = searchParams ? await searchParams : {};
  const isSetupRequested = query.nouveau === "true" || query.setup === "true";

  await connectDB();
  const existingDoc = Types.ObjectId.isValid(user.id)
    ? await Portfolio.findOne({ proprietaire: new Types.ObjectId(user.id) }).lean()
    : null;

  // Si aucun portfolio n'existe en base ou si l'utilisateur demande explicitement la configuration :
  if (!existingDoc || isSetupRequested) {
    return (
      <PortfolioSetupScreen
        photographerName={photographerFullName}
        hasExistingPortfolio={!!existingDoc}
      />
    );
  }

  const portfolio = await getOrCreatePortfolioForUser(user.id, photographerFullName);
  const photographerPhotos = await listerPhotosPhotographePourPortfolio(user.id);

  return (
    <EditorShell
      initialPortfolio={portfolio}
      portfolioTitle={photographerFullName || portfolio.titre}
      portfolioSlug={portfolio.slug}
      initialPhotos={photographerPhotos}
      photographerName={photographerFullName}
    />
  );
}
