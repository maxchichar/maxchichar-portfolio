import Link from "next/link";

/** End-of-page link to the next item — keeps visitors moving through the work. */
export function NextUp({
  label,
  title,
  body,
  href,
  coverUrl,
}: {
  label: string;
  title: string;
  body: string;
  href: string;
  coverUrl: string | null;
}) {
  return (
    <section className="container-site mt-24 md:mt-32">
      <Link
        href={href}
        className="group rounded-panel border-border bg-surface relative grid overflow-hidden border md:grid-cols-12"
      >
        <div className="flex flex-col justify-between gap-10 p-8 md:col-span-7 md:p-12">
          <p className="index-label">
            <span>→</span>
            <span>{label}</span>
          </p>
          <div>
            <h2 className="text-h2 text-text group-hover:text-accent font-sans font-semibold transition-colors">
              {title}
            </h2>
            <p className="text-text-muted mt-4 line-clamp-2 max-w-xl font-serif text-lg">
              {body}
            </p>
          </div>
          <span className="text-text inline-flex items-center gap-2 font-sans text-sm">
            Read next
            <span
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:translate-x-1"
            >
              →
            </span>
          </span>
        </div>
        <div className="relative min-h-56 overflow-hidden md:col-span-5">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
            />
          ) : (
            <div aria-hidden="true" className="hero-wash absolute inset-0" />
          )}
        </div>
      </Link>
    </section>
  );
}
