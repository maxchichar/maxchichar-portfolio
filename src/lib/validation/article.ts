import { z } from "zod";

// tiptapDocSchema is a generic Tiptap-JSON-document validator with no
// project-specific fields — reused here rather than duplicated, same as
// validation/research.ts does, per the no-duplicate-validation rule.
import { tiptapDocSchema } from "./project";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const articleCreateSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(slugPattern, "lowercase letters, numbers, and hyphens only"),
  title: z.string().min(1).max(200),
  excerpt: z.string().min(1).max(300),
});
export type ArticleCreateInput = z.infer<typeof articleCreateSchema>;

// Articles store a single Tiptap document (schema.ts: "same pattern,
// single Tiptap document instead of a sections array") rather than the
// sections array Projects/Research use — reflected directly here.
export const articleDraftUpdateSchema = z.object({
  title: z.string().min(1).max(200),
  excerpt: z.string().min(1).max(300),
  category: z.string().max(80).optional().nullable(),
  content: tiptapDocSchema,
});
export type ArticleDraftUpdateInput = z.infer<typeof articleDraftUpdateSchema>;
