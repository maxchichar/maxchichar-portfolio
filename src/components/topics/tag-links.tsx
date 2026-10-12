import Link from "next/link";

import { topicHref } from "@/lib/topics";

/** A content item's tags, each linking to its topic page. */
export function TagLinks({
  tags,
  className = "",
}: {
  tags: { name: string; slug: string }[];
  className?: string;
}) {
  if (tags.length === 0) return null;
  return (
    <ul aria-label="Topics" className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag) => {
        const href = topicHref(tag);
        const chip =
          "border-border rounded-full border px-3 py-1 font-mono text-xs transition-colors";
        return (
          <li key={tag.slug || tag.name}>
            {href ? (
              <Link
                href={href}
                className={`${chip} text-text-muted hover:border-accent hover:text-accent inline-block`}
              >
                #{tag.name}
              </Link>
            ) : (
              <span className={`${chip} text-text-muted inline-block`}>#{tag.name}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
