"use client";

import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import { CanvasTexture, SRGBColorSpace, TextureLoader, type Texture } from "three";
import type { GalleryFramePlacement } from "./types";

export function GalleryFrame({
  placement,
  onSelect,
  onTextureError,
}: {
  placement: GalleryFramePlacement;
  onSelect: () => void;
  onTextureError: (error: unknown) => void;
}) {
  const { gl } = useThree();
  const [loaded, setLoaded] = useState<{ url: string; texture: Texture } | null>(null);
  const [hovered, setHovered] = useState(false);
  const { photo } = placement;
  const textureUrl = photo.thumbnailUrl || photo.url;
  const frameDepth = 0.1;
  const photoDepth = 0.09;
  const rail = 0.085;

  useEffect(() => {
    let disposed = false;
    let displayTexture: Texture | null = null;
    const loader = new TextureLoader();
    loader.setCrossOrigin("anonymous");
    const texture = loader.load(
      textureUrl,
      (loadedTexture) => {
        if (disposed) {
          loadedTexture.dispose();
          return;
        }
        const image = loadedTexture.image as HTMLImageElement;
        const scale = Math.min(1, 2048 / image.naturalWidth, 2048 / image.naturalHeight);
        let resizedCanvas: HTMLCanvasElement | null = null;
        if (scale < 1) {
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          const context = canvas.getContext("2d");
          if (!context) {
            loadedTexture.dispose();
            onTextureError(new Error("Impossible de redimensionner une photo de la galerie."));
            return;
          }
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resizedCanvas = canvas;
        }
        displayTexture = resizedCanvas ? new CanvasTexture(resizedCanvas) : loadedTexture;
        if (displayTexture !== loadedTexture) loadedTexture.dispose();
        displayTexture.colorSpace = SRGBColorSpace;
        displayTexture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
        setLoaded({ url: textureUrl, texture: displayTexture });
      },
      undefined,
      (error) => {
        if (!disposed) onTextureError(error);
      },
    );

    return () => {
      disposed = true;
      (displayTexture ?? texture).dispose();
    };
  }, [gl, onTextureError, textureUrl]);

  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered]);

  const texture = loaded?.url === textureUrl ? loaded.texture : null;

  return (
    <group
      position={placement.position}
      rotation={[0, placement.rotationY, 0]}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh position={[0, 0, -0.035]} castShadow>
        <boxGeometry args={[placement.width + 0.2, placement.height + 0.2, frameDepth]} />
        <meshStandardMaterial color={hovered ? "#9a7046" : "#493b31"} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0, 0.025]}>
        <boxGeometry args={[placement.width + 0.07, placement.height + 0.07, 0.025]} />
        <meshStandardMaterial color="#f4efe5" roughness={0.9} />
      </mesh>
      <mesh
        position={[0, 0, photoDepth]}
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
      >
        <planeGeometry args={[placement.width - rail * 2, placement.height - rail * 2]} />
        <meshBasicMaterial
          color={texture ? "#ffffff" : "#b8b2a7"}
          map={texture}
          toneMapped={false}
        />
      </mesh>
      {(
        [
          [0, placement.height / 2, rail, placement.width],
          [0, -placement.height / 2, rail, placement.width],
          [-placement.width / 2, 0, placement.height, rail],
          [placement.width / 2, 0, placement.height, rail],
        ] as const
      ).map(([x, y, height, width], index) => (
        <mesh key={index} position={[x, y, photoDepth + 0.015]}>
          <boxGeometry args={[width, height, 0.045]} />
          <meshStandardMaterial color={hovered ? "#d0a669" : "#755c43"} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}
