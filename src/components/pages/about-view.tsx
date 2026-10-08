import type { AboutPageContent } from "@/lib/validation/page";
import type { SiteImage } from "@/lib/validation/settings";

import { Paragraphs } from "./paragraphs";

const SECTIONS = [
  { key: "bio", title: "Biography" },
  { key: "whatIBuild", title: "What I build" },
  { key: "howIThink", title: "How I think" },
  { key: "interests", title: "Areas of interest" },
  { key: "capabilities", title: "Capabilities" },
  { key: "direction", title: "Current direction" },
] as const satisfies readonly { key: keyof AboutPageContent; title: string }[];

export function AboutView({
  content,
  image,
  name,
}: {
  content: AboutPageContent;
  image: SiteImage | null;
  name: string;
}) {
  return (
    <article>
      <header className="container-site pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7 lg:pt-8">
            <p className="animate-rise index-label">
              <span>—</span>
              <span>About</span>
            </p>
            <h1
              className="animate-rise text-text mt-6 font-sans text-[clamp(2.75rem,6vw,5.5rem)] leading-[0.95] font-semibold tracking-[-0.035em]"
              style={{ animationDelay: "100ms" }}
            >
              {name}
            </h1>
            <div className="animate-rise mt-10" style={{ animationDelay: "200ms" }}>
              <Paragraphs
                text={content.intro}
                className="text-text space-y-5 font-serif text-xl leading-relaxed md:text-2xl"
              />
            </div>
          </div>

          <figure
            className="animate-rise lg:col-span-5"
            style={{ animationDelay: "250ms" }}
          >
            <div className="rounded-panel border-border bg-surface grain relative aspect-[4/5] overflow-hidden border">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image.url}
                  alt={image.alt ?? `Portrait of ${name}`}
                  width={image.width ?? undefined}
                  height={image.height ?? undefined}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div aria-hidden="true" className="hero-wash h-full w-full" />
              )}
            </div>
            <figcaption className="text-text-muted mt-4 flex items-center justify-between font-mono text-[11px] tracking-[0.18em] uppercase">
              <span>{name}</span>
              <span aria-hidden="true" className="bg-accent-purple h-px w-10" />
            </figcaption>
          </figure>
        </div>
      </header>

      <div className="container-site">
        {SECTIONS.map((section, i) => (
          <section
            key={section.key}
            className="border-border reveal grid gap-6 border-t py-12 md:grid-cols-12 md:py-16"
          >
            <h2 className="index-label md:col-span-4 md:self-start">
              <span>{String(i + 1).padStart(2, "0")}</span>
              <span>{section.title}</span>
            </h2>
            <Paragraphs
              text={content[section.key]}
              className="text-text space-y-5 font-serif text-lg leading-relaxed md:col-span-8 md:text-xl"
            />
          </section>
        ))}
      </div>
    </article>
  );
}
