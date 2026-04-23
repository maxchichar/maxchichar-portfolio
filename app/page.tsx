'use client';

import dynamic from 'next/dynamic';
import { Suspense, useEffect } from 'react';
import { useWorldStore } from '@/store/worldStore';
import LoadingScreen from '@/components/ui/LoadingScreen';
import HUD from '@/components/hud/HUD';
import CommandPalette from '@/components/ui/CommandPalette';
import Cursor from '@/components/ui/Cursor';
import ScanLines from '@/components/effects/ScanLines';

// Dynamically import Three.js world — no SSR
const World3D = dynamic(() => import('@/components/3d/World3D'), {
  ssr: false,
  loading: () => null,
});

export default function Page() {
  const { isLoaded, commandPaletteOpen, toggleCommandPalette } = useWorldStore();

  // CMD+K to open command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
      if (e.key === 'Escape' && commandPaletteOpen) {
        toggleCommandPalette();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandPaletteOpen, toggleCommandPalette]);

  return (
    <main className="relative w-full h-full overflow-hidden bg-void">
      {/* Custom cursor */}
      <Cursor />

      {/* Scan lines overlay */}
      <ScanLines />

      {/* Loading screen */}
      <LoadingScreen />

      {/* 3D World */}
      <Suspense fallback={null}>
        <World3D />
      </Suspense>

      {/* HUD overlay — only when loaded */}
      {isLoaded && <HUD />}

      {/* Command palette */}
      {commandPaletteOpen && <CommandPalette />}
    </main>
  );
}
