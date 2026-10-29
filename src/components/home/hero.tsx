import Link from "next/link";
import { Fragment } from "react";

import { Magnetic } from "@/components/motion/magnetic";
import { SplitText } from "@/components/motion/split-text";
import { parseHeadline } from "@/lib/headline";
import type { SiteImage } from "@/lib/validation/settings";
import { MediaImage } from "@/components/media-image";

interface HeroCopy {
  eyebrow: string;
  headline: string;
  body: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
}

const HEADLINE_DELAY = 150;

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

// Accented words (see lib/headline) get the italic serif treatment; the
// word-by-word reveal keeps counting across segments so timing is unbroken.
function Headline({ text }: { text: string }) {
  const segments = parseHeadline(text);
  // Word offset of each segment, so the reveal timing runs straight through.
  const starts = segments.map((_, i) =>
    segments.slice(0, i).reduce((sum, s) => sum + countWords(s.text), 0),
  );
  return (
    <>
      {segments.map((segment, i) => {
        const words = (
          <SplitText
            text={segment.text}
            baseDelay={HEADLINE_DELAY}
            startIndex={starts[i]}
          />
        );
        return segment.accent ? (
          <span
            key={i}
            className="text-accent-purple font-serif font-normal tracking-tight italic"
          >
            {words}
          </span>
        ) : (
          <Fragment key={i}>{words}</Fragment>
        );
      })}
    </>
  );
}

export function Hero({
  hero,
  image,
  name,
}: {
  hero: HeroCopy;
  image: SiteImage | null;
  name: string;
}) {
  return (
    // With a photo, the hero is a dark island in both themes: the portrait is
    // low-key studio photography (subject on black), and light scrims over it
    // turned the black into grey and put dark text on a dark image. Without a
    // photo it follows the page theme.
    <section
      data-theme={image ? "dark" : undefined}
      className="bg-bg text-text relative isolate flex min-h-[100svh] flex-col overflow-hidden"
    >
      {/* Backdrop: the landscape photo, or an atmospheric wash until one is set. */}
      <div className="grain absolute inset-0 -z-10">
        <div className="parallax absolute inset-0">
          {image ? (
            <MediaImage
              src={image.url}
              alt={image.alt ?? ""}
              fill
              sizes="100vw"
              loading="eager"
              fetchPriority="high"
              className="animate-slow-zoom object-cover"
            />
          ) : (
            <div aria-hidden="true" className="hero-wash h-full w-full" />
          )}
        </div>
        {/* Legibility scrims: bottom fade into the page, and a left fade
            under the copy. */}
        <div
          aria-hidden="true"
          className="from-bg via-bg/55 absolute inset-0 bg-gradient-to-t to-transparent"
        />
        <div
          aria-hidden="true"
          className="from-bg/70 absolute inset-0 bg-gradient-to-r via-transparent to-transparent"
        />
        <div
          aria-hidden="true"
          className="from-bg/60 absolute inset-x-0 top-0 h-40 bg-gradient-to-b to-transparent"
        />
      </div>

      <div className="container-site flex flex-1 flex-col justify-end pt-32 pb-12 md:pb-16">
        <p
          className="animate-rise text-text/80 flex items-center gap-3 font-mono text-[11px] tracking-[0.2em] uppercase"
          style={{ animationDelay: "100ms" }}
        >
          <span aria-hidden="true" className="bg-accent-purple h-px w-8" />
          {hero.eyebrow}
        </p>

        <h1 className="text-display text-text mt-6 max-w-6xl font-sans font-semibold text-balance">
          <Headline text={hero.headline} />
        </h1>

        <div
          className="animate-rise mt-10 grid gap-8 md:grid-cols-12 md:items-end"
          style={{ animationDelay: "650ms" }}
        >
          <p className="text-lede text-text/80 max-w-xl font-serif md:col-span-6">
            {hero.body}
          </p>

          <div className="flex flex-wrap gap-3 md:col-span-6 md:justify-end">
            <Magnetic>
              <Link
                href={hero.primaryCta.href}
                className="group bg-text text-bg hover:bg-accent inline-flex items-center gap-2 rounded-full px-6 py-3.5 font-sans text-sm font-medium transition-colors"
              >
                {hero.primaryCta.label}
                <span
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-0.5"
                >
                  →
                </span>
              </Link>
            </Magnetic>
            <Magnetic>
              <Link
                href={hero.secondaryCta.href}
                className="border-text/25 text-text hover:border-accent hover:text-accent bg-bg/20 inline-flex items-center rounded-full border px-6 py-3.5 font-sans text-sm font-medium backdrop-blur-md transition-colors"
              >
                {hero.secondaryCta.label}
              </Link>
            </Magnetic>
          </div>
        </div>

        <div
          className="animate-rise border-text/15 text-text-muted mt-14 flex items-center justify-between border-t pt-5 font-mono text-[11px] tracking-[0.18em] uppercase"
          style={{ animationDelay: "800ms" }}
        >
          <span>{name}</span>
          <a
            href="#main-content"
            className="hover:text-text flex items-center gap-2 transition-colors"
          >
            Scroll
            <span aria-hidden="true" className="inline-block animate-bounce">
              ↓
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
