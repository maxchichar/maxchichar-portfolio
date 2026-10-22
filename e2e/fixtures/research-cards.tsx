import { renderToStaticMarkup } from "react-dom/server";
import { ResearchCard } from "../../src/components/research/research-card";
import { selectHomepageResearch } from "../../src/lib/home-work";

export function researchCardsHtml(home = false) {
  const rows = [
    {
      research: { slug: "architecture-of-stagnation", featured: false, sortOrder: 0 },
      published: {
        title: "The Architecture of Stagnation",
        abstract:
          "An investigation into the systems that sustain stagnation, and what it takes to change them.",
        type: "Investigation",
        category: "Systems & society",
        publishedAt: "2026-10-22T12:00:00Z",
      },
      coverUrl: null,
    },
    {
      research: { slug: "technical-note", featured: false, sortOrder: 0 },
      published: {
        title: "A technical note on intelligent systems",
        abstract: "Methods, evidence, and limitations.",
        type: "Technical Note",
        category: null,
        publishedAt: null,
      },
      coverUrl: "https://research.test/cover.svg",
    },
  ];
  const visible = home ? selectHomepageResearch(rows, 3) : rows;
  return renderToStaticMarkup(
    <main className="container-site py-16">
      <h1 className="text-h1 mb-12 font-sans">
        {home ? "Questions worth answering properly." : "Research"}
      </h1>
      <ul
        className={
          home
            ? "grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3"
            : "grid gap-x-8 gap-y-14 md:grid-cols-2"
        }
      >
        {visible.map((row, i) => (
          <li key={row.research.slug}>
            <ResearchCard
              slug={row.research.slug}
              published={row.published}
              coverUrl={row.coverUrl}
              number={i + 1}
            />
          </li>
        ))}
      </ul>
    </main>,
  );
}
