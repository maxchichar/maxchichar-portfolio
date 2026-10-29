import { z } from "zod";

import { markdownToTiptapDoc } from "./markdown-doc";
import { richDocToMarkdown } from "./rich-text-markdown";
import { tiptapDocSchema } from "./validation/project";

// The Content API's request shapes and responses (Phase 11.2). Pure, so the
// rules are testable without a database. Article bodies can be sent as
// Markdown (`body`) or as the editor's Tiptap JSON (`content`), and come back
// as both. There is no publish endpoint: drafts wait for a person.

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const BODY_MAX_CHARS = 200_000;

const bodyFields = {
  body: z.string().max(BODY_MAX_CHARS).optional(),
  content: tiptapDocSchema.optional(),
};

export const createArticleRequestSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .max(120)
      .regex(slugPattern, "slug: lowercase letters, numbers and hyphens only"),
    title: z.string().trim().min(1).max(200),
    excerpt: z.string().trim().min(1).max(300),
    category: z.string().trim().max(80).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    ...bodyFields,
  })
  .strict()
  .refine((v) => !(v.body !== undefined && v.content !== undefined), {
    message: "Send either body (Markdown) or content (Tiptap JSON), not both.",
  });
export type CreateArticleRequest = z.infer<typeof createArticleRequestSchema>;

export const updateDraftRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    excerpt: z.string().trim().min(1).max(300).optional(),
    category: z.string().trim().max(80).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    ...bodyFields,
  })
  .strict()
  .refine((v) => !(v.body !== undefined && v.content !== undefined), {
    message: "Send either body (Markdown) or content (Tiptap JSON), not both.",
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update." });
export type UpdateDraftRequest = z.infer<typeof updateDraftRequestSchema>;

/** The Tiptap document for a request's body, or undefined if it sent none. */
export function requestContent(input: { body?: string; content?: unknown }) {
  if (input.body !== undefined) return markdownToTiptapDoc(input.body);
  return input.content;
}

export function apiError(
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit,
) {
  return Response.json({ error: { code, message } }, { status, headers });
}

/** Zod's first issue as a readable message. */
export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid request.";
  const path = issue.path.join(".");
  return path && !issue.message.startsWith(`${path}:`)
    ? `${path}: ${issue.message}`
    : issue.message;
}

interface VersionLike {
  id: string;
  versionNumber: number;
  status: string;
  title: string;
  excerpt: string;
  category: string | null;
  content: unknown;
  readingTime: number | null;
  createdByType: string;
  generationMode: string;
  source: string | null;
  createdAt: Date;
  publishedAt: Date | null;
}

export function serializeVersion(version: VersionLike | null, siteUrl: string) {
  if (!version) return null;
  return {
    id: version.id,
    versionNumber: version.versionNumber,
    status: version.status,
    title: version.title,
    excerpt: version.excerpt,
    category: version.category,
    readingTime: version.readingTime,
    markdown: richDocToMarkdown(version.content, siteUrl),
    content: version.content,
    provenance: {
      createdByType: version.createdByType,
      generationMode: version.generationMode,
      source: version.source,
    },
    createdAt: version.createdAt.toISOString(),
    publishedAt: version.publishedAt ? version.publishedAt.toISOString() : null,
  };
}

export function serializeArticle(
  state: {
    article: { id: string; slug: string; status: string; createdAt: Date };
    draft: VersionLike | null;
    published: VersionLike | null;
    tags: { name: string }[];
  },
  siteUrl: string,
) {
  return {
    id: state.article.id,
    slug: state.article.slug,
    status: state.article.status,
    url: state.published
      ? `${siteUrl.replace(/\/$/, "")}/writing/${state.article.slug}`
      : null,
    tags: state.tags.map((t) => t.name),
    draft: serializeVersion(state.draft, siteUrl),
    published: serializeVersion(state.published, siteUrl),
    createdAt: state.article.createdAt.toISOString(),
  };
}
