import React from "react";
import { readFile, writeFile } from "node:fs/promises";
import { ImageResponse } from "next/og";

import {
  LOGO_INK_PATHS,
  LOGO_VIEWBOX,
  LOGO_VIOLET_PATHS,
} from "../src/components/brand/logo-mark";

// Run: npx tsx scripts/generate-social-preview.tsx
// Uses the site's own fonts and logo; no network or database required.
async function main() {
  const sans = await readFile("src/assets/og-fonts/inter-tight-latin-600-normal.woff");
  const mono = await readFile("src/assets/og-fonts/jetbrains-mono-latin-500-normal.woff");
  const response = new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#0b0b0c",
        color: "#f2f1ed",
        fontFamily: "Inter Tight",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: 540,
          height: 630,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 70% 45%, #2e1668 0%, #0b0b0c 72%)",
        }}
      >
        <svg width="400" height="318" viewBox={LOGO_VIEWBOX} style={{ opacity: 0.55 }}>
          {LOGO_VIOLET_PATHS.map((d) => (
            <path key={d} d={d} fill="#652bfc" />
          ))}
          {LOGO_INK_PATHS.map((d) => (
            <path key={d} d={d} fill="#f2f1ed" />
          ))}
        </svg>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "60px 68px",
          width: "100%",
          position: "relative",
        }}
      >
        <div
          style={{
            fontFamily: "JetBrains Mono",
            fontSize: 16,
            letterSpacing: 5,
            color: "#b295ff",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ width: 32, height: 3, background: "#652bfc" }} />
          WORK / RESEARCH / WRITING
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 64,
            fontSize: 88,
            lineHeight: 1.02,
            letterSpacing: -3,
          }}
        >
          <div>Chibueze</div>
          <div>Maxwell.</div>
        </div>
        <div style={{ marginTop: 26, fontSize: 27, color: "#c9c7d0" }}>
          Super Intelligence Engineer &amp; Entrepreneur
        </div>
        <div
          style={{
            marginTop: "auto",
            paddingTop: 24,
            borderTop: "1px solid #343039",
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "JetBrains Mono",
            fontSize: 17,
          }}
        >
          <div>chibuezemaxwell.com</div>
          <div style={{ color: "#b295ff" }}>SELECTED PORTFOLIO</div>
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Inter Tight", data: sans, weight: 600 },
        { name: "JetBrains Mono", data: mono, weight: 500 },
      ],
    },
  );
  await writeFile("public/og-default.png", Buffer.from(await response.arrayBuffer()));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
