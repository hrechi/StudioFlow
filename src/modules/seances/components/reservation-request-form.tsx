"use client";

import { Building2, Camera, Heart, PartyPopper, Send, Sparkles, UserRound } from "lucide-react";
import { useState } from "react";
import { comingSoon } from "@/components/shared/coming-soon-button";
import { AIBadge } from "@/components/shared/ai-badge";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDate, formatTime } from "@/lib/utils";
import { typeSeanceLabels, type CreneauSuggere, type TypeSeance } from "../seance.types";

const TYPES: { value: TypeSeance; icon: typeof Heart; hint: string }[] = [
  { value: "MARIAGE", icon: Heart, hint: "Ceremony, couple, engagement" },
  { value: "PORTRAIT", icon: UserRound, hint: "Solo, family, corporate" },
  { value: "PRODUIT", icon: Building2, hint: "Packshot, catalogue, e-shop" },
  { value: "EVENEMENT", icon: PartyPopper, hint: "Party, conference, birthday" },
];

/** /espace-client/seances/reserver — booking request (front office). */
export function ReservationRequestForm({ creneaux }: { creneaux: CreneauSuggere[] }) {
  const [type, setType] = useState<TypeSeance>("PORTRAIT");
  const [slot, setSlot] = useState<number | null>(null);

  return (
    <form
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
      onSubmit={(event) => {
        event.preventDefault();
        comingSoon("Send the session request to the studio");
      }}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>What kind of session?</CardTitle>
          </CardHeader>
          <CardContent>
            <fieldset>
              <legend className="sr-only">Session type</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {TYPES.map(({ value, icon: Icon, hint }) => (
                  <label
                    key={value}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border bg-white p-4 transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                      type === value ? "border-primary bg-accent/60" : "hover:border-gray/40",
                    )}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={value}
                      checked={type === value}
                      onChange={() => setType(value)}
                      className="sr-only"
                    />
                    <span
                      className={cn(
                        "grid size-10 place-items-center rounded-lg",
                        type === value ? "bg-primary text-white" : "bg-muted text-slate",
                      )}
                    >
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span>
                      <span className="block font-semibold text-charcoal">
                        {typeSeanceLabels[value]}
                      </span>
                      <span className="block text-xs text-muted-foreground">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your preferences</CardTitle>
            <CardDescription>The studio confirms the date and sends you a quote.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField id="date-souhaitee" label="Preferred date" required>
              <Input id="date-souhaitee" type="date" className="h-10 bg-white" />
            </FormField>
            <FormField id="personnes" label="Number of people">
              <Input
                id="personnes"
                type="number"
                min={1}
                defaultValue={2}
                className="h-10 bg-white"
              />
            </FormField>
            <FormField id="lieu-souhaite" label="Preferred location" className="sm:col-span-2">
              <Input
                id="lieu-souhaite"
                placeholder="At the studio, outdoors, at your place…"
                className="h-10 bg-white"
              />
            </FormField>
            <FormField id="message" label="Your ideas" className="sm:col-span-2">
              <Textarea
                id="message"
                rows={4}
                placeholder="Tell us about the mood, the style, the key moments…"
                className="bg-white"
              />
            </FormField>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4">
        <Card className="ring-ai/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AIBadge />
              <CardTitle className="text-sm">Available slots</CardTitle>
            </div>
            <CardDescription>Suggested from the studio&apos;s availability.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {creneaux.map((creneau, index) => (
              <button
                key={creneau.debut}
                type="button"
                onClick={() => setSlot(index)}
                aria-pressed={slot === index}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                  slot === index ? "border-ai bg-ai-soft" : "hover:border-ai/40",
                )}
              >
                <Sparkles className="size-4 shrink-0 text-ai" aria-hidden />
                <span>
                  <span className="block font-semibold text-charcoal">
                    {formatDate(creneau.debut)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(creneau.debut)} – {formatTime(creneau.fin)}
                  </span>
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
        <Button type="submit" size="lg" className="w-full">
          <Send aria-hidden />
          Send my request
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Camera className="size-3.5" aria-hidden />
          The studio replies within 24 hours
        </p>
      </aside>
    </form>
  );
}
