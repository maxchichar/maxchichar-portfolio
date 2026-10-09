"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const INTERACTIVE = 'a, button, summary, label, select, [role="button"], [data-cursor]';
const TEXT_ENTRY =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]), textarea, [contenteditable="true"]';
const RETICLE = 28; // idle bracket box, px
const PAD = 6; // breathing room when framing a target, px

/** Label shown beside the reticle for a target, if any. */
function labelFor(el: Element): string | null {
  const explicit = el.getAttribute("data-cursor");
  if (explicit) return explicit;
  if (el instanceof HTMLAnchorElement) {
    const external =
      el.target === "_blank" || /^https?:\/\//.test(el.getAttribute("href") ?? "");
    if (external) return "Open ↗";
    if (el.querySelector("img, .hero-wash")) return "View";
  }
  return null;
}

/**
 * "Reticle" cursor: an exact-hotspot dot plus four corner brackets that
 * trail on a spring. Over links and buttons the brackets lock on and frame
 * the element; cards and images also get a small label. Pressing squeezes
 * the brackets; resting still fades in a coordinate readout.
 *
 * Only for precise pointers (mouse/trackpad) on the public site, never on
 * touch, in the admin, or under reduced motion. Text fields keep the native
 * caret. The real cursor is hidden only while this one is active, keyboard
 * focus styles are untouched, and it inverts against whatever is beneath
 * it (mix-blend-mode: difference) so it reads in light and dark themes.
 */
export function ReticleCursor() {
  const pathname = usePathname();
  const enabled = !pathname.startsWith("/admin");
  const rootRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const coordsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const fine = window.matchMedia("(pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduce.matches) return;

    const root = rootRef.current;
    const dot = dotRef.current;
    const box = boxRef.current;
    const label = labelRef.current;
    const coords = coordsRef.current;
    if (!root || !dot || !box || !label || !coords) return;

    document.documentElement.classList.add("has-reticle");

    const pointer = { x: innerWidth / 2, y: innerHeight / 2 };
    // Spring state for the bracket box: position + size.
    const cur = { x: pointer.x, y: pointer.y, w: RETICLE, h: RETICLE };
    let target: Element | null = null;
    let visible = false;
    let pressed = false;
    let lastMove = performance.now();
    let raf = 0;

    const show = (on: boolean) => {
      visible = on;
      root.style.opacity = on ? "1" : "0";
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      lastMove = performance.now();
      coords.style.opacity = "0";
      const el = e.target instanceof Element ? e.target : null;
      // Native caret in text fields; hide the reticle there.
      if (el?.closest(TEXT_ENTRY)) {
        show(false);
        return;
      }
      if (!visible) show(true);
      const next = el?.closest(INTERACTIVE) ?? null;
      if (next !== target) {
        target = next;
        const text = target ? labelFor(target) : null;
        label.textContent = text ?? "";
        label.style.opacity = text ? "1" : "0";
        root.dataset.state = target ? "lock" : "idle";
      }
    };
    const onDown = () => {
      pressed = true;
      root.dataset.pressed = "true";
    };
    const onUp = () => {
      pressed = false;
      root.dataset.pressed = "false";
    };
    const onLeave = () => show(false);

    const tick = () => {
      // The dot sits exactly on the hotspot every frame: no lag on clicks.
      dot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;

      let tx = pointer.x;
      let ty = pointer.y;
      let tw = RETICLE;
      let th = RETICLE;
      if (target && target.isConnected) {
        const r = target.getBoundingClientRect();
        tx = r.left + r.width / 2;
        ty = r.top + r.height / 2;
        tw = r.width + PAD * 2;
        th = r.height + PAD * 2;
      } else if (target) {
        target = null;
        root.dataset.state = "idle";
        label.style.opacity = "0";
      }
      if (pressed) {
        tw *= 0.86;
        th *= 0.86;
      }
      // Critically-damped-ish follow: snappier when locking onto a target.
      const k = target ? 0.28 : 0.18;
      cur.x += (tx - cur.x) * k;
      cur.y += (ty - cur.y) * k;
      cur.w += (tw - cur.w) * k;
      cur.h += (th - cur.h) * k;
      box.style.transform = `translate3d(${cur.x - cur.w / 2}px, ${cur.y - cur.h / 2}px, 0)`;
      box.style.width = `${cur.w}px`;
      box.style.height = `${cur.h}px`;
      label.style.transform = `translate3d(${cur.x + cur.w / 2 + 10}px, ${cur.y + cur.h / 2 - 8}px, 0)`;

      // Resting still on empty space: show an engineering-style readout.
      if (!target && visible && performance.now() - lastMove > 1100) {
        coords.textContent = `x ${String(Math.round(pointer.x)).padStart(4, "0")}  y ${String(Math.round(pointer.y)).padStart(4, "0")}`;
        coords.style.transform = `translate3d(${pointer.x + 22}px, ${pointer.y + 18}px, 0)`;
        coords.style.opacity = "1";
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.documentElement.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.documentElement.classList.remove("has-reticle");
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      data-state="idle"
      data-pressed="false"
      className="reticle pointer-events-none fixed inset-0 z-[100] opacity-0 transition-opacity duration-300"
    >
      <div ref={boxRef} className="reticle-box">
        <span className="reticle-corner reticle-tl" />
        <span className="reticle-corner reticle-tr" />
        <span className="reticle-corner reticle-bl" />
        <span className="reticle-corner reticle-br" />
      </div>
      <div ref={dotRef} className="reticle-dot" />
      <div ref={labelRef} className="reticle-label" />
      <div ref={coordsRef} className="reticle-coords" />
    </div>
  );
}
