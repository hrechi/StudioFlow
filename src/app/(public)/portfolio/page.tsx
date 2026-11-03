import type { Metadata } from "next";
import { PortfolioDirectory } from "@/modules/portfolio/components/public/PortfolioDirectory";
import { listPublicPortfolios } from "@/modules/portfolio/portfolio.service";

export const metadata: Metadata = {
  title: "Discover Photography Portfolios — StudioFlow",
  description: "Explore photography studios and creators by specialty, style, services, and location.",
};

export default async function PortfolioDirectoryPage() {
  const result = await listPublicPortfolios();

  return (
    <main className="min-h-screen pb-24">
      <section className="relative overflow-hidden pt-40 pb-14 lg:pt-52">
        <div className="container-wide">
          <p className="eyebrow">StudioFlow · Directory</p>
          <h1 className="display-xl mt-5 max-w-5xl text-foreground">
            Discover Photography Portfolios
          </h1>
          <p className="mt-6 max-w-2xl text-foreground/65">
            Find the studio that matches your vision, artistic style, and location.
          </p>
        </div>
      </section>
      <PortfolioDirectory initialResult={result} />
    </main>
  );
}
