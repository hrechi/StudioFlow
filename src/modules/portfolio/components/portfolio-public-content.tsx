import type { PortfolioPublic } from "../portfolio.service";
import type { BlocPortfolioPublic, ElementPortfolioPublic } from "../portfolio.types";
import type { CSSProperties } from "react";
import { SafeImage } from "@/components/shared/safe-image";
import { ArrowDown, Mail, Quote } from "lucide-react";
import { BeforeAfterSlider } from "./before-after-slider";
import { PortfolioGallery } from "./portfolio-gallery";
import { PortfolioContactForm } from "./portfolio-contact-form";
import { PortfolioTopBar } from "./public/PortfolioTopBar";
import { PortfolioRatingWidget } from "./public/PortfolioRatingWidget";
import { portfolioIntegrations } from "../integrations";

const stringValue = (configuration: Record<string, unknown>, key: string): string =>
  typeof configuration[key] === "string" ? (configuration[key] as string) : "";
const numberValue = (configuration: Record<string, unknown>, key: string): number =>
  typeof configuration[key] === "number" ? (configuration[key] as number) : 0;

function configuredElement(url: string, idElement: string): ElementPortfolioPublic {
  return {
    idElement,
    media: { url, urlMiniature: url, largeur: 1, hauteur: 1 },
    ordreAffichage: 0,
    estMisEnAvant: false,
    role: idElement === "before" ? "AVANT" : "APRES",
    nombreLikes: 0,
  };
}

export async function PortfolioPublicContent({ portfolio }: { portfolio: PortfolioPublic }) {
  const blocks = portfolio.blocsPublies
    .filter((block) => block.visible)
    .sort((a, b) => a.ordre - b.ordre);

  const photographerName = portfolio.photographe.prenom
    ? `${portfolio.photographe.prenom} ${portfolio.photographe.nom}`.trim()
    : portfolio.titre;

  // 6 theme CSS variables matching user specification
  const isDark = portfolio.theme === "SOMBRE";
  const isEditorial = portfolio.theme === "EDITORIAL";
  const isColour = portfolio.theme === "COLORE";

  const themeVars = isDark
    ? {
        "--portfolio-bg": "#0f0905",
        "--portfolio-text": "#f3ebdd",
        "--portfolio-muted": "#9a8f82",
        "--portfolio-border": "rgba(255,255,255,0.08)",
        "--portfolio-surface": "#1c1410",
        "--portfolio-accent": portfolio.couleurAccent || "#e8a34a",
      }
    : isEditorial
      ? {
          "--portfolio-bg": "#faf6ee",
          "--portfolio-text": "#1a1612",
          "--portfolio-muted": "#706659",
          "--portfolio-border": "#e2d9cb",
          "--portfolio-surface": "#f2ebde",
          "--portfolio-accent": portfolio.couleurAccent || "#e8a34a",
        }
      : isColour
        ? {
            "--portfolio-bg": "#fdfaf5",
            "--portfolio-text": "#191e24",
            "--portfolio-muted": "#6b7280",
            "--portfolio-border": "#e5e7eb",
            "--portfolio-surface": "#f4f3ef",
            "--portfolio-accent": portfolio.couleurAccent || "#d97746",
          }
        : {
            // Minimal theme (default)
            "--portfolio-bg": "#f7f2e9",
            "--portfolio-text": "#1b1712",
            "--portfolio-muted": "#7d7264",
            "--portfolio-border": "#ddd1bf",
            "--portfolio-surface": "#efe7d8",
            "--portfolio-accent": portfolio.couleurAccent || "#e8a34a",
          };

  return (
    <div
      className={`min-h-screen ${isDark ? "dark" : ""} ${isEditorial ? "font-serif" : "font-sans"}`}
      style={
        {
          ...themeVars,
          backgroundColor: "var(--portfolio-bg)",
          color: "var(--portfolio-text)",
        } as CSSProperties
      }
    >
      {/* 1. Sticky Top Bar (54px) */}
      <PortfolioTopBar photographerName={photographerName} />

      <main className="flex flex-col">
        {blocks.map((block) => (
          <PublicBlockSection
            key={block.idBloc}
            block={block}
            portfolio={portfolio}
            photographerName={photographerName}
          />
        ))}

        {/* Visitor Star Rating Widget (max 5 stars) */}
        <section className="container mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <PortfolioRatingWidget
            slug={portfolio.slug}
            noteMoyenne={portfolio.noteMoyenne}
            nombreAvis={portfolio.nombreAvis}
            accentColor={portfolio.couleurAccent}
          />
        </section>
      </main>

      {/* Footer */}
      <footer
        className="border-t py-8 text-center text-xs"
        style={{ borderColor: "var(--portfolio-border)", color: "var(--portfolio-muted)" }}
      >
        <div className="container mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <p className="font-mono text-[9px] tracking-[0.18em] uppercase">
            © {new Date().getFullYear()} {photographerName}
            {portfolio.ville ? ` · ${portfolio.ville}` : ""}
          </p>
          <p className="font-mono text-[9px] tracking-[0.18em] uppercase">Built with StudioFlow</p>
        </div>
      </footer>
    </div>
  );
}

async function PublicBlockSection({
  block,
  portfolio,
  photographerName,
}: {
  block: BlocPortfolioPublic;
  portfolio: PortfolioPublic;
  photographerName: string;
}) {
  const conf = block.configuration;
  const elements = [...block.elements].sort((a, b) => a.ordreAffichage - b.ordreAffichage);

  switch (block.type) {
    case "HERO": {
      const coverUrl =
        (conf.photoCouverture as string) || elements[0]?.media?.url || portfolio.photoCouverture;
      const subtitle = stringValue(conf, "sousTitre") || portfolio.slogan;
      const title = stringValue(conf, "titre") || portfolio.titre;
      const buttonLabel = stringValue(conf, "texteBouton") || "Enquire about your date";
      const tags = [portfolio.ville, ...(portfolio.specialites || [])].filter(Boolean).join(" · ");

      return (
        <section className="relative w-full overflow-hidden">
          {/* Cover photo */}
          <div className="relative h-[clamp(340px,52vh,520px)] w-full overflow-hidden bg-black/40">
            {coverUrl && (
              <SafeImage
                src={coverUrl}
                alt={title}
                fill
                priority
                unoptimized
                sizes="100vw"
                className="object-cover object-[center_30%]"
              />
            )}
            {/* Gradient veil from 84% bottom to 8% top */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to top, rgba(15, 9, 5, 0.84) 0%, rgba(15, 9, 5, 0.4) 45%, rgba(15, 9, 5, 0.08) 100%)",
              }}
            />

            {/* Bottom-left content */}
            <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-10 sm:px-12 md:pb-14">
              <div className="max-w-[42ch] space-y-3">
                {tags && (
                  <p
                    className="font-mono text-[10px] font-semibold tracking-[0.2em] uppercase"
                    style={{ color: "var(--portfolio-accent)" }}
                  >
                    {tags}
                  </p>
                )}
                <h1 className="font-sans text-[clamp(28px,5vw,56px)] leading-[1.02] font-bold tracking-tight text-white">
                  {title}
                </h1>
                {subtitle && (
                  <p className="font-sans text-sm leading-relaxed text-white/80 sm:text-base">
                    {subtitle}
                  </p>
                )}
                <div className="pt-2">
                  <a
                    href="#contact"
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-sans text-xs font-semibold text-[#0f0905] shadow-lg transition-transform hover:scale-105 active:scale-95"
                    style={{ backgroundColor: "var(--portfolio-accent)" }}
                  >
                    <span>{buttonLabel}</span>
                    <ArrowDown className="size-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    }

    case "A_PROPOS": {
      const portraitUrl =
        (conf.photoPortrait as string) ||
        (conf.photoCouverture as string) ||
        elements[0]?.media?.url ||
        portfolio.photoCouverture;
      const bioText = stringValue(conf, "texte") || portfolio.bio;
      const experienceYears = numberValue(conf, "anneesExperience") || 5;

      return (
        <section
          className="container mx-auto max-w-5xl border-t px-4 py-16 sm:px-6 sm:py-24"
          style={{ borderColor: "var(--portfolio-border)" }}
        >
          <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.25fr_0.75fr] md:items-center">
            {/* Left Column: Stamp + Name + Bio + Experience Stat */}
            <div className="space-y-6">
              <span
                className="font-mono text-[9.5px] font-semibold tracking-[0.2em] uppercase"
                style={{ color: "var(--portfolio-accent)" }}
              >
                About
              </span>
              <h2 className="font-sans text-2xl font-bold tracking-tight sm:text-3xl">
                {stringValue(conf, "titre") || photographerName}
              </h2>
              {bioText && (
                <p
                  className="max-w-[56ch] font-sans text-[13.5px] leading-[1.75]"
                  style={{ color: "var(--portfolio-muted)" }}
                >
                  {bioText}
                </p>
              )}
              <div className="flex items-baseline gap-2 pt-2 font-mono text-xs">
                <span
                  className="font-serif text-3xl font-bold italic"
                  style={{ color: "var(--portfolio-accent)" }}
                >
                  {experienceYears}
                </span>
                <span style={{ color: "var(--portfolio-muted)" }}>years behind the camera</span>
              </div>
            </div>

            {/* Right Column: Portrait 4/5 ratio */}
            {portraitUrl && (
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[6px] shadow-md">
                <SafeImage
                  src={portraitUrl}
                  alt={photographerName}
                  fill
                  unoptimized
                  sizes="(min-width: 768px) 380px, 100vw"
                  className="object-cover"
                />
              </div>
            )}
          </div>
        </section>
      );
    }

    case "GALERIE":
    case "COLLECTION": {
      const title = stringValue(conf, "titre") || stringValue(conf, "categorie") || "Gallery";
      return (
        <section
          className="container mx-auto max-w-5xl border-t px-4 py-16 sm:px-6 sm:py-20"
          style={{ borderColor: "var(--portfolio-border)" }}
        >
          <div className="mb-8 space-y-1">
            <span
              className="font-mono text-[9px] font-semibold tracking-[0.2em] uppercase"
              style={{ color: "var(--portfolio-accent)" }}
            >
              Gallery
            </span>
            <h2 className="font-sans text-xl font-bold tracking-tight uppercase sm:text-2xl">
              {title}
            </h2>
          </div>
          {elements.length > 0 ? (
            <PortfolioGallery
              elements={elements}
              titre={title}
              portfolioId={portfolio.id}
              slug={portfolio.slug}
              miseEnPage={block.miseEnPage}
              colonnes={numberValue(conf, "colonnes") || 3}
              espacement={numberValue(conf, "espacement") || 8}
            />
          ) : (
            <div
              className="rounded-xl border p-8 text-center text-xs"
              style={{
                borderColor: "var(--portfolio-border)",
                backgroundColor: "var(--portfolio-surface)",
                color: "var(--portfolio-muted)",
              }}
            >
              Galerie photo en cours de sélection.
            </div>
          )}
        </section>
      );
    }

    case "CASE_STUDY": {
      const image = elements[0]?.media?.url || stringValue(conf, "photo");
      const title = stringValue(conf, "titre") || "Market morning, Saint-Michel";
      const story =
        stringValue(conf, "texte") ||
        "An early dawn session catching the vendors setting their stalls...";
      const stamp = [stringValue(conf, "lieu"), stringValue(conf, "date")]
        .filter(Boolean)
        .join(" · ");

      return (
        <section
          className="border-t px-4 py-16 sm:px-6 sm:py-20"
          style={{ borderColor: "var(--portfolio-border)" }}
        >
          <div className="container mx-auto grid max-w-5xl gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-center">
            {image && (
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl shadow-md">
                <SafeImage
                  src={image}
                  alt={title}
                  fill
                  unoptimized
                  sizes="(min-width: 768px) 45vw, 100vw"
                  className="object-cover"
                />
              </div>
            )}
            <div className="space-y-4">
              {stamp && (
                <p
                  className="font-mono text-[9.5px] font-semibold tracking-[0.2em] uppercase"
                  style={{ color: "var(--portfolio-accent)" }}
                >
                  {stamp}
                </p>
              )}
              <h2 className="font-sans text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
              <p
                className="font-sans text-sm leading-[1.75]"
                style={{ color: "var(--portfolio-muted)" }}
              >
                {story}
              </p>
            </div>
          </div>
        </section>
      );
    }

    case "AVANT_APRES": {
      const title = stringValue(conf, "titre") || "Color grading & retouching";
      const description =
        stringValue(conf, "description") ||
        "Subtle film toning and shadow recovery preserving natural skin tones.";
      const pairs = new Map<
        number,
        { avant?: ElementPortfolioPublic; apres?: ElementPortfolioPublic }
      >();
      for (const element of elements) {
        if (element.paire === undefined || element.role === "NORMAL") continue;
        const pair = pairs.get(element.paire) ?? {};
        if (element.role === "AVANT") pair.avant = element;
        if (element.role === "APRES") pair.apres = element;
        pairs.set(element.paire, pair);
      }
      const publishedPairs = [...pairs.values()].filter(
        (pair): pair is { avant: ElementPortfolioPublic; apres: ElementPortfolioPublic } =>
          Boolean(pair.avant && pair.apres),
      );
      const configuredBefore = stringValue(conf, "photoAvant");
      const configuredAfter = stringValue(conf, "photoApres");

      return (
        <section
          className="border-t px-4 py-16 sm:px-6 sm:py-20"
          style={{ borderColor: "var(--portfolio-border)" }}
        >
          <div className="container mx-auto max-w-5xl">
            <div className="mb-8 space-y-1">
              <span
                className="font-mono text-[9px] font-semibold tracking-[0.2em] uppercase"
                style={{ color: "var(--portfolio-accent)" }}
              >
                Before / After
              </span>
              <h2 className="font-sans text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
              <p
                className="mt-2 max-w-2xl text-sm leading-relaxed"
                style={{ color: "var(--portfolio-muted)" }}
              >
                {description}
              </p>
            </div>
            {publishedPairs.length > 0 ? (
              <div className="grid gap-8 md:grid-cols-2">
                {publishedPairs.map((pair, index) => (
                  <BeforeAfterSlider
                    key={pair.avant.idElement || index}
                    avant={pair.avant}
                    apres={pair.apres}
                  />
                ))}
              </div>
            ) : configuredBefore && configuredAfter ? (
              <BeforeAfterSlider
                avant={configuredElement(configuredBefore, "before")}
                apres={configuredElement(configuredAfter, "after")}
              />
            ) : (
              <div
                className="rounded-xl border p-8 text-center text-xs"
                style={{
                  borderColor: "var(--portfolio-border)",
                  backgroundColor: "var(--portfolio-surface)",
                  color: "var(--portfolio-muted)",
                }}
              >
                Comparaison avant / après en cours de préparation.
              </div>
            )}
          </div>
        </section>
      );
    }

    case "TEMOIGNAGES": {
      // Prefer manually curated testimonials from conf; fall back to MongoDB reviews
      type ConfTestimonial = {
        id: string;
        auteur: string;
        role: string;
        note: number;
        texte: string;
      };
      const confTestimonials: ConfTestimonial[] = Array.isArray(conf.temoignages)
        ? (conf.temoignages as ConfTestimonial[])
        : [];

      const dbReviews =
        confTestimonials.length === 0
          ? await portfolioIntegrations.avisService.listerAvisPublies(portfolio.proprietaire)
          : [];

      const title = stringValue(conf, "titre") || "Mots doux de mes clients";

      return (
        <section
          className="container mx-auto max-w-5xl border-t px-4 py-16 sm:px-6 sm:py-20"
          style={{ borderColor: "var(--portfolio-border)" }}
        >
          <div className="mb-10 space-y-1">
            <span
              className="font-mono text-[9px] font-semibold tracking-[0.2em] uppercase"
              style={{ color: "var(--portfolio-accent)" }}
            >
              Testimonials
            </span>
            <h2 className="font-sans text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {confTestimonials.length > 0
              ? confTestimonials.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-col justify-between space-y-3 rounded-xl border p-5"
                    style={{
                      borderColor: "var(--portfolio-border)",
                      backgroundColor: "var(--portfolio-surface)",
                    }}
                  >
                    <div>
                      <div
                        className="flex gap-0.5 text-xs"
                        style={{ color: "var(--portfolio-accent)" }}
                      >
                        {"★".repeat(t.note)}
                        {"☆".repeat(5 - t.note)}
                      </div>
                      <Quote
                        className="mt-3 size-4 opacity-30"
                        style={{ color: "var(--portfolio-accent)" }}
                      />
                      <p className="mt-1 font-serif text-sm leading-relaxed italic">
                        &ldquo;{t.texte}&rdquo;
                      </p>
                    </div>
                    <div
                      className="border-t pt-3"
                      style={{ borderColor: "var(--portfolio-border)" }}
                    >
                      <p className="font-sans text-xs font-semibold">{t.auteur}</p>
                      <p
                        className="font-mono text-[9px] tracking-wider uppercase"
                        style={{ color: "var(--portfolio-muted)" }}
                      >
                        {t.role}
                      </p>
                    </div>
                  </div>
                ))
              : dbReviews.slice(0, 3).map((rev) => (
                  <div
                    key={rev.id}
                    className="space-y-4 border-t pt-5"
                    style={{ borderColor: "var(--portfolio-border)" }}
                  >
                    <Quote className="size-5" style={{ color: "var(--portfolio-accent)" }} />
                    <p className="font-serif text-sm leading-relaxed italic">
                      &ldquo;{rev.texte}&rdquo;
                    </p>
                    <div className="pt-2">
                      <p className="font-sans text-xs font-semibold">{rev.auteur}</p>
                      <p
                        className="font-mono text-[9px] tracking-wider uppercase"
                        style={{ color: "var(--portfolio-muted)" }}
                      >
                        Client certifié
                      </p>
                    </div>
                  </div>
                ))}
          </div>
        </section>
      );
    }

    case "SERVICES": {
      const packages = Array.isArray(conf.forfaits)
        ? (conf.forfaits as Record<string, unknown>[])
        : [];
      return (
        <section
          className="container mx-auto max-w-5xl border-t px-4 py-16 sm:px-6 sm:py-20"
          style={{ borderColor: "var(--portfolio-border)" }}
        >
          <div className="mb-10 space-y-1">
            <span
              className="font-mono text-[9px] font-semibold tracking-[0.2em] uppercase"
              style={{ color: "var(--portfolio-accent)" }}
            >
              Services
            </span>
            <h2 className="font-sans text-xl font-bold tracking-tight sm:text-2xl">
              Forfaits & Tarifs
            </h2>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--portfolio-border)" }}>
            {packages.map((item, idx) => {
              const prix = Number(item.prixAPartirDe ?? 0);
              const formattedPrice = new Intl.NumberFormat("fr-FR", {
                style: "currency",
                currency: "EUR",
                maximumFractionDigits: 0,
              }).format(prix);

              return (
                <div
                  key={idx}
                  className="flex flex-col justify-between gap-4 py-5 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <h3 className="font-sans text-[13.5px] font-semibold">
                      {String(item.nom ?? "")}
                    </h3>
                    <p
                      className="font-sans text-[11.5px]"
                      style={{ color: "var(--portfolio-muted)" }}
                    >
                      {String(item.description ?? "")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className="font-sans text-sm font-bold"
                      style={{ color: "var(--portfolio-accent)" }}
                    >
                      from {formattedPrice}
                    </p>
                    {Boolean(item.duree) && (
                      <p
                        className="font-mono text-[9px] tracking-wider uppercase"
                        style={{ color: "var(--portfolio-muted)" }}
                      >
                        {String(item.duree)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      );
    }

    case "STATISTIQUES": {
      // Use manually configured stats first; fall back to dynamic DB values
      const stat1Val = stringValue(conf, "stat1_valeur");
      const stat1Lbl = stringValue(conf, "stat1_label") || "Séances réalisées";
      const stat2Val = stringValue(conf, "stat2_valeur");
      const stat2Lbl = stringValue(conf, "stat2_label") || "Recommandation";
      const stat3Val = stringValue(conf, "stat3_valeur");
      const stat3Lbl = stringValue(conf, "stat3_label") || "Note moyenne";

      const show = Array.isArray(conf.afficher) ? conf.afficher : [];
      const [sessions, rating] = await Promise.all([
        !stat1Val && show.includes("SEANCES")
          ? portfolioIntegrations.seancesService.compterSeancesTerminees(portfolio.proprietaire)
          : null,
        !stat3Val && show.includes("NOTE_MOYENNE")
          ? portfolioIntegrations.avisService.calculerNoteMoyenne(portfolio.proprietaire)
          : null,
      ]);

      const stats = [
        { valeur: stat1Val || String(sessions ?? 148), label: stat1Lbl },
        { valeur: stat2Val || "96%", label: stat2Lbl },
        { valeur: stat3Val || (rating != null ? rating.toFixed(1) : "4.9"), label: stat3Lbl },
      ];

      return (
        <section
          className="w-full border-t border-b py-12"
          style={{
            borderColor: "var(--portfolio-border)",
            backgroundColor: "var(--portfolio-surface)",
          }}
        >
          <div className="container mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 text-center sm:px-6 md:grid-cols-3">
            {stats.map((s, i) => (
              <div key={i} className={i === 2 ? "col-span-2 md:col-span-1" : ""}>
                <p
                  className="font-serif text-[clamp(26px,4vw,40px)] font-bold italic"
                  style={{ color: "var(--portfolio-accent)" }}
                >
                  {s.valeur}
                </p>
                <p
                  className="mt-1 font-sans text-[10.5px] tracking-wider uppercase"
                  style={{ color: "var(--portfolio-muted)" }}
                >
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </section>
      );
    }

    case "VIDEO": {
      const videoUrl = stringValue(conf, "urlVideo");
      const videoTitle = stringValue(conf, "titre") || "Film";
      const posterUrl = stringValue(conf, "affiche") || elements[0]?.media?.url || "";

      // Convert YouTube / Vimeo watch URLs to embed URLs
      const embedUrl = videoUrl
        ? videoUrl
            .replace("youtube.com/watch?v=", "youtube.com/embed/")
            .replace("youtu.be/", "youtube.com/embed/")
            .replace("vimeo.com/", "player.vimeo.com/video/")
        : "";

      return (
        <section
          className="w-full border-t py-16"
          style={{
            borderColor: "var(--portfolio-border)",
            backgroundColor: "var(--portfolio-surface)",
          }}
        >
          <div className="container mx-auto max-w-5xl px-4 sm:px-6">
            <div className="mb-6 space-y-1">
              <span
                className="font-mono text-[9px] font-semibold tracking-[0.2em] uppercase"
                style={{ color: "var(--portfolio-accent)" }}
              >
                Film
              </span>
              <h2 className="font-sans text-xl font-bold tracking-tight sm:text-2xl">
                {videoTitle}
              </h2>
            </div>

            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-black shadow-2xl">
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  title={videoTitle}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full border-0"
                />
              ) : posterUrl ? (
                <SafeImage
                  src={posterUrl}
                  alt={videoTitle}
                  fill
                  unoptimized
                  className="object-cover opacity-60"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-white/30">
                  Vidéo non configurée
                </div>
              )}
            </div>
          </div>
        </section>
      );
    }

    case "CONTACT": {
      return (
        <section
          id="contact"
          className="container mx-auto max-w-5xl border-t px-4 py-16 sm:px-6 sm:py-24"
          style={{ borderColor: "var(--portfolio-border)" }}
        >
          <div className="grid gap-12 md:grid-cols-2">
            {/* Left: Discourse & Session pills */}
            <div className="space-y-6">
              <span
                className="font-mono text-[9px] font-semibold tracking-[0.2em] uppercase"
                style={{ color: "var(--portfolio-accent)" }}
              >
                Contact
              </span>
              <h2 className="font-sans text-3xl font-bold tracking-tight">
                Let&apos;s talk about your day.
              </h2>
              <p
                className="max-w-md font-sans text-sm leading-relaxed"
                style={{ color: "var(--portfolio-muted)" }}
              >
                {stringValue(conf, "texteIntro") ||
                  "Une séance en lumière naturelle, un reportage de mariage ou une collaboration créative. Parlons-en ensemble."}
              </p>
              {portfolio.specialites && portfolio.specialites.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {portfolio.specialites.map((spec) => (
                    <span
                      key={spec}
                      className="rounded-full border px-3 py-1 font-sans text-xs lowercase"
                      style={{
                        borderColor: "var(--portfolio-border)",
                        backgroundColor: "var(--portfolio-surface)",
                        color: "var(--portfolio-muted)",
                      }}
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Studio card + Form */}
            <div
              className="space-y-6 rounded-[8px] border p-6 sm:p-8"
              style={{
                borderColor: "var(--portfolio-border)",
                backgroundColor: "var(--portfolio-surface)",
              }}
            >
              <div className="flex items-center gap-2.5 text-xs">
                <Mail className="size-4" style={{ color: "var(--portfolio-accent)" }} />
                <span className="font-mono font-medium">contact@studioflow.tn</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--portfolio-muted)" }}>
                Réponse garantie sous 48h. Réservation confirmée par contrat et acompte de 30%.
              </p>
              <PortfolioContactForm portfolioId={portfolio.id} />
            </div>
          </div>
        </section>
      );
    }

    default:
      return null;
  }
}
