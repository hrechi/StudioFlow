"use client";

import { CalendarCheck, Clock, MapPin, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { AIConfidence, AIPanel } from "@/components/shared/ai-panel";
import { comingSoon } from "@/components/shared/coming-soon-button";
import { FormField } from "@/components/shared/form-field";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fullName } from "@/lib/mock-data-helpers";
import { cn, formatDate, formatTime } from "@/lib/utils";
import type { UtilisateurRef } from "@/modules/utilisateurs/utilisateur.types";
import {
  TYPES_SEANCE,
  typeSeanceLabels,
  type CreneauSuggere,
  type Lieu,
  type TypeSeance,
} from "../seance.types";

function toDateInput(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function toTimeInput(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** /dashboard/seances/nouvelle — form + "AI suggested time slot" card. */
export function SeanceForm({
  clients,
  photographes,
  lieux,
  creneaux,
}: {
  clients: UtilisateurRef[];
  photographes: UtilisateurRef[];
  lieux: Lieu[];
  creneaux: CreneauSuggere[];
}) {
  const [type, setType] = useState<TypeSeance>("PORTRAIT");
  const [photographe, setPhotographe] = useState(photographes[0]?.id ?? "");
  const [lieu, setLieu] = useState(lieux[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [debut, setDebut] = useState("10:00");
  const [fin, setFin] = useState("12:00");
  const [applied, setApplied] = useState<number | null>(null);

  const apply = (creneau: CreneauSuggere, index: number) => {
    setDate(toDateInput(creneau.debut));
    setDebut(toTimeInput(creneau.debut));
    setFin(toTimeInput(creneau.fin));
    setPhotographe(creneau.photographe.id);
    setLieu(creneau.lieu.id);
    setApplied(index);
    toast.success("Slot applied to the form", {
      description: "Check it before saving.",
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          comingSoon("Schedule the session (seance.service)");
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Session type, client and preparation notes.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField id="titre" label="Title" required className="sm:col-span-2">
              <Input id="titre" placeholder="e.g. Sarra & Amine Wedding" className="h-10 bg-card" />
            </FormField>
            <FormField id="type" label="Session type" required>
              <Select value={type} onValueChange={(v) => setType(v as TypeSeance)}>
                <SelectTrigger id="type" className="h-10 w-full bg-card">
                  <SelectValue>{typeSeanceLabels[type]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TYPES_SEANCE.map((t) => (
                    <SelectItem key={t} value={t}>
                      {typeSeanceLabels[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField id="client" label="Client" required>
              <Select defaultValue={clients[0]?.id}>
                <SelectTrigger id="client" className="h-10 w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {fullName(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField id="notes" label="Notes" className="sm:col-span-2">
              <Textarea
                id="notes"
                rows={3}
                placeholder="Schedule, special requests, location constraints…"
                className="bg-card"
              />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>
              Double bookings of the photographer and the location will be blocked.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <FormField id="date" label="Date" required>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 bg-card"
              />
            </FormField>
            <FormField id="debut" label="Start" required>
              <Input
                id="debut"
                type="time"
                value={debut}
                onChange={(e) => setDebut(e.target.value)}
                className="h-10 bg-card"
              />
            </FormField>
            <FormField id="fin" label="End" required>
              <Input
                id="fin"
                type="time"
                value={fin}
                onChange={(e) => setFin(e.target.value)}
                className="h-10 bg-card"
              />
            </FormField>
            <FormField
              id="photographe"
              label="Photographer"
              required
              className="sm:col-span-3 md:col-span-1"
            >
              <Select value={photographe} onValueChange={setPhotographe}>
                <SelectTrigger id="photographe" className="h-10 w-full bg-card">
                  <SelectValue>
                    {fullName(photographes.find((p) => p.id === photographe) ?? photographes[0])}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {photographes.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {fullName(p)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField id="lieu" label="Location" required className="sm:col-span-3 md:col-span-2">
              <Select value={lieu} onValueChange={setLieu}>
                <SelectTrigger id="lieu" className="h-10 w-full bg-card">
                  <SelectValue>{lieux.find((l) => l.id === lieu)?.nom}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {lieux.map((l) => (
                    <SelectItem key={l.id} value={l.id} disabled={!l.disponible}>
                      {l.nom}
                      {!l.disponible && " (unavailable)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" asChild>
            <Link href="/dashboard/seances">Cancel</Link>
          </Button>
          <Button type="submit">
            <CalendarCheck aria-hidden />
            Schedule session
          </Button>
        </div>
      </form>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <AIPanel
          title="Suggested slots"
          description="Computed from photographer and location availability and the session type."
        >
          <ul className="space-y-3">
            {creneaux.map((creneau, index) => (
              <li
                key={creneau.debut}
                className={cn(
                  "rounded-lg border bg-card p-3 transition-shadow",
                  applied === index ? "border-ai ring-2 ring-ai/25" : "border-ai/15",
                )}
              >
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <Clock className="size-3.5 text-ai" aria-hidden />
                  {formatDate(creneau.debut)} · {formatTime(creneau.debut)}–
                  {formatTime(creneau.fin)}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UserAvatar
                    {...creneau.photographe}
                    size="sm"
                    className="size-5 text-[0.55rem]"
                  />
                  {fullName(creneau.photographe)}
                  <MapPin className="ml-1 size-3" aria-hidden />
                  <span className="truncate">{creneau.lieu.nom}</span>
                </p>
                <p className="mt-2 text-xs text-slate">{creneau.raison}</p>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <AIConfidence value={creneau.score} />
                  <Button size="xs" variant="ai-soft" onClick={() => apply(creneau, index)}>
                    <Sparkles aria-hidden />
                    Apply
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </AIPanel>
      </aside>
    </div>
  );
}
