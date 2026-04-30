'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

interface Props { position: [number, number, number]; }

function PortalRing({ radius, speed, color }: { radius: number; speed: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.z = clock.elapsedTime * speed;
      ref.current.rotation.x = clock.elapsedTime * speed * 0.4;
    }
  });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[radius, 0.02, 8, 128]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} transparent opacity={0.7} />
    </mesh>
  );
}

export default function ContactRoom({ position }: Props) {
  return (
    <group position={position}>
      <Float speed={0.5} floatIntensity={0.1}>
        <Text position={[0, 8, 0]} fontSize={1.1} color="#ffffff" anchorX="center" letterSpacing={0.15}>
          CONTACT
        </Text>
        <Text position={[0, 7.1, 0]} fontSize={0.22} color="#7b00ff" anchorX="center" letterSpacing={0.3}>
          D-04 // OPEN CHANNEL
        </Text>
      </Float>

      {/* Contact portal */}
      <group position={[-5, 0, 0]}>
        <PortalRing radius={3} speed={0.4} color="#7b00ff" />
        <PortalRing radius={2.5} speed={-0.6} color="#00ffff" />
        <PortalRing radius={2} speed={0.8} color="#bf00ff" />

        <Text position={[0, 0, 0.5]} fontSize={0.22} color="#ffffff" anchorX="center" letterSpacing={0.15}>
          INITIATE{'\n'}CONNECTION
        </Text>
      </group>

      {/* Info panel */}
      <group position={[5, 0, 0]}>
        <RoundedBox args={[9, 6, 0.08]} radius={0.04}>
          <meshStandardMaterial color="#0a0020" transparent opacity={0.7} metalness={0.3} roughness={0.1} />
        </RoundedBox>

        {[
          { icon: '◈', label: 'EMAIL', val: 'hello@maxchichar.com' },
          { icon: '⊕', label: 'INSTAGRAM', val: '@maxchichar' },
          { icon: '◎', label: 'TWITTER/X', val: '@maxchichar' },
          { icon: '⟁', label: 'STATUS', val: 'AVAILABLE — OMEGA LEVEL' },
        ].map(({ icon, label, val }, i) => (
          <group key={label} position={[0, 1.8 - i * 1.2, 0.1]}>
            <Text position={[-3.8, 0, 0]} fontSize={0.3} color="#7b00ff" anchorX="left">{icon}</Text>
            <Text position={[-3.2, 0.15, 0]} fontSize={0.13} color="#7b00ff" anchorX="left" letterSpacing={0.3}>{label}</Text>
            <Text position={[-3.2, -0.18, 0]} fontSize={0.22} color="#ffffff" anchorX="left" letterSpacing={0.05}>{val}</Text>
          </group>
        ))}
      </group>
    </group>
  );
}
