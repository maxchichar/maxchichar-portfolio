import Link from "next/link";
import { MediaImage } from "@/components/media-image";

type ResearchCardProps = {
  slug: string;
  published: {
    title: string;
    abstract: string;
    type: string;
    category: string | null;
    publishedAt: Date | string | null;
  };
  coverUrl: string | null;
  number: number;
  headingLevel?: "h2" | "h3";
  sizes?: string;
};

/** One accessible link per paper; the adjacent title describes the decorative cover. */
export function ResearchCard({
  slug,
  published,
  coverUrl,
  number,
  headingLevel: Heading = "h2",
  sizes = "(min-width: 768px) 50vw, 100vw",
}: ResearchCardProps) {
  const date = published.publishedAt ? new Date(published.publishedAt) : null;
  return (
    <Link
      href={`/research/${slug}`}
      className="group focus-visible:outline-accent-purple block min-w-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-8"
    >
      <div className="border-border bg-surface relative aspect-[16/10] overflow-hidden rounded-sm border">
        {coverUrl ? (
          <MediaImage
            src={coverUrl}
            alt=""
            fill
            sizes={sizes}
            className="object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-[1.03]"
          />
        ) : (
          <div
            aria-hidden="true"
            className="hero-wash absolute inset-0 flex flex-col justify-between p-6 md:p-8"
          >
            <span className="text-accent-purple border-accent-purple/30 w-fit border-b pb-2 font-mono text-xs tracking-[0.2em] uppercase">
              Research / {String(number).padStart(2, "0")}
            </span>
            <div className="border-accent-purple/30 ml-auto h-1/2 w-1/2 border-t border-l" />
            <span className="text-text max-w-[85%] font-serif text-2xl leading-tight italic md:text-3xl">
              {published.category || "Questions worth pursuing."}
            </span>
          </div>
        )}
        <span
          aria-hidden="true"
          className="bg-bg text-text absolute right-4 bottom-4 flex h-10 w-10 items-center justify-center rounded-full border border-current/15 text-xl"
        >
          ↗
        </span>
      </div>
      <div className="text-text-muted mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px] tracking-wider uppercase">
        <span className="text-accent-purple">{published.type}</span>
        {published.category ? <span>{published.category}</span> : null}
        {date ? <time dateTime={date.toISOString()}>{date.getUTCFullYear()}</time> : null}
      </div>
      <Heading className="text-text group-hover:text-accent mt-3 font-sans text-2xl leading-tight font-semibold tracking-tight break-words transition-colors md:text-3xl">
        {published.title}
      </Heading>
      <p className="text-text-muted mt-3 line-clamp-3 font-serif text-base leading-relaxed break-words">
        {published.abstract}
      </p>
      <span className="text-text mt-5 inline-flex border-b border-current/30 pb-1 font-sans text-sm">
        Read research{" "}
        <span aria-hidden="true" className="ml-2">
          →
        </span>
      </span>
    </Link>
  );
}
