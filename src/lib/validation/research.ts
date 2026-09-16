import { z } from "zod";

// tiptapDocSchema is a generic Tiptap-JSON-document validator with no
// project-specific fields — it lives in validation/project.ts because
// projects used it first, not because it's project-only. Reused here
// rather than duplicated, per the no-duplicate-validation-systems rule.
import { tiptapDocSchema } from "./project";

// Research types — matches the `research_versions_type_check` CHECK
// constraint in schema.ts exactly.
export const RESEARCH_TYPES = [
  "Investigation",
  "Technical Note",
  "Experiment",
  "Literature Review",
  "Research Paper",
] as const;

export type ResearchType = (typeof RESEARCH_TYPES)[number];

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const researchCreateSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(slugPattern, "lowercase letters, numbers, and hyphens only"),
  title: z.string().min(1).max(200),
  type: z.enum(RESEARCH_TYPES),
  abstract: z.string().min(1).max(600),
});
export type ResearchCreateInput = z.infer<typeof researchCreateSchema>;

// Section keys from docs/SPECIFICATION.md's content-lifecycle note. The
// fourth key is deliberately `evidence_narrative`, not `evidence` — the
// spec calls this out explicitly to avoid colliding with the structured
// Evidence attachment model (project_evidence/research_evidence), which
// is Level 5.3 scope. Labeled "Evidence" in the UI; stored under this key.
export const RESEARCH_SECTION_KEYS = [
  "research_question",
  "background",
  "methodology",
  "evidence_narrative",
  "findings",
  "counterarguments",
  "limitations",
  "conclusion",
  "sources",
] as const;

export type ResearchSectionKey = (typeof RESEARCH_SECTION_KEYS)[number];

export const researchSectionSchema = z.object({
  key: z.enum(RESEARCH_SECTION_KEYS),
  heading: z.string().min(1).max(120),
  content: tiptapDocSchema,
});

export const researchDraftUpdateSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(RESEARCH_TYPES),
  abstract: z.string().min(1).max(600),
  category: z.string().max(80).optional().nullable(),
  sections: z.array(researchSectionSchema).max(RESEARCH_SECTION_KEYS.length),
});
export type ResearchDraftUpdateInput = z.infer<typeof researchDraftUpdateSchema>;
