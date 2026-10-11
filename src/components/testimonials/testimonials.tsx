import { MediaImage } from "@/components/media-image";
import type { PublicTestimonial } from "@/server/services/testimonials";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")
  ).toUpperCase();
}

function Author({ t, size = "md" }: { t: PublicTestimonial; size?: "md" | "lg" }) {
  const byline = [t.authorRole, t.authorCompany].filter(Boolean).join(", ");
  const avatarSize = size === "lg" ? "h-12 w-12" : "h-10 w-10";
  return (
    <figcaption className="flex items-center gap-3.5">
      <span
        className={`bg-surface-2 border-border text-accent-purple relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border font-sans text-xs font-semibold ${avatarSize}`}
      >
        {t.avatarUrl ? (
          <MediaImage
            src={t.avatarUrl}
            alt=""
            fill
            sizes="48px"
            className="object-cover"
          />
        ) : (
          <span aria-hidden="true">{initials(t.authorName)}</span>
        )}
      </span>
      <span className="min-w-0">
        <span className="text-text block font-sans text-sm font-medium">
          {t.authorUrl ? (
            <a
              href={t.authorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent underline-offset-4 transition-colors hover:underline"
            >
              {t.authorName}
            </a>
          ) : (
            t.authorName
          )}
        </span>
        {byline ? (
          <span className="text-text-muted block font-sans text-xs">{byline}</span>
        ) : null}
      </span>
    </figcaption>
  );
}

/** Decorative opening quote mark in the brand violet. Its box is given an
 * explicit height (the glyph sits at the top of a tall line), so the quote
 * starts right beneath it. */
function Mark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`text-accent-purple block font-serif leading-none select-none ${className}`}
    >
      &ldquo;
    </span>
  );
}

/**
 * Homepage "Kind words": the first testimonial as a large pull quote, any
 * others as quieter cards beneath it.
 */
export function TestimonialsShowcase({ items }: { items: PublicTestimonial[] }) {
  const [lead, ...rest] = items;
  if (!lead) return null;
  return (
    <div>
      <figure className="reveal md:grid md:grid-cols-12 md:gap-6">
        <div className="md:col-span-9 md:col-start-4">
          <Mark className="h-12 text-8xl md:h-20 md:text-[9rem]" />
          <blockquote>
            <p className="text-text font-serif text-2xl leading-snug text-pretty md:text-4xl md:leading-[1.2]">
              {lead.quote}
            </p>
          </blockquote>
          <div className="mt-8">
            <Author t={lead} size="lg" />
          </div>
        </div>
      </figure>

      {rest.length > 0 ? (
        <div
          className={`mt-16 grid gap-6 md:mt-20 ${rest.length === 1 ? "md:grid-cols-1 md:pl-[25%]" : rest.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}
        >
          {rest.map((t) => (
            <figure
              key={t.id}
              className="reveal rounded-panel border-border bg-surface flex flex-col justify-between gap-8 border p-7"
            >
              <blockquote>
                <Mark className="h-7 text-5xl" />
                <p className="text-text font-serif text-lg leading-relaxed">{t.quote}</p>
              </blockquote>
              <Author t={t} />
            </figure>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Testimonials linked to a project, shown at the end of its case study. */
export function ProjectTestimonials({ items }: { items: PublicTestimonial[] }) {
  if (items.length === 0) return null;
  return (
    <section
      aria-label="What the client said"
      className="container-site border-border border-t py-20 md:py-28"
    >
      <div className="grid gap-10 md:grid-cols-12">
        <p className="index-label reveal md:col-span-3 md:self-start md:pt-4">
          <span aria-hidden="true" className="h-px w-6 bg-current" />
          <span>In their words</span>
        </p>
        <div className="space-y-14 md:col-span-9">
          {items.map((t) => (
            <figure key={t.id} className="reveal">
              <Mark className="h-10 text-7xl md:h-14 md:text-8xl" />
              <blockquote>
                <p className="text-text font-serif text-2xl leading-snug text-pretty md:text-3xl">
                  {t.quote}
                </p>
              </blockquote>
              <div className="mt-7">
                <Author t={t} />
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
