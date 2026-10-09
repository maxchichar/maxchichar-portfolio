import Link from "next/link";
import { ViewTransition } from "react";

import { SplitText } from "@/components/motion/split-text";

export interface Fact {
  label: string;
  value: React.ReactNode;
}

export interface HeroAction {
  label: string;
  href: string;
  primary?: boolean;
}

/**
 * Shared header for case studies, research and articles: back link,
 * eyebrow, display title, lede, a facts strip, actions, and a wide cover
 * that morphs from the listing card (shared view-transition name).
 */
export function DetailHero({
  backHref,
  backLabel,
  eyebrow,
  title,
  lede,
  facts,
  actions = [],
  coverUrl,
  coverAlt,
  coverTransitionName,
  centered = false,
}: {
  backHref: string;
  backLabel: string;
  eyebrow: string[];
  title: string;
  lede: string;
  facts: Fact[];
  actions?: HeroAction[];
  coverUrl: string | null;
  coverAlt: string;
  coverTransitionName: string;
  centered?: boolean;
}) {
  const visibleFacts = facts.filter((f) => f.value !== null && f.value !== "");
  return (
    <header>
      <div className={`container-site pt-10 md:pt-14 ${centered ? "max-w-5xl" : ""}`}>
        <Link
          href={backHref}
          className="group text-text-muted hover:text-text inline-flex items-center gap-2 font-sans text-sm transition-colors"
        >
          <span
            aria-hidden="true"
            className="transition-transform group-hover:-translate-x-0.5"
          >
            ←
          </span>
          {backLabel}
        </Link>

        <div className={`mt-14 md:mt-20 ${centered ? "text-center" : ""}`}>
          <p className={`index-label animate-rise ${centered ? "justify-center" : ""}`}>
            {eyebrow.map((e, i) => (
              <span key={i}>{e}</span>
            ))}
          </p>
          <h1
            className={`text-h1 text-text mt-6 font-sans font-semibold text-balance ${
              centered ? "mx-auto max-w-4xl" : "max-w-5xl"
            }`}
          >
            <SplitText text={title} baseDelay={60} />
          </h1>
          <p
            className={`text-lede text-text-muted animate-rise mt-8 font-serif text-pretty ${
              centered ? "mx-auto max-w-2xl" : "max-w-3xl"
            }`}
            style={{ animationDelay: "380ms" }}
          >
            {lede}
          </p>
        </div>

        {visibleFacts.length > 0 || actions.length > 0 ? (
          <div
            className={`animate-rise border-border mt-14 flex flex-col gap-8 border-y py-6 md:flex-row md:items-center ${
              centered ? "md:justify-center" : "md:justify-between"
            }`}
            style={{ animationDelay: "480ms" }}
          >
            {visibleFacts.length > 0 ? (
              <dl
                className={`grid grid-cols-2 gap-x-10 gap-y-5 sm:flex sm:flex-wrap ${
                  centered ? "sm:justify-center sm:text-center" : ""
                }`}
              >
                {visibleFacts.map((fact) => (
                  <div key={fact.label}>
                    <dt className="text-eyebrow text-text-muted font-mono uppercase">
                      {fact.label}
                    </dt>
                    <dd className="text-text mt-1.5 font-sans text-sm">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <span />
            )}
            {actions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {actions.map((action) => (
                  <a
                    key={action.href}
                    href={action.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 font-sans text-sm font-medium transition-colors ${
                      action.primary
                        ? "bg-text text-bg hover:bg-accent"
                        : "border-border text-text hover:border-accent hover:text-accent border"
                    }`}
                  >
                    {action.label}
                    <span aria-hidden="true">↗</span>
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {coverUrl ? (
        <div className="container-site mt-12 md:mt-16">
          <ViewTransition name={coverTransitionName} share="morph" default="none">
            <div className="rounded-panel border-border bg-surface overflow-hidden border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl}
                alt={coverAlt}
                fetchPriority="high"
                className="aspect-[16/9] w-full object-cover md:aspect-[21/9]"
              />
            </div>
          </ViewTransition>
        </div>
      ) : null}
    </header>
  );
}
