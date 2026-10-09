"use client";

import { useEffect, useRef, useState } from "react";

// The signature wordmark set edge-to-edge at the foot of every page.
const WORDMARK = "MAXCHICHAR";
const VIEW_W = 1000;
const VIEW_H = 150;

type Key = "x" | "i";

interface Secret {
  key: Key;
  index: number; // position of the letter in WORDMARK
  network: string;
  href: string;
  handle: string;
}

/** "https://x.com/maxchichar/" -> "@maxchichar" (falls back to the host). */
function handleFrom(url: string): string {
  try {
    const u = new URL(url);
    const first = u.pathname.split("/").filter(Boolean)[0];
    return first ? `@${first.replace(/^@/, "")}` : u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * "Hidden in the name": the X in MAXCHICHAR links to X, the I to Instagram.
 *
 * The word is one SVG <text> stretched edge to edge (textLength), so the two
 * letters are measured after layout and covered by real HTML links: native
 * focus, keyboard and screen-reader support, and the reticle cursor frames
 * exactly the letter. Hovering or focusing a letter lights it up and dims the
 * rest; a caption names the destination. An idle glint hints which letters
 * are live (off under reduced motion), and the caption states it outright so
 * touch visitors, who can't hover, still find them.
 */
export function FooterWordmark({
  xUrl,
  instagramUrl,
}: {
  xUrl: string | null;
  instagramUrl: string | null;
}) {
  const secrets: Secret[] = [];
  if (xUrl) {
    secrets.push({
      key: "x",
      index: WORDMARK.indexOf("X"),
      network: "X",
      href: xUrl,
      handle: handleFrom(xUrl),
    });
  }
  if (instagramUrl) {
    secrets.push({
      key: "i",
      index: WORDMARK.indexOf("I"),
      network: "Instagram",
      href: instagramUrl,
      handle: handleFrom(instagramUrl),
    });
  }

  const textRef = useRef<SVGTextElement>(null);
  const [active, setActive] = useState<Key | null>(null);
  // Letter boxes in viewBox units; equal cells until real glyphs are measured.
  const cell = VIEW_W / WORDMARK.length;
  const [boxes, setBoxes] = useState<Record<number, { x: number; w: number }>>(() =>
    Object.fromEntries(
      WORDMARK.split("").map((_, i) => [i, { x: 2 + i * cell, w: cell }]),
    ),
  );

  useEffect(() => {
    let cancelled = false;
    const measure = () => {
      const text = textRef.current;
      if (!text || cancelled) return;
      try {
        const next: Record<number, { x: number; w: number }> = {};
        for (let i = 0; i < WORDMARK.length; i++) {
          const r = text.getExtentOfChar(i);
          next[i] = { x: r.x, w: r.width };
        }
        setBoxes(next);
      } catch {
        // Keep the equal-cell estimate if measuring isn't supported.
      }
    };
    document.fonts.ready.then(measure);
    return () => {
      cancelled = true;
    };
  }, []);

  const activeSecret = secrets.find((s) => s.key === active) ?? null;

  return (
    <div
      className="wm reveal relative -mb-[1.2vw] select-none"
      data-active={active ?? undefined}
    >
      {secrets.length > 0 ? (
        <p
          aria-live="polite"
          className="container-site text-text-muted mb-3 font-mono text-[11px] tracking-[0.14em] uppercase"
        >
          {activeSecret ? (
            <>
              <span className="text-text">{activeSecret.network}</span>
              <span aria-hidden="true"> → </span>
              {activeSecret.handle}
            </>
          ) : secrets.length === 2 ? (
            "The X and the I in my name are links."
          ) : (
            `The ${secrets[0]!.key.toUpperCase()} in my name is a link.`
          )}
        </p>
      ) : null}

      <svg
        aria-hidden="true"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        className="pointer-events-none block h-auto w-full"
      >
        <defs>
          <linearGradient id="footer-wordmark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--text)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--text)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <text
          ref={textRef}
          x="2"
          y="138"
          textLength="996"
          lengthAdjust="spacingAndGlyphs"
          fill="url(#footer-wordmark-fill)"
          className="font-sans"
          style={{ fontSize: 186, fontWeight: 800 }}
        >
          {WORDMARK.split("").map((ch, i) => {
            const secret = secrets.find((s) => s.index === i);
            return (
              <tspan
                key={i}
                className={
                  secret ? `wm-char wm-secret wm-secret-${secret.key}` : "wm-char"
                }
              >
                {ch}
              </tspan>
            );
          })}
        </text>
      </svg>

      {/* Real links over the two letters (percentages, so they track the
          responsive SVG exactly). */}
      {secrets.map((s) => {
        const box = boxes[s.index]!;
        return (
          <a
            key={s.key}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${s.handle} on ${s.network} (opens in a new tab)`}
            data-cursor={`${s.handle} ↗`}
            onPointerEnter={() => setActive(s.key)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(s.key)}
            onBlur={() => setActive(null)}
            className="wm-link absolute bottom-0"
            style={{
              // Centred on the glyph, never narrower than a comfortable
              // touch target (the I is only ~15px wide on phones).
              left: `${((box.x + box.w / 2) / VIEW_W) * 100}%`,
              width: `${(box.w / VIEW_W) * 100}%`,
              minWidth: 44,
              transform: "translateX(-50%)",
              height: "100%",
            }}
          />
        );
      })}
    </div>
  );
}
