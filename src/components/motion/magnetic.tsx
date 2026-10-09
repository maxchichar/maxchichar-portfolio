"use client";

import { useRef } from "react";

/**
 * Pulls its child slightly toward the pointer. Fine pointers only, and off
 * for reduced motion — purely decorative, never affects layout or hit area.
 */
export function Magnetic({
  children,
  strength = 0.28,
  className,
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  function canAnimate() {
    return (
      window.matchMedia("(pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function onMove(e: React.PointerEvent<HTMLSpanElement>) {
    const el = ref.current;
    if (!el || !canAnimate()) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * strength;
    const y = (e.clientY - rect.top - rect.height / 2) * strength;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  }

  function onLeave() {
    const el = ref.current;
    if (el) el.style.transform = "";
  }

  return (
    <span
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`inline-block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform ${className ?? ""}`}
    >
      {children}
    </span>
  );
}
