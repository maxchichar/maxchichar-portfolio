import { z } from "zod";

// The admin writing assistant's pure half: what each request asks for, the
// shape each answer must have, and the clean-up applied to every answer. The
// API call itself lives in server/services/ai.ts. Nothing here publishes or
// saves: suggestions go back to the editor, and the author decides.

export const ASSIST_KINDS = ["excerpt", "titles", "tags", "review"] as const;
export type AssistKind = (typeof ASSIST_KINDS)[number];

export const EXCERPT_MAX = 300;
/** Longer bodies are refused, not cut, so a suggestion never misses the end. */
export const BODY_MAX_CHARS = 120_000;

export const assistRequestSchema = z.object({
  articleId: z.uuid(),
  kind: z.enum(ASSIST_KINDS),
  title: z.string().max(200).default(""),
  excerpt: z.string().max(2000).default(""),
  body: z.string().max(BODY_MAX_CHARS, "This article is too long for the assistant."),
});
export type AssistRequest = z.infer<typeof assistRequestSchema>;

export const assistOutputSchemas = {
  excerpt: z.object({ excerpt: z.string() }),
  titles: z.object({ titles: z.array(z.string()) }),
  tags: z.object({ tags: z.array(z.string()) }),
  review: z.object({
    summary: z.string(),
    suggestions: z.array(z.object({ issue: z.string(), suggestion: z.string() })),
  }),
} satisfies Record<AssistKind, z.ZodType>;

export type AssistResult =
  | { kind: "excerpt"; excerpt: string }
  | { kind: "titles"; titles: string[] }
  | { kind: "tags"; tags: string[] }
  | {
      kind: "review";
      summary: string;
      suggestions: { issue: string; suggestion: string }[];
    };

// Stable across every request, so the API can cache it.
export const ASSIST_SYSTEM_PROMPT = `You are the editing assistant for a personal portfolio site. The site's owner writes the articles; you help them finish one. You only suggest. The owner reviews every suggestion before it is used, and nothing you write is published without them.

Write in the owner's voice: plain, specific, confident, no hype. Match the article's spelling (British or American) and tone. Never invent facts, numbers, names or links that are not in the article.

House style, which every answer must follow:
- Never use em dashes (—). Use a comma, colon, full stop or parentheses instead.
- No clickbait, no emoji, no hashtags, no exclamation marks.
- Plain text only. No Markdown, no quotation marks around the whole answer.`;

const TASKS: Record<AssistKind, string> = {
  excerpt: `Write the article's excerpt: one or two sentences, at most ${EXCERPT_MAX} characters, that tell a reader what the article is about and why it is worth reading. It appears in the Writing list, search results and share cards. Do not start with "In this article" or repeat the title.`,
  titles: `Suggest 4 alternative titles for the article, each under 80 characters. Make them distinct from each other: for example one direct, one built on the article's main claim, one shorter. Do not include the current title.`,
  tags: `Suggest 3 to 6 tags for the article: short topic names of one to three words (for example "Distributed systems", "Rust", "Career"). Use the topics the article is actually about, most important first. Capitalise like a heading.`,
  review: `Review the draft as a careful editor before it is published. Give a two or three sentence summary of how ready it is, then up to 6 specific suggestions, most important first: unclear passages, unsupported claims, structure, an opening that takes too long, typos. Quote or point to the exact passage in each issue. Do not rewrite the article.`,
};

/** The per-request message: the task, then the article. */
export function buildAssistPrompt(input: {
  kind: AssistKind;
  title: string;
  excerpt: string;
  body: string;
}): string {
  return `${TASKS[input.kind]}

<article>
<title>${input.title.trim() || "(untitled)"}</title>
<excerpt>${input.excerpt.trim() || "(none yet)"}</excerpt>
<body>
${input.body.trim()}
</body>
</article>`;
}

/** House style: no em dashes, no wrapping quotes, single spaces. */
export function cleanAiText(text: string): string {
  const cleaned = text
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/,\s*,/g, ",")
    .trim();
  // Only a quote at both ends wraps the answer; a lone trailing ' is a possessive.
  const wrapped = /^["“'‘](.*)["”'’]$/.exec(cleaned);
  return wrapped ? (wrapped[1] ?? "").trim() : cleaned;
}

/** Cuts at the last sentence or word that fits, never mid-word. */
export function clipToLength(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const sentence = cut.lastIndexOf(". ");
  if (sentence > max * 0.5) return cut.slice(0, sentence + 1);
  const word = cut.lastIndexOf(" ");
  return `${cut.slice(0, word > 0 ? word : max - 1).replace(/[,;:]$/, "")}…`;
}

function cleanList(items: string[], max: number, maxLength: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const item = cleanAiText(raw).replace(/^#/, "").replace(/\.$/, "");
    const key = item.toLowerCase();
    if (!item || item.length > maxLength || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length === max) break;
  }
  return out;
}

/** Applies the house style and the field limits to a parsed answer. */
export function finaliseAssistResult(
  kind: AssistKind,
  raw: unknown,
  current: { title: string },
): AssistResult {
  switch (kind) {
    case "excerpt": {
      const { excerpt } = assistOutputSchemas.excerpt.parse(raw);
      return { kind, excerpt: clipToLength(cleanAiText(excerpt), EXCERPT_MAX) };
    }
    case "titles": {
      const { titles } = assistOutputSchemas.titles.parse(raw);
      const currentTitle = current.title.trim().toLowerCase();
      return {
        kind,
        titles: cleanList(titles, 5, 200).filter((t) => t.toLowerCase() !== currentTitle),
      };
    }
    case "tags": {
      const { tags } = assistOutputSchemas.tags.parse(raw);
      return { kind, tags: cleanList(tags, 6, 40) };
    }
    case "review": {
      const { summary, suggestions } = assistOutputSchemas.review.parse(raw);
      return {
        kind,
        summary: cleanAiText(summary),
        suggestions: suggestions
          .map((s) => ({
            issue: cleanAiText(s.issue),
            suggestion: cleanAiText(s.suggestion),
          }))
          .filter((s) => s.issue && s.suggestion)
          .slice(0, 6),
      };
    }
  }
}

/** Merges suggested tags into a comma-separated field without duplicates. */
export function mergeTags(existing: string, added: string[]): string {
  const tags = existing
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const seen = new Set(tags.map((t) => t.toLowerCase()));
  for (const tag of added) {
    if (!seen.has(tag.toLowerCase())) {
      seen.add(tag.toLowerCase());
      tags.push(tag);
    }
  }
  return tags.join(", ");
}
