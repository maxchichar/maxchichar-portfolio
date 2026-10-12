import Link from "next/link";

import { groupTopicItems, topicHref, type Topic } from "@/lib/topics";

const GROUP_LABEL = { work: "Work", research: "Research", writing: "Writing" } as const;

function formatDate(ms: number) {
  return ms
    ? new Date(ms).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "";
}

/** A topic's items, one section per content type. */
export function TopicSections({ topic }: { topic: Topic }) {
  return (
    <div className="space-y-20 md:space-y-28">
      {groupTopicItems(topic).map((group) => (
        <section
          key={group.type}
          aria-labelledby={`topic-${group.type}`}
          className="grid gap-8 md:grid-cols-12"
        >
          <h2
            id={`topic-${group.type}`}
            className="index-label reveal md:col-span-3 md:self-start md:pt-6"
          >
            <span aria-hidden="true" className="h-px w-6 bg-current" />
            <span>{GROUP_LABEL[group.type]}</span>
            <span className="text-text-muted">{group.items.length}</span>
          </h2>
          <ul className="border-border border-t md:col-span-9">
            {group.items.map((item) => (
              <li key={item.href} className="reveal border-border border-b">
                <Link
                  href={item.href}
                  className="group grid gap-x-6 gap-y-1.5 py-6 md:grid-cols-[1fr_7rem_auto] md:items-baseline"
                >
                  <span className="min-w-0">
                    <span className="text-text group-hover:text-accent block font-sans text-lg font-semibold tracking-tight transition-colors md:text-xl">
                      {item.title}
                    </span>
                    {item.summary ? (
                      <span className="text-text-muted mt-1 line-clamp-2 font-serif text-base">
                        {item.summary}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-text-muted font-mono text-xs md:text-right">
                    {formatDate(item.date)}
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
        </section>
      ))}
    </div>
  );
}

/** Topic chips with item counts. */
export function TopicChips({ topics }: { topics: Topic[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {topics.map((t) => (
        <li key={t.slug}>
          <Link
            href={topicHref(t) ?? "/topics"}
            className="border-border text-text hover:border-accent hover:text-accent inline-flex items-baseline gap-2 rounded-full border px-4 py-2 font-sans text-sm transition-colors"
          >
            #{t.name}
            <span className="text-text-muted font-mono text-[11px]">{t.count}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
