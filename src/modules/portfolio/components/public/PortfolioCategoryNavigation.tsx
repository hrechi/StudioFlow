"use client";

import { useState, type ReactNode } from "react";
import {
  CATEGORIES_PORTFOLIO,
  categoriePortfolioLabelsEn,
  type CategoriePortfolio,
} from "../../portfolio.types";

export type CategorizedPortfolioSection = {
  id: string;
  category?: CategoriePortfolio;
  isGallery: boolean;
  content: ReactNode;
};

export function PortfolioCategoryNavigation({
  sections,
}: {
  sections: CategorizedPortfolioSection[];
}) {
  const [selectedCategory, setSelectedCategory] = useState<CategoriePortfolio | null>(null);
  const categories = CATEGORIES_PORTFOLIO.filter((category) =>
    sections.some((section) => section.isGallery && section.category === category),
  );

  return (
    <>
      {categories.length > 0 && (
        <nav
          aria-label="Portfolio categories"
          className="sticky top-[102px] z-30 flex justify-center gap-2 overflow-x-auto border-b px-4 py-3 backdrop-blur-md"
          style={{
            borderColor: "var(--portfolio-border)",
            backgroundColor: "color-mix(in srgb, var(--portfolio-bg) 92%, transparent)",
          }}
        >
          <CategoryButton active={selectedCategory === null} onClick={() => setSelectedCategory(null)}>
            All
          </CategoryButton>
          {categories.map((category) => (
            <CategoryButton
              key={category}
              active={selectedCategory === category}
              onClick={() => setSelectedCategory(category)}
            >
              {categoriePortfolioLabelsEn[category]}
            </CategoryButton>
          ))}
        </nav>
      )}
      {sections.map((section) =>
        section.isGallery && selectedCategory && section.category !== selectedCategory
          ? null
          : <div key={section.id}>{section.content}</div>,
      )}
    </>
  );
}

function CategoryButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition"
      style={{
        borderColor: active ? "var(--portfolio-accent)" : "var(--portfolio-border)",
        backgroundColor: active ? "var(--portfolio-accent)" : "transparent",
        color: active ? "var(--portfolio-bg)" : "var(--portfolio-text)",
      }}
    >
      {children}
    </button>
  );
}
