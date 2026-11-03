"use client";

import type { GalleryViewpoint } from "./types";

export function GalleryNavigation({
  viewpoints,
  activeIndex,
  onSelectViewpoint,
}: {
  viewpoints: GalleryViewpoint[];
  activeIndex: number;
  onSelectViewpoint: (index: number) => void;
}) {
  return (
    <group>
      {viewpoints.map((viewpoint) => (
        <group
          key={viewpoint.photoIndex}
          position={[viewpoint.position[0], 0.015, viewpoint.position[2]]}
          onClick={(event) => {
            event.stopPropagation();
            onSelectViewpoint(viewpoint.photoIndex);
          }}
          onPointerOver={() => {
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "";
          }}
        >
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[viewpoint.photoIndex === activeIndex ? 0.3 : 0.22, 24]} />
            <meshBasicMaterial
              color={viewpoint.photoIndex === activeIndex ? "#d9a95f" : "#b9b8b2"}
              transparent
              opacity={viewpoint.photoIndex === activeIndex ? 0.85 : 0.38}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
