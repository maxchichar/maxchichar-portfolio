"use client";

import { useEffect, useRef, useState } from "react";

// Validated categorical pair for the dark surface (#131316) — dataviz
// validate_palette: lightness band, chroma, CVD ΔE 30.5, normal ΔE 34.4,
// contrast all PASS. Visitors is the primary series (with an area wash).
const SERIES = [
  { key: "visitors", label: "Visitors", color: "#4f7cff" },
  { key: "views", label: "Page views", color: "#d95926" },
] as const;

type Point = { day: string; views: number; visitors: number };

const PAD = { top: 16, right: 84, bottom: 28, left: 40 };
const HEIGHT = 260;

function niceMax(v: number) {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

const fmtDay = (day: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", ...opts });

/**
 * Daily visitors vs page views — one shared count axis (same unit), legend
 * plus end labels, crosshair + tooltip on hover, arrow-key navigation on
 * focus. Values are also available in the table below the chart.
 */
export function TrendChart({ data }: { data: Point[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(320, Math.floor(entry.contentRect.width)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const max = niceMax(Math.max(1, ...data.map((d) => Math.max(d.views, d.visitors))));
  const x = (i: number) =>
    PAD.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));
  const path = (key: "views" | "visitors") =>
    data
      .map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`)
      .join("");
  const area = `${path("visitors")}L${x(data.length - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const labelEvery = Math.max(
    1,
    Math.ceil(data.length / Math.max(2, Math.floor(innerW / 90))),
  );

  function indexFromPointer(clientX: number) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || data.length === 0) return null;
    const rel = (clientX - rect.left - PAD.left) / innerW;
    return Math.min(data.length - 1, Math.max(0, Math.round(rel * (data.length - 1))));
  }

  const last = data[data.length - 1];
  const point = active !== null ? data[active] : null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-5" aria-hidden="true">
        {SERIES.map((s) => (
          <span
            key={s.key}
            className="text-text-muted flex items-center gap-2 font-sans text-xs"
          >
            <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div
        ref={ref}
        className="relative outline-none"
        tabIndex={0}
        role="img"
        aria-label={`Daily visitors and page views over the last ${data.length} days. Use arrow keys to inspect days; values are also in the table below.`}
        onPointerMove={(e) => setActive(indexFromPointer(e.clientX))}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive((a) => a ?? data.length - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft")
            setActive((a) => Math.max(0, (a ?? data.length) - 1));
          if (e.key === "ArrowRight")
            setActive((a) => Math.min(data.length - 1, (a ?? -1) + 1));
        }}
      >
        <svg width={width} height={HEIGHT} className="block">
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={PAD.left + innerW}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 10}
                y={y(t)}
                dy="0.32em"
                textAnchor="end"
                className="fill-text-muted font-mono text-[10px] tabular-nums"
              >
                {t.toLocaleString("en-US")}
              </text>
            </g>
          ))}
          {data.map((d, i) =>
            (i % labelEvery === 0 && data.length - 1 - i >= labelEvery) ||
            i === data.length - 1 ? (
              <text
                key={d.day}
                x={x(i)}
                y={HEIGHT - 8}
                textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
                className="fill-text-muted font-mono text-[10px]"
              >
                {fmtDay(d.day, { month: "short", day: "numeric" })}
              </text>
            ) : null,
          )}

          <path d={area} fill={SERIES[0].color} opacity={0.1} />
          {SERIES.map((s) => (
            <path
              key={s.key}
              d={path(s.key)}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {/* End labels (selective direct labels; text in text tokens). */}
          {last
            ? SERIES.map((s) => (
                <g key={s.key}>
                  <circle
                    cx={x(data.length - 1)}
                    cy={y(last[s.key])}
                    r={4}
                    fill={s.color}
                    stroke="var(--surface)"
                    strokeWidth={2}
                  />
                </g>
              ))
            : null}
          {last
            ? (() => {
                const a = y(last.visitors);
                const b = y(last.views);
                // Keep the two end labels from colliding.
                const gap = 14;
                const [ya, yb] =
                  Math.abs(a - b) >= gap
                    ? [a, b]
                    : a > b
                      ? [a + gap / 2, b - gap / 2]
                      : [a - gap / 2, b + gap / 2];
                return (
                  <>
                    <text
                      x={x(data.length - 1) + 10}
                      y={ya}
                      dy="0.32em"
                      className="fill-text font-sans text-[11px]"
                    >
                      {last.visitors.toLocaleString("en-US")} visitors
                    </text>
                    <text
                      x={x(data.length - 1) + 10}
                      y={yb}
                      dy="0.32em"
                      className="fill-text-muted font-sans text-[11px]"
                    >
                      {last.views.toLocaleString("en-US")} views
                    </text>
                  </>
                );
              })()
            : null}

          {point && active !== null ? (
            <g>
              <line
                x1={x(active)}
                x2={x(active)}
                y1={PAD.top}
                y2={PAD.top + innerH}
                stroke="var(--text-muted)"
                strokeWidth={1}
              />
              {SERIES.map((s) => (
                <circle
                  key={s.key}
                  cx={x(active)}
                  cy={y(point[s.key])}
                  r={4}
                  fill={s.color}
                  stroke="var(--surface)"
                  strokeWidth={2}
                />
              ))}
            </g>
          ) : null}
        </svg>

        {point && active !== null ? (
          <div
            className="rounded-card border-border bg-surface-2 pointer-events-none absolute top-2 z-10 min-w-36 border px-3 py-2 shadow-lg"
            style={{
              left: Math.min(Math.max(x(active) - 72, 0), width - 150),
            }}
          >
            <p className="text-text-muted font-mono text-[10px] uppercase">
              {fmtDay(point.day, { weekday: "short", month: "short", day: "numeric" })}
            </p>
            {SERIES.map((s) => (
              <p key={s.key} className="mt-1 flex items-center gap-2 font-sans text-xs">
                <span
                  className="h-0.5 w-3 rounded-full"
                  style={{ background: s.color }}
                />
                <span className="text-text font-semibold tabular-nums">
                  {point[s.key].toLocaleString("en-US")}
                </span>
                <span className="text-text-muted">{s.label}</span>
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
