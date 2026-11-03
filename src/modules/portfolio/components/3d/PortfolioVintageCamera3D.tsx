"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { Camera, Sparkles } from "lucide-react";

export function PortfolioVintageCamera3D({
  className = "",
  accentColor = "#e0563b",
}: {
  className?: string;
  accentColor?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const flashLightRef = useRef<THREE.PointLight | null>(null);
  const safelightRef = useRef<THREE.PointLight | null>(null);
  const cameraGroupRef = useRef<THREE.Group | null>(null);
  const shutterBtnRef = useRef<THREE.Mesh | null>(null);

  const triggerFlash = useCallback(() => {
    setIsFlashing(true);
    setHasInteracted(true);
    if (flashLightRef.current) {
      flashLightRef.current.intensity = 30;
    }
    if (shutterBtnRef.current) {
      shutterBtnRef.current.position.y = 0.88;
      setTimeout(() => {
        if (shutterBtnRef.current) shutterBtnRef.current.position.y = 0.94;
      }, 180);
    }
    setTimeout(() => {
      setIsFlashing(false);
    }, 450);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 360;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.45, 5.0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // Parse accent color
    const hexAccent = parseInt(accentColor.replace("#", ""), 16) || 0xe0563b;

    // Materials
    const leatherMat = new THREE.MeshStandardMaterial({
      color: 0x141010,
      roughness: 0.85,
      metalness: 0.1,
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0x4a4340,
      metalness: 0.9,
      roughness: 0.25,
    });

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0x8c6d48,
      metalness: 0.8,
      roughness: 0.35,
    });

    const lensGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x120505,
      metalness: 0.15,
      roughness: 0.05,
      transmission: 0.6,
      thickness: 0.8,
      ior: 1.6,
      reflectivity: 0.9,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });

    const redAccentMat = new THREE.MeshStandardMaterial({
      color: hexAccent,
      metalness: 0.4,
      roughness: 0.3,
      emissive: hexAccent,
      emissiveIntensity: 0.35,
    });

    // Group
    const cameraGroup = new THREE.Group();
    cameraGroupRef.current = cameraGroup;
    scene.add(cameraGroup);

    // 1. Body
    const bodyGeo = new THREE.BoxGeometry(2.3, 1.35, 0.9);
    const bodyMesh = new THREE.Mesh(bodyGeo, leatherMat);
    cameraGroup.add(bodyMesh);

    const topPlateGeo = new THREE.BoxGeometry(2.32, 0.28, 0.92);
    const topPlateMesh = new THREE.Mesh(topPlateGeo, chromeMat);
    topPlateMesh.position.y = 0.72;
    cameraGroup.add(topPlateMesh);

    const bottomPlateGeo = new THREE.BoxGeometry(2.32, 0.12, 0.92);
    const bottomPlateMesh = new THREE.Mesh(bottomPlateGeo, chromeMat);
    bottomPlateMesh.position.y = -0.7;
    cameraGroup.add(bottomPlateMesh);

    // Prisme SLR
    const prismShape = new THREE.Shape();
    prismShape.moveTo(-0.45, 0);
    prismShape.lineTo(0.45, 0);
    prismShape.lineTo(0.3, 0.45);
    prismShape.lineTo(-0.3, 0.45);
    prismShape.closePath();

    const prismGeo = new THREE.ExtrudeGeometry(prismShape, {
      depth: 0.8,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.04,
      bevelThickness: 0.04,
    });
    prismGeo.center();
    const prismMesh = new THREE.Mesh(prismGeo, chromeMat);
    prismMesh.position.set(0, 1.04, 0);
    cameraGroup.add(prismMesh);

    // Hot shoe
    const hotShoeGeo = new THREE.BoxGeometry(0.35, 0.08, 0.35);
    const hotShoeMesh = new THREE.Mesh(hotShoeGeo, brassMat);
    hotShoeMesh.position.set(0, 1.3, 0);
    cameraGroup.add(hotShoeMesh);

    // 2. Objectif étagé
    const lensGroup = new THREE.Group();
    lensGroup.position.set(0, 0, 0.45);

    const mountGeo = new THREE.CylinderGeometry(0.68, 0.72, 0.2, 32);
    mountGeo.rotateX(Math.PI / 2);
    const mountMesh = new THREE.Mesh(mountGeo, chromeMat);
    mountMesh.position.z = 0.1;
    lensGroup.add(mountMesh);

    const barrelGeo = new THREE.CylinderGeometry(0.64, 0.65, 0.35, 32);
    barrelGeo.rotateX(Math.PI / 2);
    const barrelMesh = new THREE.Mesh(barrelGeo, leatherMat);
    barrelMesh.position.z = 0.32;
    lensGroup.add(barrelMesh);

    const redRingGeo = new THREE.TorusGeometry(0.64, 0.018, 16, 40);
    const redRingMesh = new THREE.Mesh(redRingGeo, redAccentMat);
    redRingMesh.position.z = 0.52;
    lensGroup.add(redRingMesh);

    const apertureRingGeo = new THREE.CylinderGeometry(0.61, 0.62, 0.18, 32);
    apertureRingGeo.rotateX(Math.PI / 2);
    const apertureRingMesh = new THREE.Mesh(apertureRingGeo, chromeMat);
    apertureRingMesh.position.z = 0.62;
    lensGroup.add(apertureRingMesh);

    const lensFrontGeo = new THREE.SphereGeometry(0.52, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.35);
    lensFrontGeo.rotateX(Math.PI / 2);
    const lensFrontMesh = new THREE.Mesh(lensFrontGeo, lensGlassMat);
    lensFrontMesh.position.z = 0.64;
    lensGroup.add(lensFrontMesh);

    cameraGroup.add(lensGroup);

    // 3. Commandes mécaniques
    const shutterBaseGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.12, 24);
    const shutterBaseMesh = new THREE.Mesh(shutterBaseGeo, chromeMat);
    shutterBaseMesh.position.set(0.78, 0.9, 0.12);
    cameraGroup.add(shutterBaseMesh);

    const shutterBtnGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.08, 24);
    const shutterBtnMesh = new THREE.Mesh(shutterBtnGeo, redAccentMat);
    shutterBtnMesh.position.set(0.78, 0.94, 0.12);
    shutterBtnRef.current = shutterBtnMesh;
    cameraGroup.add(shutterBtnMesh);

    const dialGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.16, 32);
    const dialMesh = new THREE.Mesh(dialGeo, chromeMat);
    dialMesh.position.set(0.42, 0.92, 0.08);
    cameraGroup.add(dialMesh);

    const rewindGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.14, 32);
    const rewindMesh = new THREE.Mesh(rewindGeo, chromeMat);
    rewindMesh.position.set(-0.78, 0.91, 0.05);
    cameraGroup.add(rewindMesh);

    // 4. Éclairage
    const safelight = new THREE.PointLight(hexAccent, 4.5, 8);
    safelight.position.set(-2, 1.8, 2.5);
    scene.add(safelight);
    safelightRef.current = safelight;

    const rimLight = new THREE.DirectionalLight(0xf4e4de, 1.3);
    rimLight.position.set(3, 2, 3);
    scene.add(rimLight);

    const ambientLight = new THREE.AmbientLight(0x281614, 0.9);
    scene.add(ambientLight);

    const flashLight = new THREE.PointLight(0xfff5ea, 0, 16);
    flashLight.position.set(0.7, 0.8, 1.6);
    scene.add(flashLight);
    flashLightRef.current = flashLight;

    // Interaction souris
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0.08;
    let targetRotationY = -0.35;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseX = x;
      mouseY = y;
    };

    window.addEventListener("mousemove", handleMouseMove);

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrameId: number | undefined;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      targetRotationY = -0.35 + Math.sin(elapsedTime * 0.6) * 0.35 + mouseX * 0.45;
      targetRotationX = 0.08 + Math.cos(elapsedTime * 0.5) * 0.1 - mouseY * 0.3;

      cameraGroup.rotation.y += (targetRotationY - cameraGroup.rotation.y) * 0.05;
      cameraGroup.rotation.x += (targetRotationX - cameraGroup.rotation.x) * 0.05;
      cameraGroup.position.y = Math.sin(elapsedTime * 1.2) * 0.08;

      if (safelightRef.current) {
        safelightRef.current.intensity = 3.6 + Math.sin(elapsedTime * 2.2) * 1.4;
      }

      if (flashLightRef.current && flashLightRef.current.intensity > 0) {
        flashLightRef.current.intensity *= 0.84;
        if (flashLightRef.current.intensity < 0.1) {
          flashLightRef.current.intensity = 0;
        }
      }

      renderer.render(scene, camera);
    };

    const updateMotion = () => {
      if (animationFrameId !== undefined) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = undefined;
      }

      if (motionPreference.matches) {
        cameraGroup.rotation.set(0.08, -0.35, 0);
        cameraGroup.position.y = 0;
        renderer.render(scene, camera);
        return;
      }

      animate();
    };

    motionPreference.addEventListener("change", updateMotion);
    updateMotion();

    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      motionPreference.removeEventListener("change", updateMotion);
      if (animationFrameId !== undefined) cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [accentColor]);

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      {isFlashing && (
        <div className="pointer-events-none absolute inset-0 z-30 rounded-3xl bg-white/70 backdrop-blur-xs transition-opacity duration-300" />
      )}

      <div
        ref={containerRef}
        onClick={triggerFlash}
        className="relative h-[320px] w-full max-w-[380px] cursor-pointer touch-none select-none sm:h-[380px]"
        title="Cliquez pour déclencher le flash !"
      />

      <div className="relative z-10 -mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={triggerFlash}
          className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-4 py-2 font-mono text-xs tracking-wider text-white/90 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-[var(--portfolio-accent)] hover:text-white"
          style={{
            borderColor: "rgba(255,255,255,0.12)",
          }}
        >
          <Camera className="size-3.5 text-[var(--portfolio-accent)] transition-colors group-hover:scale-110" />
          <span>Déclencher le flash</span>
          <span
            className="flex size-2 rounded-full transition-transform group-hover:scale-125"
            style={{ backgroundColor: "var(--portfolio-accent)" }}
          />
        </button>

        {!hasInteracted && (
          <span className="hidden items-center gap-1.5 font-mono text-[10px] text-white/50 sm:inline-flex">
            <Sparkles className="size-3 text-[var(--portfolio-accent)]" />
            3D interactif
          </span>
        )}
      </div>
    </div>
  );
}
