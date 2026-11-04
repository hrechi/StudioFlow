"use client";

import { forwardRef } from "react";

export const AlbumCover = forwardRef<
  HTMLDivElement,
  {
    title: string;
    photographer: string;
    back?: boolean;
    pageNumber: number;
  }
>(function AlbumCover({ title, photographer, back = false, pageNumber }, ref) {
  return (
    <div
      ref={ref}
      data-density="hard"
      aria-label={back ? "Back cover" : `Cover of ${title}`}
      className="album-book-page album-book-cover relative h-full w-full overflow-hidden border border-white/10 p-4 text-center text-[#fff8e9]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-3 border border-white/25"
      />
      <div className="relative flex size-full flex-col items-center justify-center">
        {back ? (
          <div className="max-w-[14rem]">
            <span className="font-mono text-[8px] tracking-[0.3em] text-white/65 uppercase">
              End of album
            </span>
            <p className="mt-4 font-serif text-lg">{title}</p>
            <p className="mt-1 text-xs text-white/70">{photographer}</p>
          </div>
        ) : (
          <div className="max-w-[18rem]">
            <span className="font-mono text-[8px] tracking-[0.32em] text-white/65 uppercase">
              Photography portfolio
            </span>
            <h2 className="mt-5 font-serif text-3xl leading-tight font-medium sm:text-5xl">
              {title}
            </h2>
            <p className="mt-4 font-serif text-sm text-white/75 italic sm:text-base">
              {photographer}
            </p>
            <span aria-hidden="true" className="mx-auto mt-7 block h-px w-10 bg-white/45" />
            <p className="mt-4 font-mono text-[8px] tracking-[0.2em] text-white/60 uppercase">
              Photography edition
            </p>
          </div>
        )}
      </div>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/25 to-transparent"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-3 bottom-2 font-mono text-[7px] tracking-widest text-white/40"
      >
        {String(pageNumber).padStart(2, "0")}
      </span>
    </div>
  );
});
