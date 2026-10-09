import { Fragment } from "react";

import {
  collectHeadings,
  isRichDoc,
  nodeText,
  safeHref,
  safeImageSrc,
  type RichNode,
} from "@/lib/rich-text";

/**
 * Renders a stored Tiptap JSON document as React elements — never as an
 * HTML string, so there is no injection surface. Unknown node types fall
 * back to rendering their children; unknown marks are ignored. Links and
 * image sources are allow-listed (see lib/rich-text).
 */
export function RichText({
  doc,
  idPrefix = "",
  className = "rich-text",
}: {
  doc: unknown;
  idPrefix?: string;
  className?: string;
}) {
  if (!isRichDoc(doc)) return null;

  // Ids are assigned in document order, matching collectHeadings() so a
  // table of contents built from the same doc links to the right anchors.
  const headingIds = collectHeadings(doc, idPrefix).map((h) => h.id);
  let headingIndex = 0;

  const renderMarks = (node: RichNode, key: number) => {
    let el: React.ReactNode = node.text ?? "";
    for (const mark of node.marks ?? []) {
      switch (mark.type) {
        case "bold":
          el = <strong>{el}</strong>;
          break;
        case "italic":
          el = <em>{el}</em>;
          break;
        case "strike":
          el = <s>{el}</s>;
          break;
        case "underline":
          el = <u>{el}</u>;
          break;
        case "code":
          el = <code>{el}</code>;
          break;
        case "link": {
          const href = safeHref(mark.attrs?.href);
          if (href) {
            const external = /^https?:/i.test(href);
            el = (
              <a
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {el}
              </a>
            );
          }
          break;
        }
      }
    }
    return <Fragment key={key}>{el}</Fragment>;
  };

  const renderChildren = (nodes: RichNode[] | undefined) =>
    (nodes ?? []).map((child, i) => renderNode(child, i));

  function renderNode(node: RichNode, key: number): React.ReactNode {
    switch (node.type) {
      case "text":
        return renderMarks(node, key);
      case "hardBreak":
        return <br key={key} />;
      case "paragraph":
        // Empty paragraphs are spacing artifacts from the editor; skip them.
        if (!node.content || node.content.length === 0) return null;
        return <p key={key}>{renderChildren(node.content)}</p>;
      case "heading": {
        if (!nodeText(node).trim()) return null;
        const level = Math.min(Math.max(Number(node.attrs?.level ?? 2), 2), 4);
        const Tag = `h${level}` as "h2" | "h3" | "h4";
        const id = headingIds[headingIndex++];
        return (
          <Tag key={key} id={id}>
            {renderChildren(node.content)}
          </Tag>
        );
      }
      case "bulletList":
        return <ul key={key}>{renderChildren(node.content)}</ul>;
      case "orderedList": {
        const start = Number(node.attrs?.start ?? 1);
        return (
          <ol key={key} start={start > 1 ? start : undefined}>
            {renderChildren(node.content)}
          </ol>
        );
      }
      case "listItem":
        return <li key={key}>{renderChildren(node.content)}</li>;
      case "blockquote":
        return <blockquote key={key}>{renderChildren(node.content)}</blockquote>;
      case "codeBlock":
        return (
          <pre key={key}>
            <code>{nodeText(node)}</code>
          </pre>
        );
      case "horizontalRule":
        return <hr key={key} />;
      case "image": {
        const src = safeImageSrc(node.attrs?.src);
        if (!src) return null;
        const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
        const title = typeof node.attrs?.title === "string" ? node.attrs.title : "";
        return (
          <figure key={key}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} loading="lazy" decoding="async" />
            {title ? <figcaption>{title}</figcaption> : null}
          </figure>
        );
      }
      default:
        return node.content ? (
          <Fragment key={key}>{renderChildren(node.content)}</Fragment>
        ) : null;
    }
  }

  return <div className={className}>{renderChildren(doc.content)}</div>;
}
