'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useWorldStore } from '@/store/worldStore';

interface Props { position: [number, number, number]; }

const PROJECTS = [
  { id: 'FILE_001', title: 'CONTROL SYSTEM ALPHA', desc: 'End-to-end automation. 3x revenue scale.', color: '#7b00ff', status: 'DEPLOYED' },
  { id: 'FILE_002', title: 'PROFIT ENGINE v2.0', desc: 'Data-driven decision framework. Multiply output.', color: '#00ffff', status: 'OPERATIONAL' },
  { id: 'FILE_003', title: 'SCALE PROTOCOL', desc: 'Brand ecosystem → multi-channel machine.', color: '#bf00ff', status: 'ACTIVE' },
  { id: 'FILE_004', title: 'FEEDBACK LOOP', desc: 'Self-optimizing acquisition. No override.', color: '#da70d6', status: 'EVOLVING' },
  { id: 'FILE_005', title: 'VISION CORE BUILD', desc: 'Perception layer + analysis matrix.', color: '#7b00ff', status: 'INTEL' },
  { id: 'FILE_006', title: 'OUTCOME CALCULATOR', desc: 'Predictive modeling → measurable results.', color: '#00ffff', status: 'PREDICTIVE' },
];

function ProjectCube({
  project,
  pos,
  index,
}: {
  project: typeof PROJECTS[0];
  pos: [number, number, number];
  index: number;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  const phase = index * (Math.PI * 2 / PROJECTS.length);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ref.current) {
      ref.current.rotation.y = t * 0.3 + phase;
      ref.current.rotation.x = Math.sin(t * 0.4 + phase) * 0.1;
      const targetScale = hovered ? 1.15 : 1;
      ref.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity = hovered ? 0.6 : 0.2;
    }
  });

  return (
    <Float speed={1} floatIntensity={hovered ? 0.5 : 0.2} floatingRange={[-0.2, 0.2]}>
      <group position={pos}>
        <mesh
          ref={ref}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          <boxGeometry args={[2.2, 2.2, 2.2]} />
          <meshStandardMaterial
            color="#0a0020"
            emissive={project.color}
            emissiveIntensity={0.2}
            metalness={0.8}
            roughness={0.15}
            transparent
            opacity={0.85}
          />
        </mesh>

        {/* Wireframe overlay */}
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(2.2, 2.2, 2.2)]} />
          <lineBasicMaterial color={project.color} transparent opacity={hovered ? 1 : 0.5} />
        </lineSegments>

        {/* Label */}
        <Text
          position={[0, 1.4, 1.2]}
          fontSize={0.16}
          color={project.color}
          anchorX="center"
          letterSpacing={0.15}
        >
          {project.id}
        </Text>
        <Text
          position={[0, 0, 1.2]}
          fontSize={0.2}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          maxWidth={2}
          lineHeight={1.3}
        >
          {project.title}
        </Text>
        {hovered && (
          <Text
            position={[0, -0.7, 1.2]}
            fontSize={0.14}
            color="#e0d0ff"
            anchorX="center"
            anchorY="middle"
            maxWidth={2}
            lineHeight={1.4}
          >
            {project.desc}
          </Text>
        )}

        {/* Status badge */}
        <Text
          position={[0, -1.4, 1.2]}
          fontSize={0.12}
          color="#00ffff"
          anchorX="center"
          letterSpacing={0.2}
        >
          [{project.status}]
        </Text>
      </group>
    </Float>
  );
}

export default function ProjectsRoom({ position }: Props) {
  const cols = 3;
  return (
    <group position={position}>
      <Float speed={0.6} floatIntensity={0.05}>
        <Text position={[0, 8, 0]} fontSize={1.1} color="#ffffff" anchorX="center" letterSpacing={0.15}>
          CASE FILES
        </Text>
        <Text position={[0, 7.1, 0]} fontSize={0.22} color="#7b00ff" anchorX="center" letterSpacing={0.3}>
          D-02 // EXECUTION RECORDS
        </Text>
      </Float>

      {PROJECTS.map((p, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return (
          <ProjectCube
            key={p.id}
            project={p}
            index={i}
            pos={[(col - 1) * 5.5, row * -5.5 + 2, 0] as [number, number, number]}
          />
        );
      })}
    </group>
  );
}
