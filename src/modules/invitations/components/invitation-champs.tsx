"use client";

/** Small controls shared by the panels of the editor: color with swatches, slider, toggle button. */
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NUANCIERS } from "../invitation.couleurs";

export function Couleur({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-1.5">
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-8 px-2 text-xs" aria-label={`${label}: ready-made colors`}>
              Swatches
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 space-y-2 p-3">
            {NUANCIERS.map((n) => (
              <div key={n.nom}>
                <p className="mb-1 text-xs text-muted-foreground">{n.nom}</p>
                <div className="flex gap-1.5">
                  {n.couleurs.map((c) => (
                    <button
                      key={c}
                      type="button"
                      title={c}
                      aria-label={`${n.nom} ${c}`}
                      onClick={() => onChange(c)}
                      className="size-7 rounded-md border shadow-xs transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </PopoverContent>
        </Popover>
        <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-12 cursor-pointer rounded border bg-transparent p-0.5" />
      </div>
    </div>
  );
}

export function Curseur({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffixe = "",
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  suffixe?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-xs text-muted-foreground tabular-nums">{value}{suffixe}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-primary" />
    </div>
  );
}

export function BasculeIcone({ actif, label, onClick, children, disabled }: { actif: boolean; label: string; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <Button type="button" variant={actif ? "default" : "outline"} size="icon" aria-pressed={actif} aria-label={label} title={label} onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  );
}

export function TitreSection({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{children}</p>;
}
