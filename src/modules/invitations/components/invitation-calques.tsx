"use client";

import { ArrowDown, ArrowUp, Circle, Eye, EyeOff, Image as ImageIcon, Lock, LockOpen, QrCode, Timer, Type } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { deplacerCouches } from "../invitation.outils";
import type { ContenuInvitation, ElementInvitation, TypeElement } from "../invitation.schema";
import { typeElementLabels } from "../invitation.types";

const ICONES: Record<TypeElement, typeof Type> = { text: Type, image: ImageIcon, shape: Circle, qrcode: QrCode, countdown: Timer };

/** Default name of a layer: its text, its linked field, or its kind. */
export function nomCalque(element: ElementInvitation): string {
  if (element.nom) return element.nom;
  if (element.type === "text") return (element.text.trim().split("\n")[0] || typeElementLabels.text).slice(0, 40);
  if (element.type === "image") return element.src.startsWith("/api/") ? "My image" : (element.src.split("/").at(-1)?.replace(".svg", "").replaceAll("-", " ") ?? "Image");
  if (element.type === "shape") return `${typeElementLabels.shape} · ${element.shape}`;
  return typeElementLabels[element.type];
}

/**
 * Layers, from the front of the card to the back. Click selects (Shift + click adds), the eye hides,
 * the lock keeps an element in place, double-click renames.
 */
export function PanneauCalques({
  contenu,
  selection,
  onSelect,
  onChange,
  onElements,
}: {
  contenu: ContenuInvitation;
  selection: string[];
  onSelect: (id: string | null, ajouter?: boolean) => void;
  onChange: (id: string, patch: Partial<ElementInvitation>, cle?: string) => void;
  onElements: (elements: ElementInvitation[], cle?: string) => void;
}) {
  const [renomme, setRenomme] = useState<string | null>(null);
  const calques = [...contenu.elements].sort((a, b) => b.layer - a.layer);

  if (calques.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">The card is empty: add text, shapes or decorations.</CardContent>
      </Card>
    );
  }

  return (
    <Card className="py-2">
      <CardContent className="px-2">
        <ul className="space-y-1" aria-label="Layers, from front to back">
          {calques.map((e, i) => {
            const Icone = ICONES[e.type];
            const choisi = selection.includes(e.id);
            const cache = e.visible === false;
            return (
              <li
                key={e.id}
                className={cn(
                  "group flex items-center gap-1 rounded-md border border-transparent px-1.5 py-1 text-sm",
                  choisi ? "border-primary/40 bg-primary/10" : "hover:bg-muted/60",
                  cache && "opacity-60",
                )}
              >
                <Icone className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                {renomme === e.id ? (
                  <Input
                    autoFocus
                    defaultValue={e.nom ?? nomCalque(e)}
                    maxLength={60}
                    aria-label="Name of the layer"
                    className="h-7 flex-1"
                    onBlur={(ev) => {
                      onChange(e.id, { nom: ev.target.value.trim() || undefined });
                      setRenomme(null);
                    }}
                    onKeyDown={(ev) => {
                      if (ev.key === "Enter") (ev.target as HTMLInputElement).blur();
                      if (ev.key === "Escape") setRenomme(null);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left"
                    onClick={(ev) => onSelect(e.id, ev.shiftKey || ev.ctrlKey || ev.metaKey)}
                    onDoubleClick={() => setRenomme(e.id)}
                    aria-pressed={choisi}
                    title="Click to select, Shift + click to add, double-click to rename"
                  >
                    {nomCalque(e)}
                    {e.groupe && <span className="ml-1.5 rounded bg-muted px-1 text-[10px] text-muted-foreground">group</span>}
                  </button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label={cache ? `Show ${nomCalque(e)}` : `Hide ${nomCalque(e)}`}
                  title={cache ? "Show" : "Hide"}
                  onClick={() => onChange(e.id, { visible: cache ? undefined : false })}
                >
                  {cache ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label={e.verrouille ? `Unlock ${nomCalque(e)}` : `Lock ${nomCalque(e)}`}
                  title={e.verrouille ? "Unlock" : "Lock"}
                  onClick={() => onChange(e.id, { verrouille: e.verrouille ? undefined : true })}
                >
                  {e.verrouille ? <Lock aria-hidden /> : <LockOpen aria-hidden className="opacity-50" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label={`Move ${nomCalque(e)} up`}
                  title="Up"
                  disabled={i === 0}
                  onClick={() => onElements(deplacerCouches(contenu.elements, [e.id], "avant"))}
                >
                  <ArrowUp aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label={`Move ${nomCalque(e)} down`}
                  title="Down"
                  disabled={i === calques.length - 1}
                  onClick={() => onElements(deplacerCouches(contenu.elements, [e.id], "arriere"))}
                >
                  <ArrowDown aria-hidden />
                </Button>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 px-1 text-xs text-muted-foreground">Hidden layers are left out of the downloads and the shared card.</p>
      </CardContent>
    </Card>
  );
}
