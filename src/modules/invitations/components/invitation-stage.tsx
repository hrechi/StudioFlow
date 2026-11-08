"use client";

/**
 * renderInvitation: draws any invitation document on a Konva stage. Used by the editor (editable),
 * the thumbnails and exports (still), and the public page (animated). Browser only: load it
 * through next/dynamic.
 *
 * Still mode is the printed state: no animation, and countdowns show the date of the event.
 * Playback mode (`lecture`) plays the entrances and loops frame by frame without re-rendering React.
 */
import "@fontsource/great-vibes/400.css";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/400-italic.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource/cormorant-garamond/700.css";
import "@fontsource/montserrat/400.css";
import "@fontsource/montserrat/400-italic.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/amiri/400.css";
import "@fontsource/amiri/700.css";
import "@fontsource/cairo/400.css";
import "@fontsource/cairo/700.css";
import "@fontsource/dancing-script/400.css";
import "@fontsource/dancing-script/700.css";
import "@fontsource/cinzel/400.css";
import "@fontsource/cinzel/700.css";
import "@fontsource/lato/400.css";
import "@fontsource/lato/400-italic.css";
import "@fontsource/lato/700.css";
import "@fontsource/tajawal/400.css";
import "@fontsource/tajawal/700.css";
import "@fontsource/el-messiri/400.css";
import "@fontsource/el-messiri/700.css";
import "@fontsource/reem-kufi/400.css";
import "@fontsource/reem-kufi/700.css";
import Konva from "konva";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Group, Image as KonvaImage, Layer, Line, Rect, Shape, Stage, Text, Transformer } from "react-konva";
import { compteARebours, etatAnimation } from "../invitation.animation";
import { chargerImage, chargerPolices, imageChargee, styleTexte } from "../invitation.canvas";
import { estArabe } from "../invitation.linked";
import { hauteurCourbe, surGrille } from "../invitation.outils";
import { matriceQr, texteQr } from "../invitation.qr";
import {
  estVisible,
  type ContenuInvitation,
  type DetailsInvitation,
  type ElementCompte,
  type ElementForme,
  type ElementImage,
  type ElementInvitation,
  type ElementQr,
  type ElementTexte,
  type Langue,
} from "../invitation.schema";
import { calculerSnap, type Boite } from "../invitation.snap";

type PatchGeometrie = Partial<Pick<ElementInvitation, "x" | "y" | "width" | "height" | "rotation">>;

export type EditionStage = {
  selection: string[];
  /** `ajouter`: Shift / Ctrl click, or the "select several" mode on a touch screen. */
  onSelect: (id: string | null, ajouter?: boolean) => void;
  onChange: (id: string, patch: PatchGeometrie) => void;
  /** Several elements moved or resized together: one step in the history. */
  onChangeMany: (patches: { id: string; patch: PatchGeometrie }[]) => void;
  /** Grid size in card points, or null. Shown, and dragged elements snap to it. */
  grille?: number | null;
  multiple?: boolean;
};

/** Playback: `debut` is the performance.now() of the opening, or null while the card is still closed. */
export type LectureStage = { debut: number | null };

function useImageLocale(src: string | undefined) {
  const [image, setImage] = useState<HTMLImageElement | undefined>(() => (src ? imageChargee(src) : undefined));
  useEffect(() => {
    if (!src) return;
    let actif = true;
    chargerImage(src).then((el) => {
      if (actif) setImage(el);
    }).catch(() => undefined);
    return () => {
      actif = false;
    };
  }, [src]);
  return src ? image : undefined;
}

type NoeudProps = {
  id: string;
  name: string;
  x: number;
  y: number;
  rotation: number;
  draggable: boolean;
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
  onClick?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onTap?: () => void;
  onDragStart?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragMove?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd?: (e: Konva.KonvaEventObject<Event>) => void;
  onTransform?: (e: Konva.KonvaEventObject<Event>) => void;
};

// ── Text ─────────────────────────────────────────────────────────────────────

const LOCALE: Record<Langue, string> = { fr: "fr-FR", en: "en-GB", ar: "ar" };

function texteAffiche(element: ElementTexte, langue: Langue) {
  return element.style.majuscules ? element.text.toLocaleUpperCase(LOCALE[langue]) : element.text;
}

function ombreProps(ombre: ElementTexte["style"]["ombre"]) {
  if (!ombre) return {};
  return {
    shadowEnabled: true,
    shadowColor: ombre.color,
    shadowBlur: ombre.blur,
    shadowOffsetX: ombre.offsetX,
    shadowOffsetY: ombre.offsetY,
    shadowOpacity: ombre.opacity,
  };
}

function NoeudTexte({ element, noeud, langue }: { element: ElementTexte; noeud: NoeudProps; langue: Langue }) {
  const arabe = estArabe(element.text);
  const s = element.style;
  const texte = texteAffiche(element, langue);
  const courbe = s.courbe ?? 0;

  // Arabic letters join: drawing them one by one along a curve would break the words.
  if (courbe !== 0 && !arabe) {
    return (
      <Shape
        {...noeud}
        width={element.width}
        height={hauteurCourbe(element)}
        opacity={s.opacity}
        sceneFunc={(ctx, shape) => dessinerTexteCourbe(ctx, shape, element, texte)}
        hitFunc={(ctx, shape) => {
          ctx.beginPath();
          ctx.rect(0, 0, shape.width(), shape.height());
          ctx.closePath();
          ctx.fillStrokeShape(shape);
        }}
      />
    );
  }
  return (
    <Text
      {...noeud}
      {...styleTexte(s)}
      {...ombreProps(s.ombre)}
      text={texte}
      width={element.width}
      lineHeight={s.lineHeight ?? 1.25}
      align={s.align}
      fill={s.color}
      opacity={s.opacity}
      stroke={s.contour && s.contour.width > 0 ? s.contour.color : undefined}
      strokeWidth={s.contour?.width ?? 0}
      fillAfterStrokeEnabled
      // Arabic letters must stay joined: no spacing, and the canvas shapes it right to left.
      letterSpacing={arabe ? 0 : s.letterSpacing}
      direction={arabe ? "rtl" : "ltr"}
    />
  );
}

/** Letters placed one by one on an arc whose depth follows `courbe` (−100 … 100). */
function dessinerTexteCourbe(ctx: Konva.Context, shape: Konva.Shape, element: ElementTexte, texte: string) {
  const s = element.style;
  const natif = ctx._context;
  const { fontFamily, fontSize, fontStyle } = styleTexte(s);
  const w = shape.width();
  natif.save();
  natif.font = `${fontStyle === "normal" ? "" : fontStyle} ${fontSize}px ${fontFamily}`.trim();
  natif.textAlign = "center";
  natif.textBaseline = "middle";
  natif.fillStyle = s.color;
  if (s.ombre) {
    natif.shadowColor = s.ombre.color;
    natif.shadowBlur = s.ombre.blur;
    natif.shadowOffsetX = s.ombre.offsetX;
    natif.shadowOffsetY = s.ombre.offsetY;
  }
  const lettres = [...texte];
  const largeurs = lettres.map((l) => natif.measureText(l).width + s.letterSpacing);
  const longueur = largeurs.reduce((a, b) => a + b, 0);
  const courbe = s.courbe ?? 0;
  const fleche = (Math.abs(courbe) / 100) * w * 0.35;
  const rayon = (w * w / 4 + fleche * fleche) / (2 * fleche);
  const sourire = courbe > 0;
  const milieuY = fontSize * 0.7;
  const cy = sourire ? milieuY + fleche - rayon : milieuY + rayon;
  let angle = -longueur / 2 / rayon;
  lettres.forEach((lettre, i) => {
    const a = angle + largeurs[i] / 2 / rayon;
    const x = w / 2 + rayon * Math.sin(a);
    const y = sourire ? cy + rayon * Math.cos(a) : cy - rayon * Math.cos(a);
    natif.save();
    natif.translate(x, y);
    natif.rotate(sourire ? -a : a);
    if (s.contour && s.contour.width > 0) {
      natif.strokeStyle = s.contour.color;
      natif.lineWidth = s.contour.width;
      natif.strokeText(lettre, 0, 0);
    }
    natif.fillText(lettre, 0, 0);
    natif.restore();
    angle += largeurs[i] / rayon;
  });
  natif.restore();
}

// ── Images ───────────────────────────────────────────────────────────────────

const FILTRES_CSS: Record<NonNullable<ElementImage["style"]["filtre"]>, string> = {
  NOIR_BLANC: "grayscale(1)",
  SEPIA: "sepia(0.8)",
  DOUX: "contrast(0.9) brightness(1.08) saturate(0.85)",
  CHAUD: "sepia(0.25) saturate(1.25) hue-rotate(-8deg)",
};

const COEUR: [number, number, number, number, number, number][] = [
  [0.2, 0.72, 0, 0.45, 0, 0.27],
  [0, 0.1, 0.13, 0, 0.27, 0],
  [0.37, 0, 0.45, 0.06, 0.5, 0.17],
  [0.55, 0.06, 0.63, 0, 0.73, 0],
  [0.87, 0, 1, 0.1, 1, 0.27],
  [1, 0.45, 0.8, 0.72, 0.5, 1],
];

type Trace = Pick<CanvasRenderingContext2D, "moveTo" | "lineTo" | "bezierCurveTo" | "ellipse" | "rect" | "closePath" | "arc">;

function tracerCoeur(ctx: Trace, w: number, h: number) {
  ctx.moveTo(0.5 * w, h);
  for (const [a, b, c, d, e, f] of COEUR) ctx.bezierCurveTo(a * w, b * h, c * w, d * h, e * w, f * h);
  ctx.closePath();
}

function tracerArche(ctx: Trace, w: number, h: number) {
  const r = Math.min(w / 2, h);
  ctx.moveTo(0, h);
  ctx.lineTo(0, r);
  ctx.ellipse(w / 2, r, w / 2, r, 0, Math.PI, 0);
  ctx.lineTo(w, h);
  ctx.closePath();
}

function tracerMasque(ctx: Trace, masque: ElementImage["style"]["masque"], w: number, h: number) {
  if (masque === "CERCLE") ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  else if (masque === "ARCHE") tracerArche(ctx, w, h);
  else if (masque === "COEUR") tracerCoeur(ctx, w, h);
  else ctx.rect(0, 0, w, h);
}

function NoeudImage({ element, noeud }: { element: ElementImage; noeud: NoeudProps }) {
  const image = useImageLocale(element.src);
  const { masque, cadre, filtre, opacity } = element.style;
  if (!masque && !cadre && !filtre) {
    return <KonvaImage {...noeud} image={image} width={element.width} height={element.height} opacity={opacity} />;
  }
  // Masked, framed or filtered: drawn by hand so the export stays sharp at 300 dpi.
  return (
    <Shape
      {...noeud}
      width={element.width}
      height={element.height}
      opacity={opacity}
      sceneFunc={(ctx, shape) => {
        const natif = ctx._context;
        const w = shape.width();
        const h = shape.height();
        natif.save();
        natif.beginPath();
        tracerMasque(natif, masque, w, h);
        natif.clip();
        if (image) {
          // Cover: the image fills the shape, the overflow is cropped, never stretched.
          const echelle = Math.max(w / image.naturalWidth, h / image.naturalHeight);
          const iw = image.naturalWidth * echelle;
          const ih = image.naturalHeight * echelle;
          if (filtre) natif.filter = FILTRES_CSS[filtre];
          natif.drawImage(image, (w - iw) / 2, (h - ih) / 2, iw, ih);
          natif.filter = "none";
        }
        natif.restore();
        if (cadre && cadre.width > 0) {
          natif.save();
          natif.beginPath();
          tracerMasque(natif, masque, w, h);
          natif.lineWidth = cadre.width;
          natif.strokeStyle = cadre.color;
          natif.stroke();
          natif.restore();
        }
      }}
      hitFunc={(ctx, shape) => {
        ctx.beginPath();
        ctx.rect(0, 0, shape.width(), shape.height());
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      }}
    />
  );
}

// ── Shapes ───────────────────────────────────────────────────────────────────

function degradeProps(element: ElementForme) {
  const d = element.style.degrade;
  if (!d || element.style.fill === null) return {};
  const w = element.width;
  const h = element.height;
  if (d.type === "RADIAL") {
    return {
      fillPriority: "radial-gradient",
      fillRadialGradientStartPoint: { x: w / 2, y: h / 2 },
      fillRadialGradientEndPoint: { x: w / 2, y: h / 2 },
      fillRadialGradientStartRadius: 0,
      fillRadialGradientEndRadius: Math.max(w, h) / 2,
      fillRadialGradientColorStops: [0, d.de, 1, d.a],
    };
  }
  const a = (d.angle * Math.PI) / 180;
  const demi = (Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a))) / 2;
  return {
    fillPriority: "linear-gradient",
    fillLinearGradientStartPoint: { x: w / 2 - Math.cos(a) * demi, y: h / 2 - Math.sin(a) * demi },
    fillLinearGradientEndPoint: { x: w / 2 + Math.cos(a) * demi, y: h / 2 + Math.sin(a) * demi },
    fillLinearGradientColorStops: [0, d.de, 1, d.a],
  };
}

function tracerEtoile(ctx: Konva.Context, w: number, h: number) {
  const branches = 5;
  for (let i = 0; i < branches * 2; i++) {
    const r = i % 2 === 0 ? 0.5 : 0.2;
    const a = -Math.PI / 2 + (i * Math.PI) / branches;
    const x = w / 2 + Math.cos(a) * w * r;
    const y = h / 2 + Math.sin(a) * h * r + h * 0.04;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function rectArrondi(ctx: Konva.Context, x: number, y: number, w: number, h: number, r: number, inverse = false) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  if (!inverse) {
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.arcTo(x + w, y, x + w, y + rr, rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
    ctx.lineTo(x + rr, y + h);
    ctx.arcTo(x, y + h, x, y + h - rr, rr);
    ctx.lineTo(x, y + rr);
    ctx.arcTo(x, y, x + rr, y, rr);
  } else {
    // Counter-clockwise: cuts a hole in the shape drawn before it.
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x, y, x, y + rr, rr);
    ctx.lineTo(x, y + h - rr);
    ctx.arcTo(x, y + h, x + rr, y + h, rr);
    ctx.lineTo(x + w - rr, y + h);
    ctx.arcTo(x + w, y + h, x + w, y + h - rr, rr);
    ctx.lineTo(x + w, y + rr);
    ctx.arcTo(x + w, y, x + w - rr, y, rr);
  }
  ctx.closePath();
}

function NoeudForme({ element, noeud }: { element: ElementForme; noeud: NoeudProps }) {
  const { fill, stroke, strokeWidth, opacity, cornerRadius = 0, epaisseur } = element.style;
  return (
    <Shape
      {...noeud}
      {...degradeProps(element)}
      width={element.width}
      height={element.height}
      fill={fill ?? undefined}
      stroke={stroke ?? undefined}
      strokeWidth={strokeWidth}
      opacity={opacity}
      sceneFunc={(ctx, shape) => {
        const w = shape.width();
        const h = shape.height();
        const e = Math.min(epaisseur ?? Math.max(4, Math.min(w, h) * 0.12), w / 2, h / 2);
        ctx.beginPath();
        switch (element.shape) {
          case "rect": rectArrondi(ctx, 0, 0, w, h, cornerRadius); break;
          case "ellipse": ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); break;
          case "line": ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); break;
          case "heart": tracerCoeur(ctx, w, h); break;
          case "star": tracerEtoile(ctx, w, h); break;
          case "arch": tracerArche(ctx, w, h); break;
          case "ring":
            ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
            ctx.moveTo(w - e, h / 2);
            ctx.ellipse(w / 2, h / 2, w / 2 - e, h / 2 - e, 0, 0, Math.PI * 2, true);
            break;
          case "frame":
            rectArrondi(ctx, 0, 0, w, h, cornerRadius);
            rectArrondi(ctx, e, e, w - 2 * e, h - 2 * e, Math.max(0, cornerRadius - e), true);
            break;
        }
        ctx.fillStrokeShape(shape);
      }}
      // Thin or unfilled shapes stay easy to grab: the whole box is clickable.
      hitFunc={(ctx, shape) => {
        ctx.beginPath();
        ctx.rect(0, 0, shape.width(), Math.max(shape.height(), 12));
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      }}
    />
  );
}

// ── QR code ──────────────────────────────────────────────────────────────────

function NoeudQr({ element, noeud, details }: { element: ElementQr; noeud: NoeudProps; details: DetailsInvitation }) {
  const texte = texteQr(element, details);
  const matrice = useMemo(() => (texte ? matriceQr(texte) : null), [texte]);
  return (
    <Shape
      {...noeud}
      width={element.width}
      height={element.height}
      opacity={element.style.opacity}
      sceneFunc={(ctx, shape) => {
        const natif = ctx._context;
        const taille = Math.min(shape.width(), shape.height());
        natif.fillStyle = element.style.fond;
        natif.fillRect(0, 0, taille, taille);
        if (!matrice) {
          // No venue yet: a soft placeholder, so the client sees where the code will go.
          natif.strokeStyle = element.style.couleur;
          natif.globalAlpha = 0.35;
          natif.setLineDash([taille / 16, taille / 16]);
          natif.lineWidth = Math.max(1, taille / 60);
          natif.strokeRect(taille * 0.1, taille * 0.1, taille * 0.8, taille * 0.8);
          natif.globalAlpha = 1;
          natif.setLineDash([]);
          return;
        }
        const pas = taille / (matrice.taille + element.style.marge * 2);
        natif.fillStyle = element.style.couleur;
        for (let l = 0; l < matrice.taille; l++) {
          for (let c = 0; c < matrice.taille; c++) {
            if (!matrice.noir(l, c)) continue;
            // A hair wider than the module, so no gap shows between squares when scaled.
            natif.fillRect((c + element.style.marge) * pas, (l + element.style.marge) * pas, pas + 0.3, pas + 0.3);
          }
        }
      }}
      hitFunc={(ctx, shape) => {
        ctx.beginPath();
        ctx.rect(0, 0, shape.width(), shape.height());
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      }}
    />
  );
}

// ── Countdown ────────────────────────────────────────────────────────────────

const UNITES: Record<Langue, { j: string; h: string; m: string; s: string; jour: string; mois: string; annee: string }> = {
  fr: { j: "jours", h: "heures", m: "min", s: "sec", jour: "jour", mois: "mois", annee: "année" },
  en: { j: "days", h: "hours", m: "min", s: "sec", jour: "day", mois: "month", annee: "year" },
  ar: { j: "يوم", h: "ساعة", m: "دقيقة", s: "ثانية", jour: "اليوم", mois: "الشهر", annee: "السنة" },
};

/** The boxes of a countdown: live on the public page, the date of the event in still mode. */
export function casesCompte(element: ElementCompte, details: DetailsInvitation, direct: boolean, maintenant: Date): [string, string][] {
  const u = UNITES[details.langue];
  if (!direct) {
    const [a, m, j] = details.date ? details.date.split("-") : ["----", "--", "--"];
    return [[j, u.jour], [m, u.mois], [a, u.annee]];
  }
  const compte = compteARebours(details.date, details.heure, maintenant);
  if (!compte) return [["--", u.j]];
  const deux = (n: number) => String(n).padStart(2, "0");
  const cases: [string, string][] = [[String(compte.jours), u.j]];
  if (element.style.unites !== "JOURS") cases.push([deux(compte.heures), u.h]);
  if (element.style.unites === "COMPLET") cases.push([deux(compte.minutes), u.m], [deux(compte.secondes), u.s]);
  return cases;
}

function NoeudCompte({ element, noeud, details, direct, maintenant }: { element: ElementCompte; noeud: NoeudProps; details: DetailsInvitation; direct: boolean; maintenant: Date }) {
  const cases = casesCompte(element, details, direct, maintenant);
  const { fontFamily, fontSize, color, fond, opacity } = element.style;
  return (
    <Shape
      {...noeud}
      width={element.width}
      height={element.height}
      opacity={opacity}
      sceneFunc={(ctx, shape) => {
        const natif = ctx._context;
        const w = shape.width();
        const h = shape.height();
        const ecart = w * 0.04;
        const largeur = (w - ecart * (cases.length - 1)) / cases.length;
        const police = fontFamily.includes(" ") ? `"${fontFamily}"` : fontFamily;
        cases.forEach(([valeur, libelle], i) => {
          const x = i * (largeur + ecart);
          if (fond) {
            natif.fillStyle = fond;
            natif.beginPath();
            natif.roundRect(x, 0, largeur, h, Math.min(10, largeur / 6));
            natif.fill();
          }
          natif.fillStyle = color;
          natif.textAlign = "center";
          natif.textBaseline = "middle";
          natif.font = `700 ${fontSize}px ${police}`;
          natif.fillText(valeur, x + largeur / 2, h * 0.42, largeur * 0.92);
          natif.font = `400 ${Math.max(7, fontSize * 0.34)}px ${police}, Amiri`;
          natif.fillText(libelle, x + largeur / 2, h * 0.8, largeur * 0.92);
        });
      }}
      hitFunc={(ctx, shape) => {
        ctx.beginPath();
        ctx.rect(0, 0, shape.width(), shape.height());
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      }}
    />
  );
}

// ── Background ───────────────────────────────────────────────────────────────

function FondImage({ src, width, height }: { src: string; width: number; height: number }) {
  const image = useImageLocale(src);
  const recadrage = useMemo(() => {
    if (!image) return undefined;
    // Cover: the image fills the card and the overflow is cropped, never stretched.
    const echelle = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const w = width / echelle;
    const h = height / echelle;
    return { x: (image.naturalWidth - w) / 2, y: (image.naturalHeight - h) / 2, width: w, height: h };
  }, [image, width, height]);
  return <KonvaImage name="fond" image={image} width={width} height={height} crop={recadrage} />;
}

// ── Stage ────────────────────────────────────────────────────────────────────

/** Width and height the transformer should use for an element (text height follows its lines). */
const estCarre = (e: ElementInvitation | undefined) => e?.type === "qrcode";

export default function InvitationStage({
  contenu,
  scale,
  stageRef,
  edition,
  lecture,
}: {
  contenu: ContenuInvitation;
  scale: number;
  stageRef?: RefObject<Konva.Stage | null>;
  edition?: EditionStage;
  lecture?: LectureStage;
}) {
  const { size, background, elements, details } = contenu;
  const localRef = useRef<Konva.Stage | null>(null);
  const ref = stageRef ?? localRef;
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const [guides, setGuides] = useState<{ verticales: number[]; horizontales: number[] }>({ verticales: [], horizontales: [] });
  const [epoque, setEpoque] = useState(0);
  const [tactile] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);
  const direct = !!lecture;
  const [maintenant, setMaintenant] = useState(() => new Date());

  // Fonts first: text nodes measure when mounted, so they remount once the files are in.
  const clePolices = elements
    .map((e) => (e.type === "text" ? `${e.style.fontFamily}|${e.style.bold}|${e.style.italic}|${estArabe(e.text)}` : e.type === "countdown" ? e.style.fontFamily : ""))
    .join(";");
  useEffect(() => {
    let actif = true;
    chargerPolices(contenu).then(() => {
      if (actif) setEpoque((e) => e + 1);
    });
    return () => {
      actif = false;
    };
    // Only a change of font, not of the rest of the document, needs new font files.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clePolices]);

  // A live countdown ticks every second on the public page.
  const aCompte = elements.some((e) => e.type === "countdown");
  useEffect(() => {
    if (!direct || !aCompte) return;
    const minuterie = setInterval(() => setMaintenant(new Date()), 1000);
    return () => clearInterval(minuterie);
  }, [direct, aCompte]);

  const selection = useMemo(() => edition?.selection ?? [], [edition?.selection]);
  const selectionnes = elements.filter((e) => selection.includes(e.id));
  const transformables = selectionnes.filter((e) => !e.verrouille && estVisible(e));
  const cleTransformables = transformables.map((e) => e.id).join(",");
  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = ref.current;
    if (!transformer || !stage) return;
    const noeuds = cleTransformables
      ? cleTransformables.split(",").map((id) => stage.findOne(`#${id}`)).filter((n): n is Konva.Node => !!n)
      : [];
    transformer.nodes(noeuds);
    transformer.getLayer()?.batchDraw();
    // The node is replaced when fonts remount it, and its box moves with the document.
  }, [cleTransformables, epoque, contenu, ref]);

  // ── Playback: entrances and loops applied to the nodes, without React renders ──
  const debut = lecture?.debut ?? null;
  useEffect(() => {
    const stage = ref.current;
    if (!lecture || !stage) return;
    const layer = stage.findOne<Konva.Layer>(".contenu");
    if (!layer) return;
    const animes = elements.filter((e) => e.animation && estVisible(e));
    const appliquer = (t: number) => {
      for (const element of animes) {
        const noeud = stage.findOne<Konva.Shape>(`#${element.id}`);
        if (!noeud) continue;
        const etat = etatAnimation(element.animation, t);
        const signeX = element.flipX ? -1 : 1;
        const signeY = element.flipY ? -1 : 1;
        const opaciteBase = element.style.opacity;
        noeud.opacity(opaciteBase * etat.opacite);
        noeud.scale({ x: signeX * etat.echelle, y: signeY * etat.echelle });
        noeud.position({
          x: element.x + etat.dx + ((1 - etat.echelle) * element.width) / 2,
          y: element.y + etat.dy + ((1 - etat.echelle) * element.height) / 2,
        });
        if (element.type === "text" && noeud instanceof Konva.Text && etat.lettres < 1) {
          const complet = texteAffiche(element, details.langue);
          noeud.text(complet.slice(0, Math.round(complet.length * etat.lettres)));
        } else if (element.type === "text" && noeud instanceof Konva.Text) {
          noeud.text(texteAffiche(element, details.langue));
        }
        const groupe = noeud.getParent();
        if (groupe && groupe.hasName("revelation")) groupe.setAttr("revelation", etat.revelation);
      }
    };
    // Closed card: everything in its starting state, nothing moves.
    if (debut === null) {
      appliquer(0);
      layer.batchDraw();
      return;
    }
    const animation = new Konva.Animation(() => {
      appliquer((performance.now() - debut) / 1000);
    }, layer);
    animation.start();
    // No frames while the tab is hidden: saves the battery of the guest's phone.
    const visibilite = () => (document.hidden ? animation.stop() : animation.start());
    document.addEventListener("visibilitychange", visibilite);
    return () => {
      animation.stop();
      document.removeEventListener("visibilitychange", visibilite);
    };
  }, [lecture, debut, elements, details.langue, ref, epoque]);

  const ordonnes = [...elements].filter(estVisible).sort((a, b) => a.layer - b.layer);

  const boitesAutres = (noeud: Konva.Node): Boite[] => {
    const stage = noeud.getStage();
    if (!stage) return [];
    return stage.find(".element").filter((n) => n !== noeud && !selection.includes(n.id())).map((n) => n.getClientRect({ relativeTo: stage }));
  };

  // Several nodes fire dragend / transformend for one gesture: gather them into one change.
  const enAttente = useRef(new Map<string, PatchGeometrie>());
  const vider = () => {
    const patches = [...enAttente.current].map(([id, patch]) => ({ id, patch }));
    enAttente.current.clear();
    if (patches.length === 1) edition?.onChange(patches[0].id, patches[0].patch);
    else if (patches.length > 1) edition?.onChangeMany(patches);
  };
  const empiler = (id: string, patch: PatchGeometrie) => {
    const premier = enAttente.current.size === 0;
    enAttente.current.set(id, { ...enAttente.current.get(id), ...patch });
    if (premier) setTimeout(vider, 0);
  };

  const noeudProps = (element: ElementInvitation): NoeudProps => {
    const flip = {
      scaleX: element.flipX ? -1 : 1,
      scaleY: element.flipY ? -1 : 1,
      offsetX: element.flipX ? element.width : 0,
      offsetY: element.flipY ? element.height : 0,
    };
    const base = { id: element.id, name: "element", x: element.x, y: element.y, rotation: element.rotation, ...flip };
    if (!edition) return { ...base, draggable: false };
    const choisir = (ajouter: boolean) => edition.onSelect(element.id, ajouter || !!edition.multiple);
    const multiple = () => selection.length > 1 && selection.includes(element.id);
    return {
      ...base,
      draggable: !element.verrouille,
      onClick: (e) => choisir(e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey),
      onTap: () => choisir(false),
      onDragStart: (e) => {
        if (!selection.includes(element.id)) choisir(e.evt.shiftKey);
      },
      onDragMove: (e) => {
        const noeud = e.target;
        const stage = noeud.getStage();
        if (!stage) return;
        if (edition.grille) {
          noeud.x(surGrille(noeud.x(), edition.grille));
          noeud.y(surGrille(noeud.y(), edition.grille));
          return;
        }
        if (multiple()) return;
        const snap = calculerSnap(noeud.getClientRect({ relativeTo: stage }), boitesAutres(noeud), size);
        noeud.x(noeud.x() + snap.dx);
        noeud.y(noeud.y() + snap.dy);
        setGuides({ verticales: snap.verticales, horizontales: snap.horizontales });
      },
      onDragEnd: (e) => {
        setGuides({ verticales: [], horizontales: [] });
        empiler(element.id, { x: e.target.x(), y: e.target.y() });
      },
      onTransform: (e) => {
        // A text box changes width, it never stretches its letters.
        if (element.type !== "text") return;
        const noeud = e.target;
        const signe = Math.sign(noeud.scaleX()) || 1;
        noeud.setAttrs({ width: Math.max(30, noeud.width() * Math.abs(noeud.scaleX())), scaleX: signe, scaleY: Math.sign(noeud.scaleY()) || 1 });
      },
      onTransformEnd: (e) => {
        const noeud = e.target;
        const sx = Math.abs(noeud.scaleX());
        const sy = Math.abs(noeud.scaleY());
        noeud.setAttrs({ scaleX: Math.sign(noeud.scaleX()) || 1, scaleY: Math.sign(noeud.scaleY()) || 1 });
        const width = Math.max(4, noeud.width() * sx);
        const height = Math.max(1, noeud.height() * sy);
        const carre = estCarre(element) ? Math.max(width, height) : undefined;
        empiler(element.id, {
          x: noeud.x(),
          y: noeud.y(),
          rotation: noeud.rotation(),
          width: carre ?? width,
          height: carre ?? height,
        });
      },
    };
  };

  const rendre = (element: ElementInvitation) => {
    const noeud = noeudProps(element);
    switch (element.type) {
      case "text": return <NoeudTexte key={`${element.id}-${epoque}`} element={element} noeud={noeud} langue={details.langue} />;
      case "image": return <NoeudImage key={element.id} element={element} noeud={noeud} />;
      case "shape": return <NoeudForme key={element.id} element={element} noeud={noeud} />;
      case "qrcode": return <NoeudQr key={element.id} element={element} noeud={noeud} details={details} />;
      case "countdown": return <NoeudCompte key={`${element.id}-${epoque}`} element={element} noeud={noeud} details={details} direct={direct} maintenant={maintenant} />;
    }
  };

  const deselectionner = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target === e.target.getStage() || e.target.hasName("fond")) edition?.onSelect(null);
  };

  const grille = edition?.grille;
  const seul = selectionnes.length === 1 ? selectionnes[0] : undefined;

  return (
    <Stage
      ref={ref}
      width={size.width * scale}
      height={size.height * scale}
      scaleX={scale}
      scaleY={scale}
      listening={!!edition}
      onMouseDown={deselectionner}
      onTouchStart={deselectionner}
    >
      <Layer name="contenu">
        <Rect name="fond" width={size.width} height={size.height} fill={background.color} />
        {background.image && <FondImage src={background.image} width={size.width} height={size.height} />}
        {ordonnes.map((element) =>
          lecture && element.animation?.type === "REVELATION" ? (
            // "Reveal" uncovers the element from left to right: a clip that the playback widens.
            <Group
              key={element.id}
              name="revelation"
              revelation={0}
              clipFunc={function (this: Konva.Group, ctx) {
                const part = (this.getAttr("revelation") as number) ?? 1;
                ctx.rect(element.x - 4, element.y - size.height, (element.width + 8) * part, size.height * 3);
              }}
            >
              {rendre(element)}
            </Group>
          ) : (
            rendre(element)
          ),
        )}
      </Layer>
      {edition && (
        <Layer name="ui">
          {grille && (
            <Shape
              listening={false}
              sceneFunc={(ctx) => {
                const natif = ctx._context;
                natif.strokeStyle = "rgba(139, 92, 246, 0.18)";
                natif.lineWidth = 1 / scale;
                natif.beginPath();
                for (let x = grille; x < size.width; x += grille) {
                  natif.moveTo(x, 0);
                  natif.lineTo(x, size.height);
                }
                for (let y = grille; y < size.height; y += grille) {
                  natif.moveTo(0, y);
                  natif.lineTo(size.width, y);
                }
                natif.stroke();
              }}
            />
          )}
          {guides.verticales.map((x) => (
            <Line key={`v${x}`} points={[x, 0, x, size.height]} stroke="#d946ef" strokeWidth={1 / scale} dash={[4 / scale, 4 / scale]} listening={false} />
          ))}
          {guides.horizontales.map((y) => (
            <Line key={`h${y}`} points={[0, y, size.width, y]} stroke="#d946ef" strokeWidth={1 / scale} dash={[4 / scale, 4 / scale]} listening={false} />
          ))}
          <Transformer
            ref={transformerRef}
            rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
            rotationSnapTolerance={4}
            anchorSize={tactile ? 18 : 9}
            borderStroke="#8b5cf6"
            anchorStroke="#8b5cf6"
            keepRatio={transformables.some((e) => e.type === "image" || e.type === "qrcode")}
            enabledAnchors={
              seul?.type === "text"
                ? ["middle-left", "middle-right"]
                : estCarre(seul)
                  ? ["top-left", "top-right", "bottom-left", "bottom-right"]
                  : ["top-left", "top-center", "top-right", "middle-left", "middle-right", "bottom-left", "bottom-center", "bottom-right"]
            }
            boundBoxFunc={(ancienne, nouvelle) => {
              const minimum = estCarre(seul) ? 48 * scale : 8;
              return Math.abs(nouvelle.width) < minimum || Math.abs(nouvelle.height) < 1 ? ancienne : nouvelle;
            }}
          />
        </Layer>
      )}
    </Stage>
  );
}
