'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float } from '@react-three/drei';
import * as THREE from 'three';

interface Props { position: [number, number, number]; }

const TIMELINE = [
  { year: '2019', label: 'VISION CORE ACTIVATED', desc: 'Identified pattern: control systems = scalable outcomes.' },
  { year: '2020', label: 'FIRST SYSTEMS BUILT', desc: 'Deployed first automation protocols. Results: 2x efficiency.' },
  { year: '2021', label: 'PROFIT MODE UNLOCKED', desc: 'Frameworks generating revenue without manual override.' },
  { year: '2022', label: 'SCALE PROTOCOL INITIATED', desc: 'Multi-channel expansion. Brand architecture complete.' },
  { year: '2023', label: 'DECISION NODE EVOLVED', desc: 'AI-enhanced strategy engines. Predictive outcomes live.' },
  { year: '2024', label: 'OMEGA CLEARANCE GRANTED', desc: 'Operating at full system capacity. Level Omega active.' },
];

function CrystalNode({ y, year, label, desc, index }: {
  y: number; year: string; label: string; desc: string; index: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const phase = index * 0.8;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase;
    if (ref.current) {
      ref.current.rotation.y = t * 0.5;
      ref.current.rotation.x = t * 0.3;
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        1.5 + Math.sin(t * 2) * 0.5;
    }
  });

  const side = index % 2 === 0 ? -1 : 1;

  return (
    <group position={[0, y, 0]}>
      {/* Crystal */}
      <mesh ref={ref}>
        <octahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial
          color="#0a0020"
          emissive="#7b00ff"
          emissiveIntensity={2}
          metalness={0.9}
          roughness={0.05}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Connector line to timeline */}
      <mesh position={[side * 1.5, 0, 0]}>
        <boxGeometry args={[3, 0.01, 0.01]} />
        <meshStandardMaterial color="#7b00ff" emissive="#7b00ff" emissiveIntensity={2} transparent opacity={0.6} />
      </mesh>

      {/* Year */}
      <Text
        position={[side * 3.2, 0.3, 0]}
        fontSize={0.3}
        color="#00ffff"
        anchorX={side > 0 ? 'left' : 'right'}
        letterSpacing={0.15}
      >
        {year}
      </Text>
      <Text
        position={[side * 3.2, -0.1, 0]}
        fontSize={0.18}
        color="#ffffff"
        anchorX={side > 0 ? 'left' : 'right'}
        letterSpacing={0.08}
        maxWidth={5}
      >
        {label}
      </Text>
      <Text
        position={[side * 3.2, -0.45, 0]}
        fontSize={0.14}
        color="#7b00ff"
        anchorX={side > 0 ? 'left' : 'right'}
        maxWidth={5}
        lineHeight={1.4}
      >
        {desc}
      </Text>
    </group>
  );
}

export default function ExperienceRoom({ position }: Props) {
  return (
    <group position={position}>
      <Float speed={0.4} floatIntensity={0.08}>
        <Text position={[0, 8, 0]} fontSize={1.1} color="#ffffff" anchorX="center" letterSpacing={0.15}>
          TIMELINE
        </Text>
        <Text position={[0, 7.1, 0]} fontSize={0.22} color="#7b00ff" anchorX="center" letterSpacing={0.3}>
          D-05 // CRYSTAL CHRONICLE
        </Text>
      </Float>

      {/* Vertical spine */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.015, TIMELINE.length * 2.5, 0.015]} />
        <meshStandardMaterial color="#7b00ff" emissive="#7b00ff" emissiveIntensity={2} />
      </mesh>

      {TIMELINE.map((t, i) => (
        <CrystalNode
          key={t.year}
          y={i * -2.2 + (TIMELINE.length / 2) * 2.2 - 2}
          {...t}
          index={i}
        />
      ))}
    </group>
  );
}
