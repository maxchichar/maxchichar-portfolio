import type { schema } from "@/lib/db";

type EvidenceRow = typeof schema.evidence.$inferSelect;

export function EvidenceWall({ items }: { items: EvidenceRow[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="text-accent-purple font-sans text-xs font-semibold tracking-wider uppercase">
        Evidence Wall
      </h2>
      <p className="text-text-muted mt-1 font-serif text-sm">
        Verifiable benchmarks, code repositories, datasets, and empirical artifacts.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-panel border-border bg-surface flex flex-col justify-between border p-5"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-badge border-border text-text-muted bg-bg/50 border px-2 py-0.5 font-mono text-xs tracking-wider uppercase">
                  {item.type.replace("_", " ")}
                </span>

                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent font-sans text-xs font-medium hover:underline"
                  >
                    View Source &rarr;
                  </a>
                ) : null}
              </div>

              <h3 className="text-text mt-3 font-sans text-base font-semibold">
                {item.label}
              </h3>

              {item.description ? (
                <p className="text-text-muted mt-2 font-serif text-sm">
                  {item.description}
                </p>
              ) : null}

              {/* Render structured measurement / before_after data */}
              {item.data && typeof item.data === "object" ? (
                <div className="rounded-card border-border bg-bg/40 mt-4 border p-3 font-mono text-xs">
                  {"metric" in item.data ? (
                    <div className="text-text-muted mb-1 font-sans text-xs font-medium">
                      Metric:{" "}
                      <span className="text-text">{String(item.data.metric)}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-4">
                    {"before" in item.data ? (
                      <div>
                        <span className="text-text-muted block text-[10px] uppercase">
                          Before
                        </span>
                        <span className="text-text text-sm font-semibold">
                          {String(item.data.before)}{" "}
                          {"unit" in item.data && item.data.unit
                            ? String(item.data.unit)
                            : ""}
                        </span>
                      </div>
                    ) : null}
                    {"before" in item.data && "after" in item.data ? (
                      <span className="text-accent-purple font-sans text-sm">&rarr;</span>
                    ) : null}
                    {"after" in item.data ? (
                      <div>
                        <span className="text-text-muted block text-[10px] uppercase">
                          After
                        </span>
                        <span className="text-accent text-sm font-semibold">
                          {String(item.data.after)}{" "}
                          {"unit" in item.data && item.data.unit
                            ? String(item.data.unit)
                            : ""}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
