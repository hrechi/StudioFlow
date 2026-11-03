"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { GALLERY_CHAPTERS, type GalleryChapter, type GalleryPhoto } from "@/data/gallery";
import { createMuseumFrame, type Frame3DInstance } from "./Frame";

type CorridorSceneProps = {
  scrollProgressRef: React.RefObject<number>;
  isDark?: boolean;
  onSelectPhoto: (photo: GalleryPhoto) => void;
  onChapterChange?: (chapterIndex: number) => void;
  chapters?: GalleryChapter[];
};

const START_Z = 3.0;
const END_Z = -54.0;
const TOTAL_TRAVEL = START_Z - END_Z;

export function CorridorScene({
  scrollProgressRef,
  isDark = true,
  onSelectPhoto,
  onChapterChange,
  chapters = GALLERY_CHAPTERS,
}: CorridorSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webGLSupported, setWebGLSupported] = useState(true);

  // Active hover tracking
  const hoveredFrameRef = useRef<Frame3DInstance | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL availability
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) {
        setWebGLSupported(false);
        return;
      }
    } catch {
      setWebGLSupported(false);
      return;
    }

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Atmosphere
    const scene = new THREE.Scene();
    const fogColor = isDark ? new THREE.Color("#0c0705") : new THREE.Color("#e8dfd4");
    scene.background = fogColor;
    scene.fog = new THREE.FogExp2(fogColor, 0.038);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 120);
    camera.position.set(0, 1.7, START_Z);

    // 3. Renderer
    const isMobile = window.innerWidth < 768;
    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      powerPreference: "high-performance",
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isDark ? 1.15 : 0.95;
    renderer.shadowMap.enabled = !isMobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 4. Global Lighting
    const ambientLight = new THREE.AmbientLight(
      isDark ? 0xffeae0 : 0xffffff,
      isDark ? 0.35 : 0.75,
    );
    scene.add(ambientLight);

    // Subtle ceiling runner light creating hallway depth
    const corridorLength = 75;
    const ceilingLight = new THREE.DirectionalLight(0xffecd4, isDark ? 0.4 : 0.6);
    ceilingLight.position.set(0, 5, -corridorLength / 2);
    scene.add(ceilingLight);

    // 5. Museum Architecture: Floor, Side Walls, Ceiling
    const wallColor = isDark ? new THREE.Color("#120b08") : new THREE.Color("#ded5c7");
    const floorColor = isDark ? new THREE.Color("#080504") : new THREE.Color("#c8beb0");

    // Floor (Dark reflective museum pavement)
    const floorGeom = new THREE.PlaneGeometry(12, corridorLength, 1, 1);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: floorColor,
      roughness: 0.38,
      metalness: 0.25,
    });
    const floor = new THREE.Mesh(floorGeom, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -corridorLength / 2 + 5);
    floor.receiveShadow = !isMobile;
    scene.add(floor);

    // Left Wall
    const wallGeom = new THREE.PlaneGeometry(corridorLength, 6, 1, 1);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: wallColor,
      roughness: 0.85,
      metalness: 0.05,
    });
    const leftWall = new THREE.Mesh(wallGeom, wallMaterial);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-3.2, 3, -corridorLength / 2 + 5);
    scene.add(leftWall);

    // Right Wall
    const rightWall = new THREE.Mesh(wallGeom, wallMaterial);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(3.2, 3, -corridorLength / 2 + 5);
    scene.add(rightWall);

    // Ceiling
    const ceilingGeom = new THREE.PlaneGeometry(12, corridorLength, 1, 1);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: isDark ? new THREE.Color("#060302") : new THREE.Color("#b5aba0"),
      roughness: 0.95,
      metalness: 0.0,
    });
    const ceiling = new THREE.Mesh(ceilingGeom, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 6, -corridorLength / 2 + 5);
    scene.add(ceiling);

    // 6. Build Artwork Frames along the Corridor
    const textureLoader = new THREE.TextureLoader();
    const frameInstances: Frame3DInstance[] = [];

    // Layout configuration: distribute chapters along Z
    const chapterDistances = [
      { startZ: -2.0, endZ: -12.0 },
      { startZ: -15.0, endZ: -25.0 },
      { startZ: -28.0, endZ: -38.0 },
      { startZ: -41.0, endZ: -51.0 },
    ];

    chapters.forEach((chapter, chapIdx) => {
      const bounds = chapterDistances[chapIdx] || {
        startZ: -2 - chapIdx * 13,
        endZ: -12 - chapIdx * 13,
      };
      const photos = isMobile ? chapter.photos.slice(0, 2) : chapter.photos;
      const count = photos.length;
      const step = count > 1 ? (bounds.startZ - bounds.endZ) / (count - 1) : 4;

      photos.forEach((photo, pIdx) => {
        const side: "left" | "right" = (chapIdx + pIdx) % 2 === 0 ? "left" : "right";
        const xPos = side === "left" ? -3.05 : 3.05;
        const yPos = 1.8 + ((pIdx % 3) - 1) * 0.15; // Natural subtle museum height variation
        const zPos = bounds.startZ - pIdx * step;

        const frame = createMuseumFrame({
          photo,
          chapterIndex: chapIdx,
          position: [xPos, yPos, zPos],
          side,
          textureLoader,
          scene,
        });

        frameInstances.push(frame);
      });
    });

    // 7. Mouse Parallax & Raycasting
    const mouse = new THREE.Vector2(0, 0);
    const targetCameraOffset = { x: 0, y: 1.7 };
    const raycaster = new THREE.Raycaster();

    const handleMouseMove = (e: MouseEvent) => {
      if (isMobile) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouse.x = x;
      mouse.y = y;

      targetCameraOffset.x = x * 0.32;
      targetCameraOffset.y = 1.7 + y * 0.18;

      // Raycast for hover
      raycaster.setFromCamera(mouse, camera);
      const interactiveMeshes = frameInstances.map((f) => f.photoMesh);
      const intersects = raycaster.intersectObjects(interactiveMeshes);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const frame = frameInstances.find((f) => f.photoMesh === hitMesh);
        if (frame && hoveredFrameRef.current !== frame) {
          if (hoveredFrameRef.current) {
            hoveredFrameRef.current.meshGroup.scale.set(1, 1, 1);
          }
          hoveredFrameRef.current = frame;
          frame.meshGroup.scale.set(1.035, 1.035, 1.035);
          container.style.cursor = "pointer";
        }
      } else {
        if (hoveredFrameRef.current) {
          hoveredFrameRef.current.meshGroup.scale.set(1, 1, 1);
          hoveredFrameRef.current = null;
          container.style.cursor = "default";
        }
      }
    };

    const handleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const clickMouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -(((e.clientY - rect.top) / rect.height) * 2 - 1),
      );
      raycaster.setFromCamera(clickMouse, camera);
      const interactiveMeshes = frameInstances.map((f) => f.photoMesh);
      const intersects = raycaster.intersectObjects(interactiveMeshes);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const photo = hitMesh.userData?.photo as GalleryPhoto | undefined;
        if (photo) {
          onSelectPhoto(photo);
        }
      }
    };

    container.addEventListener("mousemove", handleMouseMove, { passive: true });
    container.addEventListener("click", handleClick);

    // 8. Visibility Observer: Pause render loop when offscreen
    let isVisible = true;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.05 },
    );
    observer.observe(container);

    // 9. Main Animation Loop (60 FPS with Smooth Camera Lerp)
    let animationFrameId: number;
    let lastActiveChapter = -1;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const progress = scrollProgressRef?.current ?? 0;
      const targetZ = START_Z - progress * TOTAL_TRAVEL;

      // Smooth camera position damping / lerp
      camera.position.z += (targetZ - camera.position.z) * 0.075;
      camera.position.x += (targetCameraOffset.x - camera.position.x) * 0.05;
      camera.position.y += (targetCameraOffset.y - camera.position.y) * 0.05;

      // Camera look forward with subtle depth target
      camera.lookAt(
        camera.position.x * 0.4,
        camera.position.y - 0.05,
        camera.position.z - 10,
      );

      // Dynamic Spotlights: Boost warmth as camera walks past each artwork
      const camZ = camera.position.z;
      frameInstances.forEach((frame) => {
        const distZ = Math.abs(camZ - frame.position[2]);
        if (distZ < 7.5) {
          const factor = 1 - distZ / 7.5;
          frame.spotLight.intensity = THREE.MathUtils.lerp(0.4, 4.5, factor * factor);
        } else {
          frame.spotLight.intensity = 0.35;
        }
      });

      // Chapter notification: determine which chapter camera is currently walking through
      const currentProgress = THREE.MathUtils.clamp(
        (START_Z - camZ) / TOTAL_TRAVEL,
        0,
        1,
      );
      const activeChapIdx = Math.min(
        chapters.length - 1,
        Math.floor(currentProgress * chapters.length),
      );

      if (activeChapIdx !== lastActiveChapter) {
        lastActiveChapter = activeChapIdx;
        onChapterChange?.(activeChapIdx);
      }

      renderer.render(scene, camera);
    };

    animate();

    // 10. Responsive Resize
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || window.innerWidth;
      const newH = container.clientHeight || window.innerHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("click", handleClick);

      // Clean up Three.js resources
      renderer.dispose();
      scene.clear();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [scrollProgressRef, isDark, onSelectPhoto, onChapterChange, chapters]);

  if (!webGLSupported) {
    return null;
  }

  return (
    <div
      ref={mountRef}
      className="relative size-full select-none overflow-hidden"
      style={{ touchAction: "none" }}
    />
  );
}

