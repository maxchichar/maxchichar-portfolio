'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float } from '@react-three/drei';
import * as THREE from 'three';

interface Props { position: [number, number, number]; }

const SKILLS = [
  { label: 'Systems Architecture', level: 10, angle: 0 },
  { label: 'Brand Strategy', level: 10, angle: 60 },
  { label: 'Automation', level: 9, angle: 120 },
  { label: 'Revenue Optimization', level: 10, angle: 180 },
  { label: 'Growth Frameworks', level: 9, angle: 240 },
  { label: 'Decision Architecture', level: 10, angle: 300 },
];

function NeuralNode({ angle, radius, label, level }: {
  angle: number; radius: number; label: string; level: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const a = (angle * Math.PI) / 180;
  const x = Math.cos(a) * radius;
  const y = Math.sin(a) * radius;
  const phase = useRef(Math.random() * Math.PI * 2);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase.current;
    if (ref.current) {
      ref.current.scale.setScalar(0.9 + Math.sin(t * 1.5) * 0.15);
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        1.5 + Math.sin(t * 2) * 0.8;
    }
  });

  return (
    <group position={[x, y, 0]}>
      <mesh ref={ref}>
        <icosahedronGeometry args={[0.3, 1]} />
        <meshStandardMaterial
          color="#7b00ff"
          emissive="#bf00ff"
          emissiveIntensity={2}
          wireframe
        />
      </mesh>
      <Text
        position={[0, -0.55, 0]}
        fontSize={0.18}
        color="#00ffff"
        anchorX="center"
        letterSpacing={0.1}
      >
        {label}
      </Text>
      <Text
        position={[0, -0.8, 0]}
        fontSize={0.14}
        color="#7b00ff"
        anchorX="center"
      >
        LVL {level}/10
      </Text>
    </group>
  );
}

/** Lines connecting nodes to center */
function NeuralLines({ count, radius }: { count: number; radius: number }) {
  const lineRef = useRef<THREE.LineSegments>(null!);

  const geometry = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      pts.push(0, 0, 0, Math.cos(a) * radius, Math.sin(a) * radius, 0);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [count, radius]);

  useFrame(({ clock }) => {
    if (lineRef.current) {
      (lineRef.current.material as THREE.LineBasicMaterial).opacity =
        0.3 + Math.sin(clock.elapsedTime * 0.8) * 0.1;
    }
  });

  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <lineBasicMaterial color="#7b00ff" transparent opacity={0.4} />
    </lineSegments>
  );
}

/** Central core */
function CoreSphere() {
  const ref = useRef<THREE.Mesh>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ref.current) { ref.current.rotation.y = t * 0.8; ref.current.rotation.x = t * 0.4; }
    if (ringRef.current) { ringRef.current.rotation.z = t; ringRef.current.rotation.x = t * 0.3; }
  });

  return (
    <group>
      <mesh ref={ref}>
        <icosahedronGeometry args={[0.7, 2]} />
        <meshStandardMaterial color="#3d0080" emissive="#7b00ff" emissiveIntensity={2} wireframe />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.02, 8, 64]} />
        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={4} />
      </mesh>
      <Text position={[0, 0, 1.2]} fontSize={0.2} color="#ffffff" anchorX="center" letterSpacing={0.2}>
        MAXCHICHAR
      </Text>
      <Text position={[0, -0.32, 1.2]} fontSize={0.12} color="#7b00ff" anchorX="center" letterSpacing={0.3}>
        NEURAL CORE
      </Text>
    </group>
  );
}

export default function SkillsRoom({ position }: Props) {
  const groupRef = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.15) * 0.1;
  });

  return (
    <group position={position}>
      <Float speed={0.5} floatIntensity={0.1}>
        <Text position={[0, 7, 0]} fontSize={1.1} color="#ffffff" anchorX="center" letterSpacing={0.15}>
          SKILLS
        </Text>
        <Text position={[0, 6.1, 0]} fontSize={0.22} color="#7b00ff" anchorX="center" letterSpacing={0.3}>
          D-03 // CAPABILITY ARSENAL
        </Text>
      </Float>

      <group ref={groupRef} position={[0, 0.5, 0]}>
        <CoreSphere />
        <NeuralLines count={SKILLS.length} radius={4.5} />
        {SKILLS.map((s) => (
          <NeuralNode key={s.label} {...s} radius={4.5} />
        ))}
      </group>
    </group>
  );
}
