/* Module : Gestion des Photos & Galeries · Responsable : Louay Herichi */
import { FolderPlus } from "lucide-react";
import type { Metadata } from "next";
import { ComingSoonButton } from "@/components/shared/coming-soon-button";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { GaleriesBrowser } from "@/modules/photos-galeries/components/galeries-browser";
import { GALERIES } from "@/modules/photos-galeries/mock-data";

export const metadata: Metadata = { title: "Galleries" };

export default async function GaleriesPage() {
  await requireArea("photos-galeries");
  return (
    <div className="space-y-6">
      <PageHeader
        title="Client galleries"
        description="Cull, share, then deliver: each gallery follows the cycle Culling → Shared → Approved → Delivered."
        actions={
          <ComingSoonButton feature="Create a gallery">
            <FolderPlus aria-hidden />
            New gallery
          </ComingSoonButton>
        }
      />
      <GaleriesBrowser galeries={GALERIES} />
    </div>
  );
}
