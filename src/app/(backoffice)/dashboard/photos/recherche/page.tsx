/* Module : Gestion des Photos & Galeries · Responsable : Louay Herichi */
import type { Metadata } from "next";
import { AIBadge } from "@/components/shared/ai-badge";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { AISearch } from "@/modules/photos-galeries/components/ai-search";
import { listRecentPhotos } from "@/modules/photos-galeries/photo.service";

export const metadata: Metadata = { title: "AI Search" };

const EXEMPLE_RECHERCHE = "the bride laughing outdoors at sunset";

export default async function RechercheIAPage() {
  await requireArea("photos-galeries");
  const photos = await listRecentPhotos();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<AIBadge label="Natural-language search" />}
        title="AI Search"
        description="Describe the photo you are looking for: the AI finds images from their tags and content."
      />
      <AISearch photos={photos} exemple={EXEMPLE_RECHERCHE} />
    </div>
  );
}
