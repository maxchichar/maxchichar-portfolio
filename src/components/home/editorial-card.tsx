import Link from "next/link";
import { ViewTransition } from "react";
import { MediaImage } from "@/components/media-image";

type HomeEditorialCardProps = {
  href: string;
  title: string;
  body: string;
  coverUrl: string | null;
  meta: (string | null)[];
  number: number;
  transitionName: string;
  sectionLabel?: string;
  readLabel?: string;
  fallbackLabel?: string;
};

/** Homepage editorial card; the title names the single link and decorative cover. */
export function HomeEditorialCard({
  href,
  title,
  body,
  coverUrl,
  meta,
  number,
  transitionName,
  sectionLabel = "Work",
  readLabel = "View project",
  fallbackLabel = "Ideas put into practice.",
}: HomeEditorialCardProps) {
  const metaItems = meta.filter((item): item is string => Boolean(item));
  return (
    <Link
      href={href}
      className="group focus-visible:outline-accent-purple block min-w-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-8"
    >
      <ViewTransition name={transitionName} share="morph" default="none">
        <div className="border-border bg-surface relative aspect-[16/10] overflow-hidden rounded-sm border">
          {coverUrl ? (
            <MediaImage
              src={coverUrl}
              alt=""
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              className="object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-[1.03]"
            />
          ) : (
            <div
              aria-hidden="true"
              className="hero-wash absolute inset-0 flex flex-col justify-between p-6 md:p-8"
            >
              <span className="text-accent-purple border-accent-purple/30 w-fit border-b pb-2 font-mono text-xs tracking-[0.2em] uppercase">
                {sectionLabel} / {String(number).padStart(2, "0")}
              </span>
              <div className="border-accent-purple/30 ml-auto h-1/2 w-1/2 border-t border-l" />
              <span className="text-text max-w-[85%] font-serif text-2xl leading-tight italic md:text-3xl">
                {meta[0] || fallbackLabel}
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
      </ViewTransition>
      <div className="text-text-muted mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px] tracking-wider uppercase">
        {metaItems.map((item, i) => (
          <span key={i} className={i === 0 ? "text-accent-purple" : undefined}>
            {item}
          </span>
        ))}
      </div>
      <h3 className="text-text group-hover:text-accent mt-3 font-sans text-2xl leading-tight font-semibold tracking-tight break-words transition-colors md:text-3xl">
        {title}
      </h3>
      <p className="text-text-muted mt-3 line-clamp-3 font-serif text-base leading-relaxed break-words">
        {body}
      </p>
      <span className="text-text mt-5 inline-flex border-b border-current/30 pb-1 font-sans text-sm">
        {readLabel}{" "}
        <span aria-hidden="true" className="ml-2">
          →
        </span>
      </span>
    </Link>
  );
}
