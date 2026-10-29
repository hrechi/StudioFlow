"use client";

/* Module : Gestion des Séances · Responsable : Yosser Rafrafi */
import { useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { setLieuDisponibleAction } from "../lieu.actions";

/**
 * Inline toggle that flips a location's availability directly from the list page,
 * without navigating to the edit form.
 */
export function LieuDisponibleToggle({
  lieuId,
  disponible,
  nom,
}: {
  lieuId: string;
  disponible: boolean;
  nom: string;
}) {
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      const result = await setLieuDisponibleAction(lieuId, !disponible);
      if (!result.ok) {
        toast.error(result.error ?? "Could not update availability.");
        return;
      }
      toast.success(
        disponible
          ? `"${nom}" is now unavailable.`
          : `"${nom}" is now available.`,
      );
    });
  };

  return (
    <Switch
      checked={disponible}
      onCheckedChange={toggle}
      disabled={pending}
      aria-label={disponible ? `Disable ${nom}` : `Enable ${nom}`}
    />
  );
}
