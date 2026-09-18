import { z } from "zod";

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

// The full content schema (single Tiptap document — not a sections array,
// per schema.ts's "same pattern, single Tiptap document instead of a
// sections array" comment) and the draft-update schema belong to the
// article editor, which is Level 6.2.
