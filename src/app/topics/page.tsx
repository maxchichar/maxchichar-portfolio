import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { PageIntro } from "@/components/layout/page-intro";
import { PageTransition } from "@/components/motion/page-transition";
import { constructPageMetadata } from "@/lib/metadata";
import { describeCounts, topicHref } from "@/lib/topics";
import { listTopics } from "@/server/services/topics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = constructPageMetadata({
  title: "Topics",
  description:
    "Every theme across the work, research and writing, with everything published on each.",
  path: "/topics",
});

export default async function TopicsIndexPage() {
  const topics = await listTopics();

  return (
    <>
      <Nav />

      <PageTransition>
        <main className="container-site pt-16 md:pt-24">
          <PageIntro eyebrow="Topics" title="The threads that run through the work.">
            <p>
              Every project, research piece and essay is tagged by theme. Pick one to see
              everything on it in one place.
            </p>
          </PageIntro>

          {topics.length === 0 ? (
            <div className="rounded-panel border-border border border-dashed p-12 text-center">
              <p className="text-text-muted font-serif text-lg">
                Topics appear here once published work is tagged.
              </p>
            </div>
          ) : (
            <ul className="border-border grid border-t md:grid-cols-2 md:gap-x-12">
              {topics.map((topic) => (
                <li key={topic.slug} className="reveal border-border border-b">
                  <Link
                    href={topicHref(topic) ?? "/topics"}
                    className="group flex items-baseline justify-between gap-6 py-6"
                  >
                    <span className="min-w-0">
                      <span className="text-text group-hover:text-accent block font-sans text-xl font-semibold tracking-tight transition-colors md:text-2xl">
                        <span className="text-text-muted font-normal">#</span>
                        {topic.name}
                      </span>
                      <span className="text-text-muted mt-1 block font-serif text-base">
                        {describeCounts(topic.counts)}
                      </span>
                    </span>
                    <span className="text-text-muted group-hover:text-accent flex shrink-0 items-baseline gap-3 font-mono text-xs transition-colors">
                      {String(topic.count).padStart(2, "0")}
                      <span
                        aria-hidden="true"
                        className="text-base transition-transform group-hover:translate-x-1"
                      >
                        →
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </main>
      </PageTransition>

      <Footer />
    </>
  );
}
