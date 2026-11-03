"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  BringToFront,
  Check,
  Circle,
  Copy,
  Heart,
  ImagePlus,
  Italic,
  Link2,
  Link2Off,
  Loader2,
  Minus,
  Palette as PaletteIcon,
  SendToBack,
  Sparkles,
  Square,
  Trash2,
  Type,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import { redigerAction, setPartageAction, suggererPaletteAction } from "../invitation.actions";
import { champsManquants } from "../invitation.linked";
import {
  CHAMPS_LIES,
  LANGUES,
  POLICES,
  TONS,
  type ChampLie,
  type ContenuInvitation,
  type DetailsInvitation,
  type ElementInvitation,
  type ElementTexte,
  type Forme,
  type Langue,
  type Palette,
  type Police,
  type Ton,
} from "../invitation.schema";
import {
  champLieLabels,
  DECORATIONS,
  FORMATS_CARTE,
  IMAGE_TAILLE_MAX,
  IMAGE_TYPES,
  langueLabels,
  partageHref,
  tonLabels,
  type InvitationView,
} from "../invitation.types";

// ---------------------------------------------------------------------------
// Details: the form that drives the linked texts of the card
// ---------------------------------------------------------------------------

export function PanneauDetails({
  details,
  onChange,
  onPalette,
}: {
  details: DetailsInvitation;
  onChange: (details: DetailsInvitation, cle?: string) => void;
  onPalette: (palette: Palette) => void;
}) {
  const [touches, setTouches] = useState<Partial<Record<keyof DetailsInvitation, boolean>>>({});
  const manquants = champsManquants(details);
  const erreur = (champ: keyof DetailsInvitation) => (touches[champ] ? manquants[champ] : undefined);
  const champ = (nom: keyof DetailsInvitation) => ({
    value: details[nom],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...details, [nom]: e.target.value }, `details:${nom}`),
    onBlur: () => setTouches((t) => ({ ...t, [nom]: true })),
    "aria-invalid": !!erreur(nom),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField id="nomA" label="First name" required error={erreur("nomA")}>
              <Input id="nomA" maxLength={60} {...champ("nomA")} />
            </FormField>
            <FormField id="nomB" label="Second name" required error={erreur("nomB")}>
              <Input id="nomB" maxLength={60} {...champ("nomB")} />
            </FormField>
            <FormField id="date" label="Date" required error={erreur("date")}>
              <Input id="date" type="date" {...champ("date")} />
            </FormField>
            <FormField id="heure" label="Time" required error={erreur("heure")}>
              <Input id="heure" type="time" {...champ("heure")} />
            </FormField>
          </div>
          <FormField id="lieu" label="Venue" required error={erreur("lieu")}>
            <Input id="lieu" maxLength={160} {...champ("lieu")} />
          </FormField>
          <FormField id="langue" label="Language of the card">
            <Select value={details.langue} onValueChange={(v) => onChange({ ...details, langue: v as Langue })}>
              <SelectTrigger id="langue" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUES.map((l) => (
                  <SelectItem key={l} value={l}>{langueLabels[l]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField id="message" label="Message">
            <Textarea id="message" rows={3} maxLength={600} dir="auto" {...champ("message")} />
          </FormField>
          <Redaction details={details} onTexte={(message) => onChange({ ...details, message })} />
        </CardContent>
      </Card>
      <PaletteIA onPalette={onPalette} />
    </div>
  );
}

function Redaction({ details, onTexte }: { details: DetailsInvitation; onTexte: (texte: string) => void }) {
  const [ton, setTon] = useState<Ton>("ELEGANT");
  const [pending, start] = useTransition();

  const rediger = () =>
    start(async () => {
      const result = await redigerAction({
        ton,
        langue: details.langue,
        nomA: details.nomA,
        nomB: details.nomB,
        date: details.date,
        lieu: details.lieu,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onTexte(result.data.valeur);
      if (result.data.source === "MODELE") toast.info("We used one of our written texts", { description: "The AI is not available right now." });
    });

  return (
    <div className="flex gap-2">
      <Select value={ton} onValueChange={(v) => setTon(v as Ton)}>
        <SelectTrigger aria-label="Tone" className="w-32 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TONS.map((t) => (
            <SelectItem key={t} value={t}>{tonLabels[t]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" variant="ai" className="flex-1" onClick={rediger} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
        Write it for me
      </Button>
    </div>
  );
}

function PaletteIA({ onPalette }: { onPalette: (palette: Palette) => void }) {
  const [ambiance, setAmbiance] = useState("");
  const [pending, start] = useTransition();

  const suggerer = () =>
    start(async () => {
      const result = await suggererPaletteAction({ ambiance });
      if (!result.ok) {
        toast.error(result.fieldErrors?.ambiance?.[0] ?? result.error);
        return;
      }
      onPalette(result.data.valeur);
      toast.success("Colors applied", { description: "Press undo to go back." });
    });

  return (
    <Card>
      <CardContent className="space-y-2">
        <Label htmlFor="ambiance">Suggest colors from a mood</Label>
        <div className="flex gap-2">
          <Input id="ambiance" placeholder="Olive garden, summer evening" maxLength={120} value={ambiance} onChange={(e) => setAmbiance(e.target.value)} />
          <Button type="button" variant="ai" size="icon" aria-label="Suggest colors" onClick={suggerer} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <PaletteIcon aria-hidden />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Add: text, shapes, the decoration library, uploads, and the card itself
// ---------------------------------------------------------------------------

const FORMES: { forme: Forme; label: string; icon: typeof Square; largeur: number; hauteur: number }[] = [
  { forme: "rect", label: "Rectangle", icon: Square, largeur: 160, hauteur: 100 },
  { forme: "ellipse", label: "Circle", icon: Circle, largeur: 120, hauteur: 120 },
  { forme: "line", label: "Line", icon: Minus, largeur: 160, hauteur: 4 },
  { forme: "heart", label: "Heart", icon: Heart, largeur: 80, hauteur: 80 },
];

async function envoyerImage(fichier: File): Promise<{ src: string; width: number; height: number } | null> {
  if (!(IMAGE_TYPES as readonly string[]).includes(fichier.type)) {
    toast.error("The image must be a JPG, PNG or WEBP file.");
    return null;
  }
  if (fichier.size > IMAGE_TAILLE_MAX) {
    toast.error("The image must be 5 MB or less.");
    return null;
  }
  const form = new FormData();
  form.append("image", fichier);
  try {
    const reponse = await fetch("/api/invitations/images", { method: "POST", body: form });
    const result = (await reponse.json()) as ActionResult<{ src: string; width: number; height: number }>;
    if (!result.ok) {
      toast.error(result.error);
      return null;
    }
    return result.data;
  } catch {
    toast.error("The upload failed. Check your connection and try again.");
    return null;
  }
}

export function PanneauAjout({
  contenu,
  onAjouter,
  onContenu,
}: {
  contenu: ContenuInvitation;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each element type adds its own fields
  onAjouter: (nouveau: any) => void;
  onContenu: (contenu: ContenuInvitation, cle?: string) => void;
}) {
  const imageRef = useRef<HTMLInputElement>(null);
  const fondRef = useRef<HTMLInputElement>(null);
  const [envoi, setEnvoi] = useState(false);

  const ajouterTexte = () =>
    onAjouter({
      type: "text",
      text: "Your text",
      width: 240,
      height: 30,
      style: { fontFamily: "Playfair Display", fontSize: 22, color: "#333333", align: "center", opacity: 1, bold: false, italic: false, letterSpacing: 0 },
    });

  const ajouterImage = async (fichier: File | undefined) => {
    if (!fichier) return;
    setEnvoi(true);
    const image = await envoyerImage(fichier);
    setEnvoi(false);
    if (!image) return;
    const largeur = Math.min(240, contenu.size.width * 0.6);
    onAjouter({ type: "image", src: image.src, width: largeur, height: (largeur * image.height) / image.width, style: { opacity: 1 } });
  };

  const changerFond = async (fichier: File | undefined) => {
    if (!fichier) return;
    setEnvoi(true);
    const image = await envoyerImage(fichier);
    setEnvoi(false);
    if (image) onContenu({ ...contenu, background: { ...contenu.background, image: image.src } });
  };

  const format = FORMATS_CARTE.find((f) => f.width === contenu.size.width && f.height === contenu.size.height);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3">
          <Button type="button" variant="outline" className="w-full" onClick={ajouterTexte}>
            <Type aria-hidden />
            Add text
          </Button>
          <Button type="button" variant="outline" className="w-full" disabled={envoi} onClick={() => imageRef.current?.click()}>
            {envoi ? <Loader2 className="animate-spin" aria-hidden /> : <ImagePlus aria-hidden />}
            Add my image
          </Button>
          <input
            ref={imageRef}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-label="Choose an image"
            onChange={(e) => {
              void ajouterImage(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <div className="grid grid-cols-4 gap-2">
            {FORMES.map(({ forme, label, icon: Icon, largeur, hauteur }) => (
              <Button
                key={forme}
                type="button"
                variant="outline"
                size="icon"
                className="w-full"
                aria-label={`Add ${label.toLowerCase()}`}
                title={label}
                onClick={() =>
                  onAjouter({
                    type: "shape",
                    shape: forme,
                    width: largeur,
                    height: hauteur,
                    style:
                      forme === "line"
                        ? { fill: null, stroke: "#b08d57", strokeWidth: 2, opacity: 1 }
                        : { fill: "#e8c9c9", stroke: null, strokeWidth: 0, opacity: 1 },
                  })
                }
              >
                <Icon aria-hidden />
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          {(["Flowers", "Hearts", "Frames"] as const).map((groupe) => (
            <div key={groupe}>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{groupe}</p>
              <div className="grid grid-cols-4 gap-2">
                {DECORATIONS.filter((d) => d.groupe === groupe).map((d) => (
                  <button
                    key={d.src}
                    type="button"
                    title={d.label}
                    aria-label={`Add ${d.label.toLowerCase()}`}
                    className="flex aspect-square items-center justify-center rounded-md border bg-white p-1.5 transition-colors hover:border-primary"
                    onClick={() => {
                      const image = new window.Image();
                      image.onload = () => {
                        const cadre = groupe === "Frames" && d.src.includes("frame");
                        const largeur = cadre ? contenu.size.width * 0.9 : 120;
                        onAjouter({ type: "image", src: d.src, width: largeur, height: (largeur * image.naturalHeight) / image.naturalWidth, style: { opacity: 1 } });
                      };
                      image.src = d.src;
                    }}
                  >
                    <Image src={d.src} alt="" width={48} height={48} unoptimized className="size-full object-contain" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <FormField id="format" label="Card size">
            <Select
              value={format?.id ?? ""}
              onValueChange={(id) => {
                const choisi = FORMATS_CARTE.find((f) => f.id === id);
                if (choisi) onContenu({ ...contenu, size: { width: choisi.width, height: choisi.height } });
              }}
            >
              <SelectTrigger id="format" className="w-full">
                <SelectValue placeholder="Custom" />
              </SelectTrigger>
              <SelectContent>
                {FORMATS_CARTE.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <Couleur id="fond" label="Background color" value={contenu.background.color} onChange={(color) => onContenu({ ...contenu, background: { ...contenu.background, color } }, "fond")} />
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" disabled={envoi} onClick={() => fondRef.current?.click()}>
              <ImagePlus aria-hidden />
              Background image
            </Button>
            {contenu.background.image && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove the background image"
                onClick={() => onContenu({ ...contenu, background: { color: contenu.background.color } })}
              >
                <X aria-hidden />
              </Button>
            )}
          </div>
          <input
            ref={fondRef}
            type="file"
            accept={IMAGE_TYPES.join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-label="Choose a background image"
            onChange={(e) => {
              void changerFond(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Style of the selected element
// ---------------------------------------------------------------------------

function Couleur({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id}>{label}</Label>
      <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-12 cursor-pointer rounded border bg-transparent p-0.5" />
    </div>
  );
}

function Curseur({ id, label, value, min, max, step, onChange, suffixe = "" }: { id: string; label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void; suffixe?: string }) {
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

function Bascule({ actif, label, onClick, children }: { actif: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Button type="button" variant={actif ? "default" : "outline"} size="icon" aria-pressed={actif} aria-label={label} title={label} onClick={onClick}>
      {children}
    </Button>
  );
}

export function PanneauStyle({
  element,
  contenu,
  onChange,
  onContenu,
  onSupprimer,
}: {
  element: ElementInvitation | undefined;
  contenu: ContenuInvitation;
  onChange: (id: string, patch: Partial<ElementInvitation>, cle?: string) => void;
  onContenu: (contenu: ContenuInvitation, cle?: string) => void;
  onSupprimer: () => void;
}) {
  if (!element) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Select something on the card to change its style.
        </CardContent>
      </Card>
    );
  }

  const style = (patch: Record<string, unknown>, champ: string) =>
    onChange(element.id, { style: { ...element.style, ...patch } } as Partial<ElementInvitation>, `style:${element.id}:${champ}`);

  /** Layers are renumbered on each move, so they stay small and two elements never tie. */
  const deplacerCouche = (vers: "devant" | "avant" | "arriere" | "fond") => {
    const ordre = [...contenu.elements].sort((a, b) => a.layer - b.layer);
    const index = ordre.findIndex((e) => e.id === element.id);
    const [courant] = ordre.splice(index, 1);
    const cible = vers === "devant" ? ordre.length : vers === "fond" ? 0 : vers === "avant" ? Math.min(index + 1, ordre.length) : Math.max(index - 1, 0);
    ordre.splice(cible, 0, courant);
    const couches = new Map(ordre.map((e, i) => [e.id, i + 1]));
    onContenu({ ...contenu, elements: contenu.elements.map((e) => ({ ...e, layer: couches.get(e.id) ?? e.layer })) });
  };

  return (
    <Card>
      <CardContent className="space-y-4">
        {element.type === "text" && <StyleTexte element={element} onChange={onChange} style={style} />}

        {element.type === "shape" && (
          <>
            {element.shape !== "line" && (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Switch id="avec-fond" checked={element.style.fill !== null} onCheckedChange={(v) => style({ fill: v ? "#e8c9c9" : null }, "fill")} aria-label="Fill" />
                  <Label htmlFor="avec-fond">Fill</Label>
                </div>
                {element.style.fill !== null && (
                  <input type="color" aria-label="Fill color" value={element.style.fill} onChange={(e) => style({ fill: e.target.value }, "fill")} className="h-8 w-12 cursor-pointer rounded border bg-transparent p-0.5" />
                )}
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="avec-trait"
                  checked={element.style.stroke !== null}
                  onCheckedChange={(v) => style({ stroke: v ? "#b08d57" : null, strokeWidth: v ? Math.max(element.style.strokeWidth, 2) : 0 }, "stroke")}
                  aria-label="Outline"
                />
                <Label htmlFor="avec-trait">Outline</Label>
              </div>
              {element.style.stroke !== null && (
                <input type="color" aria-label="Outline color" value={element.style.stroke} onChange={(e) => style({ stroke: e.target.value }, "stroke")} className="h-8 w-12 cursor-pointer rounded border bg-transparent p-0.5" />
              )}
            </div>
            {element.style.stroke !== null && (
              <Curseur id="epaisseur" label="Outline width" min={1} max={30} step={1} value={element.style.strokeWidth} onChange={(v) => style({ strokeWidth: v }, "strokeWidth")} />
            )}
          </>
        )}

        <Curseur id="opacite" label="Opacity" min={0.05} max={1} step={0.05} value={element.style.opacity} onChange={(v) => style({ opacity: v }, "opacity")} />
        <Curseur id="rotation" label="Rotation" suffixe="°" min={-180} max={180} step={1} value={Math.round(element.rotation)} onChange={(v) => onChange(element.id, { rotation: v }, `rotation:${element.id}`)} />

        <div className="space-y-1.5">
          <p className="text-sm font-medium">Layer</p>
          <div className="grid grid-cols-4 gap-2">
            <Button type="button" variant="outline" size="icon" className="w-full" title="To the front" aria-label="To the front" onClick={() => deplacerCouche("devant")}><BringToFront aria-hidden /></Button>
            <Button type="button" variant="outline" size="icon" className="w-full" title="Forward" aria-label="Forward" onClick={() => deplacerCouche("avant")}><ArrowUp aria-hidden /></Button>
            <Button type="button" variant="outline" size="icon" className="w-full" title="Backward" aria-label="Backward" onClick={() => deplacerCouche("arriere")}><ArrowDown aria-hidden /></Button>
            <Button type="button" variant="outline" size="icon" className="w-full" title="To the back" aria-label="To the back" onClick={() => deplacerCouche("fond")}><SendToBack aria-hidden /></Button>
          </div>
        </div>

        <Button type="button" variant="ghost" className="w-full text-destructive" onClick={onSupprimer}>
          <Trash2 aria-hidden />
          Delete this element
        </Button>
      </CardContent>
    </Card>
  );
}

function StyleTexte({
  element,
  onChange,
  style,
}: {
  element: ElementTexte;
  onChange: (id: string, patch: Partial<ElementInvitation>, cle?: string) => void;
  style: (patch: Record<string, unknown>, champ: string) => void;
}) {
  const s = element.style;
  return (
    <>
      <FormField id="lien" label="Linked to the form">
        <Select
          value={element.linkedTo ?? "aucun"}
          onValueChange={(v) => onChange(element.id, { linkedTo: v === "aucun" ? undefined : (v as ChampLie) } as Partial<ElementTexte>)}
        >
          <SelectTrigger id="lien" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="aucun">Free text</SelectItem>
            {CHAMPS_LIES.map((c) => (
              <SelectItem key={c} value={c}>{champLieLabels[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      {element.linkedTo ? (
        <p className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5 text-xs text-slate">
          <Link2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            This text follows the form. Change it in Details, or choose <em>Free text</em> above.
            <button
              type="button"
              className="mt-1 flex items-center gap-1 font-medium text-primary-text hover:underline"
              onClick={() => onChange(element.id, { linkedTo: undefined } as Partial<ElementTexte>)}
            >
              <Link2Off className="size-3" aria-hidden />
              Unlink
            </button>
          </span>
        </p>
      ) : (
        <FormField id="texte" label="Text">
          <Textarea
            id="texte"
            rows={3}
            maxLength={2000}
            dir="auto"
            value={element.text}
            onChange={(e) => onChange(element.id, { text: e.target.value } as Partial<ElementTexte>, `texte:${element.id}`)}
          />
        </FormField>
      )}
      <FormField id="police" label="Font">
        <Select value={s.fontFamily} onValueChange={(v) => style({ fontFamily: v as Police }, "fontFamily")}>
          <SelectTrigger id="police" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {POLICES.map((p) => (
              <SelectItem key={p} value={p} style={{ fontFamily: p }}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <Curseur id="taille" label="Size" min={8} max={120} step={1} value={s.fontSize} onChange={(v) => style({ fontSize: v }, "fontSize")} />
      <Couleur id="couleur" label="Color" value={s.color} onChange={(color) => style({ color }, "color")} />
      <div className="flex flex-wrap gap-2">
        <Bascule actif={s.align === "left"} label="Align left" onClick={() => style({ align: "left" }, "align")}><AlignLeft aria-hidden /></Bascule>
        <Bascule actif={s.align === "center"} label="Align center" onClick={() => style({ align: "center" }, "align")}><AlignCenter aria-hidden /></Bascule>
        <Bascule actif={s.align === "right"} label="Align right" onClick={() => style({ align: "right" }, "align")}><AlignRight aria-hidden /></Bascule>
        <span className="mx-1 w-px self-stretch bg-border" aria-hidden />
        <Bascule actif={s.bold} label="Bold" onClick={() => style({ bold: !s.bold }, "bold")}><Bold aria-hidden /></Bascule>
        <Bascule actif={s.italic} label="Italic" onClick={() => style({ italic: !s.italic }, "italic")}><Italic aria-hidden /></Bascule>
      </div>
      <Curseur id="espacement" label="Letter spacing" min={0} max={20} step={0.5} value={s.letterSpacing} onChange={(v) => style({ letterSpacing: v }, "letterSpacing")} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Public link
// ---------------------------------------------------------------------------

export function PanneauPartage({ invitation }: { invitation: InvitationView }) {
  const [actif, setActif] = useState(invitation.partageActif);
  const [token, setToken] = useState(invitation.partageToken);
  const [copie, setCopie] = useState(false);
  const [pending, start] = useTransition();
  const lien = token && typeof window !== "undefined" ? `${window.location.origin}${partageHref(token)}` : "";

  const basculer = (valeur: boolean) =>
    start(async () => {
      const result = await setPartageAction(invitation.id, valeur);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setActif(result.data.actif);
      setToken(result.data.token);
    });

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label htmlFor="partage">Public link</Label>
            <p className="text-xs text-muted-foreground">Anyone with the link sees the card, without signing in.</p>
          </div>
          <Switch id="partage" checked={actif} onCheckedChange={basculer} disabled={pending} />
        </div>
        {actif && lien && (
          <div className="flex gap-2">
            <Input readOnly value={lien} aria-label="Public link" onFocus={(e) => e.target.select()} />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Copy the link"
              onClick={async () => {
                await navigator.clipboard?.writeText(lien);
                setCopie(true);
                setTimeout(() => setCopie(false), 1500);
              }}
            >
              {copie ? <Check aria-hidden /> : <Copy aria-hidden />}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
