import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const FOOTBALL_RADIUS = 1.5;

function createPanelGeometry(sides: 5 | 6, panelRadius: number, depth: number) {
  const shape = new THREE.Shape();

  for (let i = 0; i <= sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * panelRadius;
    const y = Math.sin(angle) * panelRadius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.006,
    bevelSegments: 2,
    curveSegments: sides === 5 ? 5 : 6,
  });

  geometry.center();
  return geometry;
}

function orientPanel(
  geometry: THREE.BufferGeometry,
  center: THREE.Vector3,
  sphereRadius: number
) {
  const clone = geometry.clone();
  const normal = center.clone().normalize();
  const position = normal.clone().multiplyScalar(sphereRadius);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    normal
  );

  clone.applyQuaternion(quaternion);
  clone.translate(position.x, position.y, position.z);
  return clone;
}

function getIcosahedronData(radius: number) {
  const phi = (1 + Math.sqrt(5)) / 2;
  const raw = [
    [-1, phi, 0],
    [1, phi, 0],
    [-1, -phi, 0],
    [1, -phi, 0],
    [0, -1, phi],
    [0, 1, phi],
    [0, -1, -phi],
    [0, 1, -phi],
    [phi, 0, -1],
    [phi, 0, 1],
    [-phi, 0, -1],
    [-phi, 0, 1],
  ];

  const vertices = raw.map(
    ([x, y, z]) => new THREE.Vector3(x, y, z).normalize().multiplyScalar(radius)
  );

  const faces = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];

  return { vertices, faces };
}

export function createFootballGeometries(radius = 1.15) {
  const { vertices, faces } = getIcosahedronData(radius);
  const pentagonRadius = radius * 0.22;
  const hexagonRadius = radius * 0.19;
  const panelDepth = radius * 0.04;

  const pentagonTemplate = createPanelGeometry(5, pentagonRadius, panelDepth);
  const hexagonTemplate = createPanelGeometry(6, hexagonRadius, panelDepth);

  const pentagonGeometries: THREE.BufferGeometry[] = vertices.map((vertex) =>
    orientPanel(pentagonTemplate, vertex, radius * 0.98)
  );

  const hexagonGeometries: THREE.BufferGeometry[] = faces.map((face) => {
    const center = new THREE.Vector3();
    face.forEach((i) => center.add(vertices[i]));
    center.divideScalar(face.length);
    return orientPanel(hexagonTemplate, center, radius * 0.96);
  });

  const pentagonGeometry = mergeGeometries(pentagonGeometries, false)!;
  const hexagonGeometry = mergeGeometries(hexagonGeometries, false)!;

  pentagonGeometry.computeVertexNormals();
  hexagonGeometry.computeVertexNormals();

  pentagonTemplate.dispose();
  hexagonTemplate.dispose();
  pentagonGeometries.forEach((g) => g.dispose());
  hexagonGeometries.forEach((g) => g.dispose());

  return { pentagonGeometry, hexagonGeometry };
}

export function createSeamGeometry(radius = 1.15) {
  const geometry = new THREE.IcosahedronGeometry(radius * 1.002, 2);
  return new THREE.EdgesGeometry(geometry, 15);
}
