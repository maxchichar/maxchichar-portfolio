'use client';

import { useEffect, useRef } from 'react';
import { useWorldStore, type RoomId } from '@/store/worldStore';

const ROOM_ORDER: RoomId[] = ['entrance', 'about', 'skills', 'projects', 'experience', 'gallery', 'contact'];

/**
 * useScrollNav — maps mouse wheel / keyboard to room navigation.
 * Attach this hook in any client component that should respond to scroll.
 */
export function useScrollNav() {
  const { activeRoom, navigateTo, isTransitioning, doorComplete } = useWorldStore();
  const cooldown = useRef(false);

  useEffect(() => {
    const scroll = (delta: number) => {
      if (!doorComplete || isTransitioning || cooldown.current) return;
      cooldown.current = true;
      const idx = ROOM_ORDER.indexOf(activeRoom);
      const next = delta > 0 ? ROOM_ORDER[idx + 1] : ROOM_ORDER[idx - 1];
      if (next) navigateTo(next);
      setTimeout(() => { cooldown.current = false; }, 1800);
    };

    const onWheel = (e: WheelEvent) => scroll(e.deltaY);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') scroll(1);
      if (e.key === 'ArrowUp'   || e.key === 'ArrowLeft')  scroll(-1);
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
    };
  }, [activeRoom, navigateTo, isTransitioning, doorComplete]);
}
