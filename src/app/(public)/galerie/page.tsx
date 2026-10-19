/* Module : Gestion des Photos & Galeries · Responsable : Louay Herichi */
import { Images } from "lucide-react";
import type { Metadata } from "next";
import { SharedGalerieAccessForm } from "@/modules/photos-galeries/components/shared-galerie-access-form";

export const metadata: Metadata = {
  title: "View a shared gallery",
  description: "Open a gallery a client shared with you, with its link and password.",
};

/** Front office: guests (family, friends, a second opinion) open a client's gallery. */
export default function SharedGalerieAccessPage() {
  return (
    <main className="pt-18">
      <section className="bg-charcoal text-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-20">
          <p className="text-xs font-semibold tracking-[0.3em] text-white/60 uppercase">
            Shared gallery
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            A client shared their photos with you?
          </h1>
          <p className="mt-5 max-w-xl text-white/70">
            Enter the gallery link and the password they gave you to view the photos.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-md px-5 py-14 sm:px-8">
        <div className="space-y-6 rounded-2xl bg-white p-6 shadow-soft ring-1 ring-border sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-accent text-primary-text">
              <Images className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="font-semibold text-charcoal">Open a gallery</h2>
              <p className="text-sm text-muted-foreground">View only: no account needed.</p>
            </div>
          </div>
          <SharedGalerieAccessForm />
        </div>
      </section>
    </main>
  );
}
