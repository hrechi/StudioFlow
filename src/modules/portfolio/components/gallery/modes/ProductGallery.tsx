"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Minus, Plus, RotateCw, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SafeImage } from "@/components/shared/safe-image";
import { categoriePortfolioLabels } from "../../../portfolio.types";
import type { ProductGalleryItem } from "../galleryTypes";

export function ProductGallery({
  id,
  title,
  products,
}: {
  id?: string;
  title: string;
  products: ProductGalleryItem[];
}) {
  const reducedMotion = useReducedMotion();
  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category).filter(Boolean))),
    [products],
  );
  const [category, setCategory] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [frameIndex, setFrameIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pointer, setPointer] = useState({ x: 50, y: 50 });
  const dragStart = useRef<number | null>(null);
  const pinchStart = useRef<number | null>(null);
  const selectedProduct = products.find((product) => product.id === selectedId) ?? null;
  const visibleProducts =
    category === "all" ? products : products.filter((product) => product.category === category);
  const selectedPhoto = selectedProduct?.images[imageIndex];
  const rotating = Boolean(selectedProduct?.images360?.length);
  const frameSrc = rotating
    ? selectedProduct?.images360?.[frameIndex % (selectedProduct.images360.length || 1)]
    : selectedPhoto?.src;

  useEffect(() => {
    if (!selectedProduct) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
      if (event.key === "ArrowRight") setImageIndex((index) => (index + 1) % selectedProduct.images.length);
      if (event.key === "ArrowLeft") {
        setImageIndex((index) => (index - 1 + selectedProduct.images.length) % selectedProduct.images.length);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedProduct]);

  function openProduct(product: ProductGalleryItem) {
    setSelectedId(product.id);
    setImageIndex(0);
    setFrameIndex(0);
    setZoom(1);
  }

  function rotateBy(delta: number) {
    if (!selectedProduct?.images360?.length) return;
    setFrameIndex((index) => {
      const count = selectedProduct.images360?.length ?? 0;
      return (index + delta + count) % count;
    });
  }

  return (
    <section
      id={id}
      aria-label={title}
      className="container mx-auto max-w-7xl scroll-mt-24 px-4 py-12 sm:px-6 lg:py-20"
      style={{ color: "var(--portfolio-text)" }}
    >
      <h2 className="mb-6 font-serif text-2xl sm:mb-8 sm:text-4xl">{title}</h2>
      {categories.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2" aria-label="Filter products">
          <button
            type="button"
            onClick={() => setCategory("all")}
            aria-pressed={category === "all"}
            className={`rounded-full border px-3 py-1.5 text-xs ${
              category === "all" ? "border-current" : "border-[var(--portfolio-border)] opacity-65"
            }`}
          >
            Tous
          </button>
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item!)}
              aria-pressed={category === item}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                category === item ? "border-current" : "border-[var(--portfolio-border)] opacity-65"
              }`}
            >
              {categoriePortfolioLabels[item as keyof typeof categoriePortfolioLabels] ?? item}
            </button>
          ))}
        </div>
      )}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
        {visibleProducts.map((product) => (
          <li key={product.id}>
            <button
              type="button"
              onClick={() => openProduct(product)}
              className="group block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--portfolio-accent)]"
              aria-label={`View product ${product.name}`}
            >
              <span className="relative block aspect-[4/5] overflow-hidden bg-black/5">
                <SafeImage
                  src={product.images[0]?.src ?? ""}
                  alt={product.images[0]?.alt ?? product.name}
                  fill
                  unoptimized
                  loading="lazy"
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-opacity duration-300 group-hover:opacity-0"
                />
                {product.images[1] && (
                  <SafeImage
                    src={product.images[1].src}
                    alt={product.images[1].alt}
                    fill
                    unoptimized
                    loading="lazy"
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                    className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  />
                )}
              </span>
              <span className="mt-3 block font-serif text-sm">{product.name}</span>
              {product.category && (
                <span className="mt-1 block text-xs text-[var(--portfolio-muted)]">
                  {categoriePortfolioLabels[
                    product.category as keyof typeof categoriePortfolioLabels
                  ] ?? product.category}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {selectedProduct && selectedPhoto && frameSrc && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Product details for ${selectedProduct.name}`}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-3 text-white backdrop-blur-sm sm:p-8"
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }}
            onClick={() => setSelectedId(null)}
          >
            <div
              className="relative flex h-[min(90dvh,900px)] w-full max-w-6xl flex-col items-center"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Close viewer"
                className="absolute -top-1 right-0 z-10 grid size-10 place-items-center rounded-full border border-white/30 bg-black/60 sm:-top-12"
              >
                <X size={18} />
              </button>
              <div
                className="relative min-h-0 w-full flex-1 touch-none overflow-hidden"
                onPointerDown={(event) => {
                  dragStart.current = event.clientX;
                  if (rotating) event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  if (rotating && dragStart.current !== null) {
                    const delta = event.clientX - dragStart.current;
                    if (Math.abs(delta) > 8) {
                      rotateBy(delta < 0 ? 1 : -1);
                      dragStart.current = event.clientX;
                    }
                  }
                  const bounds = event.currentTarget.getBoundingClientRect();
                  setPointer({
                    x: ((event.clientX - bounds.left) / bounds.width) * 100,
                    y: ((event.clientY - bounds.top) / bounds.height) * 100,
                  });
                }}
                onPointerUp={() => {
                  dragStart.current = null;
                }}
                onTouchStart={(event) => {
                  if (event.touches.length === 2) {
                    pinchStart.current = Math.hypot(
                      event.touches[0].clientX - event.touches[1].clientX,
                      event.touches[0].clientY - event.touches[1].clientY,
                    );
                  }
                }}
                onTouchMove={(event) => {
                  if (event.touches.length !== 2 || pinchStart.current === null) return;
                  const distance = Math.hypot(
                    event.touches[0].clientX - event.touches[1].clientX,
                    event.touches[0].clientY - event.touches[1].clientY,
                  );
                  setZoom((value) => Math.min(3, Math.max(1, value * (distance / pinchStart.current!))));
                  pinchStart.current = distance;
                }}
                onTouchEnd={() => {
                  pinchStart.current = null;
                }}
                onWheel={(event) => setZoom((value) => Math.min(3, Math.max(1, value - event.deltaY * 0.001)))}
              >
                <SafeImage
                  src={frameSrc}
                  alt={selectedPhoto.alt}
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 80vw, 100vw"
                  className="object-contain transition-transform duration-150"
                  style={{ transform: `scale(${zoom})` }}
                />
                {zoom > 1 && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 hidden bg-no-repeat lg:block"
                    style={{
                      backgroundImage: `url("${frameSrc}")`,
                      backgroundPosition: `${pointer.x}% ${pointer.y}%`,
                      backgroundSize: `${zoom * 180}%`,
                    }}
                  />
                )}
                {rotating && (
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/65 px-3 py-1 text-xs">
                    Drag to rotate · {frameIndex + 1}/{selectedProduct.images360?.length}
                  </span>
                )}
              </div>
              <div className="mt-3 flex w-full items-center justify-between gap-3">
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={() =>
                    setImageIndex((index) => (index - 1 + selectedProduct.images.length) % selectedProduct.images.length)
                  }
                  className="grid size-10 place-items-center rounded-full border border-white/30"
                >
                  <ArrowLeft size={17} />
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoom((value) => Math.max(1, value - 0.25))}
                    aria-label="Zoom out"
                    className="grid size-9 place-items-center rounded-full border border-white/30"
                  >
                    <Minus size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom((value) => Math.min(3, value + 0.25))}
                    aria-label="Enlarge"
                    className="grid size-9 place-items-center rounded-full border border-white/30"
                  >
                    <Plus size={15} />
                  </button>
                  {rotating && (
                    <span className="ml-1 inline-flex items-center gap-1 text-xs text-white/75">
                      <RotateCw size={14} /> 360°
                    </span>
                  )}
                  <p className="ml-2 text-center font-serif text-sm">{selectedProduct.name}</p>
                </div>
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={() => setImageIndex((index) => (index + 1) % selectedProduct.images.length)}
                  className="grid size-10 place-items-center rounded-full border border-white/30"
                >
                  <ArrowRight size={17} />
                </button>
              </div>
              {selectedProduct.images.length > 1 && (
                <div className="mt-3 flex max-w-full gap-2 overflow-x-auto">
                  {selectedProduct.images.map((image, index) => (
                    <button
                      type="button"
                      key={image.id}
                      onClick={() => {
                        setImageIndex(index);
                        setFrameIndex(index);
                      }}
                      aria-label={`View image ${index + 1} of ${selectedProduct.name}`}
                      className={`relative size-14 shrink-0 overflow-hidden border ${
                        index === imageIndex ? "border-white" : "border-white/20 opacity-60"
                      }`}
                    >
                      <SafeImage src={image.src} alt="" fill unoptimized sizes="56px" className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
