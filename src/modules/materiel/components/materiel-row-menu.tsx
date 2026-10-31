"use client";

import { Archive, MoreHorizontal, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { archiveMaterielAction } from "../materiel.actions";
import type { Materiel } from "../materiel.types";
import { MaterielFormDialog } from "./materiel-form";

/** Row actions in the inventory (ADMIN only): edit, archive. */
export function MaterielRowMenu({
  materiel,
  redirectTo,
}: {
  materiel: Materiel;
  /** Where to go after archiving (the detail page leaves the archived item behind). */
  redirectTo?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  const archive = () =>
    startTransition(async () => {
      const result = await archiveMaterielAction(materiel.id);
      if (!result.ok) {
        toast.error(result.error);
      } else {
        toast.success(`${materiel.nom} archived`);
        if (redirectTo) router.push(redirectTo);
        else router.refresh();
      }
      setConfirm(false);
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${materiel.nom}`}
            disabled={pending}
          >
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="truncate text-xs text-muted-foreground">
            {materiel.nom}
          </DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <Pencil aria-hidden />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => setConfirm(true)}
            className="text-destructive-text focus:bg-destructive/10 focus:text-destructive-text"
          >
            <Archive aria-hidden />
            Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mounted on demand so the form always starts from the latest values. */}
      {editing && <MaterielFormDialog materiel={materiel} open onOpenChange={setEditing} />}
      <ConfirmDialog
        open={confirm}
        onOpenChange={(open) => !open && setConfirm(false)}
        tone="destructive"
        title={`Archive ${materiel.nom}?`}
        description="It will leave the inventory and can no longer be reserved. Its reservation history is kept."
        confirmLabel="Archive"
        pending={pending}
        onConfirm={archive}
      />
    </>
  );
}
