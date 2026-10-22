/* Module : Gestion des Séances · Responsable : Yosser Rafrafi
 * Showcase site: published packs, grouped by event type. Public, read-only. */
import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { listPublicCatalogue } from "@/modules/seances/pack.service";

export const metadata: Metadata = {
  title: "Packs",
  description: "Discover the studio's packs for weddings, portraits, parties and more.",
};

export const dynamic = "force-dynamic";

export default async function PacksPublicPage() {
  const catalogue = await listPublicCatalogue();

  return (
    <section className="section">
      <div className="container-wide space-y-16">
        <header className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Packs</p>
          <h1 className="display-lg mt-6 text-foreground">Choose your frame</h1>
          <p className="mt-6 text-sm leading-relaxed text-foreground/60">
            Pick the event, then the pack that fits. Send a booking request and the studio confirms
            the date and details with you.
          </p>
        </header>

        {catalogue.length === 0 && (
          <p className="text-center text-sm text-foreground/60">
            Our packs are being updated. Contact the studio for a personalised quote.
          </p>
        )}

        {catalogue.map(({ type, packs }) => (
          <div key={type.id} id={type.slug} className="scroll-mt-24 space-y-8">
            <div>
              <h2 className="display-md text-foreground">{type.nom}</h2>
              {type.description && (
                <p className="mt-2 max-w-2xl text-sm text-foreground/60">{type.description}</p>
              )}
            </div>
            <ul className="grid gap-px bg-foreground/[0.07] md:grid-cols-2 lg:grid-cols-3">
              {packs.map((pack) => (
                <li key={pack.id} className="flex flex-col bg-card p-8">
                  <h3 className="display-md text-foreground">{pack.nom}</h3>
                  <p className="mt-6 flex items-baseline gap-2 text-foreground">
                    {pack.prix === null ? (
                      <span className="text-sm text-foreground/60">Price on quote</span>
                    ) : (
                      <span className="font-heading text-4xl font-light">
                        {formatCurrency(pack.prix)}
                      </span>
                    )}
                  </p>
                  {pack.dureeEstimeeMinutes > 0 && (
                    <p className="mt-1 text-xs text-foreground/50">
                      About {Math.round((pack.dureeEstimeeMinutes / 60) * 10) / 10} h
                    </p>
                  )}
                  {pack.description && (
                    <p className="mt-4 text-sm text-foreground/70">{pack.description}</p>
                  )}
                  <ul className="mt-6 flex-1 space-y-2 border-t border-foreground/10 pt-6 text-sm text-foreground/75">
                    {pack.prestations.map((line) => (
                      <li key={line.nom} className="flex gap-3">
                        <Check className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                        <span>
                          {line.nom}
                          {line.quantite > 1 && ` × ${line.quantite}`}
                          {line.unite && line.quantite > 1 ? ` ${line.unite}` : ""}
                          {line.conditions && (
                            <span className="block text-xs text-foreground/50">{line.conditions}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {pack.options.length > 0 && (
                    <p className="mt-4 text-xs text-foreground/50">
                      Options:{" "}
                      {pack.options.map((o) => `${o.nom} (+${formatCurrency(o.prix)})`).join(", ")}
                    </p>
                  )}
                  <Button asChild variant="cinematic-outline" size="cta" className="mt-8 w-full">
                    <Link href="/espace-client/seances/reserver">Request this pack</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
