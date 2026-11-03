import * as THREE from "three";
import type { GalleryPhoto } from "@/data/gallery";

export type Frame3DInstance = {
  id: string;
  photo: GalleryPhoto;
  chapterIndex: number;
  position: [number, number, number];
  rotation: [number, number, number];
  side: "left" | "right";
  meshGroup: THREE.Group;
  spotLight: THREE.SpotLight;
  photoMesh: THREE.Mesh;
};

/**
 * Creates a complete museum 3D frame:
 * 1. Dark wood outer frame
 * 2. Museum cream passe-partout mat
 * 3. Photographic canvas with texture
 * 4. Dedicated warm spotlight pointing directly at the artwork
 */
export function createMuseumFrame({
  photo,
  chapterIndex,
  position,
  side,
  textureLoader,
  scene,
}: {
  photo: GalleryPhoto;
  chapterIndex: number;
  position: [number, number, number];
  side: "left" | "right";
  textureLoader: THREE.TextureLoader;
  scene: THREE.Scene;
}): Frame3DInstance {
  const group = new THREE.Group();
  group.position.set(...position);

  // Slight angle facing the visitor walking forward down the corridor
  const angleY = side === "left" ? 0.16 : -0.16;
  const angleZ = side === "left" ? -0.015 : 0.015;
  group.rotation.set(0, angleY, angleZ);

  // Dimensions
  const frameWidth = 2.4;
  const frameHeight = 1.7;
  const frameDepth = 0.08;
  const matMargin = 0.22;

  // 1. Outer Dark Walnut Wood Frame
  const outerGeom = new THREE.BoxGeometry(frameWidth, frameHeight, frameDepth);
  const woodMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#1a120e"),
    roughness: 0.7,
    metalness: 0.15,
  });
  const outerMesh = new THREE.Mesh(outerGeom, woodMaterial);
  outerMesh.castShadow = true;
  group.add(outerMesh);

  // 2. Passe-partout Cream Mat
  const matGeom = new THREE.PlaneGeometry(
    frameWidth - 0.08,
    frameHeight - 0.08,
  );
  const matMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#261e1a"),
    roughness: 0.9,
    metalness: 0.05,
  });
  const matMesh = new THREE.Mesh(matGeom, matMaterial);
  matMesh.position.z = frameDepth / 2 + 0.002;
  group.add(matMesh);

  // 3. Inner Photo Print
  const photoWidth = frameWidth - matMargin * 2;
  const photoHeight = frameHeight - matMargin * 2;
  const photoGeom = new THREE.PlaneGeometry(photoWidth, photoHeight);

  // Default placeholder canvas until texture loads
  const photoMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#100a08"),
    roughness: 0.45,
    metalness: 0.05,
  });

  const photoMesh = new THREE.Mesh(photoGeom, photoMaterial);
  photoMesh.position.z = frameDepth / 2 + 0.006;
  // Store reference to photo data for raycasting click & hover
  photoMesh.userData = { photoId: photo.id, photo };
  group.add(photoMesh);

  // Load the actual image texture asynchronously
  textureLoader.load(
    photo.src,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      photoMaterial.map = texture;
      photoMaterial.color.setHex(0xffffff);
      photoMaterial.needsUpdate = true;
    },
    undefined,
    () => {
      // Keep elegant dark fallback if texture fails
    },
  );

  // 4. Dedicated Warm Museum SpotLight
  // Positioned slightly above and away from the wall, aimed directly at the artwork
  const spotLight = new THREE.SpotLight(
    new THREE.Color("#ffc58a"),
    0.3, // Base dim intensity, boosted when camera approaches
    14,
    Math.PI / 4.5,
    0.7,
    1.2,
  );

  const lightX = side === "left" ? position[0] + 1.2 : position[0] - 1.2;
  const lightY = position[1] + 1.8;
  const lightZ = position[2] + 1.0;
  spotLight.position.set(lightX, lightY, lightZ);
  spotLight.target = photoMesh;
  scene.add(spotLight);

  scene.add(group);

  return {
    id: photo.id,
    photo,
    chapterIndex,
    position,
    rotation: [0, angleY, angleZ],
    side,
    meshGroup: group,
    spotLight,
    photoMesh,
  };
}

