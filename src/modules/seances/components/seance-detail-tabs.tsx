"use client";

import {
  Camera,
  CheckCircle2,
  Circle,
  CircleDot,
  FileText,
  Images,
  Lightbulb,
  Package,
  Receipt,
} from "lucide-react";
import Link from "next/link";
import { AIPanel } from "@/components/shared/ai-panel";
import { ComingSoonButton } from "@/components/shared/coming-soon-button";
import { SafeImage } from "@/components/shared/safe-image";
import { ToneBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";
import { typeLieuLabels, type Seance } from "../seance.types";

export type SeanceDetailExtras = {
  timeline: { label: string; date?: string; etat: "fait" | "en_cours" | "a_venir" }[];
  materiel: { nom: string; categorie: string; statut: string }[];
  galerie: { titre: string; statut: string; photos: string[]; total: number } | null;
  facturation: { devis: string; montantTTC: number; paye: number; statut: string } | null;
};

/** Tabs of /dashboard/seances/[id]: Overview / Equipment / Gallery / Billing. */
export function SeanceDetailTabs({
  seance,
  extras,
}: {
  seance: Seance;
  extras: SeanceDetailExtras;
}) {
  return (
    <Tabs defaultValue="apercu" className="gap-4">
      <TabsList variant="line" className="w-full justify-start overflow-x-auto border-b">
        <TabsTrigger value="apercu">Overview</TabsTrigger>
        <TabsTrigger value="materiel">Equipment</TabsTrigger>
        <TabsTrigger value="galerie">Gallery</TabsTrigger>
        <TabsTrigger value="facturation">Billing</TabsTrigger>
      </TabsList>

      <TabsContent value="apercu" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader>
            <CardTitle>Session timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-5 border-l border-border pl-6">
              {extras.timeline.map((step) => (
                <li key={step.label} className="relative">
                  <span className="absolute top-0.5 -left-[2.05rem] grid size-5 place-items-center rounded-full bg-white">
                    {step.etat === "fait" ? (
                      <CheckCircle2 className="size-5 text-success" aria-hidden />
                    ) : step.etat === "en_cours" ? (
                      <CircleDot className="size-5 text-primary" aria-hidden />
                    ) : (
                      <Circle className="size-5 text-light-gray" aria-hidden />
                    )}
                  </span>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      step.etat === "a_venir" ? "text-muted-foreground" : "text-charcoal",
                    )}
                  >
                    {step.label}
                    <span className="sr-only">
                      {step.etat === "fait"
                        ? " (done)"
                        : step.etat === "en_cours"
                          ? " (in progress)"
                          : " (upcoming)"}
                    </span>
                  </p>
                  {step.date && (
                    <p className="text-xs text-muted-foreground">{formatDateTime(step.date)}</p>
                  )}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-semibold text-charcoal">{seance.lieu.nom}</p>
              <p className="text-muted-foreground">{typeLieuLabels[seance.lieu.type]}</p>
              {seance.notes && (
                <p className="mt-3 rounded-lg bg-surface p-3 text-slate">{seance.notes}</p>
              )}
            </CardContent>
          </Card>
          <AIPanel title="Preparation tip" description="Based on the studio's similar sessions.">
            <p className="flex gap-2 text-sm text-slate">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-ai" aria-hidden />
              Bring a gold reflector and an 85 mm: 80% of the photos kept for this kind of session
              were taken late in the day.
            </p>
          </AIPanel>
        </div>
      </TabsContent>

      <TabsContent value="materiel">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Reserved equipment</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/materiel/reservations">
                <Package aria-hidden />
                Reservations
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {extras.materiel.map((item) => (
                <li key={item.nom} className="flex items-center gap-3 py-3">
                  <span className="grid size-9 place-items-center rounded-lg bg-accent text-primary-text">
                    <Camera className="size-4" aria-hidden />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-charcoal">{item.nom}</p>
                    <p className="text-xs text-muted-foreground">{item.categorie}</p>
                  </div>
                  <ToneBadge tone="success" label={item.statut} dot />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="galerie">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{extras.galerie?.titre ?? "Gallery"}</CardTitle>
            {extras.galerie && <ToneBadge tone="info" label={extras.galerie.statut} dot />}
          </CardHeader>
          <CardContent>
            {extras.galerie ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {extras.galerie.photos.map((url, i) => (
                    <div
                      key={url + i}
                      className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                    >
                      <SafeImage src={url} alt="" fill sizes="120px" className="object-cover" />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {extras.galerie.total} photos imported
                  </p>
                  <Button asChild size="sm">
                    <Link href="/dashboard/galeries/galerie-1">
                      <Images aria-hidden />
                      Open gallery
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No photos imported for this session yet.
                </p>
                <ComingSoonButton feature="Import the session photos">
                  Import photos
                </ComingSoonButton>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="facturation">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Quotes and invoices</CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/facturation/factures">
                <Receipt aria-hidden />
                Invoices
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {extras.facturation ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-lg bg-accent text-primary-text">
                    <FileText className="size-5" aria-hidden />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-charcoal">
                      Quote {extras.facturation.devis}
                    </p>
                    <p className="text-xs text-muted-foreground">{extras.facturation.statut}</p>
                  </div>
                  <p className="text-lg font-bold text-charcoal">
                    {formatCurrency(extras.facturation.montantTTC)}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Paid: {formatCurrency(extras.facturation.paye)}</span>
                    <span>
                      Remaining:{" "}
                      {formatCurrency(extras.facturation.montantTTC - extras.facturation.paye)}
                    </span>
                  </div>
                  <Progress
                    value={(extras.facturation.paye / extras.facturation.montantTTC) * 100}
                    aria-label="Amount paid"
                  />
                </div>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No quote for this session.
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
