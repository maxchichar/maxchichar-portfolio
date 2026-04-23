'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

interface Props { position: [number, number, number]; }

function HoloPillar({ x, h }: { x: number; h: number }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.8 + Math.sin(clock.elapsedTime * 1.2 + x) * 0.4;
    }
  });
  return (
    <mesh ref={ref} position={[x, h / 2 - 4, 0]}>
      <boxGeometry args={[0.08, h, 0.08]} />
      <meshStandardMaterial color="#7b00ff" emissive="#7b00ff" emissiveIntensity={1} transparent opacity={0.7} />
    </mesh>
  );
}

const BIO_TEXT = `I am MAXCHICHAR — a systems architect who engineers\ncontrol systems that execute with precision and\nprint outcomes at scale.\n\nMy framework: Vision Core → Decision Node →\nExecution Pathway → Feedback Loop.\n\nNo manual override. Self-optimizing. Always in\nProfit Mode.`;

export default function AboutRoom({ position }: Props) {
  return (
    <group position={position}>
      {/* Room backdrop */}
      <mesh position={[0, 0, -3]}>
        <planeGeometry args={[30, 20]} />
        <meshStandardMaterial color="#03000f" transparent opacity={0.8} />
      </mesh>

      {/* Holographic title */}
      <Float speed={0.8} floatIntensity={0.15}>
        <Text position={[-6, 4, 0]} fontSize={1.1} color="#ffffff" anchorX="left" letterSpacing={0.15}
          font="/fonts/Orbitron-Bold.woff">
          ABOUT
        </Text>
        <Text position={[-6, 3.1, 0]} fontSize={0.22} color="#7b00ff" anchorX="left" letterSpacing={0.3}>
          D-01 // IDENTITY MATRIX
        </Text>
      </Float>

      {/* Bio text panel */}
      <group position={[-5, 0.5, 0]}>
        <RoundedBox args={[9, 5.5, 0.05]} radius={0.04} smoothness={4}>
          <meshStandardMaterial color="#0a0020" transparent opacity={0.6} roughness={0.1} metalness={0.3} />
        </RoundedBox>
        <Text
          position={[0, 0, 0.08]}
          fontSize={0.22}
          color="#e0d0ff"
          anchorX="center"
          anchorY="middle"
          maxWidth={7.5}
          lineHeight={1.6}
          letterSpacing={0.02}
        >
          {BIO_TEXT}
        </Text>
      </group>

      {/* Metrics panel */}
      <group position={[5, 0, 0]}>
        {[
          ['STRATEGY ARCHITECTURE', 100],
          ['SYSTEMS DESIGN', 97],
          ['EXECUTION PROTOCOL', 99],
          ['SCALE OPTIMIZATION', 95],
          ['PROFIT MODE', 99.9],
        ].map(([label, val], i) => (
          <MetricBar key={i} label={label as string} value={val as number} y={2.5 - i * 1.1} />
        ))}
      </group>

      {/* Pillars */}
      {[-12, -11, 11, 12].map((x) => (
        <HoloPillar key={x} x={x} h={16} />
      ))}

      {/* Floor accent */}
      <mesh position={[0, -4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[28, 0.02]} />
        <meshStandardMaterial color="#7b00ff" emissive="#7b00ff" emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

function MetricBar({ label, value, y }: { label: string; value: number; y: number }) {
  const fillRef = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (fillRef.current) {
      (fillRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        1.5 + Math.sin(clock.elapsedTime + y) * 0.5;
    }
  });
  const w = (value / 100) * 5;
  return (
    <group position={[0, y, 0.1]}>
      <Text position={[-2.5, 0.25, 0]} fontSize={0.14} color="#7b00ff" anchorX="left" letterSpacing={0.15}>
        {label}
      </Text>
      <Text position={[2.4, 0.25, 0]} fontSize={0.14} color="#00ffff" anchorX="right">
        {value}%
      </Text>
      {/* Track */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[5, 0.06, 0.02]} />
        <meshStandardMaterial color="#1a003a" />
      </mesh>
      {/* Fill */}
      <mesh ref={fillRef} position={[-2.5 + w / 2, 0, 0.01]}>
        <boxGeometry args={[w, 0.06, 0.02]} />
        <meshStandardMaterial color="#7b00ff" emissive="#7b00ff" emissiveIntensity={2} />
      </mesh>
    </group>
  );
}
