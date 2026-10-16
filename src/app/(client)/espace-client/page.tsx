/* Client area — overview (front office). Each block reads another module's MOCK data;
 * replace it with that module's service (filtered by the client id) when it exists. */
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  Clock,
  Images,
  MapPin,
  MessageSquareHeart,
  Receipt,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SafeImage } from "@/components/shared/safe-image";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { requireArea } from "@/lib/guards";
import { fullName } from "@/lib/mock-data-helpers";
import { FRONT_IMAGES } from "@/lib/mock-images";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import { statutFactureConfig } from "@/modules/facturation/facturation.types";
import { MES_FACTURES } from "@/modules/facturation/mock-data";
import { statutGalerieConfig } from "@/modules/photos-galeries/galerie.types";
import { MES_GALERIES } from "@/modules/photos-galeries/mock-data";
import { MES_SEANCES } from "@/modules/seances/mock-data";
import { typeSeanceLabels } from "@/modules/seances/seance.types";

export const metadata: Metadata = { title: "My account" };

const LINKS = [
  { label: "Book a session", href: "/espace-client/seances/reserver", icon: CalendarPlus },
  { label: "My galleries", href: "/espace-client/galeries", icon: Images },
  { label: "Quotes & invoices", href: "/espace-client/factures", icon: Receipt },
  { label: "Leave a review", href: "/espace-client/avis", icon: MessageSquareHeart },
];

export default async function EspaceClientPage() {
  const user = await requireArea("espace-client");
  const now = new Date().toISOString();
  const prochaine = MES_SEANCES.filter((s) => s.dateDebut >= now && s.statut !== "ANNULEE").sort(
    (a, b) => a.dateDebut.localeCompare(b.dateDebut),
  )[0];
  const galerie = [...MES_GALERIES].sort((a, b) => b.dateCreation.localeCompare(a.dateCreation))[0];
  const facture = MES_FACTURES.find((f) => f.statut !== "PAYEE");

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-charcoal text-white">
        <SafeImage
          src={FRONT_IMAGES.hero}
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-45"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal via-charcoal/70 to-transparent" />
        <div className="relative max-w-xl space-y-3 px-6 py-10 sm:px-10 sm:py-14">
          <p className="text-xs font-semibold tracking-[0.3em] text-white/60 uppercase">
            My account
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Hello, {user.prenom}</h1>
          <p className="text-white/75">
            Your sessions, private galleries and invoices, all in one place.
          </p>
          <Button asChild size="lg" className="mt-2">
            <Link href="/espace-client/seances/reserver">
              <CalendarPlus aria-hidden />
              Book a session
            </Link>
          </Button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <article className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-border">
          <header className="flex items-center justify-between px-5 pt-5">
            <h2 className="font-semibold text-charcoal">Next session</h2>
            <CalendarDays className="size-5 text-primary" aria-hidden />
          </header>
          {prochaine ? (
            <div className="space-y-3 p-5">
              <div className="relative h-32 overflow-hidden rounded-xl bg-muted">
                <SafeImage
                  src={prochaine.couverture}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 30vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {typeSeanceLabels[prochaine.type]}
                </p>
                <p className="font-semibold text-charcoal">{prochaine.titre}</p>
              </div>
              <ul className="space-y-1 text-sm text-slate">
                <li className="flex items-center gap-2">
                  <Clock className="size-4 text-muted-foreground" aria-hidden />
                  {formatDate(prochaine.dateDebut)} at {formatTime(prochaine.dateDebut)}
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="size-4 text-muted-foreground" aria-hidden />
                  {prochaine.lieu.nom}
                </li>
              </ul>
              <p className="text-xs text-muted-foreground">
                With {fullName(prochaine.photographe)}
              </p>
            </div>
          ) : (
            <div className="space-y-3 p-5 text-sm text-muted-foreground">
              <p>No session scheduled.</p>
              <Button asChild size="sm" variant="outline">
                <Link href="/espace-client/seances/reserver">Book</Link>
              </Button>
            </div>
          )}
        </article>

        <article className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-border">
          {galerie ? (
            <Link href={`/espace-client/galeries/${galerie.id}`} className="group block h-full">
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                <SafeImage
                  src={galerie.photoCouverture}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 30vw, 100vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/75 to-transparent" />
                <div className="absolute top-3 left-3">
                  <StatusBadge
                    value={galerie.statut}
                    config={statutGalerieConfig}
                    className="bg-white"
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <p className="text-xs font-semibold tracking-wide text-white/70 uppercase">
                    Latest gallery
                  </p>
                  <p className="text-lg font-semibold">{galerie.titre}</p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-white/85">
                    Discover my photos{" "}
                    <ArrowRight
                      className="size-4 transition-transform group-hover:translate-x-1"
                      aria-hidden
                    />
                  </p>
                </div>
              </div>
            </Link>
          ) : (
            <p className="p-5 text-sm text-muted-foreground">
              Your galleries will appear here after your session.
            </p>
          )}
        </article>

        <article className="flex flex-col rounded-2xl bg-white p-5 shadow-soft ring-1 ring-border">
          <header className="flex items-center justify-between">
            <h2 className="font-semibold text-charcoal">Invoice to pay</h2>
            <Receipt className="size-5 text-primary" aria-hidden />
          </header>
          {facture ? (
            <div className="mt-4 flex flex-1 flex-col gap-3">
              <StatusBadge
                value={facture.statut}
                config={statutFactureConfig}
                className="self-start"
              />
              <p className="text-3xl font-bold text-charcoal">
                {formatCurrency(facture.montantTTC - facture.montantPaye)}
              </p>
              <p className="text-sm text-muted-foreground">
                {facture.numero} · {facture.devis.seance.titre}
                <br />
                Due {formatDate(facture.dateEcheance)}
              </p>
              <Button asChild variant="outline" className="mt-auto">
                <Link href="/espace-client/factures">View my invoices</Link>
              </Button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">All paid, thank you!</p>
          )}
        </article>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-charcoal">Quick links</h2>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {LINKS.map(({ label, href, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-3 rounded-2xl bg-white p-4 text-sm font-semibold text-charcoal shadow-soft ring-1 ring-border transition-colors hover:text-primary-text"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary-text">
                  <Icon className="size-5" aria-hidden />
                </span>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
