import Link from "next/link";

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

function Headline({ text }: { text: string }) {
  const idx = text.indexOf(HEADLINE_ACCENT);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-accent-purple font-serif font-normal tracking-tight italic">
        {HEADLINE_ACCENT}
      </span>
      {text.slice(idx + HEADLINE_ACCENT.length)}
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
    <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
      {/* Backdrop: the landscape photo, or an atmospheric wash until one is set. */}
      <div className="grain absolute inset-0 -z-10">
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

        <h1
          className="animate-rise text-text mt-6 max-w-5xl font-sans text-[clamp(2.75rem,7.5vw,7.5rem)] leading-[0.95] font-semibold tracking-[-0.035em] text-balance"
          style={{ animationDelay: "200ms" }}
        >
          <Headline text={hero.headline} />
        </h1>

        <div
          className="animate-rise mt-10 grid gap-8 md:grid-cols-12 md:items-end"
          style={{ animationDelay: "350ms" }}
        >
          <p className="text-text/80 max-w-xl font-serif text-lg leading-relaxed md:col-span-6 md:text-xl">
            {hero.body}
          </p>

          <div className="flex flex-wrap gap-3 md:col-span-6 md:justify-end">
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
            <Link
              href={hero.secondaryCta.href}
              className="border-text/25 text-text hover:border-accent hover:text-accent bg-bg/20 inline-flex items-center rounded-full border px-6 py-3.5 font-sans text-sm font-medium backdrop-blur-md transition-colors"
            >
              {hero.secondaryCta.label}
            </Link>
          </div>
        </div>

        <div
          className="animate-rise border-text/15 text-text-muted mt-14 flex items-center justify-between border-t pt-5 font-mono text-[11px] tracking-[0.18em] uppercase"
          style={{ animationDelay: "500ms" }}
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
