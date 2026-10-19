/* Module : Gestion des Photos & Galeries · Responsable : Louay Herichi */
import { FolderPlus } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/lib/guards";
import { GalerieFormDialog } from "@/modules/photos-galeries/components/galerie-form-dialog";
import { GaleriesBrowser } from "@/modules/photos-galeries/components/galeries-browser";
import { listGaleries } from "@/modules/photos-galeries/galerie.service";
import { listClientRefs } from "@/modules/utilisateurs/utilisateur.service";

export const metadata: Metadata = { title: "Galleries" };

export default async function GaleriesPage() {
  await requireArea("photos-galeries");
  const [galeries, clients] = await Promise.all([listGaleries(), listClientRefs()]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Client galleries"
        description="Cull, share, then deliver: each gallery follows the cycle Culling → Shared → Approved → Delivered."
        actions={
          <GalerieFormDialog
            clients={clients}
            trigger={
              <Button>
                <FolderPlus aria-hidden />
                New gallery
              </Button>
            }
          />
        }
      />
      <GaleriesBrowser galeries={galeries} />
    </div>
  );
}
