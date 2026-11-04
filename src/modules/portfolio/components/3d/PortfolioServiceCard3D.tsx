"use client";

import React, { useRef, useState } from "react";
import { Check } from "lucide-react";
import { PackageInquiryLink } from "../public/PackageInquiryLink";

export type PackageItem = {
  nom: string;
  prix?: string | number;
  description?: string;
  delai?: string;
  points?: string[];
  inclus?: string[];
  featured?: boolean;
};

export function PortfolioServiceCard3D({
  item,
  index = 0,
}: {
  item: PackageItem;
  index?: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;

    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  };

  const pointsList = item.points || item.inclus || [];

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="group relative rounded-[20px] p-px transition-all duration-300"
      style={{
        perspective: "1000px",
      }}
    >
      {/* Bordure progressive */}
      <div
        className="absolute inset-0 rounded-[20px] transition-opacity duration-500"
        style={{
          background: isHovered
            ? "linear-gradient(135deg, var(--portfolio-accent) 0%, transparent 60%)"
            : "var(--portfolio-border)",
          opacity: isHovered ? 1 : 0.6,
        }}
      />

      {/* Contenu 3D de la carte */}
      <div
        className="portfolio-service-card relative flex h-full flex-col justify-between rounded-[19px] p-7 transition-transform duration-200 ease-out will-change-transform sm:p-8"
        style={{
          backgroundColor: "var(--portfolio-surface)",
          transform: isHovered
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-5px)`
            : "rotateX(0deg) rotateY(0deg) translateY(0px)",
          transformStyle: "preserve-3d",
        }}
      >
        <div>
          <div className="flex items-center justify-between">
            <span
              className="font-mono text-xs font-semibold"
              style={{ color: "var(--portfolio-accent)" }}
            >
              {(index + 1).toString().padStart(2, "0")}
            </span>
            {item.delai && (
              <span
                className="rounded-full px-2.5 py-0.5 font-mono text-[9px] uppercase"
                style={{
                  backgroundColor: "rgba(255,255,255,0.06)",
                  color: "var(--portfolio-muted)",
                }}
              >
                {item.delai}
              </span>
            )}
          </div>

          <h3 className="mt-4 font-serif text-2xl font-normal tracking-tight">{item.nom}</h3>

          {item.description && (
            <p
              className="mt-3 font-sans text-xs leading-relaxed"
              style={{ color: "var(--portfolio-muted)" }}
            >
              {item.description}
            </p>
          )}

          {pointsList.length > 0 && (
            <ul
              className="mt-6 space-y-2.5 border-t pt-6"
              style={{ borderColor: "var(--portfolio-border)" }}
            >
              {pointsList.map((pt, i) => (
                <li key={i} className="flex items-start gap-2.5 font-sans text-xs opacity-90">
                  <Check
                    className="mt-0.5 size-3.5 shrink-0"
                    style={{ color: "var(--portfolio-accent)" }}
                  />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Prix & Bouton */}
        <div
          className="mt-8 flex items-baseline justify-between border-t pt-5"
          style={{ borderColor: "var(--portfolio-border)" }}
        >
          {item.prix ? (
            <div>
              <span
                className="block font-mono text-[9px] uppercase"
                style={{ color: "var(--portfolio-muted)" }}
              >
                Starting at
              </span>
              <span className="font-serif text-xl font-medium">
                {typeof item.prix === "number" ? `${item.prix} €` : item.prix}
              </span>
            </div>
          ) : (
            <div />
          )}

          <PackageInquiryLink packageName={item.nom} />
        </div>
      </div>
    </div>
  );
}
