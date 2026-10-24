import type { Metadata } from "next";
import { requireArea } from "@/lib/guards";
import { getOrCreatePortfolioForUser } from "@/modules/portfolio/portfolio.service";
import { EditorShell } from "@/modules/portfolio/components/editor/EditorShell";

export const metadata: Metadata = { title: "Portfolio · StudioFlow Editor" };

export default async function PortfolioAdminPage() {
  const user = await requireArea("portfolio");
  const portfolio = await getOrCreatePortfolioForUser(user.id);

  return <EditorShell initialPortfolio={portfolio} />;
}
