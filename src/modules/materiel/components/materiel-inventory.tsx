"use client";

import { PackageSearch } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ALL, FilterSelect, SearchInput, labelsOf } from "@/components/shared/filters";
import { SafeImage } from "@/components/shared/safe-image";
import { StatusBadge, ToneBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  categorieMaterielLabels,
  etatMaterielConfig,
  type CategorieMateriel,
  type EtatMateriel,
  type Materiel,
} from "../materiel.types";

const DISPO = { oui: "Available", non: "Unavailable" } as const;

/** /dashboard/materiel — inventory table with filters. */
export function MaterielInventory({ materiels }: { materiels: Materiel[] }) {
  const [query, setQuery] = useState("");
  const [categorie, setCategorie] = useState<CategorieMateriel | typeof ALL>(ALL);
  const [etat, setEtat] = useState<EtatMateriel | typeof ALL>(ALL);
  const [dispo, setDispo] = useState<keyof typeof DISPO | typeof ALL>(ALL);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return materiels
      .filter((m) => categorie === ALL || m.categorie === categorie)
      .filter((m) => etat === ALL || m.etat === etat)
      .filter((m) => dispo === ALL || m.disponible === (dispo === "oui"))
      .filter(
        (m) => !q || `${m.nom} ${m.marque} ${m.modele} ${m.numeroSerie}`.toLowerCase().includes(q),
      );
  }, [materiels, query, categorie, etat, dispo]);

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
        <SearchInput
          value={query}
          onChange={setQuery}
          label="Search equipment"
          placeholder="Name, brand, model, serial number…"
          className="flex-1"
        />
        <div className="flex flex-wrap gap-2">
          <FilterSelect
            value={categorie}
            onChange={setCategorie}
            options={categorieMaterielLabels}
            allLabel="All categories"
            label="Filter by category"
          />
          <FilterSelect
            value={etat}
            onChange={setEtat}
            options={labelsOf(etatMaterielConfig)}
            allLabel="All conditions"
            label="Filter by condition"
            className="w-36"
          />
          <FilterSelect
            value={dispo}
            onChange={setDispo}
            options={DISPO}
            allLabel="Availability"
            label="Filter by availability"
            className="w-36"
          />
        </div>
      </div>
      {list.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="No equipment"
          description="No equipment matches these filters."
          className="m-4"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-sm">
            <caption className="sr-only">Equipment inventory</caption>
            <thead>
              <tr className="border-b text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-2.5">Equipment</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Brand / model</th>
                <th className="px-4 py-2.5">Condition</th>
                <th className="px-4 py-2.5">Availability</th>
                <th className="px-4 py-2.5 text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id} className="border-b last:border-0 hover:bg-surface/60">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/materiel/${m.id}`}
                      className="group flex items-center gap-3"
                    >
                      <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <SafeImage
                          src={m.photo}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </span>
                      <span>
                        <span className="block font-semibold text-charcoal group-hover:text-primary-text">
                          {m.nom}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          S/N {m.numeroSerie}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate">{categorieMaterielLabels[m.categorie]}</td>
                  <td className="px-4 py-3 text-slate">
                    {m.marque} <span className="text-muted-foreground">· {m.modele}</span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={m.etat} config={etatMaterielConfig} />
                  </td>
                  <td className="px-4 py-3">
                    <ToneBadge
                      tone={m.disponible ? "success" : "neutral"}
                      label={m.disponible ? "Available" : "Reserved / unavailable"}
                      dot
                    />
                  </td>
                  <td className="px-4 py-3 text-right font-medium whitespace-nowrap text-slate">
                    {formatCurrency(m.prix)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
