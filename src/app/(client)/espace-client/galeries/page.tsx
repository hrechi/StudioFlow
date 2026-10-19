/* Module : Gestion des Photos & Galeries · Responsable : Louay Herichi */
import { ImageOff } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { requireArea } from "@/lib/guards";
import { GalerieCard } from "@/modules/photos-galeries/components/galerie-card";
import { listGaleriesOfClient } from "@/modules/photos-galeries/galerie.service";

export const metadata: Metadata = { title: "My galleries" };

export default async function MesGaleriesPage() {
  const user = await requireArea("espace-client");
  const galeries = await listGaleriesOfClient(user.id);
  return (
    <div className="space-y-6">
      <PageHeader
        title="My galleries"
        description="Discover your photos, pick your favorites and approve your selection."
      />
      {galeries.length === 0 ? (
        <EmptyState
          icon={ImageOff}
          title="No gallery yet"
          description="Your photos will appear here as soon as the studio shares your gallery."
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {galeries.map((galerie) => (
            <GalerieCard
              key={galerie.id}
              galerie={galerie}
              href={`/espace-client/galeries/${galerie.id}`}
              showClient={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
