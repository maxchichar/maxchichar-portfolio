import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import {
  LOGO_INK_PATHS,
  LOGO_VIEWBOX,
  LOGO_VIOLET,
  LOGO_VIOLET_PATHS,
} from "@/components/brand/logo-mark";
import { getSiteUrl } from "@/lib/metadata";
import { isOptimizableImage } from "@/lib/storage/image";
import { getPublicSiteSettings } from "@/server/services/settings";

/** Shared Open Graph / Twitter card: 1200x630, the size every platform expects. */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const BG = "#0b0b0c";
const INK = "#f2f1ed";
const MUTED = "#9b9a94";
const VIOLET_TEXT = "#9d7bff";

const FONT_DIR = join(process.cwd(), "src/assets/og-fonts");
let fontsPromise: ReturnType<typeof loadFonts> | null = null;
function loadFonts() {
  const read = (file: string) => readFile(join(FONT_DIR, file));
  return Promise.all([
    read("inter-tight-latin-600-normal.woff"),
    read("newsreader-latin-400-normal.woff"),
    read("newsreader-latin-400-italic.woff"),
    read("jetbrains-mono-latin-500-normal.woff"),
  ]).then(([sans, serif, serifItalic, mono]) => [
    { name: "Inter Tight", data: sans, weight: 600 as const, style: "normal" as const },
    { name: "Newsreader", data: serif, weight: 400 as const, style: "normal" as const },
    {
      name: "Newsreader",
      data: serifItalic,
      weight: 400 as const,
      style: "italic" as const,
    },
    {
      name: "JetBrains Mono",
      data: mono,
      weight: 500 as const,
      style: "normal" as const,
    },
  ]);
}

function clip(text: string | null | undefined, max: number): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ") > max * 0.6 ? cut.lastIndexOf(" ") : cut.length)}…`;
}

const MAX_COVER_BYTES = 6 * 1024 * 1024;

/**
 * Cover photo as a data URI, or null. Only our own JPEG/PNG uploads are
 * embedded (the renderer can't decode WebP), with a timeout and size cap so a
 * slow or huge file falls back to the text-only card instead of failing.
 */
async function loadCover(url: string | null | undefined): Promise<string | null> {
  if (!url || !isOptimizableImage(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > MAX_COVER_BYTES) return null;
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
    if (!isJpeg && !isPng) return null;
    return `data:image/${isJpeg ? "jpeg" : "png"};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

/** The brand mark; `mono` draws every shape in one colour (watermark). */
function Logo({ size, mono }: { size: number; mono?: string }) {
  const [, , w, h] = LOGO_VIEWBOX.split(" ").map(Number);
  return (
    <svg width={size} height={(size * h!) / w!} viewBox={LOGO_VIEWBOX}>
      {LOGO_VIOLET_PATHS.map((d) => (
        <path key={d} d={d} fill={mono ?? LOGO_VIOLET} />
      ))}
      {LOGO_INK_PATHS.map((d) => (
        <path key={d} d={d} fill={mono ?? INK} />
      ))}
    </svg>
  );
}

export interface OgCardOptions {
  /** Small uppercase label, e.g. "Case study". */
  eyebrow: string;
  title: string;
  description?: string | null;
  coverUrl?: string | null;
}

export async function renderOgCard({
  eyebrow,
  title,
  description,
  coverUrl,
}: OgCardOptions): Promise<ImageResponse> {
  const [fonts, settings, cover] = await Promise.all([
    (fontsPromise ??= loadFonts()),
    getPublicSiteSettings(),
    loadCover(coverUrl),
  ]);

  const heading = clip(title, 90);
  // Narrower column beside a cover photo, so step the title down sooner.
  const [short, medium] = cover ? [22, 46] : [32, 60];
  const titleSize = heading.length <= short ? 76 : heading.length <= medium ? 62 : 52;
  const body = clip(description, cover ? 120 : 160);
  const domain = getSiteUrl()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  // Text stays clear of the cover photo / watermark on the right.
  const textWidth = cover ? 690 : 800;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: BG,
        color: INK,
        position: "relative",
        fontFamily: "Inter Tight",
      }}
    >
      {cover ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: 520,
            display: "flex",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt=""
            width={520}
            height={630}
            style={{ objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 520,
              height: 630,
              display: "flex",
              background: `linear-gradient(90deg, ${BG} 0%, rgba(11,11,12,0.55) 35%, rgba(11,11,12,0) 70%)`,
            }}
          />
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: 560,
            display: "flex",
            alignItems: "center",
            background:
              "radial-gradient(circle at 75% 50%, rgba(101,43,252,0.28) 0%, rgba(101,43,252,0.06) 45%, rgba(11,11,12,0) 70%)",
          }}
        >
          {/* Quiet monochrome mark bleeding off the right edge. */}
          <div style={{ display: "flex", opacity: 0.22, marginLeft: 150 }}>
            <Logo size={520} mono={LOGO_VIOLET} />
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: textWidth,
          padding: "64px 0 56px 72px",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Logo size={44} />
          <div style={{ fontSize: 22, letterSpacing: 0.5 }}>{settings.siteName}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontFamily: "JetBrains Mono",
              fontSize: 18,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: VIOLET_TEXT,
            }}
          >
            <div style={{ width: 32, height: 2, background: LOGO_VIOLET }} />
            {eyebrow}
          </div>
          <div
            style={{
              marginTop: 22,
              fontSize: titleSize,
              lineHeight: 1.04,
              letterSpacing: -2,
              paddingRight: 40,
            }}
          >
            {heading}
          </div>
          {body ? (
            <div
              style={{
                marginTop: 24,
                fontFamily: "Newsreader",
                fontSize: 27,
                lineHeight: 1.35,
                color: MUTED,
                paddingRight: 60,
              }}
            >
              {body}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            fontFamily: "JetBrains Mono",
            fontSize: 17,
            letterSpacing: 2,
            color: MUTED,
          }}
        >
          {domain}
        </div>
      </div>
    </div>,
    { ...OG_SIZE, fonts },
  );
}
