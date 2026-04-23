'use client';

/**
 * MAXCHICHAR // Gallery Auction Room
 *
 * HOW TO REPLACE THE GALLERY PHOTO:
 * ─────────────────────────────────
 * Option A (easiest): Drop your image file into /public/textures/
 *   then change the `galleryPhotoUrl` default in store/worldStore.ts
 *   to '/textures/your-image.jpg'
 *
 * Option B (runtime): The DragDropUploader component below lets the
 *   user drag & drop any image file. It converts to base64 and updates
 *   the store. The gallery lighting, reflection, and frame update instantly.
 *
 * The photo appears on a luxury floating pedestal with:
 *   - Three-point spot lighting (warm key, cool fill, purple rim)
 *   - MeshPhysicalMaterial with clearcoat for glossy finish
 *   - Subtle reflection plane below
 *   - Holographic frame with neon border glow
 */

import { useRef, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float, RoundedBox, useTexture, SpotLight } from '@react-three/drei';
import * as THREE from 'three';
import { useWorldStore } from '@/store/worldStore';

interface Props { position: [number, number, number]; }

/** Marble floor tile */
function MarbleFloor() {
  return (
    <mesh position={[0, -5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial
        color="#0d0020"
        metalness={0.6}
        roughness={0.3}
        envMapIntensity={1.2}
      />
    </mesh>
  );
}

/** The main photo frame on pedestal */
function ArtworkFrame() {
  const { galleryPhotoUrl } = useWorldStore();
  const frameRef = useRef<THREE.Group>(null!);
  const spotRef1 = useRef<THREE.SpotLight>(null!);
  const spotRef2 = useRef<THREE.SpotLight>(null!);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (frameRef.current) {
      frameRef.current.rotation.y = Math.sin(t * 0.2) * 0.04;
    }
    if (spotRef1.current) {
      spotRef1.current.intensity = 3 + Math.sin(t * 0.6) * 0.5;
    }
  });

  // Load texture or use fallback color
  let texture: THREE.Texture | null = null;
  try {
    // This will work when a valid URL is provided
    // eslint-disable-next-line react-hooks/rules-of-hooks
    texture = useTexture(galleryPhotoUrl);
  } catch {
    texture = null;
  }

  return (
    <group ref={frameRef}>
      {/* Pedestal */}
      <RoundedBox args={[4, 0.4, 4]} position={[0, -4.8, 0]} radius={0.04}>
        <meshStandardMaterial
          color="#1a003a"
          metalness={0.9}
          roughness={0.1}
          envMapIntensity={1.5}
        />
      </RoundedBox>
      <RoundedBox args={[3, 2.5, 3]} position={[0, -3.4, 0]} radius={0.04}>
        <meshStandardMaterial color="#0a0020" metalness={0.8} roughness={0.15} />
      </RoundedBox>

      {/* Artwork surface */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[5.6, 7.2]} />
        <meshPhysicalMaterial
          map={texture ?? undefined}
          color={texture ? '#ffffff' : '#0a0020'}
          emissive={texture ? '#000000' : '#7b00ff'}
          emissiveIntensity={texture ? 0 : 0.3}
          metalness={0.2}
          roughness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.05}
          reflectivity={0.8}
        />
      </mesh>

      {/* Outer neon frame */}
      <Frame />

      {/* Reflection plane below frame */}
      <mesh position={[0, -4.6, 0.01]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial
          color="#7b00ff"
          metalness={1}
          roughness={0}
          transparent
          opacity={0.15}
          envMapIntensity={2}
        />
      </mesh>

      {/* Spotlights */}
      <spotLight
        ref={spotRef1}
        position={[-6, 10, 3]}
        target-position={[0, 0, 0]}
        intensity={3}
        angle={0.4}
        penumbra={0.5}
        color="#fff5e0"
        castShadow
      />
      <spotLight
        position={[6, 8, 3]}
        target-position={[0, 0, 0]}
        intensity={2}
        angle={0.45}
        penumbra={0.6}
        color="#c0d8ff"
      />
      <spotLight
        position={[0, 5, -3]}
        target-position={[0, 0, 0]}
        intensity={1.5}
        angle={0.6}
        penumbra={0.7}
        color="#7b00ff"
      />

      {/* Placeholder text if no texture */}
      {!texture && (
        <Text
          position={[0, 0, 0.02]}
          fontSize={0.25}
          color="#7b00ff"
          anchorX="center"
          anchorY="middle"
          maxWidth={4}
          lineHeight={1.6}
          letterSpacing={0.1}
        >
          DROP YOUR PHOTO HERE{'\n'}OR USE THE UPLOAD PANEL
        </Text>
      )}

      <Text position={[0, -4.2, 0.5]} fontSize={0.16} color="#00ffff" anchorX="center" letterSpacing={0.2}>
        MAXCHICHAR // GALLERY EXHIBIT 001
      </Text>
    </group>
  );
}

/** Neon picture frame */
function Frame() {
  const ref = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    if (ref.current) {
      (ref.current.children[0] as THREE.Mesh & { material: THREE.MeshStandardMaterial }).material.emissiveIntensity =
        2 + Math.sin(clock.elapsedTime * 1.5) * 0.5;
    }
  });
  const w = 5.6, h = 7.2, t = 0.08, d = 0.25;
  return (
    <group ref={ref} position={[0, 0, 0.05]}>
      {/* Four sides of frame */}
      {[
        { pos: [0,  h / 2 + d / 2, 0] as [number,number,number], size: [w + d * 2, d, t] as [number,number,number] },
        { pos: [0, -h / 2 - d / 2, 0] as [number,number,number], size: [w + d * 2, d, t] as [number,number,number] },
        { pos: [-w / 2 - d / 2, 0, 0] as [number,number,number], size: [d, h, t] as [number,number,number] },
        { pos: [ w / 2 + d / 2, 0, 0] as [number,number,number], size: [d, h, t] as [number,number,number] },
      ].map((s, i) => (
        <mesh key={i} position={s.pos}>
          <boxGeometry args={s.size} />
          <meshStandardMaterial
            color="#7b00ff"
            emissive="#7b00ff"
            emissiveIntensity={2}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Small auction paddle decorations */
function AuctionDecor() {
  return (
    <>
      {[-8, 8].map((x) => (
        <group key={x} position={[x, 0, 1]}>
          <mesh position={[0, 2, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 4, 8]} />
            <meshStandardMaterial color="#1a003a" metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[0, 4.2, 0]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial color="#7b00ff" emissive="#7b00ff" emissiveIntensity={2} />
          </mesh>
          <pointLight position={[0, 4, 0]} intensity={0.5} color="#7b00ff" distance={8} decay={2} />
        </group>
      ))}
    </>
  );
}

export default function GalleryRoom({ position }: Props) {
  return (
    <group position={position}>
      <Float speed={0.3} floatIntensity={0.03}>
        <Text position={[0, 9, 0]} fontSize={1.1} color="#ffffff" anchorX="center" letterSpacing={0.15}>
          GALLERY
        </Text>
        <Text position={[0, 8.1, 0]} fontSize={0.22} color="#da70d6" anchorX="center" letterSpacing={0.3}>
          AUCTION ROOM // EXHIBIT HALL
        </Text>
      </Float>

      <MarbleFloor />
      <ArtworkFrame />
      <AuctionDecor />

      {/* Room walls suggestion */}
      {[-14, 14].map((x) => (
        <mesh key={x} position={[x, 0, 0]}>
          <planeGeometry args={[0.02, 20]} />
          <meshStandardMaterial color="#7b00ff" emissive="#7b00ff" emissiveIntensity={1.5} transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  );
}
