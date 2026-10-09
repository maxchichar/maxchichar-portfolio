// Pure helpers over stored Tiptap JSON documents (no React, no server-only),
// shared by the public renderer, services and the admin editor.

export interface RichNode {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type?: string; attrs?: Record<string, unknown> }[];
  content?: RichNode[];
}

export interface RichHeading {
  id: string;
  text: string;
  level: number;
}

export function isRichDoc(doc: unknown): doc is RichNode & { content: RichNode[] } {
  return (
    typeof doc === "object" &&
    doc !== null &&
    (doc as RichNode).type === "doc" &&
    Array.isArray((doc as RichNode).content)
  );
}

/** Concatenated text of a node and its descendants. */
export function nodeText(node: RichNode): string {
  if (typeof node.text === "string") return node.text;
  if (node.type === "hardBreak") return "\n";
  return (node.content ?? []).map(nodeText).join("");
}

const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "codeBlock",
  "listItem",
  "bulletList",
  "orderedList",
]);

/** Plain text with blocks separated by blank lines (reading time, meta, search). */
export function richDocToPlainText(doc: unknown): string {
  if (!isRichDoc(doc)) return "";
  const blocks: string[] = [];
  const walk = (nodes: RichNode[]) => {
    for (const node of nodes) {
      const hasBlockChildren = (node.content ?? []).some((c) =>
        BLOCK_TYPES.has(c.type ?? ""),
      );
      if (hasBlockChildren) {
        walk(node.content ?? []);
      } else if (BLOCK_TYPES.has(node.type ?? "")) {
        const text = nodeText(node).trim();
        if (text) blocks.push(text);
      }
    }
  };
  walk(doc.content);
  return blocks.join("\n\n");
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80) || "section"
  );
}

/**
 * Heading ids for in-page navigation. `prefix` keeps ids unique when several
 * documents render on one page (e.g. case-study sections).
 */
export function collectHeadings(doc: unknown, prefix = ""): RichHeading[] {
  if (!isRichDoc(doc)) return [];
  const seen = new Map<string, number>();
  const out: RichHeading[] = [];
  for (const node of doc.content) {
    if (node.type !== "heading") continue;
    const text = nodeText(node).trim();
    if (!text) continue;
    const base = `${prefix}${slugify(text)}`;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    const level = Number(node.attrs?.level ?? 2);
    out.push({ id: n === 0 ? base : `${base}-${n}`, text, level });
  }
  return out;
}

/** Only http(s), mailto and same-site links survive; anything else is dropped. */
export function safeHref(href: unknown): string | null {
  if (typeof href !== "string") return null;
  const value = href.trim();
  if (/^(https?:|mailto:)/i.test(value)) return value;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  if (value.startsWith("#")) return value;
  return null;
}

/** Images: http(s) or same-site paths only (never data:/javascript:). */
export function safeImageSrc(src: unknown): string | null {
  if (typeof src !== "string") return null;
  const value = src.trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return null;
}
