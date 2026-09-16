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

// data shape validated per-type at the app layer — the schema deliberately
// leaves `evidence.data` as an unshaped jsonb column (docs/SPECIFICATION.md);
// this is where "no invented/computed marketing statistics" gets enforced —
// before_after/measurement require real stored values, not a free-text
// claim field.
const measurementData = z.object({
  metric: z.string().min(1).max(120),
  before: z.string().min(1).max(60),
  after: z.string().min(1).max(60),
  unit: z.string().max(30).optional(),
});

const beforeAfterData = z.object({
  metric: z.string().min(1).max(120),
  before: z.string().min(1).max(60),
  after: z.string().min(1).max(60),
  unit: z.string().max(30).optional(),
});

export const evidenceCreateSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("measurement"),
    label: z.string().min(1).max(160),
    description: z.string().max(600).optional(),
    url: z.url().optional().or(z.literal("")),
    data: measurementData,
  }),
  z.object({
    type: z.literal("before_after"),
    label: z.string().min(1).max(160),
    description: z.string().max(600).optional(),
    url: z.url().optional().or(z.literal("")),
    data: beforeAfterData,
  }),
  z.object({
    type: z.enum([
      "repository",
      "benchmark",
      "dataset",
      "screenshot",
      "paper",
      "demo",
      "deployment",
    ]),
    label: z.string().min(1).max(160),
    description: z.string().max(600).optional(),
    url: z.url().optional().or(z.literal("")),
    data: z.undefined().optional(),
  }),
]);
export type EvidenceCreateInput = z.infer<typeof evidenceCreateSchema>;
