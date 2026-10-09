import type { schema } from "@/lib/db";

type EvidenceRow = typeof schema.evidence.$inferSelect & { mediaUrl?: string | null };

const TYPE_LABELS: Record<string, string> = {
  repository: "Repository",
  benchmark: "Benchmark",
  dataset: "Dataset",
  screenshot: "Screenshot",
  paper: "Paper",
  demo: "Demo",
  deployment: "Deployment",
  measurement: "Measurement",
  before_after: "Before / After",
};

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function readData(data: unknown) {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (!("after" in d)) return null;
  return {
    metric: d.metric ? String(d.metric) : null,
    before: "before" in d ? String(d.before) : null,
    after: String(d.after),
    unit: d.unit ? String(d.unit) : "",
  };
}

/**
 * Evidence Wall (called "Exhibits" on research). Values are rendered exactly
 * as stored — no derived percentages or computed claims (validation/evidence).
 */
export function EvidenceWall({
  items,
  id = "evidence",
  number,
  title = "Evidence Wall",
  description = "Verifiable benchmarks, code repositories, datasets, and empirical artifacts.",
}: {
  items: EvidenceRow[];
  id?: string;
  number?: string;
  title?: string;
  description?: string;
}) {
  if (items.length === 0) return null;

  return (
    <section
      id={id}
      className="border-border reveal scroll-mt-28 border-t py-12 first:border-t-0 first:pt-0 md:py-16"
    >
      <h2 className="text-h3 text-text flex items-baseline gap-4 font-sans font-semibold">
        {number ? (
          <span className="text-accent-purple font-mono text-xs font-normal tabular-nums">
            {number}
          </span>
        ) : null}
        {title}
      </h2>
      <p className="text-text-muted mt-3 max-w-xl font-serif text-base">{description}</p>

      <ul className="mt-10 grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const data = readData(item.data);
          const isWide = item.type === "screenshot" && item.mediaUrl;
          const body = (
            <>
              {item.mediaUrl ? (
                <div className="border-border bg-bg -mx-6 -mt-6 mb-6 overflow-hidden border-b">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.mediaUrl}
                    alt={item.label}
                    loading="lazy"
                    className="aspect-video w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <span className="text-eyebrow text-text-muted font-mono uppercase">
                  {TYPE_LABELS[item.type] ?? item.type}
                </span>
                {item.url ? (
                  <span className="text-text-muted group-hover:text-accent font-mono text-xs transition-colors">
                    {hostOf(item.url)} ↗
                  </span>
                ) : null}
              </div>

              {data ? (
                <div className="mt-6">
                  {data.metric ? (
                    <p className="text-text-muted font-sans text-sm">{data.metric}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    {data.before ? (
                      <>
                        <span className="text-text-muted font-sans text-2xl font-medium tabular-nums">
                          {data.before}
                          <span className="ml-1 text-base">{data.unit}</span>
                        </span>
                        <span aria-label="to" className="text-text-muted">
                          →
                        </span>
                      </>
                    ) : null}
                    <span className="text-text font-sans text-5xl font-semibold tracking-tight tabular-nums">
                      {data.after}
                      <span className="text-text-muted ml-1.5 text-xl font-medium">
                        {data.unit}
                      </span>
                    </span>
                  </div>
                </div>
              ) : null}

              <h3 className="text-text group-hover:text-accent mt-6 font-sans text-lg font-semibold tracking-tight transition-colors">
                {item.label}
              </h3>
              {item.description ? (
                <p className="text-text-muted mt-2 font-serif text-base leading-relaxed">
                  {item.description}
                </p>
              ) : null}
            </>
          );

          const cardClass =
            "group rounded-panel border-border bg-surface hover:border-text/20 block h-full overflow-hidden border p-6 transition-colors";

          return (
            <li key={item.id} className={isWide ? "md:col-span-2" : undefined}>
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cardClass}
                >
                  {body}
                </a>
              ) : (
                <div className={cardClass}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
