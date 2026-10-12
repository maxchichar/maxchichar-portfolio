// Stored Tiptap JSON -> Markdown, for machine-readable outputs (/llms-full.txt).
// Same allow-list as the HTML renderers: unknown nodes fall back to their
// text, links and images go through safeHref / safeImageSrc, and relative
// URLs are made absolute against `baseUrl`.

import { isRichDoc, nodeText, safeHref, safeImageSrc, type RichNode } from "./rich-text";

function absolute(url: string, baseUrl: string): string {
  if (url.startsWith("#") || /^[a-z]+:/i.test(url)) return url;
  return `${baseUrl.replace(/\/$/, "")}${url}`;
}

export function richDocToMarkdown(doc: unknown, baseUrl: string): string {
  if (!isRichDoc(doc)) return "";

  const inline = (nodes: RichNode[] | undefined): string =>
    (nodes ?? [])
      .map((node) => {
        if (node.type === "hardBreak") return "  \n";
        if (node.type !== "text") return inline(node.content);
        let text = node.text ?? "";
        const marks = node.marks ?? [];
        const code = marks.some((m) => m.type === "code");
        if (code) text = `\`${text.replace(/`/g, "\\`")}\``;
        for (const mark of marks) {
          if (mark.type === "bold") text = `**${text}**`;
          else if (mark.type === "italic") text = `*${text}*`;
          else if (mark.type === "strike") text = `~~${text}~~`;
          else if (mark.type === "link") {
            const href = safeHref(mark.attrs?.href);
            if (href) text = `[${text}](${absolute(href, baseUrl)})`;
          }
        }
        return text;
      })
      .join("");

  function block(node: RichNode, indent = ""): string {
    switch (node.type) {
      case "paragraph": {
        const text = inline(node.content).trim();
        return text ? `${indent}${text}` : "";
      }
      case "heading": {
        if (!nodeText(node).trim()) return "";
        const level = Math.min(Math.max(Number(node.attrs?.level ?? 2), 2), 4);
        // Shifted down one level: the item's title is the "## " heading.
        return `${"#".repeat(level + 1)} ${inline(node.content).trim()}`;
      }
      case "bulletList":
      case "orderedList": {
        const start = Number(node.attrs?.start ?? 1);
        return (node.content ?? [])
          .map((item, i) => {
            const marker = node.type === "orderedList" ? `${start + i}.` : "-";
            const parts = (item.content ?? []).map((child) =>
              block(child, `${indent}   `),
            );
            const [first = "", ...rest] = parts.filter(Boolean);
            return [`${indent}${marker} ${first.trimStart()}`, ...rest].join("\n");
          })
          .join("\n");
      }
      case "blockquote":
        return (node.content ?? [])
          .map((child) => block(child))
          .filter(Boolean)
          .join("\n\n")
          .split("\n")
          .map((line) => `${indent}> ${line}`.trimEnd())
          .join("\n");
      case "codeBlock":
        return `${indent}\`\`\`\n${nodeText(node)}\n${indent}\`\`\``;
      case "horizontalRule":
        return `${indent}---`;
      case "image": {
        const src = safeImageSrc(node.attrs?.src);
        if (!src) return "";
        const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
        return `${indent}![${alt}](${absolute(src, baseUrl)})`;
      }
      default:
        return (node.content ?? [])
          .map((child) => block(child, indent))
          .filter(Boolean)
          .join("\n\n");
    }
  }

  return doc.content
    .map((node) => block(node))
    .filter(Boolean)
    .join("\n\n");
}
