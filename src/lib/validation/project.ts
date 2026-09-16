import { z } from "zod";

// Section keys from the project case-study proof architecture — docs/SPECIFICATION.md.
export const PROJECT_SECTION_KEYS = [
  "problem",
  "context",
  "why_it_matters",
  "hypothesis",
  "approach",
  "architecture",
  "implementation",
  "experiments",
  "results",
  "failures",
  "tradeoffs",
  "lessons",
  "limitations",
  "future_work",
] as const;

export type ProjectSectionKey = (typeof PROJECT_SECTION_KEYS)[number];

// Minimal valid Tiptap JSON document shape. The editor UI in this slice is
// a plain textarea (real Tiptap integration is deferred — see the Phase 3
// report) but the STORED shape is genuine Tiptap JSON either way, so later
// wiring in the real editor is a UI change only, not a data migration.
export const tiptapDocSchema = z.object({
  type: z.literal("doc"),
  content: z.array(z.record(z.string(), z.unknown())),
});
export type TiptapDoc = z.infer<typeof tiptapDocSchema>;

export function plainTextToTiptapDoc(text: string): TiptapDoc {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 0);
  return {
    type: "doc",
    content:
      paragraphs.length > 0
        ? paragraphs.map((p) => ({
            type: "paragraph",
            content: [{ type: "text", text: p }],
          }))
        : [{ type: "paragraph", content: [] }],
  };
}

export function tiptapDocToPlainText(doc: unknown): string {
  const parsed = tiptapDocSchema.safeParse(doc);
  if (!parsed.success) return "";
  return parsed.data.content
    .map((node) => {
      const content = node["content"];
      if (!Array.isArray(content)) return "";
      return content
        .map((n) => (typeof n === "object" && n && "text" in n ? String(n.text) : ""))
        .join("");
    })
    .join("\n\n");
}

export const projectSectionSchema = z.object({
  key: z.enum(PROJECT_SECTION_KEYS),
  heading: z.string().min(1).max(120),
  content: tiptapDocSchema,
});

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const projectCreateSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(slugPattern, "lowercase letters, numbers, and hyphens only"),
  title: z.string().min(1).max(200),
  shortDescription: z.string().min(1).max(400),
});
export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;

export const projectDraftUpdateSchema = z.object({
  title: z.string().min(1).max(200),
  shortDescription: z.string().min(1).max(400),
  category: z.string().max(80).optional().nullable(),
  year: z.number().int().min(1990).max(2100).optional().nullable(),
  technologies: z.array(z.string().min(1).max(60)).max(30).default([]),
  githubUrl: z.url().optional().nullable().or(z.literal("")),
  liveUrl: z.url().optional().nullable().or(z.literal("")),
  documentationUrl: z.url().optional().nullable().or(z.literal("")),
  sections: z.array(projectSectionSchema).max(PROJECT_SECTION_KEYS.length),
  tags: z.array(z.string().min(1).max(40)).max(20).default([]),
  coverMediaId: z.uuid().optional().nullable(),
});
export type ProjectDraftUpdateInput = z.infer<typeof projectDraftUpdateSchema>;
