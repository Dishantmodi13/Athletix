"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import * as THREE from "three";
import { FootballMesh } from "./FootballMesh";
import { FOOTBALL_RADIUS } from "./utils/footballGeometry";

interface FootballSceneProps {
  mouse: { x: number; y: number };
}

function SceneFallback() {
  return (
    <mesh>
      <sphereGeometry args={[FOOTBALL_RADIUS, 32, 32]} />
      <meshStandardMaterial color="#f0f0eb" wireframe opacity={0.3} transparent />
    </mesh>
  );
}

export function FootballScene({ mouse }: FootballSceneProps) {
  return (
    <Canvas
      className="!h-full !w-full"
      camera={{ position: [0, 0, 4.6], fov: 38 }}
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      style={{ background: "transparent", display: "block" }}
      dpr={[1, 2]}
    >
      <Suspense fallback={<SceneFallback />}>
        <FootballMesh mouse={mouse} />
      </Suspense>
    </Canvas>
  );
}
