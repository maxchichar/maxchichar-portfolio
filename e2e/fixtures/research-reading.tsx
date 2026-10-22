import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ResearchDetailView } from "../../src/components/research/research-detail-view";

const paragraph = (text: string) => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});
const doc = (...content: unknown[]) => ({ type: "doc", content });
const reference = (title: string, url: string) => ({
  type: "listItem",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: title, marks: [{ type: "italic" }] },
        { type: "text", text: ". " },
        { type: "text", text: url, marks: [{ type: "link", attrs: { href: url } }] },
      ],
    },
  ],
});

/** Synthetic layout fixtures, never research claims or stored CMS content. */
export function researchReadingHtml(
  sourceShape: "list" | "paragraphs" | "empty" = "list",
) {
  const sources =
    sourceShape === "list"
      ? doc({
          type: "orderedList",
          attrs: { start: 4 },
          content: [
            reference(
              "Example reference A",
              "https://example.org/" + "long-reference-path-".repeat(12),
            ),
            {
              type: "listItem",
              content: [
                paragraph("Example reference B. Supporting annotation."),
                {
                  type: "bulletList",
                  content: [
                    {
                      type: "listItem",
                      content: [paragraph("Nested annotation remains nested.")],
                    },
                  ],
                },
              ],
            },
          ],
        })
      : sourceShape === "paragraphs"
        ? doc(paragraph("[A] Example paragraph citation."), {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Unsafe link stays text",
                marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
              },
            ],
          })
        : doc(paragraph(""));
  const props = {
    research: { id: "fixture", slug: "reading-fixture" },
    published: {
      title: "Research reading preview",
      type: "Investigation",
      abstract: "Synthetic content for checking typography and reference layout.",
      versionNumber: 1,
      publishedAt: null,
      sections: [
        {
          key: "research_question",
          heading: "Research Question",
          content: doc(
            paragraph(
              "How should a clear research question read alongside the rest of the paper?",
            ),
          ),
        },
        {
          key: "background",
          heading: "Background",
          content: doc(
            paragraph(
              "The question and background use the same body text size and reading rhythm.",
            ),
          ),
        },
        { key: "sources", heading: "Sources", content: sources },
      ],
    },
    evidence: [],
    tags: [],
    coverUrl: null,
    next: null,
  } as unknown as ComponentProps<typeof ResearchDetailView>;
  return renderToStaticMarkup(createElement(ResearchDetailView, props));
}
