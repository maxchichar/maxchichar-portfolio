import { renderToStaticMarkup } from "react-dom/server";
import { WorkCard } from "../../src/components/home/work-card";
import { selectHomepageWork } from "../../src/lib/home-work";

export function homeWorkHtml() {
  const rows = [
    {
      project: { slug: "intelligent-systems", featured: false, sortOrder: 0 },
      published: { publishedAt: "2026-10-22" },
      title: "Intelligent systems for real-world problems",
      body: "Building and measuring systems that turn ideas into working products.",
      coverUrl: null,
      meta: ["Engineering", "2026"],
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
      <section aria-label="Selected Work">
        <h2 className="text-h2 mb-12 font-sans">Systems built, shipped, and measured.</h2>
        <div className="grid gap-x-6 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {selectHomepageWork(rows, 3).map((row, i) => (
            <WorkCard
              key={row.project.slug}
              href={`/work/${row.project.slug}`}
              transitionName={`cover-work-${row.project.slug}`}
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
