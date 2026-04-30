'use client';

/**
 * MAXCHICHAR // Entrance Room
 *
 * The door ritual. Glassmorphism door with energy core,
 * cinematic opening, avatar materializes in the doorway.
 */

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox, MeshTransmissionMaterial, Float } from '@react-three/drei';
import * as THREE from 'three';
import { useWorldStore } from '@/store/worldStore';

interface Props {
  position: [number, number, number];
}

/** Energy core orb on the door */
function EnergyCore({ open }: { open: boolean }) {
  const ref = useRef<THREE.Mesh>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ref.current) {
      ref.current.rotation.y = t * 1.2;
      ref.current.rotation.z = t * 0.7;
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        open ? 0.2 : 1.5 + Math.sin(t * 3) * 0.5;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 2;
      ringRef.current.rotation.x = t * 0.5;
      ringRef.current.scale.setScalar(open ? 0.2 : 1 + Math.sin(t * 2) * 0.1);
    }
  });

  return (
    <group position={[0, 0, 0.12]}>
      {/* Core sphere */}
      <mesh ref={ref}>
        <icosahedronGeometry args={[0.4, 3]} />
        <meshStandardMaterial
          color="#7b00ff"
          emissive="#bf00ff"
          emissiveIntensity={2}
          wireframe
        />
      </mesh>
      {/* Ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.6, 0.02, 8, 64]} />
        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={3} />
      </mesh>
    </group>
  );
}

/** Single door panel */
function DoorPanel({
  side,
  open,
}: {
  side: 'left' | 'right';
  open: boolean;
}) {
  const ref = useRef<THREE.Group>(null!);
  const dir = side === 'left' ? -1 : 1;

  useFrame((_, delta) => {
    if (!ref.current) return;
    const targetX = open ? dir * 4.5 : dir * 2;
    ref.current.position.x = THREE.MathUtils.lerp(
      ref.current.position.x,
      targetX,
      delta * 1.8
    );
  });

  return (
    <group ref={ref} position={[dir * 2, 0, 0]}>
      {/* Main door slab */}
      <RoundedBox args={[3.8, 7, 0.18]} radius={0.05} smoothness={4}>
        <MeshTransmissionMaterial
          backside
          samples={6}
          resolution={256}
          transmission={0.6}
          roughness={0.05}
          thickness={0.3}
          ior={1.5}
          chromaticAberration={0.06}
          color="#0a0020"
          distortionScale={0.3}
          temporalDistortion={0.2}
        />
      </RoundedBox>

      {/* Metallic frame */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(3.8, 7, 0.18)]} />
        <lineBasicMaterial color="#7b00ff" />
      </lineSegments>

      {/* Neon stripe */}
      <mesh position={[0, 0, 0.1]}>
        <planeGeometry args={[0.04, 6.5]} />
        <meshStandardMaterial
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={4}
        />
      </mesh>

      {/* Corner accents */}
      {[-1, 1].map((cx) =>
        [-1, 1].map((cy) => (
          <mesh
            key={`${cx}-${cy}`}
            position={[cx * 1.7, cy * 3.1, 0.12]}
            rotation={[0, 0, cx * cy * Math.PI / 4]}
          >
            <planeGeometry args={[0.3, 0.04]} />
            <meshStandardMaterial
              color="#7b00ff"
              emissive="#7b00ff"
              emissiveIntensity={3}
            />
          </mesh>
        ))
      )}
    </group>
  );
}

/** Avatar plane — extracts the figure from banner */
function AvatarFloat({ visible }: { visible: boolean }) {
  const ref = useRef<THREE.Mesh>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);
  const opacity = useRef(0);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    opacity.current = THREE.MathUtils.lerp(
      opacity.current,
      visible ? 1 : 0,
      delta * 1.2
    );
    if (ref.current) {
      (ref.current.material as THREE.MeshStandardMaterial).opacity = opacity.current;
      ref.current.position.y = Math.sin(t * 0.8) * 0.3;
      ref.current.rotation.y = Math.sin(t * 0.3) * 0.1;
    }
    if (ringRef.current) {
      ringRef.current.rotation.y = t * 0.5;
      ringRef.current.rotation.z = t * 0.3;
    }
  });

  return (
    <group position={[0, 0, 1.5]}>
      {/* Avatar card — user replaces texture here */}
      <mesh ref={ref}>
        <planeGeometry args={[3.2, 4.2]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#7b00ff"
          emissiveIntensity={0.3}
          transparent
          opacity={0}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>

      {/* Holographic aura rings */}
      <mesh ref={ringRef} position={[0, 0, -0.1]}>
        <torusGeometry args={[2.2, 0.015, 8, 128]} />
        <meshStandardMaterial
          color="#7b00ff"
          emissive="#7b00ff"
          emissiveIntensity={visible ? 3 : 0}
          transparent
          opacity={0.6}
        />
      </mesh>
      <mesh rotation={[0.4, 0, 0.4]} position={[0, 0, -0.1]}>
        <torusGeometry args={[2.6, 0.01, 8, 128]} />
        <meshStandardMaterial
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={visible ? 3 : 0}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Data particles around avatar */}
      {visible &&
        Array.from({ length: 20 }).map((_, i) => {
          const angle = (i / 20) * Math.PI * 2;
          const r = 2.5 + Math.sin(i * 1.3) * 0.5;
          return (
            <DataParticle
              key={i}
              position={[Math.cos(angle) * r, Math.sin(angle) * r * 0.6, 0]}
            />
          );
        })}
    </group>
  );
}

function DataParticle({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null!);
  const speed = useRef(Math.random() * 0.8 + 0.4);
  const phase = useRef(Math.random() * Math.PI * 2);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed.current + phase.current;
    if (ref.current) {
      ref.current.position.y = position[1] + Math.sin(t) * 0.3;
      ref.current.scale.setScalar(0.5 + Math.sin(t * 2) * 0.3);
    }
  });

  return (
    <mesh ref={ref} position={position}>
      <boxGeometry args={[0.04, 0.04, 0.04]} />
      <meshStandardMaterial
        color="#00ffff"
        emissive="#00ffff"
        emissiveIntensity={4}
      />
    </mesh>
  );
}

export default function EntranceRoom({ position }: Props) {
  const { doorOpen, doorComplete, openDoor, completeDoor, isLoaded } = useWorldStore();

  // Auto-open door after load
  useEffect(() => {
    if (!isLoaded) return;
    const t1 = setTimeout(openDoor, 1200);
    const t2 = setTimeout(completeDoor, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isLoaded, openDoor, completeDoor]);

  return (
    <group position={position}>
      {/* Door frame */}
      <mesh position={[0, 0, -0.1]}>
        <boxGeometry args={[8.2, 7.4, 0.08]} />
        <meshStandardMaterial
          color="#1a003a"
          metalness={0.8}
          roughness={0.2}
          emissive="#3d0080"
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Door panels */}
      <DoorPanel side="left" open={doorOpen} />
      <DoorPanel side="right" open={doorOpen} />

      {/* Energy core (center of door) */}
      <EnergyCore open={doorOpen} />

      {/* Floor line */}
      <mesh position={[0, -3.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 0.04]} />
        <meshStandardMaterial
          color="#7b00ff"
          emissive="#7b00ff"
          emissiveIntensity={3}
        />
      </mesh>

      {/* Welcome text — fades in after door opens */}
      {doorOpen && (
        <Float speed={1} rotationIntensity={0.05} floatIntensity={0.2}>
          <Text
            position={[0, 4.5, 0.5]}
            fontSize={0.28}
            color="#ffffff"
            font="/fonts/ShareTechMono.woff"
            anchorX="center"
            anchorY="middle"
            letterSpacing={0.2}
          >
            WELCOME TO MAXCHICHAR
          </Text>
          <Text
            position={[0, 4.0, 0.5]}
            fontSize={0.14}
            color="#7b00ff"
            anchorX="center"
            letterSpacing={0.3}
          >
            ARCHITECT PROTOCOL // LEVEL OMEGA
          </Text>
        </Float>
      )}

      {/* Avatar materializes in doorway */}
      <AvatarFloat visible={doorComplete} />

      {/* Neon floor grid in front of door */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i} position={[0, -3.5, i * 1.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[8, 0.01]} />
          <meshStandardMaterial
            color="#7b00ff"
            emissive="#7b00ff"
            emissiveIntensity={2 - i * 0.18}
            transparent
            opacity={0.5 - i * 0.04}
          />
        </mesh>
      ))}
    </group>
  );
}
