"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supprimerPortfolio } from "../portfolio.actions";

export function DeletePortfolioButton({ portfolioId, title }: { portfolioId: string; title: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function remove() {
    if (!window.confirm(`Supprimer définitivement le portfolio « ${title} » ?`)) return;
    startTransition(async () => {
      const result = await supprimerPortfolio({ portfolioId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Portfolio supprimé.");
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      disabled={pending}
      onClick={remove}
      aria-label={`Supprimer le portfolio ${title}`}
      title="Supprimer le portfolio"
      className="absolute top-3 right-3 z-10 bg-background/90 text-destructive hover:bg-destructive hover:text-destructive-foreground"
    >
      <Trash2 className="size-4" aria-hidden />
    </Button>
  );
}
