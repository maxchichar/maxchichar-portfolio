import Link from "next/link";

import type { ContentCard } from "@/lib/related";

const TYPE_LABEL = { work: "Work", research: "Research", writing: "Writing" } as const;

/** Topically related items (shared tags), shown above "Next up". */
export function RelatedContent({ items }: { items: ContentCard[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="related-heading" className="container-site mt-24 md:mt-32">
      <div className="grid gap-8 md:grid-cols-12">
        <h2
          id="related-heading"
          className="index-label reveal md:col-span-3 md:self-start md:pt-6"
        >
          <span aria-hidden="true" className="h-px w-6 bg-current" />
          <span>Related</span>
        </h2>
        <ul className="border-border border-t md:col-span-9">
          {items.map((item) => (
            <li key={item.href} className="reveal border-border border-b">
              <Link
                href={item.href}
                className="group grid gap-x-6 gap-y-1.5 py-6 md:grid-cols-[7rem_1fr_auto] md:items-baseline"
              >
                <span className="text-text-muted font-mono text-[11px] tracking-[0.16em] uppercase">
                  {TYPE_LABEL[item.type]}
                </span>
                <span className="min-w-0">
                  <span className="text-text group-hover:text-accent block font-sans text-lg font-semibold tracking-tight transition-colors md:text-xl">
                    {item.title}
                  </span>
                  <span className="text-text-muted mt-1 line-clamp-2 font-serif text-base md:line-clamp-1">
                    {item.summary}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="text-text-muted group-hover:text-accent hidden transition-[color,transform] group-hover:translate-x-1 md:block"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
