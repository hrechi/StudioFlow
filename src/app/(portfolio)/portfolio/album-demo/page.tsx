import type { Metadata } from "next";
import { PortfolioPhotoAlbum } from "@/modules/portfolio/components/gallery/PortfolioPhotoAlbum";
import { PortfolioThemeWrapper } from "@/modules/portfolio/components/public/PortfolioThemeWrapper";
import type { AlbumPhoto } from "@/modules/portfolio/lib/albumLayout";

export const metadata: Metadata = {
  title: "Démonstration de l’album photo",
  description: "Aperçu de l’album photo feuilletable de ReFrame.",
  robots: { index: false, follow: false },
};

const demoPhotos: AlbumPhoto[] = [
  {
    id: "demo-01",
    src: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=85",
    alt: "Un couple échange ses vœux dans un jardin",
    caption: "L’échange des vœux",
  },
  {
    id: "demo-02",
    src: "https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1400&q=85",
    alt: "Un couple marche dans une allée lumineuse",
    caption: "La promenade",
  },
  {
    id: "demo-03",
    src: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1400&q=85",
    alt: "Des mariés célèbrent leur union entourés de proches",
    caption: "Une journée à célébrer",
  },
  {
    id: "demo-04",
    src: "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=1400&q=85",
    alt: "Des fleurs décorent une cérémonie de mariage",
    caption: "Les détails fleuris",
  },
  {
    id: "demo-05",
    src: "https://images.unsplash.com/photo-1520857014576-2c4f4c972b57?auto=format&fit=crop&w=1400&q=85",
    alt: "Un couple danse sous une lumière douce",
    caption: "La première danse",
  },
  {
    id: "demo-06",
    src: "https://images.unsplash.com/photo-1507504031003-b417219a0fde?auto=format&fit=crop&w=1400&q=85",
    alt: "Une table de réception ornée de fleurs et de bougies",
    caption: "À table, ensemble",
  },
  {
    id: "demo-07",
    src: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1400&q=85",
    alt: "Des invités célèbrent les mariés en plein air",
    caption: "Les retrouvailles",
  },
  {
    id: "demo-08",
    src: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1400&q=85",
    alt: "Un bouquet de fleurs posé dans un décor élégant",
    caption: "Un bouquet de saison",
  },
  {
    id: "demo-09",
    src: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1400&q=85",
    alt: "Une réception de mariage décorée de guirlandes lumineuses",
    caption: "À la tombée du jour",
  },
  {
    id: "demo-10",
    src: "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?auto=format&fit=crop&w=1400&q=85",
    alt: "Un couple profite d’un instant calme pendant sa célébration",
    caption: "Un instant à deux",
  },
  {
    id: "demo-11",
    src: "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=1400&q=85",
    alt: "Un couple célèbre son mariage dans une lumière dorée",
    caption: "La lumière de fin d’après-midi",
  },
  {
    id: "demo-12",
    src: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1400&q=85",
    alt: "Portrait de célébration au naturel",
    caption: "Le dernier portrait",
  },
];

export default function AlbumDemoPage() {
  return (
    <PortfolioThemeWrapper initialTheme="EDITORIAL" accentColor="#b48752" isEditorial>
      <main className="min-h-screen py-10 sm:py-16">
        <div className="mx-auto mb-2 max-w-5xl px-6">
          <p className="font-mono text-[10px] tracking-[0.2em] text-[var(--portfolio-muted)] uppercase">
            Démonstration · 12 photographies
          </p>
        </div>
        <PortfolioPhotoAlbum
          title="Un jour, pour toujours"
          photographerName="Camille Laurent"
          photos={demoPhotos}
          portfolioId="album-demo"
          slug="album-demo"
          enableLikes={false}
          coverColor="#51402e"
        />
      </main>
    </PortfolioThemeWrapper>
  );
}
