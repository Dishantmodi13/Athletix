"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import {
  createFootballGeometries,
  createSeamGeometry,
  FOOTBALL_RADIUS,
} from "./utils/footballGeometry";

interface FootballMeshProps {
  mouse: { x: number; y: number };
}

export function FootballMesh({ mouse }: FootballMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const targetRotation = useRef({ x: 0, y: 0, z: 0 });

  const { pentagonGeometry, hexagonGeometry, seamGeometry } = useMemo(() => {
    const { pentagonGeometry, hexagonGeometry } =
      createFootballGeometries(FOOTBALL_RADIUS);
    const seamGeometry = createSeamGeometry(FOOTBALL_RADIUS);
    return { pentagonGeometry, hexagonGeometry, seamGeometry };
  }, []);

  const pentagonMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#0d0d0d",
        roughness: 0.55,
        metalness: 0.05,
        clearcoat: 0.15,
        clearcoatRoughness: 0.4,
      }),
    []
  );

  const hexagonMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#f4f4f0",
        roughness: 0.42,
        metalness: 0.02,
        clearcoat: 0.25,
        clearcoatRoughness: 0.35,
      }),
    []
  );

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    targetRotation.current.y += delta * 0.28;
    targetRotation.current.x = mouse.y * 0.12;
    targetRotation.current.z = mouse.x * 0.06;

    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRotation.current.y,
      0.04
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      targetRotation.current.x,
      0.04
    );
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z,
      targetRotation.current.z,
      0.04
    );
  });

  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[6, 8, 5]}
        intensity={1.4}
        color="#ffffff"
        castShadow
      />
      <directionalLight position={[-4, 2, -3]} intensity={0.35} color="#93c5fd" />
      <pointLight position={[-5, -2, 4]} intensity={0.6} color="#3b82f6" />
      <pointLight position={[4, -3, -2]} intensity={0.25} color="#a3ff12" />
      <spotLight
        position={[0, 6, 2]}
        angle={0.4}
        penumbra={0.8}
        intensity={0.5}
        color="#dbeafe"
      />

      <group ref={groupRef}>
        <mesh geometry={hexagonGeometry} material={hexagonMaterial} castShadow receiveShadow />
        <mesh geometry={pentagonGeometry} material={pentagonMaterial} castShadow receiveShadow />
        <lineSegments geometry={seamGeometry}>
          <lineBasicMaterial color="#2a2a2a" transparent opacity={0.35} />
        </lineSegments>
      </group>
    </>
  );
}
