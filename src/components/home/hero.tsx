import Link from "next/link";

import { Magnetic } from "@/components/motion/magnetic";
import { SplitText } from "@/components/motion/split-text";
import type { SiteImage } from "@/lib/validation/settings";

interface HeroCopy {
  eyebrow: string;
  headline: string;
  body: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
}

// The design accents the word "intelligent" in the headline. The CMS
// headline is plain text, so the accent is applied wherever that word
// appears — same look for the fallback and for CMS copy that keeps it.
const HEADLINE_ACCENT = "intelligent";

const HEADLINE_DELAY = 150;

function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

function Headline({ text }: { text: string }) {
  const idx = text.indexOf(HEADLINE_ACCENT);
  if (idx === -1) return <SplitText text={text} baseDelay={HEADLINE_DELAY} />;
  const before = text.slice(0, idx);
  const after = text.slice(idx + HEADLINE_ACCENT.length);
  const beforeCount = countWords(before);
  return (
    <>
      <SplitText text={before} baseDelay={HEADLINE_DELAY} />
      <span className="text-accent-purple font-serif font-normal tracking-tight italic">
        <SplitText
          text={HEADLINE_ACCENT}
          baseDelay={HEADLINE_DELAY}
          startIndex={beforeCount}
        />
      </span>
      <SplitText text={after} baseDelay={HEADLINE_DELAY} startIndex={beforeCount + 1} />
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
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.url}
              alt={image.alt ?? ""}
              width={image.width ?? undefined}
              height={image.height ?? undefined}
              fetchPriority="high"
              decoding="async"
              className="animate-slow-zoom h-full w-full object-cover"
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
