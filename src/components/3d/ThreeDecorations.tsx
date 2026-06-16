import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Mesh, MeshStandardMaterial, TorusKnotGeometry, IcosahedronGeometry } from "three";

function TorusKnotMesh() {
  const meshRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <torusKnotGeometry args={[1.2, 0.4, 64, 16]} />
      <meshStandardMaterial
        color="#6366f1"
        transparent
        opacity={0.15}
        wireframe={false}
      />
    </mesh>
  );
}

function FloatingIcosahedron({
  position,
  speed,
  offset,
}: {
  position: [number, number, number];
  speed: number;
  offset: number;
}) {
  const meshRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * speed * 0.5;
      meshRef.current.rotation.y += delta * speed * 0.3;
      meshRef.current.position.y += Math.sin(Date.now() * 0.001 * speed + offset) * 0.002;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <icosahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial
        color="#a78bfa"
        transparent
        opacity={0.12}
        wireframe
      />
    </mesh>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 3, 5]} intensity={0.8} />

      <TorusKnotMesh />
      <FloatingIcosahedron position={[-2.5, 1.5, -1]} speed={0.4} offset={0} />
      <FloatingIcosahedron position={[2.5, -1.2, 0.5]} speed={0.6} offset={Math.PI} />
      <FloatingIcosahedron
        position={[-1.5, -2, 1.5]}
        speed={0.5}
        offset={Math.PI / 2}
      />
    </>
  );
}

export default function ThreeDecorations() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        dpr={[1, 2]}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
