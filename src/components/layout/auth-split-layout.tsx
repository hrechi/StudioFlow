import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/shared/logo";
import { SafeImage } from "@/components/shared/safe-image";

type AuthSplitLayoutProps = {
  image: string;
  imageAlt: string;
  /** Short line shown on the photo, under the tagline. */
  caption: string;
  children: ReactNode;
};

/**
 * Split-screen layout for /login and /register: photo with dark overlay on one
 * side, centered form card on the other. On mobile the photo is a slim banner.
 */
export function AuthSplitLayout({ image, imageAlt, caption, children }: AuthSplitLayoutProps) {
  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr] bg-ink text-bone lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:grid-rows-none">
      {/* Photo side (desktop) / banner (mobile) */}
      <aside className="relative h-44 overflow-hidden bg-ink sm:h-52 lg:sticky lg:top-0 lg:h-dvh">
        <div
          aria-hidden
          className="viewfinder pointer-events-none absolute inset-6 z-10 hidden opacity-70 lg:block"
        />
        <div className="absolute inset-0">
          <SafeImage
            src={image}
            alt={imageAlt}
            fill
            priority
            sizes="(min-width: 1024px) 52vw, 100vw"
            className="ken-burns object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/30 lg:bg-gradient-to-br lg:from-ink/80 lg:via-ink/35 lg:to-ink/90" />
        <div className="relative flex h-full flex-col justify-between p-6 sm:p-8 lg:p-12">
          <Link href="/" aria-label="ReFrame — home" className="w-fit rounded-sm py-1">
            <Logo showTagline iconClassName="h-5" />
          </Link>
          <div className="hidden max-w-lg space-y-4 lg:block">
            <p className="eyebrow">Photography studio · Tunis</p>
            <p className="display-lg text-bone">{caption}</p>
            <p className="max-w-md text-sm leading-relaxed text-bone/70">
              Weddings, portraits, products and events: one studio to book your sessions, discover
              your private galleries and keep track of your invoices.
            </p>
          </div>
        </div>
      </aside>

      {/* Form side */}
      <main className="flex flex-col px-5 py-8 sm:px-10 lg:px-16 lg:py-10">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 rounded-sm text-[0.65rem] font-medium tracking-[0.3em] text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to website
        </Link>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
        <p className="text-center text-[0.65rem] tracking-[0.24em] text-muted-foreground uppercase">
          © {new Date().getFullYear()} ReFrame · Photography studio
        </p>
      </main>
    </div>
  );
}
