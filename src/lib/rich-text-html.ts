// Stored Tiptap JSON -> an HTML string, for places that need markup rather
// than React elements (the RSS feed's full-content field). Mirrors the
// RichText component: every text value is escaped, only allow-listed nodes
// and marks produce tags, and links/images go through the same safeHref /
// safeImageSrc checks. Relative URLs are made absolute against `baseUrl`,
// since feed readers show the content away from the site.

import { isRichDoc, nodeText, safeHref, safeImageSrc, type RichNode } from "./rich-text";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function absolute(url: string, baseUrl: string): string {
  if (url.startsWith("#") || /^[a-z]+:/i.test(url)) return url;
  return `${baseUrl.replace(/\/$/, "")}${url}`;
}

export function richDocToHtml(doc: unknown, baseUrl: string): string {
  if (!isRichDoc(doc)) return "";

  const marks = (node: RichNode): string => {
    let html = escapeHtml(node.text ?? "");
    for (const mark of node.marks ?? []) {
      switch (mark.type) {
        case "bold":
          html = `<strong>${html}</strong>`;
          break;
        case "italic":
          html = `<em>${html}</em>`;
          break;
        case "strike":
          html = `<s>${html}</s>`;
          break;
        case "underline":
          html = `<u>${html}</u>`;
          break;
        case "code":
          html = `<code>${html}</code>`;
          break;
        case "link": {
          const href = safeHref(mark.attrs?.href);
          if (href) html = `<a href="${escapeHtml(absolute(href, baseUrl))}">${html}</a>`;
          break;
        }
      }
    }
    return html;
  };

  const children = (nodes: RichNode[] | undefined) => (nodes ?? []).map(render).join("");

  function render(node: RichNode): string {
    switch (node.type) {
      case "text":
        return marks(node);
      case "hardBreak":
        return "<br>";
      case "paragraph":
        return node.content?.length ? `<p>${children(node.content)}</p>` : "";
      case "heading": {
        if (!nodeText(node).trim()) return "";
        const level = Math.min(Math.max(Number(node.attrs?.level ?? 2), 2), 4);
        return `<h${level}>${children(node.content)}</h${level}>`;
      }
      case "bulletList":
        return `<ul>${children(node.content)}</ul>`;
      case "orderedList": {
        const start = Number(node.attrs?.start ?? 1);
        return `<ol${start > 1 ? ` start="${start}"` : ""}>${children(node.content)}</ol>`;
      }
      case "listItem":
        return `<li>${children(node.content)}</li>`;
      case "blockquote":
        return `<blockquote>${children(node.content)}</blockquote>`;
      case "codeBlock":
        return `<pre><code>${escapeHtml(nodeText(node))}</code></pre>`;
      case "horizontalRule":
        return "<hr>";
      case "image": {
        const src = safeImageSrc(node.attrs?.src);
        if (!src) return "";
        const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
        const title = typeof node.attrs?.title === "string" ? node.attrs.title : "";
        return `<figure><img src="${escapeHtml(absolute(src, baseUrl))}" alt="${escapeHtml(alt)}">${
          title ? `<figcaption>${escapeHtml(title)}</figcaption>` : ""
        }</figure>`;
      }
      default:
        return children(node.content);
    }
  }

  return children(doc.content);
}
