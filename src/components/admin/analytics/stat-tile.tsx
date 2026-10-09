function compact(n: number) {
  return n >= 10_000
    ? new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(n)
    : n.toLocaleString("en-US");
}

/** Label · value · signed delta vs the previous period (arrow + text, not colour alone). */
export function StatTile({
  label,
  value,
  previous,
  format = compact,
  note,
  live = false,
}: {
  label: string;
  value: number;
  previous?: number;
  format?: (n: number) => string;
  note?: string;
  live?: boolean;
}) {
  let delta: string | null = null;
  if (previous !== undefined) {
    if (previous === 0) delta = value > 0 ? "New" : null;
    else {
      const pct = Math.round(((value - previous) / previous) * 100);
      delta = `${pct > 0 ? "▲" : pct < 0 ? "▼" : "■"} ${Math.abs(pct)}%`;
    }
  }
  return (
    <div className="rounded-panel border-border bg-surface border p-5">
      <p className="text-text-muted flex items-center gap-2 font-sans text-sm">
        {live ? (
          <span className="relative flex h-2 w-2">
            <span className="bg-accent absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" />
            <span className="bg-accent relative inline-flex h-2 w-2 rounded-full" />
          </span>
        ) : null}
        {label}
      </p>
      <p className="text-text mt-3 font-sans text-4xl font-semibold tracking-tight">
        {format(value)}
      </p>
      <p className="text-text-muted mt-2 font-mono text-xs">
        {delta ? <span className="text-text">{delta}</span> : null}
        {delta && note ? " " : null}
        {note}
      </p>
    </div>
  );
}
