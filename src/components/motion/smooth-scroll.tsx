"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Dispatch with `detail: true` to pause page scrolling, `false` to resume. */
export const SCROLL_LOCK_EVENT = "scroll-lock";

/**
 * Inertial smooth scrolling for the public site (Lenis). Skipped in the
 * admin (a tool, not a showcase) and for visitors who prefer reduced motion.
 * Lenis drives the native window scroll, so CSS scroll-driven animations,
 * sticky elements and anchor links keep working.
 */
export function SmoothScroll() {
  const pathname = usePathname();
  const enabled = !pathname.startsWith("/admin");

  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      autoRaf: true,
      anchors: { offset: -80 },
      lerp: 0.11,
    });
    // Overlays (the command palette) pause smooth scrolling while open.
    const onLock = (e: Event) => {
      if ((e as CustomEvent<boolean>).detail) lenis.stop();
      else lenis.start();
    };
    window.addEventListener(SCROLL_LOCK_EVENT, onLock);
    return () => {
      window.removeEventListener(SCROLL_LOCK_EVENT, onLock);
      lenis.destroy();
    };
  }, [enabled]);

  return null;
}
