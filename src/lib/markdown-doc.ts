import { marked, type Token, type Tokens } from "marked";

import { looksLikeMarkdown } from "@/lib/markdown-paste";
import { safeHref, safeImageSrc } from "@/lib/rich-text";

/**
 * Markdown to the Tiptap JSON the site stores and renders, without a DOM, so
 * the server can repair content: articles whose text was entered as raw
 * Markdown, or whose whole text ended up in the excerpt. Only nodes and marks
 * the public renderer allows are produced.
 */

type Mark = { type: string; attrs?: Record<string, unknown> };
type JSONNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: JSONNode[];
  marks?: Mark[];
  text?: string;
};
export type TiptapJSONDoc = { type: "doc"; content: JSONNode[] };

function inline(tokens: Token[] | undefined, marks: Mark[] = []): JSONNode[] {
  const out: JSONNode[] = [];
  for (const t of tokens ?? []) {
    switch (t.type) {
      case "strong":
        out.push(...inline((t as Tokens.Strong).tokens, [...marks, { type: "bold" }]));
        break;
      case "em":
        out.push(...inline((t as Tokens.Em).tokens, [...marks, { type: "italic" }]));
        break;
      case "del":
        out.push(...inline((t as Tokens.Del).tokens, [...marks, { type: "strike" }]));
        break;
      case "codespan":
        out.push(
          textNode(decode((t as Tokens.Codespan).text), [...marks, { type: "code" }]),
        );
        break;
      case "link": {
        const href = safeHref((t as Tokens.Link).href);
        const linkMarks = href ? [...marks, { type: "link", attrs: { href } }] : marks;
        out.push(...inline((t as Tokens.Link).tokens, linkMarks));
        break;
      }
      case "br":
        out.push({ type: "hardBreak" });
        break;
      case "image": {
        const image = t as Tokens.Image;
        const src = safeImageSrc(image.href);
        if (src) {
          out.push({
            type: "image",
            attrs: { src, alt: decode(image.text), title: image.title ?? null },
          });
        }
        break;
      }
      case "text": {
        const tt = t as Tokens.Text;
        if (tt.tokens?.length) out.push(...inline(tt.tokens, marks));
        else out.push(textNode(decode(tt.text), marks));
        break;
      }
      default:
        if ("text" in t && typeof t.text === "string") {
          out.push(textNode(decode(t.text), marks));
        }
    }
  }
  return out.filter((n) => n.type !== "text" || (n.text ?? "") !== "");
}

function textNode(text: string, marks: Mark[]): JSONNode {
  return marks.length ? { type: "text", text, marks } : { type: "text", text };
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};
function decode(text: string): string {
  return text.replace(/&(amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m] ?? m);
}

function paragraph(content: JSONNode[]): JSONNode {
  return content.length ? { type: "paragraph", content } : { type: "paragraph" };
}

// Tiptap images are block nodes. Keep them outside paragraphs so both the
// editor and public renderer retain them when repaired content is saved.
function paragraphs(content: JSONNode[]): JSONNode[] {
  const out: JSONNode[] = [];
  let text: JSONNode[] = [];
  for (const node of content) {
    if (node.type === "image") {
      if (text.length) out.push(paragraph(text));
      text = [];
      out.push(node);
    } else {
      text.push(node);
    }
  }
  if (text.length) out.push(paragraph(text));
  return out.length ? out : [paragraph([])];
}

function blocks(tokens: Token[]): JSONNode[] {
  const out: JSONNode[] = [];
  for (const t of tokens) {
    switch (t.type) {
      case "heading": {
        const h = t as Tokens.Heading;
        out.push({
          type: "heading",
          attrs: { level: h.depth <= 2 ? 2 : 3 },
          content: inline(h.tokens),
        });
        break;
      }
      case "paragraph":
        out.push(...paragraphs(inline((t as Tokens.Paragraph).tokens)));
        break;
      case "list": {
        const l = t as Tokens.List;
        out.push({
          type: l.ordered ? "orderedList" : "bulletList",
          content: l.items.map((item) => {
            const inner = blocks(item.tokens);
            return {
              type: "listItem",
              content: inner.length ? inner : [paragraph([])],
            };
          }),
        });
        break;
      }
      case "blockquote":
        out.push({
          type: "blockquote",
          content: blocks((t as Tokens.Blockquote).tokens),
        });
        break;
      case "hr":
        out.push({ type: "horizontalRule" });
        break;
      case "code":
        out.push({
          type: "codeBlock",
          content: [{ type: "text", text: (t as Tokens.Code).text || " " }],
        });
        break;
      case "text": {
        // Loose text inside list items.
        const tt = t as Tokens.Text;
        out.push(
          ...paragraphs(tt.tokens?.length ? inline(tt.tokens) : [textNode(tt.text, [])]),
        );
        break;
      }
      case "space":
      case "def":
        break;
      default:
        if ("text" in t && typeof t.text === "string" && t.text.trim()) {
          out.push(paragraph([textNode(t.text, [])]));
        }
    }
  }
  return out;
}

export function markdownToTiptapDoc(markdown: string): TiptapJSONDoc {
  const tokens = marked.lexer(markdown.replace(/\r\n?/g, "\n"), { gfm: true });
  const content = blocks(tokens);
  return { type: "doc", content: content.length ? content : [paragraph([])] };
}

/** Plain text of a Tiptap document (blocks separated by blank lines). */
export function docPlainText(doc: unknown): string {
  const walk = (n: unknown): string => {
    if (!n || typeof n !== "object") return "";
    const node = n as JSONNode;
    if (node.type === "text") return node.text ?? "";
    if (node.type === "hardBreak") return "\n";
    const inner = (node.content ?? []).map(walk);
    return node.type === "doc" ? inner.join("\n\n") : inner.join("");
  };
  return walk(doc).trim();
}

/** Plain text of Markdown with the formatting removed. */
function plain(markdown: string): string {
  const doc = markdownToTiptapDoc(markdown);
  return docPlainText(doc).replace(/\s+/g, " ").trim();
}

const EXCERPT_MAX = 300;

/** A short summary: the text's first paragraph, cut at a sentence if long. */
function summarize(markdown: string): string {
  const first = marked
    .lexer(markdown.replace(/\r\n?/g, "\n"), { gfm: true })
    .find((t) => t.type === "paragraph");
  const text = plain(first ? first.raw : markdown);
  if (text.length <= EXCERPT_MAX) return text;
  const cut = text.slice(0, EXCERPT_MAX - 1);
  const sentenceEnd = Math.max(
    cut.lastIndexOf(". "),
    cut.lastIndexOf("? "),
    cut.lastIndexOf("! "),
  );
  return sentenceEnd > 80
    ? cut.slice(0, sentenceEnd + 1)
    : `${cut.replace(/\s+\S*$/, "")}…`;
}

function isPlainParagraphs(doc: unknown): doc is TiptapJSONDoc {
  if (!doc || typeof doc !== "object") return false;
  const content = (doc as TiptapJSONDoc).content;
  return (
    Array.isArray(content) &&
    content.every(
      (n) =>
        n.type === "paragraph" &&
        (n.content ?? []).every(
          (c) => (c.type === "text" && !c.marks?.length) || c.type === "hardBreak",
        ),
    )
  );
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Repairs an article whose formatting was lost: the whole text typed into
 * the excerpt with an empty body, or a body (or excerpt) of literal Markdown.
 * Returns null when the article is fine as it is. The repaired body drops a
 * leading summary paragraph used as the excerpt and a heading repeating the
 * title, so nothing shows twice.
 */
export function repairArticleContent({
  title,
  excerpt,
  content,
}: {
  title: string;
  excerpt: string;
  content: unknown;
}): { excerpt: string; content: TiptapJSONDoc } | null {
  const body = docPlainText(content);

  let markdown: string | null = null;
  if (!body && isPlainParagraphs(content) && excerpt.trim().length > EXCERPT_MAX) {
    markdown = excerpt;
  } else if (body && isPlainParagraphs(content) && looksLikeMarkdown(body)) {
    markdown = body;
  }

  if (markdown === null) {
    // Body is fine; only tidy an excerpt written in Markdown.
    if (looksLikeMarkdown(excerpt)) {
      const cleaned = summarize(excerpt);
      return cleaned && cleaned !== excerpt
        ? { excerpt: cleaned, content: content as TiptapJSONDoc }
        : null;
    }
    return null;
  }

  const doc = markdownToTiptapDoc(markdown);
  let nodes = doc.content;
  let newExcerpt = excerpt;

  if (
    markdown === excerpt ||
    excerpt.trim().length > EXCERPT_MAX ||
    looksLikeMarkdown(excerpt)
  ) {
    newExcerpt = summarize(markdown);
    // The opening paragraph became the excerpt: don't repeat it (or a
    // divider right after it) at the top of the body.
    if (
      nodes[0]?.type === "paragraph" &&
      plain(docPlainText({ type: "doc", content: [nodes[0]] })) === newExcerpt
    ) {
      nodes = nodes.slice(1);
      if (nodes[0]?.type === "horizontalRule") nodes = nodes.slice(1);
    }
  }
  // A heading that only repeats the title.
  const firstHeading = nodes.find((n) => n.type === "heading");
  if (
    firstHeading &&
    norm(docPlainText({ type: "doc", content: [firstHeading] })) === norm(title)
  ) {
    nodes = nodes.filter((n) => n !== firstHeading);
  }

  return {
    excerpt: newExcerpt,
    content: { type: "doc", content: nodes.length ? nodes : [paragraph([])] },
  };
}
