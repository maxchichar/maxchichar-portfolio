import { renderToStaticMarkup } from "react-dom/server";
import { HomeEditorialCard } from "../../src/components/home/editorial-card";
import { selectHomepageWork } from "../../src/lib/home-work";

export function homeWritingHtml() {
  const rows = [
    {
      project: { slug: "world-is-not-finished", featured: false, sortOrder: 0 },
      published: { publishedAt: "2026-10-22" },
      title: "The World Is Not a Finished Product.",
      body: "Building and measuring systems that turn ideas into working products.",
      coverUrl: null,
      meta: ["Essay", "Oct 2026", "4 min read"],
    },
    {
      project: { slug: "project-with-cover", featured: false, sortOrder: 0 },
      published: { publishedAt: "2026-10-01" },
      title: "A project with an uploaded cover",
      body: "An image-led case study with room for a concise introduction.",
      coverUrl: "https://research.test/cover.svg",
      meta: [null, null],
    },
  ];
  return renderToStaticMarkup(
    <main className="container-site py-16">
      <h1 className="sr-only">Portfolio</h1>
      <section aria-label="Writing">
        <h2 className="text-h2 mb-12 font-sans">Notes from the work.</h2>
        <div className="grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {selectHomepageWork(rows, 3).map((row, i) => (
            <HomeEditorialCard
              sectionLabel="Writing"
              readLabel="Read article"
              fallbackLabel="Notes from the work."
              key={row.project.slug}
              href={`/writing/${row.project.slug}`}
              transitionName={`cover-writing-${row.project.slug}`}
              title={row.title}
              body={row.body}
              coverUrl={row.coverUrl}
              meta={row.meta}
              number={i + 1}
            />
          ))}
        </div>
      </section>
    </main>,
  );
}
