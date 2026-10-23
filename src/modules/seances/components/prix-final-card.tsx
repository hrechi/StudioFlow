"use client";

/**
 * Module : Gestion des Séances · Responsable : Yosser Rafrafi
 * Carte de saisie du prix final d'une séance.
 * Le prix du pack est indicatif ; le prix réel peut varier (tarif famille, amis, etc.)
 */

import { Loader2, Save } from "lucide-react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField, IconInput } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { setPrixFinalAction } from "../seance.actions";
import type { StatutSeanceReel } from "../seance.dto";

interface Props {
  seanceId: string;
  statut: StatutSeanceReel;
  prixPack?: number; // prix catalogue du pack, affiché à titre indicatif
  prixFinal?: number; // valeur déjà enregistrée
}

const STATUTS_EDITABLES: readonly StatutSeanceReel[] = [
  "CONFIRMEE",
  "EN_COURS",
  "TERMINEE",
  "REPORTEE",
];

export function PrixFinalCard({ seanceId, statut, prixPack, prixFinal }: Props) {
  const editable = STATUTS_EDITABLES.includes(statut);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ prix: string }>({
    defaultValues: { prix: prixFinal != null ? String(prixFinal) : "" },
  });

  const onSubmit = handleSubmit(({ prix }) => {
    const parsed = prix.trim() === "" ? null : Number(prix.replace(",", "."));
    if (parsed !== null && (isNaN(parsed) || parsed < 0)) {
      toast.error("Veuillez entrer un montant valide.");
      return;
    }
    startTransition(async () => {
      const result = await setPrixFinalAction(seanceId, parsed);
      if (!result.ok) {
        toast.error(result.error ?? "Erreur lors de la sauvegarde.");
        return;
      }
      toast.success(parsed === null ? "Prix final supprimé." : `Prix final enregistré : ${parsed} TND`);
    });
  });

  const hint =
    prixPack != null
      ? `Prix catalogue du pack : ${prixPack} TND. Laissez vide pour effacer.`
      : "Laissez vide pour effacer.";

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="font-semibold text-foreground">Prix final</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Le prix réel convenu avec le client (remise famille, amis, négociation…).
          Utilisé par la gestion financière.
        </p>
      </div>

      {!editable ? (
        <p className="text-sm text-muted-foreground">
          Le prix final n'est pas modifiable pour une séance{" "}
          {statut === "ANNULEE" ? "annulée" : "à ce stade"}.
        </p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-48">
            <FormField
              id="prixFinal"
              label="Montant (TND)"
              hint={hint}
              error={errors.prix?.message}
            >
              <IconInput
                id="prixFinal"
                type="number"
                min="0"
                step="0.01"
                placeholder={prixPack != null ? `ex. ${prixPack}` : "ex. 450"}
                {...register("prix")}
              />
            </FormField>
          </div>
          <Button type="submit" variant="secondary" disabled={pending} className="mb-0.5">
            {pending ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <Save aria-hidden />
            )}
            Enregistrer le prix
          </Button>
        </form>
      )}

      {prixFinal != null && (
        <p className="text-sm font-medium text-foreground">
          Prix final actuel :{" "}
          <span className="text-primary">{prixFinal} TND</span>
          {prixPack != null && prixFinal !== prixPack && (
            <span className="ml-2 text-xs text-muted-foreground">
              (prix pack : {prixPack} TND)
            </span>
          )}
        </p>
      )}
    </Card>
  );
}
