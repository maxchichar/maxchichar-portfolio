import { z } from "zod";

export const EVIDENCE_TYPES = [
  "repository",
  "benchmark",
  "dataset",
  "screenshot",
  "paper",
  "demo",
  "deployment",
  "measurement",
  "before_after",
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

// Blank optional form controls are absent values, not invalid measurements.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);
const requiredText = (max: number) => z.string().trim().min(1, "Enter a value.").max(max);
const contextData = z.object({
  observationPeriod: optionalText(160),
  source: optionalText(600),
  method: optionalText(1200),
  limitations: optionalText(1200),
});
const comparisonData = contextData.extend({
  metric: requiredText(120),
  before: requiredText(60),
  after: requiredText(60),
  unit: optionalText(30),
});
// Accept the original paired measurement shape from existing project clients.
const measurementData = z.union([
  contextData.extend({
    metric: requiredText(120),
    value: requiredText(60),
    unit: optionalText(30),
  }),
  comparisonData,
]);
const base = {
  label: requiredText(160),
  description: optionalText(600),
  mediaId: z.uuid().optional().nullable(),
  url: z
    .string()
    .trim()
    .pipe(z.url().or(z.literal("")))
    .optional(),
};
export const evidenceCreateSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("measurement"), data: measurementData }),
  z.object({ ...base, type: z.literal("before_after"), data: comparisonData }),
  z.object({ ...base, type: z.enum(["paper", "dataset"]), data: contextData.optional() }),
  z.object({
    ...base,
    type: z.enum(["repository", "benchmark", "screenshot", "demo", "deployment"]),
    data: z.undefined().optional(),
  }),
]);
export type EvidenceCreateInput = z.infer<typeof evidenceCreateSchema>;

/** Only submit fields relevant to the selected type. Never fill in missing data. */
export function parseResearchEvidenceForm(form: FormData) {
  const type = String(form.get("type") ?? "");
  const fields =
    type === "measurement"
      ? ["metric", "value", "unit"]
      : type === "before_after"
        ? ["metric", "before", "after", "unit"]
        : [];
  const hasContext = ["paper", "dataset", "measurement", "before_after"].includes(type);
  const data = hasContext
    ? Object.fromEntries(
        [...fields, "observationPeriod", "source", "method", "limitations"].map((key) => [
          key,
          String(form.get(key) ?? ""),
        ]),
      )
    : undefined;
  return evidenceCreateSchema.safeParse({
    type,
    label: String(form.get("label") ?? ""),
    description: String(form.get("description") ?? ""),
    url: String(form.get("url") ?? ""),
    data,
  });
}

export function evidenceFieldErrors(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.filter((part) => part !== "data").join(".");
    errors[key || "type"] ??= issue.message;
  }
  return errors;
}
