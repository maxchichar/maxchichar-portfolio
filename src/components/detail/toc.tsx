"use client";

import { useEffect, useState } from "react";

export interface TocItem {
  id: string;
  label: string;
  number?: string;
}

/**
 * Sticky "On this page" navigation with scroll-spy: the section currently
 * in the reading zone is highlighted. Desktop sidebar; collapses into a
 * disclosure on small screens.
 */
export function Toc({
  items,
  title = "On this page",
}: {
  items: TocItem[];
  title?: string;
}) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // The "reading zone" is the upper-middle band of the viewport.
      { rootMargin: "-20% 0px -65% 0px" },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  if (items.length < 2) return null;

  const list = (
    <ol className="space-y-1">
      {items.map((item) => {
        const isActive = active === item.id;
        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={isActive ? "location" : undefined}
              className={`group flex items-baseline gap-3 py-1.5 font-sans text-sm transition-colors ${
                isActive ? "text-text" : "text-text-muted hover:text-text"
              }`}
            >
              <span
                aria-hidden="true"
                className={`h-px shrink-0 self-center transition-all duration-300 ${
                  isActive ? "bg-text w-6" : "bg-border group-hover:bg-text-muted w-3"
                }`}
              />
              {item.number ? (
                <span className="font-mono text-[11px] tabular-nums opacity-70">
                  {item.number}
                </span>
              ) : null}
              <span>{item.label}</span>
            </a>
          </li>
        );
      })}
    </ol>
  );

  return (
    <>
      <nav aria-label={title} className="sticky top-28 hidden lg:block">
        <p className="text-eyebrow text-text-muted mb-4 font-mono uppercase">{title}</p>
        {list}
      </nav>
      <details className="rounded-panel border-border bg-surface group border p-5 lg:hidden">
        <summary className="text-text flex cursor-pointer list-none items-center justify-between font-sans text-sm font-medium">
          {title}
          <span
            aria-hidden="true"
            className="text-text-muted transition-transform group-open:rotate-45"
          >
            +
          </span>
        </summary>
        <div className="mt-4">{list}</div>
      </details>
    </>
  );
}
