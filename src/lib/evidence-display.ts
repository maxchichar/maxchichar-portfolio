/** Tolerant reader for existing JSON records. Display stored values without calculations. */
export function readEvidenceData(data: unknown) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const d = data as Record<string, unknown>;
  const text = (key: string) => {
    const value = d[key];
    return typeof value === "string" || typeof value === "number" ? String(value) : "";
  };
  return {
    metric: text("metric"),
    before: text("before"),
    after: text("value") || text("after"),
    unit: text("unit"),
    context: (
      [
        ["Observation period", "observationPeriod"],
        ["Source", "source"],
        ["Method", "method"],
        ["Limitations", "limitations"],
      ] as const
    ).flatMap(([label, key]) => (text(key) ? [{ label, value: text(key) }] : [])),
  };
}
