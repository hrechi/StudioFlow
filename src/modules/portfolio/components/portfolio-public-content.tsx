import type { PortfolioPublic } from "../portfolio.service";
import type { BlocPortfolioPublic, ElementPortfolioPublic } from "../portfolio.types";
import type { CSSProperties } from "react";
import { SafeImage } from "@/components/shared/safe-image";
import { BeforeAfterSlider } from "./before-after-slider";
import { PortfolioContactForm } from "./portfolio-contact-form";
import { PortfolioGallery } from "./portfolio-gallery";
import { PortfolioShareButton } from "./portfolio-share-button";
import { PortfolioViewTracker } from "./portfolio-view-tracker";
import { portfolioIntegrations } from "../integrations";

const stringValue = (configuration: Record<string, unknown>, key: string): string =>
  typeof configuration[key] === "string" ? (configuration[key] as string) : "";
const numberValue = (configuration: Record<string, unknown>, key: string): number =>
  typeof configuration[key] === "number" ? (configuration[key] as number) : 0;

export async function PortfolioPublicContent({ portfolio }: { portfolio: PortfolioPublic }) {
  const blocks = portfolio.blocsPublies
    .filter((block) => block.visible)
    .sort((a, b) => a.ordre - b.ordre);
  const themeClass =
    portfolio.theme === "SOMBRE"
      ? "dark"
      : portfolio.theme === "EDITORIAL"
        ? "font-serif"
        : portfolio.theme === "COLORE"
          ? "bg-[#EEF0FF] text-[#0B1633]"
          : "";
  return (
    <main
      className={`${themeClass} min-h-screen ${portfolio.theme === "COLORE" ? "" : "bg-background text-foreground"}`}
      style={{ "--portfolio-accent": portfolio.couleurAccent } as CSSProperties}
    >
      <PortfolioViewTracker slug={portfolio.slug} />
      <div className="relative h-[45vh] min-h-72 overflow-hidden bg-muted sm:h-[62vh]">
        <SafeImage
          src={portfolio.photoCouverture}
          alt={portfolio.titre}
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-background/10" />
      </div>
      <header className="container-wide flex items-center justify-between gap-5 pt-28 pb-10 sm:pt-36">
        <div>
          <p className="eyebrow">
            {portfolio.photographe.prenom} {portfolio.photographe.nom}
          </p>
          <h1 className="display-lg mt-3">{portfolio.titre}</h1>
        </div>
        <PortfolioShareButton title={portfolio.titre} />
      </header>
      {blocks.map((block) => (
        <PortfolioBlock key={block.idBloc} block={block} portfolio={portfolio} />
      ))}
      <footer className="container-wide border-t border-border py-12 text-sm text-muted-foreground">
        <p>
          {portfolio.photographe.prenom} {portfolio.photographe.nom}
          {portfolio.ville ? ` · ${portfolio.ville}` : ""}
        </p>
        <p className="mt-2">{portfolio.specialites.join(" · ")}</p>
        {portfolio.liensSociaux.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-4">
            {portfolio.liensSociaux.map((link) => (
              <li key={link.reseau}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  {link.reseau.replaceAll("_", " ")}
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-5">
          © {new Date().getFullYear()} {portfolio.titre}
        </p>
      </footer>
    </main>
  );
}

async function PortfolioBlock({
  block,
  portfolio,
}: {
  block: BlocPortfolioPublic;
  portfolio: PortfolioPublic;
}) {
  const configuration = block.configuration;
  const elements = [...block.elements].sort((a, b) => a.ordreAffichage - b.ordreAffichage);
  const gallery =
    elements.length > 0 ? (
      <PortfolioGallery
        elements={elements}
        titre={stringValue(configuration, "titre") || portfolio.titre}
        portfolioId={portfolio.id}
        slug={portfolio.slug}
        miseEnPage={block.miseEnPage}
        colonnes={numberValue(configuration, "colonnes") || 3}
        espacement={
          typeof configuration.espacement === "number"
            ? numberValue(configuration, "espacement")
            : 16
        }
      />
    ) : null;

  switch (block.type) {
    case "HERO":
      return (
        <section className="container-wide py-12 sm:py-20">
          <p className="eyebrow" style={{ color: "var(--portfolio-accent)" }}>
            {portfolio.slogan}
          </p>
          <h2 className="display-xl mt-4 max-w-5xl">{stringValue(configuration, "titre")}</h2>
          <p className="mt-5 max-w-2xl text-lg text-foreground/65">
            {stringValue(configuration, "sousTitre")}
          </p>
          {stringValue(configuration, "lienBouton") && (
            <a
              href={stringValue(configuration, "lienBouton")}
              className="mt-8 inline-flex rounded-full px-6 py-3 font-semibold text-white"
              style={{ backgroundColor: "var(--portfolio-accent)" }}
            >
              {stringValue(configuration, "texteBouton")}
            </a>
          )}
        </section>
      );
    case "A_PROPOS":
      return (
        <section className="container-wide border-t border-border py-14 sm:py-20">
          <p className="eyebrow">About</p>
          <div className="mt-5 grid gap-8 md:grid-cols-[1fr_2fr]">
            <h2 className="display-md">The person behind the camera</h2>
            <div>
              <p className="max-w-3xl leading-relaxed whitespace-pre-wrap text-foreground/75">
                {stringValue(configuration, "texte")}
              </p>
              <p className="mt-5 text-sm text-muted-foreground">
                {numberValue(configuration, "anneesExperience")} years of experience
              </p>
            </div>
          </div>
        </section>
      );
    case "GALERIE":
    case "COLLECTION":
      return (
        <section className="container-wide border-t border-border py-14 sm:py-20">
          {(stringValue(configuration, "titre") || stringValue(configuration, "categorie")) && (
            <h2 className="display-md mb-8">
              {stringValue(configuration, "titre") || stringValue(configuration, "categorie")}
            </h2>
          )}
          {gallery}
        </section>
      );
    case "CASE_STUDY":
      return (
        <section className="container-wide border-t border-border py-14 sm:py-20">
          <p className="eyebrow">Selected story</p>
          <h2 className="display-md mt-4">{stringValue(configuration, "titre")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {[stringValue(configuration, "date"), stringValue(configuration, "lieu")]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="mt-5 max-w-3xl whitespace-pre-wrap text-foreground/70">
            {stringValue(configuration, "texte")}
          </p>
          {elements.length > 0 && <div className="mt-8">{gallery}</div>}
        </section>
      );
    case "AVANT_APRES": {
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
      return (
        <section className="container-wide border-t border-border py-14 sm:py-20">
          <p className="eyebrow">Before and after</p>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {[...pairs.values()]
              .filter(
                (pair): pair is { avant: ElementPortfolioPublic; apres: ElementPortfolioPublic } =>
                  !!pair.avant && !!pair.apres,
              )
              .map((pair, index) => (
                <BeforeAfterSlider
                  key={pair.avant.idElement || index}
                  avant={pair.avant}
                  apres={pair.apres}
                />
              ))}
          </div>
        </section>
      );
    }
    case "TEMOIGNAGES": {
      const reviews = await portfolioIntegrations.avisService.listerAvisPublies(
        portfolio.proprietaire,
      );
      const ids = Array.isArray(configuration.avisIds) ? configuration.avisIds : [];
      const selected = ids.length ? reviews.filter((review) => ids.includes(review.id)) : reviews;
      return (
        <section className="container-wide border-t border-border py-14 sm:py-20">
          <p className="eyebrow">Kind words</p>
          <ul className="mt-7 grid gap-4 md:grid-cols-2">
            {selected.map((review) => (
              <li key={review.id} className="rounded-2xl border border-border bg-card p-6">
                <p className="text-amber-500" aria-label={`${review.note} out of 5 stars`}>
                  {"★".repeat(Math.max(0, Math.min(5, review.note)))}
                </p>
                <blockquote className="mt-4 leading-relaxed">“{review.texte}”</blockquote>
                <p className="mt-5 text-sm text-muted-foreground">{review.auteur}</p>
              </li>
            ))}
          </ul>
        </section>
      );
    }
    case "SERVICES": {
      const packages = Array.isArray(configuration.forfaits)
        ? (configuration.forfaits as Record<string, unknown>[])
        : [];
      return (
        <section className="container-wide border-t border-border py-14 sm:py-20">
          <p className="eyebrow">Services</p>
          <ul className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {packages.map((item, index) => (
              <li
                key={`${String(item.nom)}-${index}`}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <h3 className="text-xl font-semibold">{String(item.nom ?? "")}</h3>
                <p className="mt-3 text-sm text-foreground/70">{String(item.description ?? "")}</p>
                <p className="mt-6 font-semibold" style={{ color: "var(--portfolio-accent)" }}>
                  From {String(item.prixAPartirDe ?? 0)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{String(item.duree ?? "")}</p>
              </li>
            ))}
          </ul>
        </section>
      );
    }
    case "STATISTIQUES": {
      const show = Array.isArray(configuration.afficher) ? configuration.afficher : [];
      const [sessions, rating] = await Promise.all([
        show.includes("SEANCES")
          ? portfolioIntegrations.seancesService.compterSeancesTerminees(portfolio.proprietaire)
          : 0,
        show.includes("NOTE_MOYENNE")
          ? portfolioIntegrations.avisService.calculerNoteMoyenne(portfolio.proprietaire)
          : 0,
      ]);
      return (
        <section className="container-wide border-t border-border py-12">
          <ul className="grid gap-5 sm:grid-cols-2">
            {show.includes("SEANCES") && (
              <li className="rounded-xl bg-card p-5">
                <p className="text-3xl font-semibold">{sessions}</p>
                <p className="text-sm text-muted-foreground">Completed sessions</p>
              </li>
            )}
            {show.includes("NOTE_MOYENNE") && (
              <li className="rounded-xl bg-card p-5">
                <p className="text-3xl font-semibold">{rating.toFixed(1)} / 5</p>
                <p className="text-sm text-muted-foreground">Average review</p>
              </li>
            )}
          </ul>
        </section>
      );
    }
    case "VIDEO":
      return (
        <section className="container-wide border-t border-border py-14 sm:py-20">
          <p className="eyebrow">Film</p>
          <h2 className="display-md mt-4">{stringValue(configuration, "titre")}</h2>
          <a
            href={stringValue(configuration, "urlVideo")}
            rel="noreferrer"
            target="_blank"
            className="mt-5 inline-flex underline underline-offset-4"
          >
            Watch video
          </a>
        </section>
      );
    case "CONTACT":
      return (
        <section className="container-wide border-t border-border py-14 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">Get in touch</p>
            <h2 className="display-md mt-4">Let&apos;s plan your session</h2>
            <p className="mt-4 mb-8 text-foreground/70">
              {stringValue(configuration, "texteIntro")}
            </p>
            <PortfolioContactForm portfolioId={portfolio.id} />
          </div>
        </section>
      );
  }
}
