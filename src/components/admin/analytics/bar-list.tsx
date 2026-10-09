/**
 * Ranked breakdown (top pages, referrers, countries…): single series, so no
 * legend — the card title names it. Bars are thin, grow from one baseline
 * with a rounded data-end; every value is printed, so nothing hides behind
 * hover.
 */
export function BarList({
  title,
  rows,
  labelHeader,
  formatLabel,
}: {
  title: string;
  rows: { label: string; visitors: number; views: number }[];
  labelHeader: string;
  formatLabel?: (label: string) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.visitors));
  return (
    <section className="rounded-panel border-border bg-surface border p-5">
      <h2 className="text-text font-sans text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-text-muted py-8 text-center font-serif text-sm">
          No data yet.
        </p>
      ) : (
        <table className="mt-4 w-full text-left">
          <thead className="text-text-muted font-mono text-[10px] tracking-wider uppercase">
            <tr>
              <th scope="col" className="pb-2 font-normal">
                {labelHeader}
              </th>
              <th scope="col" className="w-20 pb-2 text-right font-normal">
                Visitors
              </th>
              <th scope="col" className="w-16 pb-2 text-right font-normal">
                Views
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="py-1.5 pr-3">
                  <div className="relative h-7">
                    <div
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 rounded-r-[4px]"
                      style={{
                        width: `${Math.max(2, (r.visitors / max) * 100)}%`,
                        background: "color-mix(in oklab, #4f7cff 22%, transparent)",
                      }}
                    />
                    <span className="text-text relative block truncate px-2 font-sans text-xs leading-7">
                      {formatLabel ? formatLabel(r.label) : r.label}
                    </span>
                  </div>
                </td>
                <td className="text-text py-1.5 text-right font-mono text-xs tabular-nums">
                  {r.visitors.toLocaleString("en-US")}
                </td>
                <td className="text-text-muted py-1.5 text-right font-mono text-xs tabular-nums">
                  {r.views.toLocaleString("en-US")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
