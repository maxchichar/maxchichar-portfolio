'use client';

/**
 * MAXCHICHAR // World3D
 *
 * The entire 3D universe lives here.
 * R3F Canvas → Rooms rendered at different Z positions.
 * Camera flies between them via smooth lerp transitions.
 */

import { useRef, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Stars,
  Environment,
  Preload,
} from '@react-three/drei';
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
  Noise,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { useWorldStore } from '@/store/worldStore';
import { lerp } from '@/lib/utils';

// Rooms
import EntranceRoom from './rooms/EntranceRoom';
import AboutRoom from './rooms/AboutRoom';
import SkillsRoom from './rooms/SkillsRoom';
import ProjectsRoom from './rooms/ProjectsRoom';
import ExperienceRoom from './rooms/ExperienceRoom';
import GalleryRoom from './rooms/GalleryRoom';
import ContactRoom from './rooms/ContactRoom';

// Room Z positions in world space
const ROOM_POSITIONS: Record<string, [number, number, number]> = {
  entrance:   [0,   0,  0],
  about:      [0,   0, -30],
  skills:     [0,   0, -60],
  projects:   [0,   0, -90],
  experience: [0,   0, -120],
  gallery:    [30,  0, -60],
  contact:    [0,   0, -150],
};

const CAMERA_OFFSETS: Record<string, [number, number, number]> = {
  entrance:   [0, 0, 12],
  about:      [0, 0, -18],
  skills:     [0, 2, -48],
  projects:   [0, 0, -78],
  experience: [0, 3, -108],
  gallery:    [30, 0, -48],
  contact:    [0, 0, -138],
};

/** Smooth camera that flies to active room */
function CameraRig() {
  const { camera } = useThree();
  const { activeRoom, doorComplete } = useWorldStore();
  const targetPos = useRef(new THREE.Vector3(0, 0, 12));
  const targetLook = useRef(new THREE.Vector3(0, 0, 0));
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const move = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);

  useFrame((_state, delta) => {
    if (!doorComplete) return;

    const [tx, ty, tz] = CAMERA_OFFSETS[activeRoom] ?? [0, 0, 12];
    const [lx, ly, lz] = ROOM_POSITIONS[activeRoom] ?? [0, 0, 0];

    // Subtle parallax from mouse
    const px = mouse.current.x * 0.6;
    const py = -mouse.current.y * 0.4;

    targetPos.current.set(tx + px, ty + py, tz);
    targetLook.current.set(lx, ly, lz);

    camera.position.lerp(targetPos.current, delta * 2.5);

    const look = camera.position.clone().lerp(targetLook.current, delta * 2.5);
    camera.lookAt(look);
  });

  return null;
}

/** Global ambient + point lighting */
function WorldLighting() {
  const { activeRoom } = useWorldStore();
  const point1 = useRef<THREE.PointLight>(null!);

  useFrame(({ clock }) => {
    if (!point1.current) return;
    point1.current.intensity = 1.2 + Math.sin(clock.elapsedTime * 0.8) * 0.3;
  });

  return (
    <>
      <ambientLight intensity={0.1} color="#03000f" />
      <pointLight
        ref={point1}
        position={[0, 8, 2]}
        intensity={1.5}
        color="#7b00ff"
        distance={80}
        decay={2}
      />
      <pointLight position={[-15, 5, -30]} intensity={0.8} color="#00ffff" distance={60} decay={2} />
      <pointLight position={[15, -5, -60]} intensity={0.6} color="#bf00ff" distance={60} decay={2} />
      <pointLight position={[0, 10, -90]} intensity={1.0} color="#7b00ff" distance={80} decay={2} />
      <pointLight position={[30, 8, -60]} intensity={1.2} color="#da70d6" distance={60} decay={2} />
    </>
  );
}

/** Infinite starfield background */
function QuantumField() {
  const meshRef = useRef<THREE.Points>(null!);
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.elapsedTime * 0.02;
      meshRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.01) * 0.05;
    }
  });

  const count = 3000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 400;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 400;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 400;
    // Purple/cyan/white random colors
    const c = Math.random();
    if (c < 0.5) { colors[i*3]=0.48; colors[i*3+1]=0; colors[i*3+2]=1; }          // purple
    else if (c < 0.75) { colors[i*3]=0; colors[i*3+1]=1; colors[i*3+2]=1; }       // cyan
    else { colors[i*3]=0.94; colors[i*3+1]=0.9; colors[i*3+2]=1; }                // white
  }

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.18} vertexColors transparent opacity={0.7} sizeAttenuation />
    </points>
  );
}

/** Floating grid floor that extends infinitely */
function GridFloor() {
  return (
    <gridHelper
      args={[800, 100, '#7b00ff', '#3d0080']}
      position={[0, -8, -75]}
      rotation={[0, 0, 0]}
    />
  );
}

export default function World3D() {
  const { setLoaded, setLoadProgress, isLoaded } = useWorldStore();

  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, 12], fov: 60, near: 0.1, far: 1000 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 1.5]}
        onCreated={({ gl }) => {
          gl.setClearColor('#000005', 1);
        }}
      >
        {/* Camera rig */}
        <CameraRig />

        {/* Background */}
        <color attach="background" args={['#000005']} />

        {/* Quantum particle field */}
        <QuantumField />

        {/* Grid floor */}
        <GridFloor />

        {/* Lighting */}
        <WorldLighting />

        {/* ── ROOMS ── */}
        <Suspense fallback={null}>
          <EntranceRoom position={ROOM_POSITIONS.entrance} />
          <AboutRoom position={ROOM_POSITIONS.about} />
          <SkillsRoom position={ROOM_POSITIONS.skills} />
          <ProjectsRoom position={ROOM_POSITIONS.projects} />
          <ExperienceRoom position={ROOM_POSITIONS.experience} />
          <GalleryRoom position={ROOM_POSITIONS.gallery} />
          <ContactRoom position={ROOM_POSITIONS.contact} />
        </Suspense>

        {/* Post-processing */}
        <EffectComposer>
          <Bloom
            intensity={1.4}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <ChromaticAberration
            blendFunction={BlendFunction.NORMAL}
            offset={[0.0005, 0.0005] as any}
          />
          <Vignette darkness={0.5} offset={0.4} />
          <Noise opacity={0.02} blendFunction={BlendFunction.SCREEN} />
        </EffectComposer>

        <Preload all />
      </Canvas>
    </div>
  );
}
