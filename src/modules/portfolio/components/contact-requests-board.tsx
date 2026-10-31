"use client";

import { useState } from "react";
import { toast } from "sonner";
import { changerStatutDemande, convertirDemandeEnSeance } from "../portfolio.actions";
import { STATUTS_DEMANDE, type StatutDemande } from "../portfolio.types";
import type { PortfolioContactRequest } from "../portfolio.service";

const labels: Record<StatutDemande, string> = { NOUVELLE: "New", EN_COURS: "In progress", CONVERTIE: "Converted", REJETEE: "Rejected" };

export function ContactRequestsBoard({ requests }: { requests: PortfolioContactRequest[] }) {
  const [items, setItems] = useState(requests);
  async function change(id: string, statut: StatutDemande) {
    const result = await changerStatutDemande({ id, statut });
    if (!result.ok) { toast.error(result.error); return; }
    setItems((current) => current.map((item) => item.id === id ? { ...item, statut } : item));
  }
  async function convert(id: string) {
    const result = await convertirDemandeEnSeance({ id });
    if (!result.ok) { toast.error(result.error); return; }
    setItems((current) => current.map((item) => item.id === id ? { ...item, statut: "CONVERTIE" } : item));
    toast.success("Session created from this request.");
  }
  if (!items.length) return <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">Contact requests will appear here.</div>;
  return <ul className="space-y-4">{items.map((item) => <li key={item.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">{item.nomVisiteur}</h2><p className="mt-1 text-sm text-muted-foreground"><a href={`mailto:${item.email}`} className="underline underline-offset-2">{item.email}</a>{item.telephone ? ` · ${item.telephone}` : ""}</p><p className="mt-2 text-xs text-muted-foreground">{item.typeSeance}{item.dateSouhaitee ? ` · Requested ${new Date(item.dateSouhaitee).toLocaleDateString()}` : ""} · {new Date(item.dateCreation).toLocaleString()}</p></div><select aria-label={`Status for ${item.nomVisiteur}`} value={item.statut} onChange={(event) => void change(item.id, event.target.value as StatutDemande)} className="h-9 rounded-lg border border-border bg-background px-2">{STATUTS_DEMANDE.map((status) => <option key={status} value={status}>{labels[status]}</option>)}</select></div><p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{item.message}</p>{item.statut !== "CONVERTIE" && <button type="button" onClick={() => void convert(item.id)} className="mt-4 h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Convert to session</button>}</li>)}</ul>;
}
