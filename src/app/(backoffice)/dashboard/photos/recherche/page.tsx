/* Module : Gestion des Photos & Galeries · Responsable : Louay Herichi */
import type { Metadata } from "next";
import { AIBadge } from "@/components/shared/ai-badge";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { AISearch } from "@/modules/photos-galeries/components/ai-search";
import { listRecentPhotos } from "@/modules/photos-galeries/photo.service";

export const metadata: Metadata = { title: "AI Search" };

const EXEMPLE_RECHERCHE = "the bride laughing outdoors at sunset";

export default async function RechercheIAPage({
  searchParams,
}: PageProps<"/dashboard/photos/recherche">) {
  await requireArea("photos-galeries");
  const [photos, { q }] = await Promise.all([listRecentPhotos(), searchParams]);
  const initialQuery = typeof q === "string" ? q.slice(0, 300) : undefined;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<AIBadge label="Natural-language search" />}
        title="AI Search"
        description="Describe the photo you are looking for: Claude finds it from what the AI saw in each photo."
      />
      <AISearch photos={photos} exemple={EXEMPLE_RECHERCHE} initialQuery={initialQuery} />
    </div>
  );
}
