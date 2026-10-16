/* Front office — landing page (visitors). Reviews come from the Avis & Réclamations module,
 * portfolio images from the Portfolio module (MOCK data for now). */
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  Camera,
  Heart,
  Images,
  Mail,
  MapPin,
  PartyPopper,
  Phone,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { RatingStars } from "@/components/shared/rating-stars";
import { Reveal } from "@/components/shared/reveal";
import { SafeImage } from "@/components/shared/safe-image";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { fullName } from "@/lib/mock-data-helpers";
import { FRONT_IMAGES, mockImage } from "@/lib/mock-images";
import { AVIS_PUBLIES } from "@/modules/avis-reclamations/mock-data";
import { PORTFOLIOS_PUBLICS } from "@/modules/portfolio/mock-data";
import { ContactForm } from "./_components/contact-form";

export const metadata: Metadata = {
  title: { absolute: "StudioFlow — Photography studio in Tunis" },
};

const SERVICES = [
  {
    titre: "Wedding",
    icon: Heart,
    image: mockImage("mariage", 5),
    texte:
      "Engagement, ceremony and party: your story told with emotion, from the first look to the last dance.",
    prix: "from 1,900 TND",
  },
  {
    titre: "Portrait",
    icon: UserRound,
    image: mockImage("portrait", 9),
    texte: "Solo, family, maternity or corporate, in the studio or in natural light.",
    prix: "from 250 TND",
  },
  {
    titre: "Product",
    icon: Building2,
    image: mockImage("produit", 1),
    texte: "White-background packshots and styled scenes for your shops and social media.",
    prix: "from 35 TND / photo",
  },
  {
    titre: "Event",
    icon: PartyPopper,
    image: mockImage("evenement", 1),
    texte: "Launches, conferences and parties, captured live by a discreet crew.",
    prix: "from 700 TND",
  },
];

const STEPS = [
  {
    icon: CalendarCheck,
    titre: "Book online",
    texte:
      "Choose your session and a time slot: the studio sends you a quote to accept in one click.",
  },
  {
    icon: Camera,
    titre: "Enjoy the session",
    texte: "Attentive photographers, the right equipment and locations designed for light.",
  },
  {
    icon: Sparkles,
    titre: "Private gallery",
    texte: "The AI sorts through thousands of shots; our photographers pick the best ones for you.",
    ai: true,
  },
  {
    icon: Images,
    titre: "Choose and receive",
    texte: "Mark your favorites, approve your selection and download your retouched photos.",
  },
];

export default async function HomePage() {
  const session = await auth();
  const role = session?.user?.role;
  const reserveHref =
    role === "CLIENT"
      ? "/espace-client/seances/reserver"
      : role
        ? "/dashboard/seances/nouvelle"
        : "/register";
  const band = PORTFOLIOS_PUBLICS.flatMap((p) =>
    p.elements.slice(0, 2).map((e) => ({ ...e, slug: p.slug })),
  ).slice(0, 6);

  return (
    <main>
      {/* Hero */}
      <section className="relative flex min-h-[40rem] items-end overflow-hidden bg-charcoal text-white md:h-dvh md:max-h-[60rem]">
        <SafeImage
          src={FRONT_IMAGES.hero}
          alt="Bride holding her bouquet in the evening light"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/45 to-charcoal/30" />
        <div className="relative mx-auto w-full max-w-7xl px-5 pt-32 pb-16 sm:px-8 md:pb-24">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.2em] uppercase backdrop-blur">
            <Sparkles className="size-3.5 text-[#c4b5fd]" aria-hidden />
            AI-powered photography studio
          </p>
          <h1 className="mt-6 max-w-4xl text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-6xl lg:text-7xl">
            Your most precious moments, in images that look like you.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/80">
            Weddings, portraits, products and events in Tunis. Book your session, discover your
            photos in a private gallery and approve your selection online.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 px-7">
              <Link href={reserveHref}>
                Book a session
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 border-white/40 bg-white/10 px-7 text-white backdrop-blur hover:bg-white/20 hover:text-white"
            >
              <Link href="/portfolio">View portfolio</Link>
            </Button>
          </div>
          <dl className="mt-14 grid max-w-2xl grid-cols-3 gap-6 border-t border-white/15 pt-6">
            {[
              ["1,200+", "sessions completed"],
              ["4.9 / 5", "average rating"],
              ["72 h", "to get your gallery"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd className="text-2xl font-bold sm:text-3xl">{value}</dd>
                <dd className="text-xs text-white/65 sm:text-sm">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="scroll-mt-20 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.3em] text-primary-text uppercase">
              Services
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">
              A session for every story
            </h2>
            <p className="mt-4 text-muted-foreground">
              From weddings to packshots, the same standards: careful lighting, natural images and
              simple follow-up.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((service, index) => (
              <Reveal
                key={service.titre}
                delay={index * 90}
                as="article"
                className="group overflow-hidden rounded-2xl bg-surface ring-1 ring-border"
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <SafeImage
                    src={service.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 25vw, 50vw"
                    className="object-cover transition-transform duration-[1.2s] group-hover:scale-105"
                  />
                  <span className="absolute top-4 left-4 grid size-10 place-items-center rounded-full bg-white/90 text-primary-text backdrop-blur">
                    <service.icon className="size-5" aria-hidden />
                  </span>
                </div>
                <div className="space-y-2 p-5">
                  <h3 className="text-lg font-semibold text-charcoal">{service.titre}</h3>
                  <p className="text-sm text-muted-foreground">{service.texte}</p>
                  <p className="pt-1 text-sm font-semibold text-primary-text">{service.prix}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y bg-surface">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold tracking-[0.3em] text-primary-text uppercase">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">
              From booking to your photos, all online
            </h2>
          </Reveal>
          <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <Reveal
                key={step.titre}
                as="li"
                delay={index * 90}
                className="relative rounded-2xl bg-white p-6 shadow-soft ring-1 ring-border"
              >
                <span className="text-sm font-bold text-light-gray">0{index + 1}</span>
                <span
                  className={`mt-3 grid size-11 place-items-center rounded-xl ${step.ai ? "bg-ai-soft text-ai-text" : "bg-accent text-primary-text"}`}
                >
                  <step.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-semibold text-charcoal">{step.titre}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.texte}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Portfolio band */}
      <section className="bg-charcoal text-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <Reveal className="max-w-xl">
              <p className="text-xs font-semibold tracking-[0.3em] text-white/60 uppercase">
                Portfolio
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                A few stories we have told
              </h2>
            </Reveal>
            <Button
              asChild
              variant="outline"
              className="self-start border-white/30 bg-transparent text-white hover:bg-white hover:text-charcoal md:self-auto"
            >
              <Link href="/portfolio">
                Full portfolio
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
          <div className="mt-12 grid auto-rows-[12rem] grid-cols-2 gap-3 sm:auto-rows-[16rem] lg:grid-cols-4">
            {band.map((element, index) => (
              <Link
                key={element.id}
                href={`/portfolio/${element.slug}`}
                className={`group relative overflow-hidden rounded-xl bg-slate ${index === 0 ? "row-span-2" : ""} ${index === 3 ? "lg:col-span-2" : ""}`}
              >
                <SafeImage
                  src={element.photo.url}
                  alt={element.legende}
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="object-cover transition-transform duration-[1.2s] group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section id="avis" className="scroll-mt-20 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.3em] text-primary-text uppercase">
              Client reviews
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">
              They trusted us with their memories
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {AVIS_PUBLIES.map((avis, index) => (
              <Reveal
                key={avis.id}
                as="article"
                delay={index * 90}
                className="flex flex-col gap-4 rounded-2xl bg-surface p-6 ring-1 ring-border"
              >
                <RatingStars value={avis.note} />
                <blockquote className="flex-1 text-sm leading-relaxed text-slate">
                  “{avis.commentaire}”
                </blockquote>
                <footer className="border-t pt-4">
                  <p className="text-sm font-semibold text-charcoal">{fullName(avis.client)}</p>
                  <p className="text-xs text-muted-foreground">{avis.seance.type}</p>
                </footer>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-charcoal">
        <SafeImage
          src={FRONT_IMAGES.studio}
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal via-charcoal/80 to-charcoal/40" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-6 px-5 py-20 text-white sm:px-8 lg:py-24">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to create images that last?
          </h2>
          <p className="max-w-xl text-white/75">
            Create your client account in a minute: booking, quotes, private gallery and invoices in
            one place.
          </p>
          <Button asChild size="lg" className="h-12 px-7">
            <Link href={reserveHref}>
              Book a session
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-20 bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_1.3fr] lg:py-28">
          <Reveal className="space-y-6">
            <div>
              <p className="text-xs font-semibold tracking-[0.3em] text-primary-text uppercase">
                Contact
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-charcoal sm:text-4xl">
                Let&apos;s talk about your shoot
              </h2>
              <p className="mt-4 text-muted-foreground">
                A question, a date, an idea? We reply within 24 hours.
              </p>
            </div>
            <ul className="space-y-4 text-sm text-slate">
              <li className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-accent text-primary-text">
                  <MapPin className="size-5" aria-hidden />
                </span>
                Rue du Lac Léman, Les Berges du Lac, 1053 Tunis
              </li>
              <li className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-accent text-primary-text">
                  <Phone className="size-5" aria-hidden />
                </span>
                <a href="tel:+21670000000" className="hover:text-primary-text">
                  +216 70 000 000
                </a>
              </li>
              <li className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-accent text-primary-text">
                  <Mail className="size-5" aria-hidden />
                </span>
                <a href="mailto:contact@studioflow.tn" className="hover:text-primary-text">
                  contact@studioflow.tn
                </a>
              </li>
            </ul>
            <div className="relative hidden aspect-[16/10] overflow-hidden rounded-2xl lg:block">
              <SafeImage
                src={FRONT_IMAGES.contact}
                alt="Photographer holding a camera"
                fill
                sizes="40vw"
                className="object-cover"
              />
            </div>
          </Reveal>
          <Reveal delay={120} className="rounded-3xl bg-surface p-6 ring-1 ring-border sm:p-10">
            <ContactForm />
          </Reveal>
        </div>
      </section>
    </main>
  );
}
