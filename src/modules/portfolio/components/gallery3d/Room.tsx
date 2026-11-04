"use client";

import { useEffect, useMemo } from "react";
import { CanvasTexture, Object3D, RepeatWrapping } from "three";
import { GalleryFrame } from "./GalleryFrame";
import { GalleryNavigation } from "./GalleryNavigation";
import type { GalleryLayout } from "./types";

function createFloorTexture(width: number, depth: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create the gallery floor texture.");

  context.fillStyle = "#242423";
  context.fillRect(0, 0, canvas.width, canvas.height);
  const tileSize = 128;
  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < 4; x += 1) {
      const shade = 32 + ((x * 7 + y * 11) % 8);
      context.fillStyle = `rgb(${shade}, ${shade}, ${shade - 1})`;
      context.fillRect(x * tileSize + 2, y * tileSize + 2, tileSize - 4, tileSize - 4);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(width / 4, depth / 4);
  return texture;
}

function FrameSpotlight({
  position,
  normal,
  height,
}: {
  position: [number, number, number];
  normal: [number, number, number];
  height: number;
}) {
  const target = useMemo(() => {
    const object = new Object3D();
    object.position.set(...position);
    return object;
  }, [position]);

  return (
    <>
      <primitive object={target} />
      <spotLight
        position={[position[0] + normal[0] * 0.8, height - 0.4, position[2] + normal[2] * 0.8]}
        target={target}
        color="#fff4df"
        intensity={22}
        distance={8}
        angle={0.42}
        penumbra={0.75}
        decay={2}
      />
      <mesh
        position={[position[0] + normal[0] * 0.55, height - 0.22, position[2] + normal[2] * 0.55]}
      >
        <cylinderGeometry args={[0.11, 0.16, 0.18, 12]} />
        <meshStandardMaterial color="#282827" metalness={0.65} roughness={0.35} />
      </mesh>
    </>
  );
}

export function Room({
  layout,
  activeIndex,
  onSelectPhoto,
  onSelectViewpoint,
  onTextureError,
}: {
  layout: GalleryLayout;
  activeIndex: number;
  onSelectPhoto: (index: number) => void;
  onSelectViewpoint: (index: number) => void;
  onTextureError: (error: unknown) => void;
}) {
  const floorTexture = useMemo(
    () => createFloorTexture(layout.width, layout.depth),
    [layout.depth, layout.width],
  );
  useEffect(() => () => floorTexture.dispose(), [floorTexture]);

  return (
    <group>
      <mesh position={[0, -0.08, 0]} receiveShadow>
        <boxGeometry args={[layout.width, 0.16, layout.depth]} />
        <meshStandardMaterial map={floorTexture} roughness={0.78} metalness={0.12} />
      </mesh>

      <mesh position={[0, layout.height / 2, -layout.depth / 2]}>
        <boxGeometry args={[layout.width, layout.height, 0.18]} />
        <meshStandardMaterial color="#f4f3ef" roughness={0.9} />
      </mesh>
      <mesh position={[0, layout.height / 2, layout.depth / 2]}>
        <boxGeometry args={[layout.width, layout.height, 0.18]} />
        <meshStandardMaterial color="#f4f3ef" roughness={0.9} />
      </mesh>
      <mesh position={[-layout.width / 2, layout.height / 2, 0]}>
        <boxGeometry args={[0.18, layout.height, layout.depth]} />
        <meshStandardMaterial color="#f4f3ef" roughness={0.9} />
      </mesh>
      <mesh position={[layout.width / 2, layout.height / 2, 0]}>
        <boxGeometry args={[0.18, layout.height, layout.depth]} />
        <meshStandardMaterial color="#f4f3ef" roughness={0.9} />
      </mesh>

      <mesh position={[0, layout.height + 0.03, 0]}>
        <boxGeometry args={[layout.width, 0.12, layout.depth]} />
        <meshStandardMaterial color="#eeede8" roughness={0.95} />
      </mesh>
      {[-1.8, 1.8].map((offset) => (
        <mesh key={offset} position={[offset, layout.height - 0.12, 0]}>
          <boxGeometry args={[0.08, 0.08, layout.depth - 1]} />
          <meshStandardMaterial color="#292a29" metalness={0.65} roughness={0.4} />
        </mesh>
      ))}

      <ambientLight intensity={0.72} />
      <hemisphereLight args={["#fffaf0", "#242321", 1.15]} />
      <directionalLight position={[0, layout.height - 0.3, 0]} intensity={0.48} />

      {layout.frames.map((placement) => (
        <group key={placement.photo.id}>
          <GalleryFrame
            placement={placement}
            onSelect={() => onSelectPhoto(placement.photoIndex)}
            onTextureError={onTextureError}
          />
          <FrameSpotlight
            position={placement.position}
            normal={placement.normal}
            height={layout.height}
          />
        </group>
      ))}
      <GalleryNavigation
        viewpoints={layout.viewpoints}
        activeIndex={activeIndex}
        onSelectViewpoint={onSelectViewpoint}
      />
    </group>
  );
}
