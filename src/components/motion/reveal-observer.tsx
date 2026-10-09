"use client";

import { useEffect } from "react";

/**
 * Scroll-reveal fallback. `.reveal` normally animates with CSS scroll-driven
 * animations, which only some browsers support (Chromium today) and which
 * are off for reduced-motion users. Everywhere else this observer adds
 * `is-visible` as each element scrolls into view, so every browser and
 * device gets the reveal (a gentle fade only, under reduced motion).
 */
export function RevealObserver() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const native = CSS.supports("animation-timeline: view()") && !reduce;
    if (native || !("IntersectionObserver" in window)) return;

    const root = document.documentElement;
    root.classList.add("reveal-js");

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );

    const observeAll = () =>
      document
        .querySelectorAll(".reveal:not(.is-visible)")
        .forEach((el) => io.observe(el));
    observeAll();

    // Client-side navigations render new `.reveal` elements.
    const mo = new MutationObserver(observeAll);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      root.classList.remove("reveal-js");
    };
  }, []);

  return null;
}
