import type { Metadata } from "next";

// Self-hosted variable fonts (Fontsource) — no runtime dependency on a
// third-party font CDN. Locked typefaces: FINAL LOCKED SPECIFICATION §D.10.
import "@fontsource-variable/inter-tight";
import "@fontsource-variable/newsreader";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portfolio OS",
  description:
    "AI-Native Engineer & Entrepreneur — I build intelligent systems for real-world problems.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-bg text-text min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
