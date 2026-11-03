"use client";

import { CloudUpload, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import type { UtilisateurRef } from "@/modules/utilisateurs/utilisateur.types";
import { deleteGalerieAction } from "../galerie.actions";
import type { Galerie } from "../galerie.types";
import { GalerieFormDialog } from "./galerie-form-dialog";
import { UploadDialog } from "./upload-dialog";

/** Header actions of /dashboard/galeries/[id]: import photos, edit, delete. */
export function GalerieActions({
  galerie,
  clients,
}: {
  galerie: Galerie;
  clients: UtilisateurRef[];
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const onDelete = () =>
    startTransition(async () => {
      const result = await deleteGalerieAction(galerie.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`“${galerie.titre}” deleted`);
      setConfirmOpen(false);
      router.push("/dashboard/galeries");
      router.refresh();
    });

  return (
    <div className="flex flex-wrap gap-2">
      <UploadDialog
        galerieId={galerie.id}
        trigger={
          <Button>
            <CloudUpload aria-hidden />
            Import photos
          </Button>
        }
      />
      <GalerieFormDialog
        galerie={galerie}
        clients={clients}
        trigger={
          <Button variant="outline">
            <Pencil aria-hidden />
            Edit
          </Button>
        }
      />
      <Button
        variant="destructive-soft"
        onClick={() => setConfirmOpen(true)}
        aria-label="Delete the gallery"
      >
        <Trash2 aria-hidden />
        Delete
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        tone="destructive"
        title={`Delete “${galerie.titre}”?`}
        description={`The gallery and its ${galerie.nombrePhotos} photo${galerie.nombrePhotos === 1 ? "" : "s"} will be permanently deleted. This action cannot be undone.`}
        confirmLabel="Delete permanently"
        pending={pending}
        onConfirm={onDelete}
      />
    </div>
  );
}
