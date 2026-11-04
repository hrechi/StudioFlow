"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { creerPortfolio } from "../portfolio.actions";
import {
  CATEGORIES_PORTFOLIO,
  RESEAUX_SOCIAUX,
  SERVICES_PHOTOGRAPHIQUES,
  STYLES_PHOTOGRAPHIQUES,
  categoriePortfolioLabels,
  type Reseau,
  servicePhotographiqueLabels,
  stylePhotographiqueLabels,
} from "../portfolio.types";

const socialLabels: Record<Exclude<Reseau, "SITE_WEB">, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
};

export function PortfolioCreateForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function submit(formData: FormData) {
    const specialites = formData.getAll("specialites").map(String);
    const styles = formData.getAll("styles").map(String);
    const services = formData.getAll("services").map(String);
    const liensSociaux = RESEAUX_SOCIAUX.filter((reseau) => reseau !== "SITE_WEB").flatMap(
      (reseau) => {
        const url = String(formData.get(`social-${reseau}`) ?? "").trim();
        return url ? [{ reseau, url }] : [];
      },
    );
    startTransition(async () => {
      const result = await creerPortfolio({
        titre: formData.get("titre"),
        slogan: formData.get("slogan") || undefined,
        bio: formData.get("bio") || undefined,
        photoCouverture: formData.get("photoCouverture"),
        specialites,
        styles,
        services,
        disponible: formData.get("disponible") === "on",
        ville: formData.get("ville") || undefined,
        theme: formData.get("theme"),
        couleurAccent: formData.get("couleurAccent"),
        filigrane: formData.get("filigrane") === "on",
        visibilite: formData.get("visibilite"),
        liensSociaux,
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
    <form
      action={submit}
      className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2"
    >
      <label className="grid gap-1.5 text-sm sm:col-span-2">
        <span>Portfolio title</span>
        <input
          name="titre"
          required
          maxLength={160}
          className="h-11 rounded-lg border border-border bg-background px-3"
        />
      </label>
      <label className="grid gap-1.5 text-sm sm:col-span-2">
        <span>Cover photo URL</span>
        <input
          name="photoCouverture"
          type="url"
          required
          pattern="https://.*"
          placeholder="https://res.cloudinary.com/…"
          className="h-11 rounded-lg border border-border bg-background px-3"
        />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span>Short slogan</span>
        <input
          name="slogan"
          maxLength={300}
          className="h-11 rounded-lg border border-border bg-background px-3"
        />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span>City</span>
        <input
          name="ville"
          maxLength={120}
          className="h-11 rounded-lg border border-border bg-background px-3"
        />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span>Region</span>
        <input
          name="region"
          maxLength={120}
          className="h-11 rounded-lg border border-border bg-background px-3"
        />
      </label>
      <label className="grid gap-1.5 text-sm">
        <span>Country</span>
        <input
          name="pays"
          maxLength={120}
          className="h-11 rounded-lg border border-border bg-background px-3"
        />
      </label>
      <label className="grid gap-1.5 text-sm sm:col-span-2">
        <span>About the studio</span>
        <textarea
          name="bio"
          maxLength={5000}
          rows={4}
          className="rounded-lg border border-border bg-background px-3 py-2"
          placeholder="Describe your studio, experience and photographic approach."
        />
      </label>
      <fieldset className="grid gap-2 sm:col-span-2">
        <legend className="mb-1 text-sm">Specialties</legend>
        <div className="flex flex-wrap gap-3">
          {CATEGORIES_PORTFOLIO.map((category) => (
            <label key={category} className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="specialites" value={category} />
              {categoriePortfolioLabels[category]}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="grid gap-2 sm:col-span-2">
        <legend className="mb-1 text-sm">Photographic styles</legend>
        <div className="flex flex-wrap gap-3">
          {STYLES_PHOTOGRAPHIQUES.map((style) => (
            <label key={style} className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="styles" value={style} />
              {stylePhotographiqueLabels[style]}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="grid gap-2 sm:col-span-2">
        <legend className="mb-1 text-sm">Services</legend>
        <div className="flex flex-wrap gap-3">
          {SERVICES_PHOTOGRAPHIQUES.map((service) => (
            <label key={service} className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="services" value={service} />
              {servicePhotographiqueLabels[service]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="disponible" />
        Available for new bookings
      </label>
      <fieldset className="grid gap-3 sm:col-span-2">
        <legend className="mb-1 text-sm">Social links</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {RESEAUX_SOCIAUX.filter((reseau) => reseau !== "SITE_WEB").map((reseau) => (
            <label key={reseau} className="grid gap-1.5 text-sm">
              <span>{socialLabels[reseau]}</span>
              <input
                name={`social-${reseau}`}
                type="url"
                pattern="https://.*"
                placeholder="https://…"
                className="h-10 rounded-lg border border-border bg-background px-3"
              />
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          The Website link to your public portfolio is created automatically when you publish it.
        </p>
      </fieldset>
      <fieldset className="grid gap-3 sm:col-span-2">
        <legend className="mb-1 text-sm">Public profile appearance</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span>Theme</span>
            <select
              name="theme"
              defaultValue="MINIMAL"
              className="h-10 rounded-lg border border-border bg-background px-3"
            >
              <option value="MINIMAL">Minimal</option>
              <option value="SOMBRE">Dark</option>
              <option value="EDITORIAL">Editorial</option>
              <option value="COLORE">Colorful</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span>Accent color</span>
            <input
              name="couleurAccent"
              type="color"
              defaultValue="#e0563b"
              className="h-10 w-full rounded-lg border border-border bg-background px-2"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span>Portfolio visibility</span>
            <select
              name="visibilite"
              defaultValue="PUBLIC"
              className="h-10 rounded-lg border border-border bg-background px-3"
            >
              <option value="PUBLIC">Public</option>
              <option value="PRIVE">Private link</option>
            </select>
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" name="filigrane" />
            Add a watermark to published photos
          </label>
        </div>
      </fieldset>
      <label className="grid gap-1.5 text-sm sm:col-span-2">
        <span>Starting structure</span>
        <select
          name="structureInitiale"
          defaultValue="MODELE"
          className="h-11 rounded-lg border border-border bg-background px-3"
        >
          <option value="MODELE">Photography starter (Hero, About, Gallery, Contact)</option>
          <option value="VIDE">Start with a blank portfolio</option>
        </select>
        <span className="text-xs text-muted-foreground">
          You can edit, reorder or remove these blocks in the portfolio editor.
        </span>
      </label>
      {error && (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {error}
        </p>
      )}
      <button
        disabled={pending}
        className="h-11 rounded-lg bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-60 sm:col-span-2"
      >
        {pending ? "Creating…" : "Create portfolio"}
      </button>
    </form>
  );
}
