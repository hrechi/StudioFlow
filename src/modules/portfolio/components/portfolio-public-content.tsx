import type { PortfolioPublic } from "../portfolio.service";
import type { BlocPortfolioPublic, ElementPortfolioPublic } from "../portfolio.types";
import { SafeImage } from "@/components/shared/safe-image";
import { ArrowUpRight, Mail, MapPin, Quote, Star } from "lucide-react";
import { BeforeAfterSlider } from "./before-after-slider";
import { PortfolioContactForm } from "./portfolio-contact-form";
import { PortfolioGalleryRenderer } from "./gallery/PortfolioGalleryRenderer";
import { PortfolioThemeToggle } from "./public/PortfolioTopBar";
import { PortfolioSectionNavigation } from "./public/PortfolioSectionNavigation";
import { PortfolioRatingWidget } from "./public/PortfolioRatingWidget";
import { PortfolioStatistics } from "./public/PortfolioStatistics";
import { PortfolioThemeWrapper } from "./public/PortfolioThemeWrapper";
import { Reveal } from "@/components/shared/reveal";
import { PortfolioFilmStrip3D } from "./3d/PortfolioFilmStrip3D";
import { PortfolioServiceCard3D } from "./3d/PortfolioServiceCard3D";
import { PortfolioReviewStack3D } from "./3d/PortfolioReviewStack3D";
import { portfolioIntegrations } from "../integrations";
import {
  CATEGORIES_PORTFOLIO,
  categoriePortfolioLabelsEn,
  RESEAUX_SOCIAUX,
  servicePhotographiqueLabelsEn,
  stylePhotographiqueLabelsEn,
  type CategoriePortfolio,
} from "../portfolio.types";

const publicEnglishText = (value: string): string => {
  const translations: Record<string, string> = {
    "Consult photography on demand": "Book a photography session",
    "Depuis plus de dix ans, je photographie avec naturel les instants délicats et spontanés. Installée dans le Sud-Ouest, je voyage partout où les histoires méritent d’être racontées.":
      "For more than ten years, I have photographed delicate and spontaneous moments with a natural approach. Based in the Southwest, I travel wherever stories deserve to be told.",
    "Étalonnage et retouche": "Editing and Retouching",
    "Une tonalité argentique subtile et des ombres travaillées, tout en préservant les teints naturels.":
      "A subtle film-inspired tone and carefully shaped shadows, while preserving natural skin tones.",
    "Les mots des couples et des familles": "What Couples and Families Say",
    "Mariage en Dordogne": "Wedding in Dordogne",
    "Séance nouveau-né": "Newborn session",
    "Portrait éditorial": "Editorial portrait",
    "Aurélie a su capturer l’essence même de notre journée sans jamais se faire remarquer. Les photos sont intemporelles et d'une poésie folle.":
      "Aurélie captured the very essence of our day without ever intruding. The photographs are timeless and wonderfully poetic.",
    "Une douceur exceptionnelle lors de la séance à la maison. Les clichés sont lumineux et d'un naturel qui nous émeut à chaque fois.":
      "Exceptional gentleness throughout the in-home session. The images are luminous and so natural that they move us every time.",
    "Un œil précis, une direction bienveillante et un rendu qui dépasse toutes mes attentes professionnelles.":
      "A precise eye, thoughtful direction, and results that exceed all my professional expectations.",
    "Collections et tarifs": "Collections and Pricing",
    "Mariage Héritage": "Heritage Wedding",
    "Présence des préparatifs jusqu'à la pièce montée, galerie privée en ligne, coffret tirages d'art.":
      "Coverage from preparations through the wedding cake, private online gallery, and fine-art print box.",
    "Mariage Essentiel": "Essential Wedding",
    "Cérémonies, cocktail & séance couple. Galerie privée haute résolution.":
      "Ceremony, cocktail reception, and couple session. Private high-resolution gallery.",
    "Séance Couple / Portrait": "Couple / Portrait Session",
    "Lieu au choix dans Bordeaux et ses alentours, 35 photographies retouchées.":
      "Location of your choice in Bordeaux and the surrounding area, 35 edited photographs.",
    "Séances réalisées": "Sessions completed",
    "Clients accompagnés": "Clients served",
    "Note moyenne vérifiée": "Verified average rating",
    "Parlons de votre projet": "Let’s discuss your project",
    "Racontez-moi votre date, votre lieu ou votre projet. J’accompagne un nombre limité de séances chaque saison pour consacrer à chacune toute mon attention.":
      "Tell me about your date, location, or project. I accept a limited number of sessions each season so every story receives my full attention.",
    "Mariage": "Wedding",
    "Séance couple": "Couple Session",
    "Portrait": "Portrait",
    "Événement privé": "Private Event",
  };
  if (translations[value]) return translations[value];
  return value
    .replace(/Depuis plus de dix ans, je photographie avec naturel/g, "For more than ten years, I have photographed naturally")
    .replace(/Installée dans le Sud-Ouest/g, "Based in the Southwest")
    .replace(/voyage partout où les histoires méritent d’être racontées/g, "I travel wherever stories deserve to be told");
};

const stringValue = (configuration: Record<string, unknown>, key: string): string =>
  typeof configuration[key] === "string" ? publicEnglishText(configuration[key] as string) : "";
const numberValue = (configuration: Record<string, unknown>, key: string): number =>
  typeof configuration[key] === "number" ? (configuration[key] as number) : 0;
const publicPhotoTitle = (element: ElementPortfolioPublic): string => {
  const title = element.titre?.trim() || "";
  if (
    /\.(?:jpe?g|png|webp|heic|tiff?)$/i.test(title) ||
    /^(?:img|dsc|dscf|pxl|vid|photo)[-_ ]?\d{3,}/i.test(title) ||
    /^photo$/i.test(title)
  ) return "";
  return title;
};
const isPortfolioSocialLink = (
  value: unknown,
): value is PortfolioPublic["liensSociaux"][number] => {
  if (!value || typeof value !== "object") return false;
  const link = value as Record<string, unknown>;
  return (
    typeof link.url === "string" &&
    typeof link.reseau === "string" &&
    RESEAUX_SOCIAUX.includes(link.reseau as (typeof RESEAUX_SOCIAUX)[number])
  );
};

function sectionId(
  block: BlocPortfolioPublic,
  index: number,
  blocks: BlocPortfolioPublic[],
): string | undefined {
  const firstIndex = (types: readonly string[]) =>
    blocks.findIndex((candidate) => types.includes(candidate.type));

  if (block.type === "A_PROPOS" && firstIndex(["A_PROPOS"]) === index) return "a-propos";
  if (["GALERIE", "COLLECTION"].includes(block.type)) {
    return firstIndex(["GALERIE", "COLLECTION"]) === index
      ? "portfolio"
      : `portfolio-${block.idBloc}`;
  }
  if (block.type === "SERVICES" && firstIndex(["SERVICES"]) === index) return "prestations";
  if (block.type === "TEMOIGNAGES" && firstIndex(["TEMOIGNAGES"]) === index) return "avis";
  if (block.type === "PROCESSUS" && firstIndex(["PROCESSUS"]) === index) return "processus";
  if (block.type === "FAQ" && firstIndex(["FAQ"]) === index) return "faq";
  if (block.type === "CONTACT" && firstIndex(["CONTACT"]) === index) return "contact";
  return undefined;
}

function ProfileTag({ children }: { children: string }) {
  return (
    <span
      className="rounded-full border px-2.5 py-1 text-[10px]"
      style={{ borderColor: "var(--portfolio-border)" }}
    >
      {children}
    </span>
  );
}

function SectionHeading({
  number,
  label,
  title,
}: {
  number: string;
  label: string;
  title: string;
}) {
  const words = title.trim().split(/\s+/);
  const accentWord = words.pop() || title;
  return (
    <div className="mb-8 space-y-3">
      <p
        className="font-mono text-[9px] tracking-[0.18em] uppercase"
        style={{ color: "var(--portfolio-muted)" }}
      >
        {number} — {label}
      </p>
      <h2 className="font-sans text-3xl leading-tight font-medium tracking-tight sm:text-4xl">
        {words.length > 0 ? `${words.join(" ")} ` : null}
        <em className="font-serif font-normal" style={{ color: "var(--portfolio-accent)" }}>
          {accentWord}
        </em>
      </h2>
    </div>
  );
}

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

export async function PortfolioPublicContent({
  portfolio,
  isPreview = false,
}: {
  portfolio: PortfolioPublic;
  isPreview?: boolean;
}) {
  const blocks = portfolio.blocsPublies
    .filter((block) => block.visible && block.type !== "VIDEO")
    .sort((a, b) => a.ordre - b.ordre);

  const photographerName = portfolio.photographe.prenom
    ? `${portfolio.photographe.prenom} ${portfolio.photographe.nom}`.trim()
    : portfolio.titre;
  const hasGallery = blocks.some((block) => ["GALERIE", "COLLECTION"].includes(block.type));
  const hasContact = blocks.some((block) => block.type === "CONTACT");
  const [completedSessions, reviewSummary] = await Promise.all([
    portfolioIntegrations.seancesService.compterSeancesTerminees(portfolio.proprietaire),
    portfolioIntegrations.avisService.obtenirAvisPublics(portfolio.proprietaire),
  ]);
  const numberedTypes = new Set([
    "A_PROPOS",
    "GALERIE",
    "COLLECTION",
    "SERVICES",
    "PROCESSUS",
    "FAQ",
    "TEMOIGNAGES",
    "CONTACT",
  ]);
  const numberedBlocks = blocks.filter(
    (block) => numberedTypes.has(block.type),
  );
  const sectionNumbers = new Map(
    numberedBlocks.map((block, index) => [block.idBloc, String(index + 1).padStart(2, "0")]),
  );
  const renderedSections = await Promise.all(
    blocks.map(async (block, index) => {
      const isPortfolioGallery = ["GALERIE", "COLLECTION"].includes(block.type);
      return {
        id: block.idBloc,
        type: block.type,
        isPortfolioGallery,
        content: await PublicBlockSection({
          block,
          portfolio,
          photographerName,
          sectionId: sectionId(block, index, blocks),
          completedSessions,
          reviewSummary,
          sectionNumber: sectionNumbers.get(block.idBloc) ?? "01",
          isPreview,
        }),
      };
    }),
  );
  const heroSection = renderedSections.find((section) =>
    blocks.some((block) => block.idBloc === section.id && block.type === "HERO"),
  );
  const profileSections = renderedSections.filter(
    (section) => section !== heroSection && section.content !== null,
  );
  const aboutBlock = blocks.find((block) => block.type === "A_PROPOS");
  const profilePhoto =
    portfolio.photographe.photoProfil ||
    (typeof aboutBlock?.configuration.photoPortrait === "string" &&
      aboutBlock.configuration.photoPortrait) ||
    aboutBlock?.elements[0]?.media.url ||
    portfolio.photoCouverture;
  const location = [portfolio.ville, portfolio.region, portfolio.pays].filter(Boolean).join(", ");
  const photoCount = blocks.reduce((sum, block) => sum + block.elements.length, 0);
  const featuredPhotos = blocks
    .filter((block) => ["GALERIE", "COLLECTION"].includes(block.type))
    .flatMap((block) => block.elements)
    .filter((element) => element.estMisEnAvant)
    .slice(0, 8);
  const navigationLabels: Partial<Record<string, string>> = {
    profil: "Profile",
    "a-propos": "About",
    portfolio: "Galleries",
    prestations: "Services",
    avis: "Reviews",
    processus: "Process",
    faq: "FAQ",
    contact: "Contact",
  };
  const navigation = [
    { href: "#studio-profile", label: "Profile" },
    ...blocks.flatMap((block, index) => {
      const id = sectionId(block, index, blocks);
      if (!id) return [];
      const label =
        ["GALERIE", "COLLECTION"].includes(block.type)
          ? stringValue(block.configuration, "titre") || "Gallery"
          : navigationLabels[id];
      return label ? [{ href: `#${id}`, label }] : [];
    }),
    ...(!hasContact ? [{ href: "#contact", label: "Contact" }] : []),
  ];
  const heroSocialLinks = blocks.find((block) => block.type === "HERO")?.configuration.liensSociaux;
  const configuredSocialLinks = Array.isArray(heroSocialLinks)
    ? heroSocialLinks.filter(isPortfolioSocialLink)
    : portfolio.liensSociaux;
  const publicLinks = [
    ...configuredSocialLinks.filter((link) => link.reseau !== "SITE_WEB"),
    { reseau: "SITE_WEB" as const, url: `/portfolio/${portfolio.slug}` },
  ];

  const isEditorial = portfolio.theme === "EDITORIAL";
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: photographerName,
    jobTitle: "Photographer",
    description: portfolio.bio || portfolio.slogan,
    image: portfolio.photographe.photoProfil || portfolio.photoCouverture,
    address: {
      "@type": "PostalAddress",
      addressLocality: portfolio.ville,
      addressRegion: portfolio.region,
      addressCountry: portfolio.pays,
    },
    knowsAbout: portfolio.specialites.map((category) => categoriePortfolioLabelsEn[category]),
    url: `/portfolio/${portfolio.slug}`,
  };

  return (
    <PortfolioThemeWrapper
      initialTheme={portfolio.theme || "MINIMAL"}
      accentColor={portfolio.couleurAccent || "#e0563b"}
      isEditorial={isEditorial}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <main className="flex flex-col">
        {heroSection?.content}
        <PortfolioSectionNavigation items={navigation} hasHero={Boolean(heroSection)} />

        <Reveal
          rootMargin="0px 0px -12% 0px"
          className={`relative z-10 container mx-auto w-[calc(100%-2rem)] max-w-6xl sm:w-[calc(100%-3rem)] ${
            heroSection ? "-mt-24 sm:-mt-32" : "mt-6"
          }`}
        >
          <section
            id="studio-profile"
            className="overflow-hidden rounded-[20px] border backdrop-blur-2xl"
            style={{
              borderColor: "var(--portfolio-border)",
              backgroundColor: "color-mix(in srgb, var(--portfolio-surface) 86%, transparent)",
            }}
          >
            <div className="grid gap-6 p-5 min-[940px]:grid-cols-[minmax(0,1fr)_auto] min-[940px]:gap-8 sm:p-7 md:p-8">
              <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
                <div
                  className="relative size-20 shrink-0 overflow-hidden rounded-full border-[3px] sm:size-24"
                  style={{
                    borderColor: "var(--portfolio-accent)",
                    boxShadow:
                      "0 0 0 5px color-mix(in srgb, var(--portfolio-accent) 15%, transparent)",
                    backgroundColor: "var(--portfolio-bg)",
                  }}
                >
                  <SafeImage
                    src={profilePhoto}
                    alt={`Portrait of ${photographerName}`}
                    fill
                    unoptimized
                    sizes="112px"
                    className="object-cover transition-transform duration-700 hover:scale-[1.03]"
                  />
                </div>
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h2 className="font-serif text-2xl font-medium tracking-tight sm:text-3xl">
                      {photographerName}
                    </h2>
                    {portfolio.disponible && (
                      <span
                        className="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[9px] tracking-wide uppercase"
                        style={{
                          borderColor:
                            "color-mix(in srgb, var(--portfolio-accent) 38%, transparent)",
                          color: "var(--portfolio-accent)",
                        }}
                      >
                        <span
                          className="relative size-1.5 rounded-full"
                          style={{ backgroundColor: "var(--portfolio-accent)" }}
                        >
                          <span
                            className="portfolio-status-pulse absolute inset-0 rounded-full"
                            style={{ backgroundColor: "var(--portfolio-accent)" }}
                          />
                        </span>
                        Accepting Bookings
                      </span>
                    )}
                  </div>
                  <p
                    className="font-mono text-[9px] tracking-[0.16em] uppercase"
                    style={{ color: "var(--portfolio-muted)" }}
                  >
                    {portfolio.slogan || photographerName}
                  </p>
                  <div
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs"
                    style={{ color: "var(--portfolio-muted)" }}
                  >
                    {location && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="size-3.5" />
                        {location}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {portfolio.specialites.map((category) => (
                      <ProfileTag key={category}>{categoriePortfolioLabelsEn[category]}</ProfileTag>
                    ))}
                  </div>
                </div>
              </div>
              <aside className="flex flex-col justify-center gap-3 border-t pt-5 md:min-w-48 md:border-t-0 md:border-l md:pt-0 md:pl-7">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className="font-mono text-[8px] tracking-[0.16em] uppercase"
                    style={{ color: "var(--portfolio-muted)" }}
                  >
                    Photographer Profile
                  </span>
                  <PortfolioThemeToggle />
                </div>
                <div className="flex flex-wrap gap-2">
                  {portfolio.disponible && <ProfileTag>Available</ProfileTag>}
                  {stringValue(aboutBlock?.configuration ?? {}, "delaiReponse") && (
                    <ProfileTag>{`Response within ${stringValue(aboutBlock?.configuration ?? {}, "delaiReponse")}`}</ProfileTag>
                  )}
                  {stringValue(aboutBlock?.configuration ?? {}, "langues") && (
                    <ProfileTag>{stringValue(aboutBlock?.configuration ?? {}, "langues")}</ProfileTag>
                  )}
                  {stringValue(aboutBlock?.configuration ?? {}, "zoneDeplacement") && (
                    <ProfileTag>{`Travel: ${stringValue(aboutBlock?.configuration ?? {}, "zoneDeplacement")}`}</ProfileTag>
                  )}
                </div>
                {(hasGallery || hasContact) && (
                  <div className="flex flex-wrap gap-2">
                    {hasGallery && (
                      <a
                        href="#portfolio"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-full border px-4 text-xs font-semibold transition hover:opacity-80"
                        style={{
                          borderColor: "var(--portfolio-border)",
                          color: "var(--portfolio-text)",
                        }}
                      >
                        Explore Portfolio
                      </a>
                    )}
                    {hasContact && (
                      <a
                        href="#contact"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold transition hover:brightness-110"
                        style={{
                          backgroundColor: "var(--portfolio-accent)",
                          color: "var(--portfolio-bg)",
                        }}
                      >
                        Get in Touch <ArrowUpRight className="size-3.5" />
                      </a>
                    )}
                  </div>
                )}
                <nav
                  aria-label="Studio social links"
                  className="flex flex-wrap gap-x-4 gap-y-2"
                >
                  {publicLinks
                    .filter((link) => link.reseau !== "SITE_WEB")
                    .map((link) => (
                      <a
                        key={`${link.reseau}:${link.url}`}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-[9px] tracking-wide uppercase transition hover:opacity-70"
                        style={{ color: "var(--portfolio-accent)" }}
                      >
                        {link.reseau.replaceAll("_", " ")}
                        <ArrowUpRight className="size-3" />
                      </a>
                    ))}
                </nav>
              </aside>
            </div>

            {[
              { label: "Photographs", value: photoCount },
              { label: "Completed Sessions", value: completedSessions },
              { label: "Verified Reviews", value: reviewSummary.total },
            ].filter((stat) => stat.value > 0).length > 0 && (
            <div
              className="grid border-t"
              style={{
                borderColor: "var(--portfolio-border)",
                gridTemplateColumns: `repeat(${[
                  photoCount,
                  completedSessions,
                  reviewSummary.total,
                ].filter((value) => value > 0).length}, minmax(0, 1fr))`,
              }}
            >
              {[
                { label: "Photographs", value: photoCount },
                { label: "Completed Sessions", value: completedSessions },
                { label: "Verified Reviews", value: reviewSummary.total },
              ].filter((stat) => stat.value > 0).map((stat, index) => (
                <div
                  key={stat.label}
                  className={`px-3 py-4 text-center ${index > 0 ? "border-l" : ""}`}
                  style={{ borderColor: "var(--portfolio-border)" }}
                >
                  <p className="font-serif text-xl font-medium">{stat.value.toLocaleString("en-US")}</p>
                  <p
                    className="mt-1 font-mono text-[8px] tracking-[0.12em] uppercase"
                    style={{ color: "var(--portfolio-muted)" }}
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
            )}

            <div
              className="flex flex-wrap gap-2 border-t px-5 py-4 sm:px-7 md:px-8"
              style={{ borderColor: "var(--portfolio-border)" }}
            >
              {portfolio.styles.map((style) => (
                <ProfileTag key={style}>{stylePhotographiqueLabelsEn[style]}</ProfileTag>
              ))}
              {portfolio.services.map((service) => (
                <ProfileTag key={service}>{servicePhotographiqueLabelsEn[service]}</ProfileTag>
              ))}
            </div>
          </section>
        </Reveal>

        {featuredPhotos.length > 0 && (
          <section
            id="meilleures-photos"
            className="container mx-auto max-w-6xl scroll-mt-20 px-4 py-12 sm:px-6 sm:py-16"
          >
            <SectionHeading number="01" label="CURATED" title="Featured Works" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
              {featuredPhotos.map((photo) => (
                <div
                  key={photo.idElement}
                  className="relative aspect-[4/5] overflow-hidden rounded-xl border"
                  style={{ borderColor: "var(--portfolio-border)" }}
                >
                  <SafeImage
                    src={photo.media.url}
                    alt={photo.texteAlt || photo.titre || "Featured photograph"}
                    fill
                    unoptimized
                    loading="lazy"
                    sizes="(min-width: 640px) 25vw, 50vw"
                    className="object-cover transition-transform duration-700 hover:scale-[1.03]"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section animée Planche Contact 35mm (directement sous le profil) */}
        {portfolio.plancheContact?.active !== false && (
          <PortfolioFilmStrip3D
            plancheContact={portfolio.plancheContact}
            photos={blocks
              .filter((block) => ["GALERIE", "COLLECTION"].includes(block.type))
              .flatMap((block) => block.elements)
              .filter(
                (element, index, list) =>
                  list.findIndex((candidate) => candidate.media.url === element.media.url) === index,
              )
              .slice(0, 16)
              .map((element) => ({
                id: element.idElement,
                url: element.media.url,
                title: element.titre,
                caption: element.legende,
              }))}
          />
        )}

        {/* Profile galleries are rendered without
            the Reveal wrapper (position:sticky breaks inside CSS transform).
            All other sections get fade-in via Reveal. */}
        {profileSections.map((section, index) =>
          section.isPortfolioGallery ? (
            // Keep the album outside the Reveal transform context.
            <div key={section.id}>{section.content}</div>
          ) : (
            <div key={section.id} className={index === 0 ? "mt-8" : ""}>
              <Reveal delay={Math.min(index * 70, 350)} rootMargin="0px 0px -12% 0px">
                {section.content}
              </Reveal>
            </div>
          ),
        )}

        {/* Visitor Star Rating Widget (max 5 stars) */}
        {!isPreview && (
          <Reveal
            rootMargin="0px 0px -12% 0px"
            className="container mx-auto max-w-5xl px-4 py-12 sm:px-6"
          >
            <PortfolioRatingWidget
              slug={portfolio.slug}
              noteMoyenne={portfolio.noteMoyenne}
              nombreAvis={portfolio.nombreAvis}
              accentColor={portfolio.couleurAccent}
            />
          </Reveal>
        )}
        {!hasContact && (
          <section
            id="contact"
            className="container mx-auto max-w-5xl scroll-mt-20 border-t px-4 py-16 sm:px-6 sm:py-24"
            style={{ borderColor: "var(--portfolio-border)" }}
          >
            <div className="grid gap-12 min-[940px]:grid-cols-2">
              <div>
                <SectionHeading number="—" label="CONTACT" title="Let's discuss your project" />
                <p className="max-w-md text-sm leading-7" style={{ color: "var(--portfolio-muted)" }}>
                  Describe your session or project and the photographer will get back to you as soon as possible.
                </p>
              </div>
              {isPreview ? (
                <p className="text-sm" style={{ color: "var(--portfolio-muted)" }}>
                  The contact form is disabled in draft preview.
                </p>
              ) : (
                <PortfolioContactForm
                  portfolioId={portfolio.id}
                  categories={portfolio.specialites}
                />
              )}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <Reveal rootMargin="0px 0px -12% 0px">
        <footer
          className="border-t py-8 text-center text-xs"
          style={{ borderColor: "var(--portfolio-border)", color: "var(--portfolio-muted)" }}
        >
          <div className="container mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
            <p className="font-mono text-[9px] tracking-[0.18em] uppercase">
              © {new Date().getFullYear()} {photographerName}
              {portfolio.ville ? ` · ${portfolio.ville}` : ""}
            </p>
            <p className="font-mono text-[9px] tracking-[0.18em] uppercase">
              Built with StudioFlow
            </p>
          </div>
          {publicLinks.length > 0 && (
            <nav aria-label="Studio social links" className="mt-4 flex justify-center gap-5">
              {publicLinks.map((link) => (
                <a
                  key={`${link.reseau}:${link.url}`}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-4 hover:opacity-70"
                >
                  {link.reseau.replaceAll("_", " ")}
                </a>
              ))}
            </nav>
          )}
        </footer>
      </Reveal>
    </PortfolioThemeWrapper>
  );
}

async function PublicBlockSection({
  block,
  portfolio,
  photographerName,
  sectionId: id,
  completedSessions,
  reviewSummary,
  sectionNumber,
  isPreview,
}: {
  block: BlocPortfolioPublic;
  portfolio: PortfolioPublic;
  photographerName: string;
  sectionId?: string;
  completedSessions: number;
  reviewSummary: Awaited<ReturnType<typeof portfolioIntegrations.avisService.obtenirAvisPublics>>;
  sectionNumber: string;
  isPreview: boolean;
}) {
  const conf = block.configuration;
  const elements = [...block.elements].sort((a, b) => a.ordreAffichage - b.ordreAffichage);
  const location = [portfolio.ville, portfolio.region, portfolio.pays].filter(Boolean).join(", ");

  switch (block.type) {
    case "HERO": {
      const backgroundVideo = stringValue(conf, "videoFond");
      const backgroundImage = stringValue(conf, "photoCouverture") || portfolio.photoCouverture;

      return (
        <section
          aria-label={`${portfolio.titre} Cover`}
          className="relative -mt-[54px] w-full scroll-mt-20"
        >
          <div
            data-portfolio-hero
            className="relative flex min-h-[100svh] w-full items-end overflow-hidden bg-[#120907]"
          >
            {backgroundVideo && (
              <video
                aria-hidden="true"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="absolute inset-0 size-full object-cover"
              >
                <source src={backgroundVideo} />
              </video>
            )}
            {!backgroundVideo && backgroundImage && (
              <SafeImage
                src={backgroundImage}
                alt=""
                fill
                unoptimized
                sizes="100vw"
                className="absolute inset-0 size-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,123,78,0.18),_transparent_38%)]" />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(16, 5, 4, 0.8) 0%, rgba(16, 5, 4, 0.35) 45%, rgba(16, 5, 4, 0.18) 100%), linear-gradient(180deg, rgba(16, 5, 4, 0.36) 0%, rgba(16, 5, 4, 0.68) 100%)",
              }}
            />

            <a
              href="#studio-profile"
              aria-label="Scroll to photographer profile"
              className="absolute right-6 bottom-7 z-10 flex items-center gap-3 text-[9px] tracking-[0.18em] text-white/80 uppercase sm:right-12"
            >
              Scroll
              <span className="hero-scroll-indicator block h-10 w-px origin-top bg-white/70" />
            </a>
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
      const bioText = publicEnglishText(stringValue(conf, "texte") || portfolio.bio || "");
      const experienceYears = numberValue(conf, "anneesExperience");
      const paragraphs = bioText
        .split(/\n\s*\n/)
        .map((text) => text.trim())
        .filter(Boolean);
      const facts = [
        (stringValue(conf, "lieuBase") || location) && {
          label: "Based in",
          value: stringValue(conf, "lieuBase") || location,
        },
        (stringValue(conf, "depuis") ||
          (experienceYears > 0 ? `${experienceYears} years of experience` : "")) && {
          label: "Experience",
          value:
            stringValue(conf, "depuis") ||
            (experienceYears > 0 ? `${experienceYears} years of experience` : ""),
        },
        stringValue(conf, "materiel") && {
          label: "Gear",
          value: stringValue(conf, "materiel"),
        },
        stringValue(conf, "langues") && {
          label: "Languages",
          value: stringValue(conf, "langues"),
        },
      ].filter((fact): fact is { label: string; value: string } => Boolean(fact));
      const portraitCaption =
        stringValue(conf, "legendePortrait") || `Portrait · ${photographerName}`;

      return (
        <section
          id={id}
          className="container mx-auto max-w-6xl scroll-mt-24 px-4 py-[clamp(4.5rem,9vw,8rem)] sm:px-6"
        >
          <div
            className={`grid grid-cols-1 gap-10 min-[940px]:items-center min-[940px]:gap-16 ${
              portraitUrl ? "min-[940px]:grid-cols-[0.9fr_1.1fr]" : ""
            }`}
          >
            {portraitUrl && (
              <figure className="group relative mx-auto w-full max-w-[420px] min-[940px]:mx-0">
                <div
                  aria-hidden="true"
                  className="absolute inset-2 translate-x-4 -translate-y-3 rotate-[3deg] rounded-[12px] border max-[480px]:translate-x-2"
                  style={{
                    borderColor: "color-mix(in srgb, var(--portfolio-border) 85%, transparent)",
                    backgroundColor:
                      "color-mix(in srgb, var(--portfolio-surface) 72%, transparent)",
                  }}
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-1 translate-x-2 -translate-y-1.5 rotate-[1.5deg] rounded-[12px] border"
                  style={{
                    borderColor: "color-mix(in srgb, var(--portfolio-border) 90%, transparent)",
                    backgroundColor: "var(--portfolio-surface)",
                  }}
                />
                <div
                  className="relative aspect-[4/5] overflow-hidden rounded-[10px] border"
                  style={{
                    borderColor: "var(--portfolio-border)",
                    backgroundColor: "var(--portfolio-surface)",
                  }}
                >
                  <SafeImage
                    src={portraitUrl}
                    alt={`Portrait of ${photographerName}`}
                    fill
                    unoptimized
                    sizes="(min-width: 940px) 42vw, (min-width: 640px) 70vw, 100vw"
                    className="object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.025]"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(180deg, transparent 65%, color-mix(in srgb, var(--portfolio-bg) 24%, transparent) 100%), linear-gradient(90deg, color-mix(in srgb, var(--portfolio-accent) 10%, transparent), transparent 35%)",
                    }}
                  />
                </div>
                <figcaption
                  className="mt-3 flex items-center justify-between gap-3 font-mono text-[8px] tracking-[0.16em] uppercase"
                  style={{ color: "var(--portfolio-muted)" }}
                >
                  <span>{portraitCaption}</span>
                  {portfolio.ville && <span className="shrink-0">{portfolio.ville}</span>}
                </figcaption>
              </figure>
            )}
            <div className="space-y-5 sm:space-y-6">
              <SectionHeading
                number={sectionNumber}
                label="THE PROFILE"
                title={stringValue(conf, "titre") || photographerName}
              />
              {paragraphs.map((paragraph, index) => (
                <p
                  key={`${index}:${paragraph.slice(0, 20)}`}
                  className="max-w-[62ch] text-sm leading-7 sm:text-[13px] sm:leading-[1.9]"
                  style={{ color: "var(--portfolio-muted)" }}
                >
                  {paragraph}
                </p>
              ))}
              {stringValue(conf, "citation") && (
                <blockquote
                  className="border-l py-1 pl-4 font-serif text-base leading-relaxed italic sm:pl-5 sm:text-lg"
                  style={{
                    borderColor: "var(--portfolio-accent)",
                    color: "var(--portfolio-text)",
                  }}
                >
                  <Quote
                    className="mb-2 size-4"
                    style={{ color: "var(--portfolio-accent)" }}
                    aria-hidden="true"
                  />
                  {stringValue(conf, "citation")}
                </blockquote>
              )}
              {facts.length > 0 && (
                <dl
                  className="grid grid-cols-1 overflow-hidden rounded-[10px] border sm:grid-cols-2"
                  style={{
                    borderColor: "var(--portfolio-border)",
                    backgroundColor:
                      "color-mix(in srgb, var(--portfolio-surface) 48%, transparent)",
                  }}
                >
                  {facts.map((fact) => (
                    <div
                      key={fact.label}
                      className="border-r border-b px-3.5 py-3 sm:px-4"
                      style={{ borderColor: "var(--portfolio-border)" }}
                    >
                      <dt
                        className="font-mono text-[8px] tracking-[0.18em] uppercase"
                        style={{ color: "var(--portfolio-muted)" }}
                      >
                        {fact.label}
                      </dt>
                      <dd className="mt-1 text-xs font-medium">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>
        </section>
      );
    }

    case "GALERIE":
    case "COLLECTION": {
      const title = stringValue(conf, "titre") || stringValue(conf, "categorie") || "Gallery";
      const category = CATEGORIES_PORTFOLIO.includes(
        conf.categorie as CategoriePortfolio,
      )
        ? (conf.categorie as CategoriePortfolio)
        : undefined;
      if (elements.length === 0) {
        return (
          <section
            id={id}
            className="container mx-auto max-w-5xl scroll-mt-24 border-t px-4 py-16 text-center text-sm sm:px-6"
            style={{ borderColor: "var(--portfolio-border)", color: "var(--portfolio-muted)" }}
          >
            Photo gallery currently being curated.
          </section>
        );
      }

      return (
        <section id={id} className="scroll-mt-16">
          {(stringValue(conf, "sousTitre") || stringValue(conf, "lieu") || stringValue(conf, "date")) && (
            <div className="container mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
              {stringValue(conf, "sousTitre") && (
                <p className="mb-3 max-w-2xl text-sm leading-7" style={{ color: "var(--portfolio-muted)" }}>
                  {stringValue(conf, "sousTitre")}
                </p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[9px] tracking-[0.12em] uppercase" style={{ color: "var(--portfolio-muted)" }}>
                {stringValue(conf, "lieu") && <span>{stringValue(conf, "lieu")}</span>}
                {stringValue(conf, "date") && <span>{stringValue(conf, "date")}</span>}
                <span>{elements.length} photo{elements.length > 1 ? "s" : ""}</span>
              </div>
            </div>
          )}
        <PortfolioGalleryRenderer
          title={title}
          photographerName={photographerName}
          portfolioId={portfolio.id}
          slug={portfolio.slug}
          enableLikes={!isPreview}
          coverColor={portfolio.couleurAccent}
          mode={stringValue(conf, "modeAffichage")}
          photos={elements.map((element, index) => ({
            id: element.idElement,
            src: element.media.url,
            title: publicPhotoTitle(element),
            caption: publicPhotoTitle(element),
            category: category ?? element.categorie,
            highlighted: element.estMisEnAvant,
            width: element.media.largeur,
            height: element.media.hauteur,
            alt:
              element.texteAlt?.trim() ||
              element.titre?.trim() ||
              `Photograph ${index + 1} from ${title}`,
            likes: element.nombreLikes,
          }))}
        />
        </section>
      );
    }

    case "PROCESSUS": {
      const steps = Array.isArray(conf.etapes)
        ? (conf.etapes as { titre?: string; description?: string }[]).slice(0, 4)
        : [];
      if (!steps.some((step) => step.titre || step.description)) return null;
      return (
        <section
          id={id}
          className="container mx-auto max-w-6xl scroll-mt-20 border-t px-4 py-16 sm:px-6 sm:py-20"
          style={{ borderColor: "var(--portfolio-border)" }}
        >
          <SectionHeading
            number={sectionNumber}
            label="WORKFLOW"
            title={stringValue(conf, "titre") || "A seamless, human-centered process"}
          />
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <li
                key={`${step.titre}-${index}`}
                className="rounded-2xl border p-5"
                style={{
                  backgroundColor: "var(--portfolio-surface)",
                  borderColor: "var(--portfolio-border)",
                }}
              >
                <span className="font-mono text-xs" style={{ color: "var(--portfolio-accent)" }}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 font-serif text-xl">{step.titre}</h3>
                {step.description && (
                  <p className="mt-2 text-sm leading-6" style={{ color: "var(--portfolio-muted)" }}>
                    {step.description}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      );
    }

    case "FAQ": {
      const questions = Array.isArray(conf.questions)
        ? (conf.questions as { question?: string; reponse?: string }[]).filter(
            (item) => item.question && item.reponse,
          )
        : [];
      if (questions.length === 0) return null;
      return (
        <section
          id={id}
          className="container mx-auto max-w-4xl scroll-mt-20 border-t px-4 py-16 sm:px-6 sm:py-20"
          style={{ borderColor: "var(--portfolio-border)" }}
        >
          <SectionHeading
            number={sectionNumber}
            label="FREQUENTLY ASKED QUESTIONS"
            title={stringValue(conf, "titre") || "Frequently Asked Questions"}
          />
          <div className="divide-y border-y" style={{ borderColor: "var(--portfolio-border)" }}>
            {questions.map((item, index) => (
              <details key={`${item.question}-${index}`} className="group py-4">
                <summary className="cursor-pointer list-none pr-6 font-medium marker:hidden">
                  <span>{item.question}</span>
                  <span aria-hidden="true" className="float-right text-xl" style={{ color: "var(--portfolio-accent)" }}>
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-3xl text-sm leading-7" style={{ color: "var(--portfolio-muted)" }}>
                  {item.reponse}
                </p>
              </details>
            ))}
          </div>
        </section>
      );
    }

    case "CASE_STUDY": {
      const image = elements[0]?.media?.url || stringValue(conf, "photo");
      const title = stringValue(conf, "titre");
      const story = stringValue(conf, "texte");
      const stamp = [stringValue(conf, "lieu"), stringValue(conf, "date")]
        .filter(Boolean)
        .join(" · ");

      if (!image && !title && !story && !stamp) return null;

      return (
        <section
          id={id}
          className="border-t px-4 py-16 sm:px-6 sm:py-20"
          style={{ borderColor: "var(--portfolio-border)" }}
        >
          <div className="container mx-auto grid max-w-5xl gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
            {image && (
              <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-xl">
                <SafeImage
                  src={image}
                  alt={title}
                  fill
                  unoptimized
                  sizes="(min-width: 768px) 45vw, 100vw"
                  className="object-cover transition-transform duration-1000 group-hover:scale-[1.03]"
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
              {title && (
                <h2 className="font-serif text-3xl leading-tight font-medium tracking-tight sm:text-4xl">
                  {title}
                </h2>
              )}
              {story && (
                <p
                  className="font-sans text-sm leading-[1.75]"
                  style={{ color: "var(--portfolio-muted)" }}
                >
                  {story}
                </p>
              )}
            </div>
          </div>
        </section>
      );
    }

    case "AVANT_APRES": {
      const title = stringValue(conf, "titre") || "Before / After";
      const description = stringValue(conf, "description");
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
          id={id}
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
              <h2 className="font-serif text-3xl leading-tight font-medium tracking-tight sm:text-4xl">
                {title}
              </h2>
              {description && (
                <p
                  className="mt-2 max-w-2xl text-sm leading-relaxed"
                  style={{ color: "var(--portfolio-muted)" }}
                >
                  {description}
                </p>
              )}
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
                Before / after comparison coming soon.
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

      const selectedReviewIds = Array.isArray(conf.avisIds)
        ? new Set(conf.avisIds.filter((id): id is string => typeof id === "string"))
        : null;
      const dbReviews =
        confTestimonials.length === 0
          ? selectedReviewIds && selectedReviewIds.size > 0
            ? reviewSummary.items.filter((review) => selectedReviewIds.has(review.id))
            : reviewSummary.items
          : [];

      const title = stringValue(conf, "titre") || "Client Reviews";
      const allReviews =
        confTestimonials.length > 0
          ? confTestimonials.map((review) => ({
              ...review,
              auteur: publicEnglishText(review.auteur),
              role: publicEnglishText(review.role),
              texte: publicEnglishText(review.texte),
            }))
          : dbReviews.map((r) => ({
              id: r.id,
              auteur: r.auteur,
              role: publicEnglishText([r.seanceType, r.seanceTitre].filter(Boolean).join(" · ") || "Verified Session"),
              note: r.note,
              texte: r.texte,
            }));

      if (allReviews.length === 0) return null;

      return (
        <section
          id={id}
          className="container mx-auto max-w-5xl border-t px-4 py-16 sm:px-6 sm:py-20"
          style={{ borderColor: "var(--portfolio-border)" }}
        >
          <div className="mb-4 text-center">
            <SectionHeading number={sectionNumber} label="VERIFIED REVIEWS" title={title} />
            {confTestimonials.length === 0 && reviewSummary.total > 0 && (
              <p
                className="mt-3 inline-flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-[9px] tracking-wide"
                style={{ borderColor: "var(--portfolio-border)", color: "var(--portfolio-muted)" }}
              >
                <span className="font-serif text-lg" style={{ color: "var(--portfolio-accent)" }}>
                  {reviewSummary.moyenne.toFixed(1)}
                </span>
                <span className="flex items-center" aria-label={`${reviewSummary.moyenne} out of 5`}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`size-3 ${star <= Math.round(reviewSummary.moyenne) ? "fill-current" : "opacity-30"}`}
                      style={{ color: "var(--portfolio-accent)" }}
                    />
                  ))}
                </span>
                {reviewSummary.total} reviews published after session
              </p>
            )}
          </div>
          <PortfolioReviewStack3D reviews={allReviews} />
        </section>
      );
    }

    case "SERVICES": {
      const rawPackages = Array.isArray(conf.forfaits)
        ? (conf.forfaits as Record<string, unknown>[])
        : [];
      if (rawPackages.length === 0) return null;

      const packages = rawPackages.map((item) => {
        const hasPrice =
          item.prixAPartirDe != null &&
          item.prixAPartirDe !== "" &&
          Number.isFinite(Number(item.prixAPartirDe));
        const formattedPrice = hasPrice
          ? new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "EUR",
              maximumFractionDigits: 0,
            }).format(Number(item.prixAPartirDe))
          : undefined;

        const points = Array.isArray(item.inclus)
          ? (item.inclus as string[])
          : Array.isArray(item.points)
            ? (item.points as string[])
            : [];

        return {
          nom: publicEnglishText(String(item.nom ?? "Package")),
          prix: formattedPrice,
          description: item.description ? publicEnglishText(String(item.description)) : undefined,
          delai: item.delai ? publicEnglishText(String(item.delai)) : undefined,
          points: points.map((point) => publicEnglishText(String(point))),
        };
      });

      const title = stringValue(conf, "titre") || "Services & Pricing";

      return (
        <section
          id={id}
          className="container mx-auto max-w-5xl border-t px-4 py-16 sm:px-6 sm:py-20"
          style={{ borderColor: "var(--portfolio-border)" }}
        >
          <SectionHeading number={sectionNumber} label="SERVICES" title={title} />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {packages.map((item, idx) => (
              <PortfolioServiceCard3D key={idx} item={item} index={idx} />
            ))}
          </div>
        </section>
      );
    }

    case "STATISTIQUES": {
      // Use manually configured stats first; fall back to dynamic DB values
      const stat1Val = stringValue(conf, "stat1_valeur");
      const stat1Lbl = stringValue(conf, "stat1_label") || "Completed Sessions";
      const stat2Val = stringValue(conf, "stat2_valeur");
      const stat2Lbl = stringValue(conf, "stat2_label") || "Recommendation Rate";
      const stat3Val = stringValue(conf, "stat3_valeur");
      const stat3Lbl = stringValue(conf, "stat3_label") || "Average Rating";

      const show = Array.isArray(conf.afficher) ? conf.afficher : [];
      const stats: { valeur: string; label: string }[] = [];
      if (stat1Val && stat1Val !== "0") stats.push({ valeur: stat1Val, label: stat1Lbl });
      else if (show.includes("SEANCES") && completedSessions > 0)
        stats.push({ valeur: String(completedSessions), label: stat1Lbl });
      if (stat2Val && stat2Val !== "0") stats.push({ valeur: stat2Val, label: stat2Lbl });
      if (stat3Val && stat3Val !== "0") stats.push({ valeur: stat3Val, label: stat3Lbl });
      else if (reviewSummary.total > 0) {
        stats.push({
          valeur: reviewSummary.moyenne.toFixed(1),
          label: stat3Lbl,
        });
      }

      if (stats.length === 0) return null;

      return (
        <section
          className="w-full border-t border-b py-12"
          style={{
            borderColor: "var(--portfolio-border)",
            backgroundColor: "var(--portfolio-surface)",
          }}
        >
          <PortfolioStatistics stats={stats} />
        </section>
      );
    }

    case "VIDEO": {
      return null;
    }

    case "CONTACT": {
      const proposedCategories = Array.isArray(conf.typesSeanceProposes)
        ? conf.typesSeanceProposes.filter(
            (category): category is string => typeof category === "string",
          )
        : [];
      const configuredCategories = CATEGORIES_PORTFOLIO.filter((category) =>
        proposedCategories.includes(category),
      );
      const contactCategories =
        configuredCategories.length > 0
          ? configuredCategories
          : portfolio.specialites.length > 0
            ? portfolio.specialites
            : [...CATEGORIES_PORTFOLIO];
      const contactIntro = stringValue(conf, "texteIntro");

      return (
        <section
          id={id}
          className="container mx-auto max-w-5xl scroll-mt-24 border-t px-4 py-16 sm:px-6 sm:py-24"
          style={{ borderColor: "var(--portfolio-border)" }}
        >
          <div className="grid gap-12 min-[940px]:grid-cols-2">
            {/* Left: Discourse & Session pills */}
            <div className="space-y-6">
              <SectionHeading
                number={sectionNumber}
                label="CONTACT"
                title={stringValue(conf, "titre") || "Let's discuss your project"}
              />
              {contactIntro && (
                <p
                  className="max-w-md font-sans text-sm leading-relaxed"
                  style={{ color: "var(--portfolio-muted)" }}
                >
                  {contactIntro}
                </p>
              )}
              {contactCategories.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {contactCategories.map((spec) => (
                    <span
                      key={spec}
                      className="rounded-full border px-3 py-1 font-sans text-xs lowercase"
                      style={{
                        borderColor: "var(--portfolio-border)",
                        backgroundColor: "var(--portfolio-surface)",
                        color: "var(--portfolio-muted)",
                      }}
                    >
                      {categoriePortfolioLabelsEn[spec]}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Studio card + Form */}
            <div
              className="space-y-6 rounded-[20px] border p-6 sm:p-8"
              style={{
                borderColor: "var(--portfolio-border)",
                backgroundColor: "var(--portfolio-surface)",
              }}
            >
              <div className="flex items-center gap-2.5 text-xs">
                <Mail className="size-4" style={{ color: "var(--portfolio-accent)" }} />
                <span className="font-mono font-medium">{portfolio.titre}</span>
              </div>
              {isPreview ? (
                <p className="text-sm text-white/60">
                  Contact form is disabled in draft preview.
                </p>
              ) : (
                <PortfolioContactForm portfolioId={portfolio.id} categories={contactCategories} />
              )}
            </div>
          </div>
        </section>
      );
    }

    default:
      return null;
  }
}
