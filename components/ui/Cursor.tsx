'use client';

import { useEffect, useRef } from 'react';

export default function Cursor() {
  const curRef = useRef<HTMLDivElement>(null!);
  const trailRef = useRef<HTMLDivElement>(null!);
  const ringRef = useRef<HTMLDivElement>(null!);
  const pos = useRef({ x: 0, y: 0 });
  const ring = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const move = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      if (curRef.current) {
        curRef.current.style.left = e.clientX + 'px';
        curRef.current.style.top  = e.clientY + 'px';
      }
      if (trailRef.current) {
        trailRef.current.style.left = e.clientX + 'px';
        trailRef.current.style.top  = e.clientY + 'px';
      }
    };

    const hover = () => {
      curRef.current?.style.setProperty('width', '36px');
      curRef.current?.style.setProperty('height', '36px');
    };
    const leave = () => {
      curRef.current?.style.setProperty('width', '18px');
      curRef.current?.style.setProperty('height', '18px');
    };

    window.addEventListener('mousemove', move);
    document.querySelectorAll('button, a, [role=button]').forEach((el) => {
      el.addEventListener('mouseenter', hover);
      el.addEventListener('mouseleave', leave);
    });

    let raf: number;
    const animate = () => {
      ring.current.x += (pos.current.x - ring.current.x) * 0.14;
      ring.current.y += (pos.current.y - ring.current.y) * 0.14;
      if (ringRef.current) {
        ringRef.current.style.left = ring.current.x + 'px';
        ringRef.current.style.top  = ring.current.y + 'px';
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', move);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div id="cursor" ref={curRef} />
      <div id="cursor-trail" ref={trailRef} />
      <div id="cursor-ring" ref={ringRef} />
    </>
  );
}
