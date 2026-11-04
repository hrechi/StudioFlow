"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Html,
  KeyboardControls,
  OrbitControls,
  PointerLockControls,
  useKeyboardControls,
  useProgress,
} from "@react-three/drei";
import { easing } from "maath";
import { Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Room } from "./Room";
import type { GalleryLayout } from "./types";

type WalkControl = "forward" | "backward" | "left" | "right";
type NavigationMode = "guided" | "free";

const KEY_MAP = [
  { name: "forward", keys: ["ArrowUp", "KeyW", "KeyZ"] },
  { name: "backward", keys: ["ArrowDown", "KeyS"] },
  { name: "left", keys: ["ArrowLeft", "KeyA", "KeyQ"] },
  { name: "right", keys: ["ArrowRight", "KeyD"] },
] satisfies { name: WalkControl; keys: string[] }[];

function LoadingIndicator() {
  const { active, progress } = useProgress();
  if (!active) return null;

  return (
    <Html center>
      <div className="rounded-xl border border-white/15 bg-black/75 px-5 py-3 text-center text-sm text-white shadow-xl backdrop-blur">
        <p>Preparing the exhibition...</p>
        <p className="mt-1 font-mono text-xs text-white/65">{Math.round(progress)} %</p>
      </div>
    </Html>
  );
}

function GuidedCamera({ layout, activeIndex }: { layout: GalleryLayout; activeIndex: number }) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls as OrbitControlsImpl | undefined);
  const destination = useRef<GalleryLayout["viewpoints"][number] | null>(null);
  const transitioning = useRef(true);
  const desiredPosition = useMemo(() => new Vector3(), []);

  useEffect(() => {
    destination.current =
      layout.viewpoints.find((viewpoint) => viewpoint.photoIndex === activeIndex) ?? null;
    transitioning.current = true;
  }, [activeIndex, layout]);

  useFrame((_, delta) => {
    const view = destination.current;
    if (!view || !controls || !transitioning.current) return;

    easing.damp3(camera.position, view.position, 0.85, delta);
    easing.damp3(controls.target, view.target, 0.85, delta);
    desiredPosition.set(...view.position);
    if (camera.position.distanceTo(desiredPosition) < 0.025) {
      transitioning.current = false;
    }
  });

  return (
    <OrbitControls
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={1.5}
      maxDistance={5}
      minPolarAngle={0.25}
      maxPolarAngle={Math.PI - 0.25}
    />
  );
}

function FreeMovement({ enabled, layout }: { enabled: boolean; layout: GalleryLayout }) {
  const [, getKeys] = useKeyboardControls<WalkControl>();
  const forward = useRef(new Vector3());
  const right = useRef(new Vector3());
  const direction = useRef(new Vector3());

  useFrame(({ camera }, delta) => {
    if (!enabled) return;
    const keys = getKeys();
    const forwardVector = forward.current;
    const rightVector = right.current;
    const directionVector = direction.current;
    camera.getWorldDirection(forwardVector);
    forwardVector.y = 0;
    forwardVector.normalize();
    rightVector.crossVectors(forwardVector, camera.up).normalize();
    directionVector.set(0, 0, 0);
    if (keys.forward) directionVector.add(forwardVector);
    if (keys.backward) directionVector.sub(forwardVector);
    if (keys.right) directionVector.add(rightVector);
    if (keys.left) directionVector.sub(rightVector);
    if (directionVector.lengthSq() === 0) return;

    directionVector.normalize();
    camera.position.addScaledVector(directionVector, Math.min(delta, 0.05) * 3);
    camera.position.x = Math.max(
      -layout.width / 2 + 1,
      Math.min(layout.width / 2 - 1, camera.position.x),
    );
    camera.position.z = Math.max(
      -layout.depth / 2 + 1,
      Math.min(layout.depth / 2 - 1, camera.position.z),
    );
    camera.position.y = 1.65;
  });

  return null;
}

export default function GalleryScene({
  layout,
  activeIndex,
  navigationMode,
  lowPower,
  onSelectPhoto,
  onSelectViewpoint,
  onPointerLockChange,
  onTextureError,
}: {
  layout: GalleryLayout;
  activeIndex: number;
  navigationMode: NavigationMode;
  lowPower: boolean;
  onSelectPhoto: (index: number) => void;
  onSelectViewpoint: (index: number) => void;
  onPointerLockChange: (locked: boolean) => void;
  onTextureError: (error: unknown) => void;
}) {
  return (
    <KeyboardControls map={KEY_MAP}>
      <Canvas
        camera={{ position: [0, 1.65, 0], fov: 66, near: 0.1, far: 100 }}
        dpr={lowPower ? [1, 1.25] : [1, 1.75]}
        shadows={!lowPower}
        gl={{
          alpha: false,
          antialias: !lowPower,
          powerPreference: "high-performance",
        }}
        onCreated={({ gl }) => gl.setClearColor("#272725")}
      >
        <Suspense fallback={null}>
          <Room
            layout={layout}
            activeIndex={activeIndex}
            onSelectPhoto={onSelectPhoto}
            onSelectViewpoint={onSelectViewpoint}
            onTextureError={onTextureError}
          />
          <LoadingIndicator />
        </Suspense>
        {navigationMode === "guided" ? (
          <GuidedCamera layout={layout} activeIndex={activeIndex} />
        ) : (
          <>
            <PointerLockControls
              makeDefault
              onLock={() => onPointerLockChange(true)}
              onUnlock={() => onPointerLockChange(false)}
            />
            <FreeMovement enabled={navigationMode === "free"} layout={layout} />
          </>
        )}
      </Canvas>
    </KeyboardControls>
  );
}
