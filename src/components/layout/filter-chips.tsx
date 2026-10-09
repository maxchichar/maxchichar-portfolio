import Link from "next/link";

/**
 * Server-rendered filter pills driven by a query param — no client JS, the
 * filtered page is a normal link (shareable, back-button friendly).
 */
export function FilterChips({
  basePath,
  param,
  options,
  active,
  allLabel = "All",
}: {
  basePath: string;
  param: string;
  options: { value: string; count: number }[];
  active: string | null;
  allLabel?: string;
}) {
  if (options.length < 2) return null;
  const total = options.reduce((n, o) => n + o.count, 0);
  const chip = (label: string, count: number, href: string, isActive: boolean) => (
    <li key={label}>
      <Link
        href={href}
        scroll={false}
        aria-current={isActive ? "true" : undefined}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-sans text-sm transition-colors ${
          isActive
            ? "border-text bg-text text-bg"
            : "border-border text-text-muted hover:border-text/40 hover:text-text"
        }`}
      >
        {label}
        <span className="font-mono text-[11px] tabular-nums opacity-60">{count}</span>
      </Link>
    </li>
  );
  return (
    <nav
      aria-label="Filter"
      className="animate-rise mb-14"
      style={{ animationDelay: "500ms" }}
    >
      <ul className="flex flex-wrap gap-2">
        {chip(allLabel, total, basePath, active === null)}
        {options.map((o) =>
          chip(
            o.value,
            o.count,
            `${basePath}?${param}=${encodeURIComponent(o.value)}`,
            active === o.value,
          ),
        )}
      </ul>
    </nav>
  );
}

/** Distinct non-empty values with counts, most common first. */
export function countBy<T>(items: T[], pick: (item: T) => string | null | undefined) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const v = pick(item)?.trim();
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value, count]) => ({ value, count }));
}

export function firstParam(value: string | string[] | undefined): string | null {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.trim().length > 0 ? v : null;
}
