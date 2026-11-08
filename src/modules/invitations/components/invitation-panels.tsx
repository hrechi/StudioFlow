"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  BringToFront,
  CaseUpper,
  Circle,
  Diamond,
  ExternalLink,
  FlipHorizontal2,
  FlipVertical2,
  Frame,
  Heart,
  ImagePlus,
  Italic,
  Link2,
  Link2Off,
  Loader2,
  Lock,
  LockOpen,
  MapPin,
  Minus,
  Palette as PaletteIcon,
  QrCode,
  SendToBack,
  Sparkles,
  Square,
  Star,
  Timer,
  Trash2,
  Type,
  Wand2,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action-result";
import { redigerAction, suggererPaletteAction } from "../invitation.actions";
import { assurerContraste } from "../invitation.couleurs";
import { champsVisibles, configEvenement, libelleChamp, LISTE_EVENEMENTS, type ChampOptionnel } from "../invitation.evenements";
import { lienAppleMaps, lienGoogleMaps, lienWaze } from "../invitation.lieu";
import { champsManquants, estArabe } from "../invitation.linked";
import { hauteurCourbe, type Alignement, type DeplacementCouche } from "../invitation.outils";
import { controleElementQr } from "../invitation.qr";
import {
  CHAMPS_LIES,
  FILTRES,
  LANGUES,
  MASQUES,
  POLICES,
  POLICES_ARABES,
  QR_CONTRASTE_CONSEILLE,
  TONS,
  UNITES_COMPTE,
  type ChampLie,
  type ContenuInvitation,
  type DetailsInvitation,
  type ElementCompte,
  type ElementForme,
  type ElementImage,
  type ElementInvitation,
  type ElementQr,
  type ElementTexte,
  type Forme,
  type Langue,
  type Masque,
  type Palette,
  type Police,
  type Ton,
  type TypeEvenement,
} from "../invitation.schema";
import {
  DECORATIONS,
  filtreLabels,
  FORMATS_CARTE,
  GROUPES_DECORATION,
  IMAGE_TAILLE_MAX,
  IMAGE_TYPES,
  langueLabels,
  masqueLabels,
  tonLabels,
  typeElementLabels,
  unitesCompteLabels,
} from "../invitation.types";
import { BasculeIcone, Couleur, Curseur, TitreSection } from "./invitation-champs";

const CarteLieu = dynamic(() => import("./invitation-carte-lieu").then((m) => m.CarteLieu), {
  ssr: false,
  loading: () => <Skeleton className="h-48 w-full rounded-lg" />,
});

// ---------------------------------------------------------------------------
// Details: the form that drives the linked texts of the card
// ---------------------------------------------------------------------------

type ChampTexte = Exclude<keyof DetailsInvitation, "langue" | "coordonnees">;

export function PanneauDetails({
  details,
  typeEvenement = "MARIAGE",
  onChange,
  onPalette,
}: {
  details: DetailsInvitation;
  typeEvenement?: TypeEvenement;
  onChange: (details: DetailsInvitation, cle?: string) => void;
  onPalette: (palette: Palette) => void;
}) {
  const config = configEvenement(typeEvenement);
  const [touches, setTouches] = useState<Partial<Record<keyof DetailsInvitation, boolean>>>({});
  const manquants = champsManquants(details, typeEvenement);
  const erreur = (champ: keyof DetailsInvitation) => (touches[champ] ? manquants[champ] : undefined);
  const requis = (champ: keyof DetailsInvitation) => config.requis.includes(champ);
  const champ = (nom: ChampTexte) => ({
    value: details[nom] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...details, [nom]: e.target.value }, `details:${nom}`),
    onBlur: () => setTouches((t) => ({ ...t, [nom]: true })),
    "aria-invalid": !!erreur(nom),
  });
  const optionnels = champsVisibles(typeEvenement);
  const MAX: Record<ChampOptionnel, number> = { nomA: 60, nomB: 60, titre: 120, hotes: 160, tenue: 120, contact: 160 };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Image src={`/invitations/decorations/${config.icone}.svg`} alt="" width={28} height={28} unoptimized className="size-7" />
            {config.label}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {optionnels.map(({ champ: nom, label }) => (
              <FormField key={nom} id={nom} label={label} required={requis(nom)} error={erreur(nom)} className={nom === "nomA" || nom === "nomB" ? "" : "col-span-2"}>
                <Input id={nom} maxLength={MAX[nom]} dir="auto" {...champ(nom)} />
              </FormField>
            ))}
            <FormField id="date" label="Date" required={requis("date")} error={erreur("date")}>
              <Input id="date" type="date" {...champ("date")} />
            </FormField>
            <FormField id="heure" label="Time" required={requis("heure")} error={erreur("heure")}>
              <Input id="heure" type="time" {...champ("heure")} />
            </FormField>
          </div>
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
          <Redaction details={details} typeEvenement={typeEvenement} onTexte={(message) => onChange({ ...details, message })} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <TitreSection>Venue</TitreSection>
          <FormField id="lieu" label="Venue" required={requis("lieu")} error={erreur("lieu")}>
            <Input id="lieu" maxLength={160} dir="auto" placeholder="Jasmine Palace" {...champ("lieu")} />
          </FormField>
          <FormField id="adresse" label="Address (for the map)">
            <Input id="adresse" maxLength={240} dir="auto" placeholder="Avenue Habib Bourguiba, Tunis" {...champ("adresse")} />
          </FormField>
          <CarteLieu
            coordonnees={details.coordonnees}
            recherche={details.adresse || details.lieu}
            adresse={details.adresse}
            onChange={(coordonnees) => onChange({ ...details, coordonnees })}
            onAdresse={(adresse) => onChange({ ...details, adresse: adresse.slice(0, 240) })}
          />
          <LiensCarte details={details} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2">
          <Label>Colors of this event</Label>
          <div className="flex flex-wrap gap-2">
            {config.palettes.map((p) => (
              <button
                key={`${p.fond}${p.principale}`}
                type="button"
                onClick={() => onPalette(p)}
                aria-label={`Apply the palette ${p.fond}, ${p.principale}, ${p.secondaire}`}
                className="flex overflow-hidden rounded-md border shadow-xs transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {[p.fond, p.principale, p.secondaire].map((c) => (
                  <span key={c} className="size-6" style={{ background: c }} />
                ))}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
      <PaletteIA typeEvenement={typeEvenement} onPalette={onPalette} />
    </div>
  );
}

/** The three map links, so the client can check them before printing the QR code. */
function LiensCarte({ details }: { details: DetailsInvitation }) {
  const google = lienGoogleMaps(details);
  if (!google) {
    return <p className="text-xs text-muted-foreground">Add the venue or its address, or place a pin, to get the map link and the QR code.</p>;
  }
  const liens = [
    { label: "Google Maps", href: google },
    { label: "Apple Maps", href: lienAppleMaps(details)! },
    { label: "Waze", href: lienWaze(details)! },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {liens.map((l) => (
        <Button key={l.label} type="button" variant="outline" size="sm" asChild>
          <a href={l.href} target="_blank" rel="noopener noreferrer">
            <ExternalLink aria-hidden />
            {l.label}
          </a>
        </Button>
      ))}
    </div>
  );
}

function Redaction({ details, typeEvenement, onTexte }: { details: DetailsInvitation; typeEvenement: TypeEvenement; onTexte: (texte: string) => void }) {
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
        typeEvenement,
        titre: details.titre || undefined,
        hotes: details.hotes || undefined,
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

function PaletteIA({ typeEvenement, onPalette }: { typeEvenement: TypeEvenement; onPalette: (palette: Palette) => void }) {
  const [ambiance, setAmbiance] = useState("");
  const [pending, start] = useTransition();

  const suggerer = () =>
    start(async () => {
      const result = await suggererPaletteAction({ ambiance, typeEvenement });
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
// Add: text styles, shapes, the decoration library, photos, QR code, countdown, and the card itself
// ---------------------------------------------------------------------------

const FORMES_AJOUT: { forme: Forme; label: string; icon: typeof Square; largeur: number; hauteur: number }[] = [
  { forme: "rect", label: "Rectangle", icon: Square, largeur: 160, hauteur: 100 },
  { forme: "ellipse", label: "Circle", icon: Circle, largeur: 120, hauteur: 120 },
  { forme: "line", label: "Line", icon: Minus, largeur: 160, hauteur: 4 },
  { forme: "heart", label: "Heart", icon: Heart, largeur: 80, hauteur: 80 },
  { forme: "star", label: "Star", icon: Star, largeur: 90, hauteur: 90 },
  { forme: "ring", label: "Ring", icon: Circle, largeur: 120, hauteur: 120 },
  { forme: "arch", label: "Arch", icon: Diamond, largeur: 140, hauteur: 190 },
  { forme: "frame", label: "Frame", icon: Frame, largeur: 300, hauteur: 420 },
];

type StyleTexte = ElementTexte["style"];

/** Ready-made text styles: a click adds a text with the style, or applies it to the selected text. */
export const PRESETS_TEXTE: { nom: string; texte: string; style: StyleTexte }[] = [
  { nom: "Calligraphy title", texte: "Sarah & Adam", style: { fontFamily: "Great Vibes", fontSize: 46, color: "#a8843f", align: "center", opacity: 1, bold: false, italic: false, letterSpacing: 0 } },
  { nom: "Elegant serif", texte: "You are invited", style: { fontFamily: "Playfair Display", fontSize: 26, color: "#333333", align: "center", opacity: 1, bold: false, italic: true, letterSpacing: 0 } },
  { nom: "Spaced label", texte: "Save the date", style: { fontFamily: "Montserrat", fontSize: 12, color: "#555555", align: "center", opacity: 1, bold: true, italic: false, letterSpacing: 4, majuscules: true } },
  { nom: "Body text", texte: "Dinner and dancing to follow", style: { fontFamily: "Cormorant Garamond", fontSize: 17, color: "#4a4032", align: "center", opacity: 1, bold: false, italic: false, letterSpacing: 0, lineHeight: 1.35 } },
  { nom: "Engraved", texte: "Celebration", style: { fontFamily: "Cinzel", fontSize: 30, color: "#ffffff", align: "center", opacity: 1, bold: true, italic: false, letterSpacing: 2, contour: { color: "#a8843f", width: 2 } } },
  { nom: "Soft shadow", texte: "Let's party!", style: { fontFamily: "Dancing Script", fontSize: 40, color: "#e63946", align: "center", opacity: 1, bold: true, italic: false, letterSpacing: 0, ombre: { color: "#000000", blur: 6, offsetX: 2, offsetY: 3, opacity: 0.25 } } },
  { nom: "Arched title", texte: "Happy birthday", style: { fontFamily: "Lato", fontSize: 30, color: "#219ebc", align: "center", opacity: 1, bold: true, italic: false, letterSpacing: 2, courbe: -45 } },
  { nom: "Arabic title", texte: "دعوة", style: { fontFamily: "El Messiri", fontSize: 38, color: "#2f5d50", align: "center", opacity: 1, bold: true, italic: false, letterSpacing: 0 } },
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
  const masqueRef = useRef<Masque | undefined>(undefined);
  const [envoi, setEnvoi] = useState(false);
  const config = configEvenement(contenu.typeEvenement ?? "MARIAGE");
  const couleurTexte = contenu.elements.find((e): e is ElementTexte => e.type === "text" && (e.linkedTo === "noms" || e.linkedTo === "titre"))?.style.color ?? "#333333";

  const ajouterTexte = (preset = PRESETS_TEXTE[1]) => {
    const element = {
      type: "text",
      text: preset.texte,
      width: 300,
      height: Math.ceil(preset.style.fontSize * 1.4),
      style: { ...preset.style },
    };
    onAjouter(preset.style.courbe ? { ...element, height: hauteurCourbe({ width: 300, style: preset.style }) } : element);
  };

  const ajouterImage = async (fichier: File | undefined) => {
    if (!fichier) return;
    setEnvoi(true);
    const image = await envoyerImage(fichier);
    setEnvoi(false);
    if (!image) return;
    const masque = masqueRef.current;
    const largeur = Math.min(240, contenu.size.width * 0.6);
    const hauteur = masque ? (masque === "ARCHE" ? largeur * 1.3 : largeur) : (largeur * image.height) / image.width;
    onAjouter({
      type: "image",
      src: image.src,
      width: largeur,
      height: hauteur,
      style: masque ? { opacity: 1, masque, cadre: { color: couleurTexte, width: 3 } } : { opacity: 1 },
    });
  };

  const choisirImage = (masque?: Masque) => {
    masqueRef.current = masque;
    imageRef.current?.click();
  };

  const changerFond = async (fichier: File | undefined) => {
    if (!fichier) return;
    setEnvoi(true);
    const image = await envoyerImage(fichier);
    setEnvoi(false);
    if (image) onContenu({ ...contenu, background: { ...contenu.background, image: image.src } });
  };

  const ajouterDecoration = (src: string, groupe: string) => {
    const image = new window.Image();
    image.onload = () => {
      const cadre = groupe === "Frames" && src.includes("frame");
      const largeur = cadre ? contenu.size.width * 0.9 : 120;
      onAjouter({ type: "image", src, width: largeur, height: (largeur * image.naturalHeight) / image.naturalWidth, style: { opacity: 1 } });
    };
    image.src = src;
  };

  const format = FORMATS_CARTE.find((f) => f.width === contenu.size.width && f.height === contenu.size.height);
  const decorationsDuType = config.decorations.map((f) => DECORATIONS.find((d) => d.src.endsWith(`/${f}.svg`))).filter((d): d is (typeof DECORATIONS)[number] => !!d);

  const vignette = (d: (typeof DECORATIONS)[number]) => (
    <button
      key={d.src}
      type="button"
      title={d.label}
      aria-label={`Add ${d.label.toLowerCase()}`}
      className="flex aspect-square items-center justify-center rounded-md border bg-white p-1.5 transition-colors hover:border-primary"
      onClick={() => ajouterDecoration(d.src, d.groupe)}
    >
      <Image src={d.src} alt="" width={48} height={48} unoptimized className="size-full object-contain" />
    </button>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3">
          <TitreSection>Text</TitreSection>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS_TEXTE.map((p) => (
              <button
                key={p.nom}
                type="button"
                onClick={() => ajouterTexte(p)}
                className="truncate rounded-md border bg-white px-2 py-2 text-center text-[15px] text-neutral-800 transition-colors hover:border-primary"
                style={{ fontFamily: p.style.fontFamily, fontWeight: p.style.bold ? 700 : 400, fontStyle: p.style.italic ? "italic" : "normal" }}
                title={`Add: ${p.nom}`}
              >
                {p.nom}
              </button>
            ))}
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={() => ajouterTexte()}>
            <Type aria-hidden />
            Add text
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <TitreSection>Photos</TitreSection>
          <Button type="button" variant="outline" className="w-full" disabled={envoi} onClick={() => choisirImage()}>
            {envoi ? <Loader2 className="animate-spin" aria-hidden /> : <ImagePlus aria-hidden />}
            Add my image
          </Button>
          <div className="grid grid-cols-3 gap-2">
            {MASQUES.map((m) => (
              <Button key={m} type="button" variant="outline" size="sm" disabled={envoi} onClick={() => choisirImage(m)}>
                {m === "COEUR" ? <Heart aria-hidden /> : <Circle aria-hidden />}
                {masqueLabels[m]}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Photos in a circle, an arch or a heart get a thin frame you can change.</p>
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <TitreSection>Shapes</TitreSection>
          <div className="grid grid-cols-4 gap-2">
            {FORMES_AJOUT.map(({ forme, label, icon: Icon, largeur, hauteur }) => (
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
                        ? { fill: null, stroke: couleurTexte, strokeWidth: 2, opacity: 1 }
                        : forme === "frame" || forme === "ring"
                          ? { fill: couleurTexte, stroke: null, strokeWidth: 0, opacity: 1, epaisseur: forme === "frame" ? 3 : 10 }
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
          <TitreSection>Practical</TitreSection>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onAjouter({ type: "qrcode", cible: "CARTE", width: 96, height: 96, style: { couleur: "#111111", fond: "#ffffff", marge: 4, opacity: 1 } })
              }
            >
              <QrCode aria-hidden />
              QR to the venue
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onAjouter({
                  type: "countdown",
                  width: 300,
                  height: 72,
                  style: { fontFamily: config.polices.texte, fontSize: 28, color: couleurTexte, fond: null, opacity: 1, unites: "JOURS_HEURES" },
                })
              }
            >
              <Timer aria-hidden />
              Countdown
            </Button>
          </div>
          {!lienGoogleMaps(contenu.details) && (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              The QR code opens Google Maps on the venue: fill in the venue in Details first.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">For this event</p>
            <div className="grid grid-cols-4 gap-2">{decorationsDuType.map(vignette)}</div>
          </div>
          {GROUPES_DECORATION.map((groupe) => (
            <div key={groupe}>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{groupe}</p>
              <div className="grid grid-cols-4 gap-2">{DECORATIONS.filter((d) => d.groupe === groupe).map(vignette)}</div>
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
          <FormField id="evenement" label="Event type">
            <Select value={contenu.typeEvenement ?? "MARIAGE"} onValueChange={(v) => onContenu({ ...contenu, typeEvenement: v as TypeEvenement })}>
              <SelectTrigger id="evenement" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LISTE_EVENEMENTS.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
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
// Style of the selection
// ---------------------------------------------------------------------------

type OnChange = (id: string, patch: Partial<ElementInvitation>, cle?: string) => void;

export function PanneauStyle({
  element,
  selection = element ? [element] : [],
  contenu,
  onChange,
  onContenu,
  onSupprimer,
  onCouches,
  onAligner,
}: {
  element: ElementInvitation | undefined;
  selection?: ElementInvitation[];
  contenu: ContenuInvitation;
  onChange: OnChange;
  onContenu: (contenu: ContenuInvitation, cle?: string) => void;
  onSupprimer: () => void;
  onCouches?: (vers: DeplacementCouche) => void;
  onAligner?: (mode: Alignement) => void;
}) {
  if (selection.length > 1) return <StylePlusieurs selection={selection} contenu={contenu} onContenu={onContenu} onSupprimer={onSupprimer} onAligner={onAligner} />;
  if (!element) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Select something on the card to change its style. Shift + click selects several.
        </CardContent>
      </Card>
    );
  }

  const style = (patch: Record<string, unknown>, champ: string) =>
    onChange(element.id, { style: { ...element.style, ...patch } } as Partial<ElementInvitation>, `style:${element.id}:${champ}`);

  const couches = (vers: DeplacementCouche) => onCouches?.(vers);

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{element.nom || typeElementLabels[element.type]}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(element.id, { verrouille: !element.verrouille || undefined })}
            aria-pressed={!!element.verrouille}
          >
            {element.verrouille ? <Lock aria-hidden /> : <LockOpen aria-hidden />}
            {element.verrouille ? "Locked" : "Lock"}
          </Button>
        </div>
        {element.verrouille && <p className="rounded-lg bg-muted/50 p-2.5 text-xs text-slate">This element is locked: it cannot be moved on the card. Unlock it to change it.</p>}

        <fieldset disabled={!!element.verrouille} className="space-y-4 disabled:opacity-60">
          {element.type === "text" && <StyleTexte element={element} type={contenu.typeEvenement ?? "MARIAGE"} onChange={onChange} style={style} />}
          {element.type === "image" && <StyleImage element={element} style={style} />}
          {element.type === "shape" && <StyleForme element={element} style={style} />}
          {element.type === "qrcode" && <StyleQr element={element} details={contenu.details} onChange={onChange} style={style} />}
          {element.type === "countdown" && <StyleCompte element={element} style={style} />}

          {element.type !== "qrcode" && (
            <Curseur id="opacite" label="Opacity" min={0.05} max={1} step={0.05} value={element.style.opacity} onChange={(v) => style({ opacity: v }, "opacity")} />
          )}
          <Curseur id="rotation" label="Rotation" suffixe="°" min={-180} max={180} step={1} value={Math.round(element.rotation)} onChange={(v) => onChange(element.id, { rotation: v }, `rotation:${element.id}`)} />

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Layer and flip</p>
            <div className="grid grid-cols-6 gap-2">
              <Button type="button" variant="outline" size="icon" className="w-full" title="To the front (Ctrl+])" aria-label="To the front" onClick={() => couches("devant")}><BringToFront aria-hidden /></Button>
              <Button type="button" variant="outline" size="icon" className="w-full" title="Forward (])" aria-label="Forward" onClick={() => couches("avant")}><ArrowUp aria-hidden /></Button>
              <Button type="button" variant="outline" size="icon" className="w-full" title="Backward ([)" aria-label="Backward" onClick={() => couches("arriere")}><ArrowDown aria-hidden /></Button>
              <Button type="button" variant="outline" size="icon" className="w-full" title="To the back (Ctrl+[)" aria-label="To the back" onClick={() => couches("fond")}><SendToBack aria-hidden /></Button>
              <BasculeIcone actif={!!element.flipX} label="Flip horizontally" onClick={() => onChange(element.id, { flipX: !element.flipX || undefined })}><FlipHorizontal2 aria-hidden /></BasculeIcone>
              <BasculeIcone actif={!!element.flipY} label="Flip vertically" onClick={() => onChange(element.id, { flipY: !element.flipY || undefined })}><FlipVertical2 aria-hidden /></BasculeIcone>
            </div>
          </div>
        </fieldset>

        <Button type="button" variant="ghost" className="w-full text-destructive" onClick={onSupprimer} disabled={!!element.verrouille}>
          <Trash2 aria-hidden />
          Delete this element
        </Button>
      </CardContent>
    </Card>
  );
}

function StylePlusieurs({
  selection,
  contenu,
  onContenu,
  onSupprimer,
  onAligner,
}: {
  selection: ElementInvitation[];
  contenu: ContenuInvitation;
  onContenu: (contenu: ContenuInvitation, cle?: string) => void;
  onSupprimer: () => void;
  onAligner?: (mode: Alignement) => void;
}) {
  const ids = selection.map((e) => e.id);
  const opacite = Math.min(...selection.map((e) => e.style.opacity));
  return (
    <Card>
      <CardContent className="space-y-4">
        <p className="text-sm font-semibold">{selection.length} elements selected</p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["gauche", "Left"],
              ["centreH", "Center"],
              ["droite", "Right"],
              ["haut", "Top"],
              ["centreV", "Middle"],
              ["bas", "Bottom"],
            ] as [Alignement, string][]
          ).map(([mode, label]) => (
            <Button key={mode} type="button" variant="outline" size="sm" onClick={() => onAligner?.(mode)}>
              {label}
            </Button>
          ))}
        </div>
        <Curseur
          id="opacite-plusieurs"
          label="Opacity"
          min={0.05}
          max={1}
          step={0.05}
          value={opacite}
          onChange={(v) =>
            onContenu(
              { ...contenu, elements: contenu.elements.map((e) => (ids.includes(e.id) && e.type !== "qrcode" ? ({ ...e, style: { ...e.style, opacity: v } } as ElementInvitation) : e)) },
              `opacite:${ids.join(",")}`,
            )
          }
        />
        <p className="text-xs text-muted-foreground">Group them (Ctrl+G) to move them together later. Arrows move them, Shift + arrows by 10.</p>
        <Button type="button" variant="ghost" className="w-full text-destructive" onClick={onSupprimer}>
          <Trash2 aria-hidden />
          Delete {selection.length} elements
        </Button>
      </CardContent>
    </Card>
  );
}

function StyleTexte({
  element,
  type,
  onChange,
  style,
}: {
  element: ElementTexte;
  type: TypeEvenement;
  onChange: OnChange;
  style: (patch: Record<string, unknown>, champ: string) => void;
}) {
  const s = element.style;
  const arabe = estArabe(element.text);
  const appliquerPreset = (nom: string) => {
    const preset = PRESETS_TEXTE.find((p) => p.nom === nom);
    if (!preset) return;
    const suivant = { ...preset.style, align: s.align };
    onChange(element.id, { style: suivant, height: suivant.courbe ? hauteurCourbe({ width: element.width, style: suivant }) : element.height } as Partial<ElementTexte>);
  };
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
              <SelectItem key={c} value={c}>{libelleChamp(type, c)}</SelectItem>
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
      <FormField id="preset" label="Text style">
        <Select value="" onValueChange={appliquerPreset}>
          <SelectTrigger id="preset" className="w-full">
            <SelectValue placeholder="Apply a ready-made style" />
          </SelectTrigger>
          <SelectContent>
            {PRESETS_TEXTE.map((p) => (
              <SelectItem key={p.nom} value={p.nom} style={{ fontFamily: p.style.fontFamily }}>{p.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField id="police" label="Font">
        <Select value={s.fontFamily} onValueChange={(v) => style({ fontFamily: v as Police }, "fontFamily")}>
          <SelectTrigger id="police" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Latin</SelectLabel>
              {POLICES.filter((p) => !POLICES_ARABES.includes(p)).map((p) => (
                <SelectItem key={p} value={p} style={{ fontFamily: p }}>{p}</SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Arabic and Latin</SelectLabel>
              {POLICES_ARABES.map((p) => (
                <SelectItem key={p} value={p} style={{ fontFamily: p }}>{p} · عربي</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </FormField>
      <Curseur id="taille" label="Size" min={8} max={120} step={1} value={s.fontSize} onChange={(v) => style({ fontSize: v }, "fontSize")} />
      <Couleur id="couleur" label="Color" value={s.color} onChange={(color) => style({ color }, "color")} />
      <div className="flex flex-wrap gap-2">
        <BasculeIcone actif={s.align === "left"} label="Align left" onClick={() => style({ align: "left" }, "align")}><AlignLeft aria-hidden /></BasculeIcone>
        <BasculeIcone actif={s.align === "center"} label="Align center" onClick={() => style({ align: "center" }, "align")}><AlignCenter aria-hidden /></BasculeIcone>
        <BasculeIcone actif={s.align === "right"} label="Align right" onClick={() => style({ align: "right" }, "align")}><AlignRight aria-hidden /></BasculeIcone>
        <span className="mx-1 w-px self-stretch bg-border" aria-hidden />
        <BasculeIcone actif={s.bold} label="Bold" onClick={() => style({ bold: !s.bold }, "bold")}><Bold aria-hidden /></BasculeIcone>
        <BasculeIcone actif={s.italic} label="Italic" onClick={() => style({ italic: !s.italic }, "italic")}><Italic aria-hidden /></BasculeIcone>
        <BasculeIcone actif={!!s.majuscules} label="Capital letters" onClick={() => style({ majuscules: !s.majuscules || undefined }, "majuscules")}><CaseUpper aria-hidden /></BasculeIcone>
      </div>
      <Curseur id="espacement" label="Letter spacing" min={0} max={20} step={0.5} value={s.letterSpacing} onChange={(v) => style({ letterSpacing: v }, "letterSpacing")} />
      <Curseur id="interligne" label="Line height" min={0.8} max={2.5} step={0.05} value={s.lineHeight ?? 1.25} onChange={(v) => style({ lineHeight: v }, "lineHeight")} />
      <div className="space-y-1">
        <Curseur
          id="courbe"
          label="Curve"
          min={-100}
          max={100}
          step={5}
          value={s.courbe ?? 0}
          onChange={(v) => {
            const suivant = { ...s, courbe: v === 0 ? undefined : v };
            onChange(element.id, { style: suivant, height: hauteurCourbe({ width: element.width, style: suivant }) } as Partial<ElementTexte>, `style:${element.id}:courbe`);
          }}
        />
        {arabe && (s.courbe ?? 0) !== 0 && <p className="text-xs text-muted-foreground">Arabic text stays straight: its letters must stay joined.</p>}
      </div>
      <div className="space-y-2 rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="ombre">Shadow</Label>
          <Switch id="ombre" checked={!!s.ombre} onCheckedChange={(v) => style({ ombre: v ? { color: "#000000", blur: 6, offsetX: 2, offsetY: 3, opacity: 0.3 } : undefined }, "ombre")} />
        </div>
        {s.ombre && (
          <>
            <Couleur id="ombre-couleur" label="Shadow color" value={s.ombre.color} onChange={(color) => style({ ombre: { ...s.ombre!, color } }, "ombre")} />
            <Curseur id="ombre-flou" label="Blur" min={0} max={40} step={1} value={s.ombre.blur} onChange={(blur) => style({ ombre: { ...s.ombre!, blur } }, "ombre")} />
            <Curseur id="ombre-y" label="Distance" min={-20} max={20} step={1} value={s.ombre.offsetY} onChange={(offsetY) => style({ ombre: { ...s.ombre!, offsetY, offsetX: Math.round(offsetY * 0.6) } }, "ombre")} />
            <Curseur id="ombre-opacite" label="Strength" min={0.05} max={1} step={0.05} value={s.ombre.opacity} onChange={(opacity) => style({ ombre: { ...s.ombre!, opacity } }, "ombre")} />
          </>
        )}
      </div>
      <div className="space-y-2 rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="contour">Outline</Label>
          <Switch id="contour" checked={!!s.contour} onCheckedChange={(v) => style({ contour: v ? { color: "#ffffff", width: 2 } : undefined }, "contour")} />
        </div>
        {s.contour && (
          <>
            <Couleur id="contour-couleur" label="Outline color" value={s.contour.color} onChange={(color) => style({ contour: { ...s.contour!, color } }, "contour")} />
            <Curseur id="contour-epaisseur" label="Width" min={0.5} max={10} step={0.5} value={s.contour.width} onChange={(width) => style({ contour: { ...s.contour!, width } }, "contour")} />
          </>
        )}
      </div>
    </>
  );
}

function StyleImage({ element, style }: { element: ElementImage; style: (patch: Record<string, unknown>, champ: string) => void }) {
  const s = element.style;
  return (
    <>
      <FormField id="masque" label="Shape of the photo">
        <Select value={s.masque ?? "aucun"} onValueChange={(v) => style({ masque: v === "aucun" ? undefined : v }, "masque")}>
          <SelectTrigger id="masque" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="aucun">As it is</SelectItem>
            {MASQUES.map((m) => (
              <SelectItem key={m} value={m}>{masqueLabels[m]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <div className="space-y-2 rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="cadre">Frame</Label>
          <Switch id="cadre" checked={!!s.cadre} onCheckedChange={(v) => style({ cadre: v ? { color: "#c9a24a", width: 3 } : undefined }, "cadre")} />
        </div>
        {s.cadre && (
          <>
            <Couleur id="cadre-couleur" label="Frame color" value={s.cadre.color} onChange={(color) => style({ cadre: { ...s.cadre!, color } }, "cadre")} />
            <Curseur id="cadre-epaisseur" label="Width" min={1} max={30} step={1} value={s.cadre.width} onChange={(width) => style({ cadre: { ...s.cadre!, width } }, "cadre")} />
          </>
        )}
      </div>
      <FormField id="filtre" label="Filter">
        <Select value={s.filtre ?? "aucun"} onValueChange={(v) => style({ filtre: v === "aucun" ? undefined : v }, "filtre")}>
          <SelectTrigger id="filtre" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="aucun">None</SelectItem>
            {FILTRES.map((f) => (
              <SelectItem key={f} value={f}>{filtreLabels[f]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
    </>
  );
}

function StyleForme({ element, style }: { element: ElementForme; style: (patch: Record<string, unknown>, champ: string) => void }) {
  const s = element.style;
  const aCoins = element.shape === "rect" || element.shape === "frame";
  const aEpaisseur = element.shape === "ring" || element.shape === "frame";
  return (
    <>
      {element.shape !== "line" && (
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Switch id="avec-fond" checked={s.fill !== null} onCheckedChange={(v) => style({ fill: v ? "#e8c9c9" : null, degrade: v ? s.degrade : undefined }, "fill")} aria-label="Fill" />
              <Label htmlFor="avec-fond">Fill</Label>
            </div>
            {s.fill !== null && !s.degrade && (
              <input type="color" aria-label="Fill color" value={s.fill} onChange={(e) => style({ fill: e.target.value }, "fill")} className="h-8 w-12 cursor-pointer rounded border bg-transparent p-0.5" />
            )}
          </div>
          {s.fill !== null && (
            <div className="flex items-center justify-between">
              <Label htmlFor="degrade">Gradient</Label>
              <Switch
                id="degrade"
                checked={!!s.degrade}
                onCheckedChange={(v) => style({ degrade: v ? { type: "LINEAIRE", de: s.fill ?? "#e8c9c9", a: "#ffffff", angle: 90 } : undefined }, "degrade")}
              />
            </div>
          )}
          {s.fill !== null && s.degrade && (
            <>
              <Select value={s.degrade.type} onValueChange={(v) => style({ degrade: { ...s.degrade!, type: v } }, "degrade")}>
                <SelectTrigger aria-label="Type of gradient" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LINEAIRE">Linear</SelectItem>
                  <SelectItem value="RADIAL">Radial</SelectItem>
                </SelectContent>
              </Select>
              <Couleur id="degrade-de" label="From" value={s.degrade.de} onChange={(de) => style({ degrade: { ...s.degrade!, de } }, "degrade")} />
              <Couleur id="degrade-a" label="To" value={s.degrade.a} onChange={(a) => style({ degrade: { ...s.degrade!, a } }, "degrade")} />
              {s.degrade.type === "LINEAIRE" && (
                <Curseur id="degrade-angle" label="Angle" suffixe="°" min={0} max={360} step={5} value={s.degrade.angle} onChange={(angle) => style({ degrade: { ...s.degrade!, angle } }, "degrade")} />
              )}
            </>
          )}
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Switch
            id="avec-trait"
            checked={s.stroke !== null}
            onCheckedChange={(v) => style({ stroke: v ? "#b08d57" : null, strokeWidth: v ? Math.max(s.strokeWidth, 2) : 0 }, "stroke")}
            aria-label="Outline"
          />
          <Label htmlFor="avec-trait">Outline</Label>
        </div>
        {s.stroke !== null && (
          <input type="color" aria-label="Outline color" value={s.stroke} onChange={(e) => style({ stroke: e.target.value }, "stroke")} className="h-8 w-12 cursor-pointer rounded border bg-transparent p-0.5" />
        )}
      </div>
      {s.stroke !== null && <Curseur id="epaisseur" label="Outline width" min={1} max={30} step={1} value={s.strokeWidth} onChange={(v) => style({ strokeWidth: v }, "strokeWidth")} />}
      {aCoins && <Curseur id="coins" label="Rounded corners" min={0} max={120} step={1} value={s.cornerRadius ?? 0} onChange={(v) => style({ cornerRadius: v || undefined }, "cornerRadius")} />}
      {aEpaisseur && <Curseur id="epaisseur-forme" label="Thickness" min={1} max={80} step={1} value={s.epaisseur ?? 10} onChange={(v) => style({ epaisseur: v }, "epaisseur")} />}
    </>
  );
}

function StyleQr({
  element,
  details,
  onChange,
  style,
}: {
  element: ElementQr;
  details: DetailsInvitation;
  onChange: OnChange;
  style: (patch: Record<string, unknown>, champ: string) => void;
}) {
  const s = element.style;
  const controle = controleElementQr(element);
  const lien = lienGoogleMaps(details);
  /** Colors the schema would refuse are corrected on the spot: the code must stay readable. */
  const changerCouleur = (patch: { couleur?: string; fond?: string }) => {
    const suivant = { ...s, ...patch };
    style({ couleur: assurerContraste(suivant.couleur, suivant.fond, 3), fond: suivant.fond }, "couleurs");
  };
  return (
    <>
      <div className="rounded-lg bg-muted/50 p-2.5 text-xs text-slate">
        {lien ? (
          <>
            Opens Google Maps on the venue.{" "}
            <a href={lien} target="_blank" rel="noopener noreferrer" className="font-medium text-primary-text underline-offset-2 hover:underline">
              Test the link
            </a>
          </>
        ) : (
          "Fill in the venue, its address or place a pin in Details: the code shows a placeholder until then."
        )}
      </div>
      <Couleur id="qr-couleur" label="Code color" value={s.couleur} onChange={(couleur) => changerCouleur({ couleur })} />
      <Couleur id="qr-fond" label="Background" value={s.fond} onChange={(fond) => changerCouleur({ fond })} />
      <Curseur id="qr-marge" label="White margin" min={2} max={8} step={1} value={s.marge} onChange={(v) => style({ marge: v }, "marge")} />
      <Curseur
        id="qr-taille"
        label="Size"
        suffixe=" pt"
        min={48}
        max={240}
        step={2}
        value={Math.round(element.width)}
        onChange={(v) => onChange(element.id, { width: v, height: v }, `taille:${element.id}`)}
      />
      {controle.avertissements.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-warning/40 bg-warning/10 p-2.5 text-xs text-foreground">
          {controle.avertissements.map((a) => (
            <li key={a}>• {a}</li>
          ))}
          <li>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-1"
              onClick={() =>
                onChange(element.id, {
                  width: Math.max(element.width, 72),
                  height: Math.max(element.width, 72),
                  style: { ...s, couleur: assurerContraste(s.couleur, "#ffffff", QR_CONTRASTE_CONSEILLE), fond: "#ffffff", marge: Math.max(4, s.marge) },
                } as Partial<ElementQr>)
              }
            >
              <Wand2 aria-hidden />
              Make it easy to scan
            </Button>
          </li>
        </ul>
      )}
    </>
  );
}

function StyleCompte({ element, style }: { element: ElementCompte; style: (patch: Record<string, unknown>, champ: string) => void }) {
  const s = element.style;
  return (
    <>
      <p className="rounded-lg bg-muted/50 p-2.5 text-xs text-slate">
        Guests see the time left until the event on the shared link. The editor and printed files show the date itself.
      </p>
      <FormField id="unites" label="Show">
        <Select value={s.unites} onValueChange={(v) => style({ unites: v }, "unites")}>
          <SelectTrigger id="unites" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNITES_COMPTE.map((u) => (
              <SelectItem key={u} value={u}>{unitesCompteLabels[u]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField id="compte-police" label="Font">
        <Select value={s.fontFamily} onValueChange={(v) => style({ fontFamily: v }, "fontFamily")}>
          <SelectTrigger id="compte-police" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {POLICES.map((p) => (
              <SelectItem key={p} value={p} style={{ fontFamily: p }}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <Curseur id="compte-taille" label="Size" min={10} max={80} step={1} value={s.fontSize} onChange={(v) => style({ fontSize: v }, "fontSize")} />
      <Couleur id="compte-couleur" label="Color" value={s.color} onChange={(color) => style({ color }, "color")} />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Switch id="compte-fond" checked={s.fond !== null} onCheckedChange={(v) => style({ fond: v ? "#ffffff" : null }, "fond")} />
          <Label htmlFor="compte-fond">Boxes</Label>
        </div>
        {s.fond !== null && <input type="color" aria-label="Color of the boxes" value={s.fond} onChange={(e) => style({ fond: e.target.value }, "fond")} className="h-8 w-12 cursor-pointer rounded border bg-transparent p-0.5" />}
      </div>
    </>
  );
}
