/* Front office — landing page (visitors). Reviews come from the Avis & Réclamations module,
 * portfolio images from the Portfolio module (MOCK data for now). */
import { ArrowDown, ArrowUpRight, Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Parallax } from "@/components/shared/parallax";
import { Reveal } from "@/components/shared/reveal";
import { SafeImage } from "@/components/shared/safe-image";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { fullName } from "@/lib/mock-data-helpers";
import { FRONT_IMAGES, mockImage } from "@/lib/mock-images";
import { cn } from "@/lib/utils";
import { AVIS_PUBLIES } from "@/modules/avis-reclamations/mock-data";
import { PORTFOLIOS_PUBLICS } from "@/modules/portfolio/mock-data";
import { ContactForm } from "./_components/contact-form";
import { Testimonials } from "./_components/testimonials";

export const metadata: Metadata = {
  title: { absolute: "ReFrame — Photography studio in Tunis" },
};

const CATEGORIES = [
  {
    titre: "Weddings",
    slug: "mariages-mediterranee",
    image: mockImage("mariage", 5),
    texte: "Engagement, ceremony and party, from the first look to the last dance.",
  },
  {
    titre: "Portraits",
    slug: "portraits",
    image: mockImage("portrait", 9),
    texte: "Solo, family, maternity or corporate, in the studio or in natural light.",
  },
  {
    titre: "Products",
    slug: "produits",
    image: mockImage("produit", 1),
    texte: "Packshots and styled scenes for your shops and social media.",
  },
  {
    titre: "Events",
    slug: "evenements",
    image: mockImage("evenement", 1),
    texte: "Launches, conferences and parties, captured live by a discreet crew.",
  },
];

const PACKAGES = [
  {
    nom: "Essential",
    pour: "Portraits · Products",
    prix: "250",
    featured: false,
    points: [
      "2-hour session in the studio or outdoors",
      "20 retouched photos",
      "Private online gallery for 3 months",
      "Delivery within 72 hours",
    ],
  },
  {
    nom: "Signature",
    pour: "Weddings · Events",
    prix: "1,900",
    featured: true,
    points: [
      "8 hours of coverage, two photographers",
      "300+ photos, AI-assisted culling",
      "Private gallery with favourites and selection",
      "Downloads in full resolution",
    ],
  },
  {
    nom: "Prestige",
    pour: "The full story",
    prix: "3,500",
    featured: false,
    points: [
      "Engagement session + full wedding day",
      "Fine-art printed album (30 × 30 cm)",
      "Highlight film, 3 minutes",
      "Private gallery for 12 months",
    ],
  },
];

const STEPS = [
  [
    "Book online",
    "Choose your session and a time slot; the studio sends you a quote to accept in one click.",
  ],
  [
    "The session",
    "Attentive photographers, the right equipment and locations chosen for their light.",
  ],
  [
    "Your private gallery",
    "The AI sorts thousands of shots; our photographers keep the best ones for you.",
  ],
  [
    "Choose and receive",
    "Mark your favourites, approve your selection and download your retouched photos.",
  ],
] as const;

const GALLERY_RATIOS = ["aspect-[4/5]", "aspect-[3/2]", "aspect-[2/3]"];

export default async function HomePage() {
  const session = await auth();
  const role = session?.user?.role;
  const reserveHref =
    role === "CLIENT"
      ? "/espace-client/seances/reserver"
      : role
        ? "/dashboard/seances/nouvelle"
        : "/register";
  const publicSlugs = new Set(PORTFOLIOS_PUBLICS.map((p) => p.slug));
  const gallery = PORTFOLIOS_PUBLICS.flatMap((p) =>
    p.elements.slice(0, 3).map((e) => ({ ...e, slug: p.slug })),
  ).slice(0, 9);
  const testimonials = AVIS_PUBLIES.map((avis) => ({
    id: avis.id,
    quote: avis.commentaire,
    author: fullName(avis.client),
    context: `${avis.seance.type} session`,
    note: avis.note,
  }));

  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="dark relative flex h-dvh min-h-[38rem] items-end overflow-hidden bg-background text-foreground">
        <Parallax speed={0.25} className="absolute inset-0">
          <div className="ken-burns absolute inset-[-4%]">
            <SafeImage
              src={FRONT_IMAGES.hero}
              alt="Bride holding her bouquet in the evening light"
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
        </Parallax>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgb(10_10_10/0.65))]" />
        <div
          aria-hidden
          className="viewfinder pointer-events-none absolute inset-x-[var(--space-gutter)] top-28 bottom-10 hidden opacity-60 [--vf-len:2.25rem] md:block"
        />

        <div className="container-wide relative pb-20 sm:pb-24">
          <p className="eyebrow page-enter">Photography studio · Tunis</p>
          <h1 className="display-xl page-enter mt-6 max-w-6xl text-foreground [animation-delay:120ms]">
            Your moments,
            <br />
            reframed.
          </h1>
          <div className="page-enter mt-10 flex flex-col gap-10 [animation-delay:240ms] md:flex-row md:items-end md:justify-between">
            <p className="max-w-md text-base leading-relaxed text-foreground/75 sm:text-lg">
              Weddings, portraits, products and events. Book your session, discover your photos in a
              private gallery and approve your selection online.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="cinematic" size="cta">
                <Link href={reserveHref}>
                  Book a session
                  <ArrowUpRight aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="cinematic-outline" size="cta">
                <Link href="/portfolio">View portfolio</Link>
              </Button>
            </div>
          </div>
        </div>
        <a
          href="#manifesto"
          className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[0.6rem] tracking-[0.4em] text-foreground/50 uppercase transition-colors hover:text-foreground md:flex"
        >
          Scroll
          <ArrowDown className="size-3.5 animate-bounce" aria-hidden />
        </a>
      </section>

      {/* ── Manifesto + numbers ─────────────────────────────────────────── */}
      <section id="manifesto" className="section scroll-mt-20">
        <div className="container-wide grid gap-16 lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <Reveal>
            <p className="eyebrow">The studio</p>
            <p className="display-lg mt-6 text-foreground">
              We don&apos;t just take pictures. We frame what you&apos;ll want to remember.
            </p>
            <dl className="mt-14 grid grid-cols-3 gap-6 border-t border-foreground/10 pt-8">
              {[
                ["1,200+", "Sessions"],
                ["4.9/5", "Average rating"],
                ["72 h", "To your gallery"],
              ].map(([value, label]) => (
                <div key={label} className="flex flex-col-reverse gap-2">
                  <dt className="text-[0.65rem] tracking-[0.28em] text-foreground/55 uppercase">
                    {label}
                  </dt>
                  <dd className="font-heading text-3xl font-light text-foreground sm:text-4xl">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
          <Reveal delay={150} className="relative">
            <div className="relative aspect-[4/5] overflow-hidden bg-card">
              <Parallax speed={-0.08} className="absolute inset-[-8%]">
                <SafeImage
                  src={FRONT_IMAGES.studio}
                  alt="Photographer setting up lights in the studio"
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover"
                />
              </Parallax>
            </div>
            <div
              aria-hidden
              className="viewfinder pointer-events-none absolute -inset-4 [--vf-len:1.75rem]"
            />
          </Reveal>
        </div>
      </section>

      {/* ── Categories: cinematic cards ─────────────────────────────────── */}
      <section id="services" className="section scroll-mt-20 border-t border-foreground/[0.06]">
        <div className="container-wide">
          <Reveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="eyebrow">Services</p>
              <h2 className="display-lg mt-6 max-w-3xl text-foreground">
                A session for every story
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-foreground/60">
              From weddings to packshots, the same standards: careful light, natural images and a
              simple follow-up.
            </p>
          </Reveal>
          <ul className="mt-16 grid gap-4 md:grid-cols-2">
            {CATEGORIES.map((category, index) => (
              <Reveal key={category.slug} as="li" delay={(index % 2) * 120}>
                <Link
                  href={
                    publicSlugs.has(category.slug) ? `/portfolio/${category.slug}` : "/portfolio"
                  }
                  className="dark group relative block aspect-[16/10] overflow-hidden bg-card lg:aspect-[21/11]"
                >
                  <SafeImage
                    src={category.image}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="img-zoom object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/25 to-background/10 transition-colors duration-700 group-hover:via-background/45" />
                  <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8">
                    <span className="font-heading text-xs tracking-[0.3em] text-foreground/60">
                      0{index + 1}
                    </span>
                    <div className="flex items-end justify-between gap-6">
                      <div>
                        <h3 className="display-md text-foreground">{category.titre}</h3>
                        <p className="mt-3 max-w-sm text-sm text-foreground/70 transition-all duration-700 md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-focus-visible:translate-y-0 md:group-focus-visible:opacity-100">
                          {category.texte}
                        </p>
                      </div>
                      <span className="grid size-12 shrink-0 place-items-center border border-foreground/30 text-foreground transition-colors duration-500 group-hover:border-foreground group-hover:bg-foreground group-hover:text-background">
                        <ArrowUpRight className="size-5" aria-hidden />
                      </span>
                    </div>
                  </div>
                  <span className="sr-only">See the {category.titre.toLowerCase()} portfolio</span>
                </Link>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Packages ────────────────────────────────────────────────────── */}
      <section id="packages" className="section scroll-mt-20 bg-surface">
        <div className="container-wide">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="eyebrow">Packages</p>
            <h2 className="display-lg mt-6 text-foreground">Choose your frame</h2>
            <p className="mt-6 text-sm leading-relaxed text-foreground/60">
              Every package includes a private online gallery and the studio&apos;s retouching.
              Prices from, VAT included; a detailed quote follows your request.
            </p>
          </Reveal>
          <ul className="mt-16 grid gap-px bg-foreground/[0.07] lg:grid-cols-3">
            {PACKAGES.map((pack, index) => (
              <Reveal
                key={pack.nom}
                as="li"
                delay={index * 120}
                className={cn(
                  "relative flex flex-col p-8 sm:p-10",
                  pack.featured ? "bg-card" : "bg-surface",
                )}
              >
                {pack.featured && (
                  <>
                    <span aria-hidden className="viewfinder pointer-events-none absolute inset-3" />
                    <span className="absolute top-3 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 font-heading text-[0.6rem] tracking-[0.3em] whitespace-nowrap text-gold uppercase">
                      Most booked
                    </span>
                  </>
                )}
                <p className="text-[0.65rem] tracking-[0.3em] text-foreground/50 uppercase">
                  {pack.pour}
                </p>
                <h3 className="display-md mt-3 text-foreground">{pack.nom}</h3>
                <p className="mt-8 flex items-baseline gap-2 text-foreground">
                  <span className="text-xs tracking-[0.2em] text-foreground/50 uppercase">
                    From
                  </span>
                  <span className="font-heading text-5xl font-light">{pack.prix}</span>
                  <span className="text-sm text-foreground/60">TND</span>
                </p>
                <ul className="mt-8 flex-1 space-y-3 border-t border-foreground/10 pt-8 text-sm text-foreground/75">
                  {pack.points.map((point) => (
                    <li key={point} className="flex gap-3">
                      <Check className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  variant={pack.featured ? "cinematic" : "cinematic-outline"}
                  size="cta"
                  className="mt-10 w-full"
                >
                  <Link href={reserveHref}>
                    Book {pack.nom}
                    <ArrowUpRight aria-hidden />
                  </Link>
                </Button>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="section">
        <div className="container-wide">
          <Reveal>
            <p className="eyebrow">How it works</p>
            <h2 className="display-lg mt-6 max-w-3xl text-foreground">
              From booking to your photos
            </h2>
          </Reveal>
          <ol className="mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([titre, texte], index) => (
              <Reveal
                key={titre}
                as="li"
                delay={index * 110}
                className="border-t border-foreground/15 pt-6"
              >
                <span className="font-heading text-xs tracking-[0.3em] text-gold">
                  0{index + 1}
                </span>
                <h3 className="mt-6 font-heading text-sm font-medium tracking-[0.2em] text-foreground uppercase">
                  {titre}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-foreground/60">{texte}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Portfolio gallery (masonry) ─────────────────────────────────── */}
      <section className="section border-t border-foreground/[0.06]">
        <div className="container-wide">
          <Reveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="eyebrow">Portfolio</p>
              <h2 className="display-lg mt-6 max-w-3xl text-foreground">Stories we have told</h2>
            </div>
            <Button
              asChild
              variant="cinematic-outline"
              size="cta-sm"
              className="self-start md:self-auto"
            >
              <Link href="/portfolio">
                Full portfolio
                <ArrowUpRight aria-hidden />
              </Link>
            </Button>
          </Reveal>
          <ul className="mt-16 columns-1 gap-4 sm:columns-2 lg:columns-3 [&>li]:mb-4">
            {gallery.map((element, index) => (
              <Reveal
                key={element.id}
                as="li"
                delay={(index % 3) * 100}
                className="break-inside-avoid"
              >
                <Link
                  href={`/portfolio/${element.slug}`}
                  className={cn(
                    "dark group relative block overflow-hidden bg-card",
                    GALLERY_RATIOS[index % GALLERY_RATIOS.length],
                  )}
                >
                  <SafeImage
                    src={element.photo.url}
                    alt={element.legende}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="img-zoom object-cover"
                  />
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-background/80 via-transparent to-transparent p-5 opacity-0 transition-opacity duration-700 group-hover:opacity-100 group-focus-visible:opacity-100">
                    <p className="text-xs tracking-[0.2em] text-foreground uppercase">
                      {element.legende}
                    </p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────── */}
      <section id="avis" className="section scroll-mt-20 bg-surface">
        <div className="container-wide">
          <Reveal className="text-center">
            <p className="eyebrow">Client reviews</p>
          </Reveal>
          <div className="mt-12">
            <Testimonials items={testimonials} />
          </div>
        </div>
      </section>

      {/* ── Call to action, cinematic band ──────────────────────────────── */}
      <section className="dark relative overflow-hidden">
        <div className="relative aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9]">
          <Parallax speed={0.15} className="absolute inset-[-10%]">
            <SafeImage
              src={mockImage("mariage", 9)}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
            />
          </Parallax>
          <div className="absolute inset-0 bg-background/65" />
          <div className="container-wide absolute inset-0 flex flex-col items-center justify-center text-center">
            <Reveal>
              <h2 className="display-lg mx-auto max-w-4xl text-foreground">
                Ready to create images that last?
              </h2>
              <p className="mx-auto mt-6 max-w-lg text-sm leading-relaxed text-foreground/70 sm:text-base">
                Create your client account in a minute: booking, quotes, private gallery and
                invoices in one place.
              </p>
              <Button asChild variant="cinematic" size="cta" className="mt-10">
                <Link href={reserveHref}>
                  Book a session
                  <ArrowUpRight aria-hidden />
                </Link>
              </Button>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Contact ─────────────────────────────────────────────────────── */}
      <section id="contact" className="section scroll-mt-20">
        <div className="container-wide grid gap-16 lg:grid-cols-[1fr_1.2fr]">
          <Reveal className="space-y-10">
            <div>
              <p className="eyebrow">Contact</p>
              <h2 className="display-lg mt-6 text-foreground">Let&apos;s talk about your shoot</h2>
              <p className="mt-6 max-w-md text-foreground/60">
                A question, a date, an idea? We reply within 24 hours.
              </p>
            </div>
            <dl className="grid gap-6 border-t border-foreground/10 pt-8 text-sm sm:grid-cols-3 lg:grid-cols-1">
              <div>
                <dt className="text-[0.65rem] tracking-[0.3em] text-foreground/50 uppercase">
                  Studio
                </dt>
                <dd className="mt-2 text-foreground/85">
                  Rue du Lac Léman, Les Berges du Lac, 1053 Tunis
                </dd>
              </div>
              <div>
                <dt className="text-[0.65rem] tracking-[0.3em] text-foreground/50 uppercase">
                  Phone
                </dt>
                <dd className="mt-2">
                  <a
                    href="tel:+21670000000"
                    className="text-foreground/85 transition-colors hover:text-gold"
                  >
                    +216 70 000 000
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-[0.65rem] tracking-[0.3em] text-foreground/50 uppercase">
                  Email
                </dt>
                <dd className="mt-2">
                  <a
                    href="mailto:contact@reframe.tn"
                    className="text-foreground/85 transition-colors hover:text-gold"
                  >
                    contact@reframe.tn
                  </a>
                </dd>
              </div>
            </dl>
          </Reveal>
          <Reveal delay={120} className="border border-foreground/10 bg-card p-6 sm:p-10">
            <ContactForm />
          </Reveal>
        </div>
      </section>
    </main>
  );
}
