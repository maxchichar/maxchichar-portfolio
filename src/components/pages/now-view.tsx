import { SplitText } from "@/components/motion/split-text";
import type { NowPageContent } from "@/lib/validation/page";

import { Paragraphs } from "./paragraphs";

const GRID = [
  { key: "currentlyBuilding", title: "Building" },
  { key: "researching", title: "Researching" },
  { key: "learning", title: "Learning" },
  { key: "interests", title: "Interested in" },
] as const satisfies readonly { key: keyof NowPageContent; title: string }[];

function daysAgo(date: Date) {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "a month ago" : `${months} months ago`;
}

export function NowView({
  content,
  publishedAt,
}: {
  content: NowPageContent;
  publishedAt: Date | null;
}) {
  return (
    <article className="container-site pt-16 md:pt-24">
      <header className="border-border border-b pb-14 md:pb-20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="animate-rise index-label">
            <span aria-hidden="true" className="h-px w-6 bg-current" />
            <span>Now</span>
          </p>
          {/* "Last updated" isn't a stored field — it's the published
              version's own timestamp, so it can't drift from reality. */}
          {publishedAt ? (
            <p className="animate-rise border-border text-text-muted inline-flex items-center gap-2.5 rounded-full border px-3.5 py-1.5 font-mono text-xs">
              <span className="relative flex h-2 w-2">
                <span className="bg-accent-purple absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" />
                <span className="bg-accent-purple relative inline-flex h-2 w-2 rounded-full" />
              </span>
              Updated {daysAgo(publishedAt)} ·{" "}
              {new Date(publishedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          ) : null}
        </div>
        <h1 className="text-h1 text-text mt-6 max-w-4xl font-sans font-semibold text-balance">
          <SplitText text="What I'm focused on right now." baseDelay={80} />
        </h1>
      </header>

      <section className="reveal py-16 md:py-24">
        <p className="text-eyebrow text-text-muted font-mono uppercase">Current thesis</p>
        <blockquote className="border-accent-purple mt-6 border-l-2 pl-6 md:pl-10">
          <Paragraphs
            text={content.thesis}
            className="text-text space-y-4 font-serif text-[clamp(1.5rem,1.1rem+1.6vw,2.5rem)] leading-[1.3] tracking-tight italic"
          />
        </blockquote>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {GRID.map((item, i) => (
          <section
            key={item.key}
            className="reveal rounded-panel border-border bg-surface border p-8 md:p-10"
          >
            <h2 className="flex items-baseline gap-3 font-sans">
              <span className="text-accent-purple font-mono text-xs tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-h3 text-text font-semibold">{item.title}</span>
            </h2>
            <Paragraphs
              text={content[item.key]}
              className="text-text/85 mt-5 space-y-4 font-serif text-lg leading-relaxed"
            />
          </section>
        ))}
      </div>

      <section className="reveal border-border mt-16 grid gap-6 border-t pt-12 md:mt-24 md:grid-cols-12">
        <h2 className="text-eyebrow text-text-muted font-mono uppercase md:col-span-3">
          Recent changes
        </h2>
        <Paragraphs
          text={content.recentChanges}
          className="text-text space-y-4 font-serif text-lg leading-relaxed md:col-span-8"
        />
      </section>
    </article>
  );
}
