import { marked } from "marked";

/**
 * Pasting Markdown into the rich-text editor: decide whether plain text is
 * Markdown, and turn it into HTML the editor can take in. The editor parses
 * that HTML against its own schema (unknown tags are dropped) and stores
 * Tiptap JSON, which the public site renders through an allow-list, so the
 * HTML here is never shown as-is.
 */

const MARKDOWN_SIGNS = [
  /^#{1,6}\s+\S/m, // # Heading
  /^\s*[-*+]\s+\S/m, // - list item
  /^\s*\d+[.)]\s+\S/m, // 1. list item
  /^\s*>\s?\S/m, // > quote
  /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/m, // --- divider
  /\*\*[^*\n]+\*\*/, // **bold**
  /(?:^|[\s(])[*_][^*_\s][^*_\n]*[*_](?=[\s).,;:!?]|$)/m, // *italic*
  /\[[^\]\n]+\]\([^)\s]+\)/, // [link](url)
  /^```/m, // fenced code
];

/** Ask a RichTextEditor (by field name) to take in some Markdown. */
export const INSERT_MARKDOWN_EVENT = "rich-text:insert-markdown";
export interface InsertMarkdownDetail {
  /** The editor's field name, e.g. "content". */
  target: string;
  markdown: string;
}

/**
 * True when copied HTML already carries real formatting (a web page, a doc),
 * so the editor's normal paste keeps it. Code editors copy Markdown as
 * plain styled spans, which don't count.
 */
export function hasRichHtml(html: string): boolean {
  return /<(h[1-6]|strong|em|b|i|ul|ol|blockquote|table)[\s>]/i.test(html);
}

/** True when plain text carries Markdown formatting worth converting. */
export function looksLikeMarkdown(text: string): boolean {
  if (!text.trim()) return false;
  return MARKDOWN_SIGNS.some((re) => re.test(text));
}

/**
 * Markdown to editor-ready HTML. The editor has two heading levels: `#` and
 * `##` become H2 (the page title is the only H1), `###` and smaller H3.
 */
export function markdownToEditorHtml(markdown: string): string {
  const html = marked.parse(markdown.replace(/\r\n?/g, "\n"), {
    async: false,
    gfm: true,
    breaks: false,
  });
  return html
    .replace(/<(\/?)h1(\s|>)/g, "<$1h2$2")
    .replace(/<(\/?)h[4-6](\s|>)/g, "<$1h3$2");
}
