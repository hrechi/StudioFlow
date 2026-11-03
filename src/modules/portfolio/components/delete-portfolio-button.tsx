"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { supprimerPortfolio } from "../portfolio.actions";

export function DeletePortfolioButton({ portfolioId, title }: { portfolioId: string; title: string }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function confirmDelete() {
    setOpen(true);
  }

  function remove() {
    startTransition(async () => {
      const result = await supprimerPortfolio({ portfolioId });
      setOpen(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Portfolio supprimé.");
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={pending}
        onClick={confirmDelete}
        aria-label={`Supprimer le portfolio ${title}`}
        title="Supprimer le portfolio"
        className="absolute top-3 right-3 z-10 bg-background/90 text-destructive hover:bg-destructive hover:text-destructive-foreground"
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={(nextOpen) => !pending && setOpen(nextOpen)}
        title="Supprimer définitivement ce portfolio ?"
        description={`Êtes-vous sûr de vouloir supprimer définitivement le portfolio « ${title} » de la base de données MongoDB ?`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        tone="destructive"
        pending={pending}
        onConfirm={remove}
      />
    </>
  );
}
