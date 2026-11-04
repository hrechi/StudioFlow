"use client";

import { forwardRef } from "react";

export const TextCardPage = forwardRef<HTMLDivElement, { caption: string; pageNumber: number }>(
  function TextCardPage({ caption, pageNumber }, ref) {
    return (
      <div
        ref={ref}
        data-density="soft"
        data-album-page
        aria-label={`Caption card, page ${pageNumber}`}
        className="album-book-page relative flex h-full w-full items-center justify-center overflow-hidden bg-[#fffdf8] p-5 text-[#66553e] sm:p-8"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-[#9e8b6e]/15 to-transparent"
        />
        <div className="relative flex size-full flex-col items-center justify-center border border-[#bd9a5c]/75 px-4 py-8 text-center shadow-[inset_0_0_0_4px_#fffdf8,inset_0_0_0_5px_rgba(189,154,92,.35)] sm:px-7">
          <span className="font-mono text-[8px] tracking-[0.3em] text-[#9b7a42] uppercase">
            A note across the pages
          </span>
          <span aria-hidden="true" className="my-5 h-px w-9 bg-[#bd9a5c]" />
          <p
            className="max-w-[17rem] text-lg leading-relaxed italic sm:text-2xl"
            style={{ fontFamily: "cursive" }}
          >
            {caption}
          </p>
          <span aria-hidden="true" className="mt-5 h-px w-9 bg-[#bd9a5c]" />
          <span
            aria-hidden="true"
            className="absolute right-2 bottom-2 font-mono text-[7px] tracking-widest text-[#a28a69]/65"
          >
            REFRAME · {String(pageNumber).padStart(2, "0")}
          </span>
        </div>
      </div>
    );
  },
);
