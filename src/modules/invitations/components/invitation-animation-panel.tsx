"use client";

import { Eraser, Play, RotateCcw, Sparkles, Users } from "lucide-react";
import { useState } from "react";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { configEvenement } from "../invitation.evenements";
import {
  AMBIANCES,
  BORNES_ANIMATION,
  BOUCLES,
  EASINGS,
  ENTREES,
  ENTREES_TEXTE,
  OUVERTURES,
  PISTES_MUSIQUE,
  type AnimationElement,
  type ContenuInvitation,
  type ElementInvitation,
  type PisteMusique,
} from "../invitation.schema";
import { animerParDefaut } from "../invitation.templates";
import { ambianceLabels, boucleLabels, easingLabels, entreeLabels, MUSIQUES, ouvertureLabels } from "../invitation.types";
import { InvitationApercu } from "./invitation-apercu";
import { Couleur, Curseur, TitreSection } from "./invitation-champs";

const ANIMATION_PAR_DEFAUT: AnimationElement = { type: "FONDU", duree: 0.9, delai: 0.3, easing: "DOUCE", boucle: "AUCUNE", dureeBoucle: 3 };

export function PanneauAnimation({
  contenu,
  element,
  musiques,
  onChange,
  onContenu,
  onApercuInvite,
}: {
  contenu: ContenuInvitation;
  element: ElementInvitation | undefined;
  /** Tracks whose file exists in public/invitations/musique. */
  musiques: string[];
  onChange: (id: string, patch: Partial<ElementInvitation>, cle?: string) => void;
  onContenu: (contenu: ContenuInvitation, cle?: string) => void;
  onApercuInvite: () => void;
}) {
  const [apercu, setApercu] = useState<number | null>(null);
  const config = configEvenement(contenu.typeEvenement ?? "MARIAGE");
  const animation = element?.animation;
  const types = element?.type === "text" ? ENTREES_TEXTE : ENTREES;
  const pistes = PISTES_MUSIQUE.filter((p) => musiques.includes(p));

  const changerAnimation = (patch: Partial<AnimationElement> | null, champ: string) => {
    if (!element) return;
    if (patch === null) {
      onChange(element.id, { animation: undefined } as Partial<ElementInvitation>);
      return;
    }
    const suivante = { ...(animation ?? ANIMATION_PAR_DEFAUT), ...patch };
    const vide = suivante.type === "AUCUNE" && suivante.boucle === "AUCUNE";
    onChange(element.id, { animation: vide ? undefined : suivante } as Partial<ElementInvitation>, `animation:${element.id}:${champ}`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={() => setApercu(performance.now())}>
          <Play aria-hidden />
          Preview
        </Button>
        <Button type="button" onClick={onApercuInvite}>
          <Users aria-hidden />
          Preview as guest
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-3">
          <TitreSection>Selected element</TitreSection>
          {!element ? (
            <p className="text-sm text-muted-foreground">Select one element on the card to animate it.</p>
          ) : (
            <>
              <FormField id="entree" label="Entrance">
                <Select value={animation?.type ?? "AUCUNE"} onValueChange={(v) => changerAnimation({ type: v as AnimationElement["type"] }, "type")}>
                  <SelectTrigger id="entree" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((t) => (
                      <SelectItem key={t} value={t}>{entreeLabels[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              {animation && animation.type !== "AUCUNE" && (
                <>
                  <Curseur
                    id="duree"
                    label="Duration"
                    suffixe=" s"
                    min={BORNES_ANIMATION.duree.min}
                    max={BORNES_ANIMATION.duree.max}
                    step={0.1}
                    value={animation.duree}
                    onChange={(duree) => changerAnimation({ duree }, "duree")}
                  />
                  <Curseur
                    id="delai"
                    label="Delay"
                    suffixe=" s"
                    min={BORNES_ANIMATION.delai.min}
                    max={BORNES_ANIMATION.delai.max}
                    step={0.1}
                    value={animation.delai}
                    onChange={(delai) => changerAnimation({ delai }, "delai")}
                  />
                  <FormField id="easing" label="Movement">
                    <Select value={animation.easing} onValueChange={(v) => changerAnimation({ easing: v as AnimationElement["easing"] }, "easing")}>
                      <SelectTrigger id="easing" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EASINGS.map((e) => (
                          <SelectItem key={e} value={e}>{easingLabels[e]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                </>
              )}
              <FormField id="boucle" label="Gentle loop">
                <Select value={animation?.boucle ?? "AUCUNE"} onValueChange={(v) => changerAnimation({ boucle: v as AnimationElement["boucle"] }, "boucle")}>
                  <SelectTrigger id="boucle" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BOUCLES.map((b) => (
                      <SelectItem key={b} value={b}>{boucleLabels[b]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              {animation && animation.boucle !== "AUCUNE" && (
                <Curseur
                  id="duree-boucle"
                  label="Loop speed"
                  suffixe=" s"
                  min={BORNES_ANIMATION.dureeBoucle.min}
                  max={BORNES_ANIMATION.dureeBoucle.max}
                  step={0.2}
                  value={animation.dureeBoucle}
                  onChange={(dureeBoucle) => changerAnimation({ dureeBoucle }, "dureeBoucle")}
                />
              )}
              {animation && (
                <Button type="button" variant="ghost" size="sm" onClick={() => changerAnimation(null, "aucune")}>
                  <Eraser aria-hidden />
                  No animation for this element
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <TitreSection>Whole card</TitreSection>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onContenu(animerParDefaut({ ...contenu, elements: contenu.elements.map((e) => ({ ...e, animation: undefined }) as ElementInvitation) }))}>
              <Sparkles aria-hidden />
              Animate it for me
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => onContenu({ ...contenu, elements: contenu.elements.map((e) => ({ ...e, animation: undefined }) as ElementInvitation) })}>
              <Eraser aria-hidden />
              Remove all
            </Button>
          </div>

          <FormField id="ouverture" label="Opening">
            <Select
              value={contenu.ouverture?.type ?? "AUCUNE"}
              onValueChange={(v) =>
                onContenu({
                  ...contenu,
                  ouverture: v === "AUCUNE" ? undefined : { type: v as (typeof OUVERTURES)[number], couleur: contenu.ouverture?.couleur ?? config.palettes[0].principale },
                })
              }
            >
              <SelectTrigger id="ouverture" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AUCUNE">None, the card is shown at once</SelectItem>
                {OUVERTURES.map((o) => (
                  <SelectItem key={o} value={o}>{ouvertureLabels[o]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          {contenu.ouverture && (
            <Couleur id="ouverture-couleur" label="Color of the opening" value={contenu.ouverture.couleur} onChange={(couleur) => onContenu({ ...contenu, ouverture: { ...contenu.ouverture!, couleur } }, "ouverture")} />
          )}

          <FormField id="ambiance-type" label="Around the card">
            <Select
              value={contenu.ambiance?.type ?? "AUCUNE"}
              onValueChange={(v) => onContenu({ ...contenu, ambiance: v === "AUCUNE" ? undefined : { type: v as (typeof AMBIANCES)[number], densite: contenu.ambiance?.densite ?? 2 } })}
            >
              <SelectTrigger id="ambiance-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AUCUNE">Nothing</SelectItem>
                {AMBIANCES.map((a) => (
                  <SelectItem key={a} value={a}>{ambianceLabels[a]}{a === config.ambiance ? " (suits this event)" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          {contenu.ambiance && (
            <Curseur id="densite" label="Amount" min={1} max={3} step={1} value={contenu.ambiance.densite} onChange={(densite) => onContenu({ ...contenu, ambiance: { ...contenu.ambiance!, densite } }, "densite")} />
          )}

          {pistes.length > 0 && (
            <>
              <FormField id="musique" label="Music">
                <Select
                  value={contenu.musique?.piste ?? "AUCUNE"}
                  onValueChange={(v) => onContenu({ ...contenu, musique: v === "AUCUNE" ? undefined : { piste: v as PisteMusique, volume: contenu.musique?.volume ?? 0.6 } })}
                >
                  <SelectTrigger id="musique" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUCUNE">No music</SelectItem>
                    {pistes.map((p) => (
                      <SelectItem key={p} value={p}>{MUSIQUES[p].titre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              {contenu.musique && (
                <Curseur id="volume" label="Volume" min={0.05} max={1} step={0.05} value={contenu.musique.volume} onChange={(volume) => onContenu({ ...contenu, musique: { ...contenu.musique!, volume } }, "volume")} />
              )}
              <p className="text-xs text-muted-foreground">Browsers never play music by themselves: it starts when the guest taps Open.</p>
            </>
          )}
          <p className="text-xs text-muted-foreground">Guests who asked their phone for less motion see the still card. Downloads always show the still card.</p>
        </CardContent>
      </Card>

      <Dialog open={apercu !== null} onOpenChange={(open) => !open && setApercu(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Animation preview</DialogTitle>
            <DialogDescription>The entrances and loops, without the opening scene.</DialogDescription>
          </DialogHeader>
          {apercu !== null && (
            <InvitationApercu key={apercu} contenu={contenu} lecture={{ debut: apercu }} className="mx-auto w-full max-w-sm overflow-hidden rounded shadow-xl" />
          )}
          <Button variant="outline" onClick={() => setApercu(performance.now())}>
            <RotateCcw aria-hidden />
            Replay
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
