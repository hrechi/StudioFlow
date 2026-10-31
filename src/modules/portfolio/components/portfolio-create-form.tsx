"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { creerPortfolio } from "../portfolio.actions";
import { CATEGORIES_PORTFOLIO, categoriePortfolioLabels } from "../portfolio.types";

export function PortfolioCreateForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function submit(formData: FormData) {
    const specialites = formData.getAll("specialites").map(String);
    startTransition(async () => {
      const result = await creerPortfolio({
        titre: formData.get("titre"),
        slogan: formData.get("slogan") || undefined,
        photoCouverture: formData.get("photoCouverture"),
        specialites,
        ville: formData.get("ville") || undefined,
        structureInitiale: formData.get("structureInitiale"),
      });
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      router.push(`/dashboard/portfolio/${result.data.id}`);
      router.refresh();
    });
  }
  return (
    <form action={submit} className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm sm:col-span-2"><span>Portfolio title</span><input name="titre" required maxLength={160} className="h-11 rounded-lg border border-border bg-background px-3" /></label>
      <label className="grid gap-1.5 text-sm sm:col-span-2"><span>Cover photo URL</span><input name="photoCouverture" type="url" required pattern="https://.*" placeholder="https://res.cloudinary.com/…" className="h-11 rounded-lg border border-border bg-background px-3" /></label>
      <label className="grid gap-1.5 text-sm"><span>Short slogan</span><input name="slogan" maxLength={300} className="h-11 rounded-lg border border-border bg-background px-3" /></label>
      <label className="grid gap-1.5 text-sm"><span>City</span><input name="ville" maxLength={120} className="h-11 rounded-lg border border-border bg-background px-3" /></label>
      <fieldset className="grid gap-2 sm:col-span-2"><legend className="mb-1 text-sm">Specialties</legend><div className="flex flex-wrap gap-3">{CATEGORIES_PORTFOLIO.map((category) => <label key={category} className="inline-flex items-center gap-2 text-sm"><input type="checkbox" name="specialites" value={category} />{categoriePortfolioLabels[category]}</label>)}</div></fieldset>
      <label className="grid gap-1.5 text-sm sm:col-span-2"><span>Starting structure</span><select name="structureInitiale" defaultValue="MODELE" className="h-11 rounded-lg border border-border bg-background px-3"><option value="MODELE">Photography starter (Hero, About, Gallery, Contact)</option><option value="VIDE">Start with a blank portfolio</option></select><span className="text-xs text-muted-foreground">You can edit, reorder or remove these blocks in the portfolio editor.</span></label>
      {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
      <button disabled={pending} className="h-11 rounded-lg bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-60 sm:col-span-2">{pending ? "Creating…" : "Create portfolio"}</button>
    </form>
  );
}
