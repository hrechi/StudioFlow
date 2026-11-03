"use client";

/**
 * renderInvitation: draws any invitation document on a Konva stage. Used by the editor (editable),
 * the thumbnails and the public page (read-only). Browser only: load it through next/dynamic.
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
import type Konva from "konva";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Image as KonvaImage, Layer, Line, Rect, Shape, Stage, Text, Transformer } from "react-konva";
import { chargerImage, chargerPolices, imageChargee, styleTexte } from "../invitation.canvas";
import { estArabe } from "../invitation.linked";
import type { ContenuInvitation, ElementForme, ElementImage, ElementInvitation, ElementTexte } from "../invitation.schema";
import { calculerSnap, type Boite } from "../invitation.snap";

export type EditionStage = {
  selection: string | null;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<Pick<ElementInvitation, "x" | "y" | "width" | "height" | "rotation">>) => void;
};

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
  onClick?: () => void;
  onTap?: () => void;
  onDragStart?: () => void;
  onDragMove?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd?: (e: Konva.KonvaEventObject<Event>) => void;
  onTransform?: (e: Konva.KonvaEventObject<Event>) => void;
};

function NoeudTexte({ element, noeud }: { element: ElementTexte; noeud: NoeudProps }) {
  const arabe = estArabe(element.text);
  return (
    <Text
      {...noeud}
      {...styleTexte(element.style)}
      text={element.text}
      width={element.width}
      lineHeight={1.25}
      align={element.style.align}
      fill={element.style.color}
      opacity={element.style.opacity}
      // Arabic letters must stay joined: no spacing, and the canvas shapes it right to left.
      letterSpacing={arabe ? 0 : element.style.letterSpacing}
      direction={arabe ? "rtl" : "ltr"}
    />
  );
}

function NoeudImage({ element, noeud }: { element: ElementImage; noeud: NoeudProps }) {
  const image = useImageLocale(element.src);
  return <KonvaImage {...noeud} image={image} width={element.width} height={element.height} opacity={element.style.opacity} />;
}

const COEUR: [number, number, number, number, number, number][] = [
  [0.2, 0.72, 0, 0.45, 0, 0.27],
  [0, 0.1, 0.13, 0, 0.27, 0],
  [0.37, 0, 0.45, 0.06, 0.5, 0.17],
  [0.55, 0.06, 0.63, 0, 0.73, 0],
  [0.87, 0, 1, 0.1, 1, 0.27],
  [1, 0.45, 0.8, 0.72, 0.5, 1],
];

function NoeudForme({ element, noeud }: { element: ElementForme; noeud: NoeudProps }) {
  const { fill, stroke, strokeWidth, opacity } = element.style;
  return (
    <Shape
      {...noeud}
      width={element.width}
      height={element.height}
      fill={fill ?? undefined}
      stroke={stroke ?? undefined}
      strokeWidth={strokeWidth}
      opacity={opacity}
      sceneFunc={(ctx, shape) => {
        const w = shape.width();
        const h = shape.height();
        ctx.beginPath();
        if (element.shape === "rect") ctx.rect(0, 0, w, h);
        else if (element.shape === "ellipse") ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        else if (element.shape === "line") {
          ctx.moveTo(0, h / 2);
          ctx.lineTo(w, h / 2);
        } else {
          ctx.moveTo(0.5 * w, h);
          for (const [a, b, c, d, e, f] of COEUR) ctx.bezierCurveTo(a * w, b * h, c * w, d * h, e * w, f * h);
          ctx.closePath();
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

export default function InvitationStage({
  contenu,
  scale,
  stageRef,
  edition,
}: {
  contenu: ContenuInvitation;
  scale: number;
  stageRef?: RefObject<Konva.Stage | null>;
  edition?: EditionStage;
}) {
  const { size, background, elements } = contenu;
  const localRef = useRef<Konva.Stage | null>(null);
  const ref = stageRef ?? localRef;
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const [guides, setGuides] = useState<{ verticales: number[]; horizontales: number[] }>({ verticales: [], horizontales: [] });
  const [epoque, setEpoque] = useState(0);
  const [tactile] = useState(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches);

  // Fonts first: text nodes measure when mounted, so they remount once the files are in.
  const clePolices = elements
    .map((e) => (e.type === "text" ? `${e.style.fontFamily}|${e.style.bold}|${e.style.italic}|${estArabe(e.text)}` : ""))
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

  const selection = edition?.selection ?? null;
  const elementSelectionne = elements.find((e) => e.id === selection);
  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = ref.current;
    if (!transformer || !stage) return;
    const noeud = selection ? stage.findOne(`#${selection}`) : undefined;
    transformer.nodes(noeud ? [noeud] : []);
    transformer.getLayer()?.batchDraw();
    // The node is replaced when fonts remount it, and its box moves with the document.
  }, [selection, epoque, contenu, ref]);

  const ordonnes = [...elements].sort((a, b) => a.layer - b.layer);

  const boitesAutres = (noeud: Konva.Node): Boite[] => {
    const stage = noeud.getStage();
    if (!stage) return [];
    return stage.find(".element").filter((n) => n !== noeud).map((n) => n.getClientRect({ relativeTo: stage }));
  };

  const noeudProps = (element: ElementInvitation): NoeudProps => {
    if (!edition) return { id: element.id, name: "element", x: element.x, y: element.y, rotation: element.rotation, draggable: false };
    const choisir = () => edition.onSelect(element.id);
    return {
      id: element.id,
      name: "element",
      x: element.x,
      y: element.y,
      rotation: element.rotation,
      draggable: true,
      onClick: choisir,
      onTap: choisir,
      onDragStart: choisir,
      onDragMove: (e) => {
        const noeud = e.target;
        const stage = noeud.getStage();
        if (!stage) return;
        const snap = calculerSnap(noeud.getClientRect({ relativeTo: stage }), boitesAutres(noeud), size);
        noeud.x(noeud.x() + snap.dx);
        noeud.y(noeud.y() + snap.dy);
        setGuides({ verticales: snap.verticales, horizontales: snap.horizontales });
      },
      onDragEnd: (e) => {
        setGuides({ verticales: [], horizontales: [] });
        edition.onChange(element.id, { x: e.target.x(), y: e.target.y() });
      },
      onTransform: (e) => {
        // A text box changes width, it never stretches its letters.
        if (element.type !== "text") return;
        const noeud = e.target;
        noeud.setAttrs({ width: Math.max(30, noeud.width() * noeud.scaleX()), scaleX: 1, scaleY: 1 });
      },
      onTransformEnd: (e) => {
        const noeud = e.target;
        const scaleX = noeud.scaleX();
        const scaleY = noeud.scaleY();
        noeud.setAttrs({ scaleX: 1, scaleY: 1 });
        edition.onChange(element.id, {
          x: noeud.x(),
          y: noeud.y(),
          rotation: noeud.rotation(),
          width: Math.max(4, noeud.width() * scaleX),
          height: Math.max(1, noeud.height() * scaleY),
        });
      },
    };
  };

  const deselectionner = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target === e.target.getStage() || e.target.hasName("fond")) edition?.onSelect(null);
  };

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
      <Layer>
        <Rect name="fond" width={size.width} height={size.height} fill={background.color} />
        {background.image && <FondImage src={background.image} width={size.width} height={size.height} />}
        {ordonnes.map((element) => {
          const noeud = noeudProps(element);
          if (element.type === "text") return <NoeudTexte key={`${element.id}-${epoque}`} element={element} noeud={noeud} />;
          if (element.type === "image") return <NoeudImage key={element.id} element={element} noeud={noeud} />;
          return <NoeudForme key={element.id} element={element} noeud={noeud} />;
        })}
      </Layer>
      {edition && (
        <Layer name="ui">
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
            keepRatio={elementSelectionne?.type === "image"}
            enabledAnchors={
              elementSelectionne?.type === "text"
                ? ["middle-left", "middle-right"]
                : ["top-left", "top-center", "top-right", "middle-left", "middle-right", "bottom-left", "bottom-center", "bottom-right"]
            }
            boundBoxFunc={(ancienne, nouvelle) => (nouvelle.width < 8 || nouvelle.height < 1 ? ancienne : nouvelle)}
          />
        </Layer>
      )}
    </Stage>
  );
}
