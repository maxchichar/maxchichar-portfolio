import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Footer } from "@/components/layout/footer";
import { Nav } from "@/components/layout/nav";
import { PageIntro } from "@/components/layout/page-intro";
import { PageTransition } from "@/components/motion/page-transition";
import { TopicChips, TopicSections } from "@/components/topics/topic-sections";
import { constructPageMetadata } from "@/lib/metadata";
import {
  buildBreadcrumbJsonLd,
  buildJsonLdGraph,
  JsonLdScript,
} from "@/lib/structured-data";
import { describeCounts } from "@/lib/topics";
import { getTopic } from "@/server/services/topics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: PageProps<"/topics/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const found = await getTopic(slug);
  if (!found) return { title: "Topic Not Found" };
  const { topic } = found;
  return constructPageMetadata({
    title: `Topic: ${topic.name}`,
    description: `${describeCounts(topic.counts)} on ${topic.name}.`,
    path: `/topics/${topic.slug}`,
  });
}

export default async function TopicPage({ params }: PageProps<"/topics/[slug]">) {
  const { slug } = await params;
  const found = await getTopic(slug);
  if (!found) notFound();
  const { topic, related } = found;

  const jsonLd = buildJsonLdGraph([
    buildBreadcrumbJsonLd([
      { name: "Home", url: "/" },
      { name: "Topics", url: "/topics" },
      { name: topic.name, url: `/topics/${topic.slug}` },
    ]),
  ]);

  return (
    <>
      <JsonLdScript data={jsonLd} />
      <Nav />

      <PageTransition>
        <main className="container-site pt-16 md:pt-24">
          <PageIntro eyebrow="Topic" title={`#${topic.name}`}>
            <p>{describeCounts(topic.counts)} on this topic, newest first.</p>
          </PageIntro>

          <TopicSections topic={topic} />

          <section
            aria-labelledby="related-topics"
            className="border-border mt-24 grid gap-8 border-t pt-12 md:mt-32 md:grid-cols-12"
          >
            <h2
              id="related-topics"
              className="index-label md:col-span-3 md:self-start md:pt-2"
            >
              <span aria-hidden="true" className="h-px w-6 bg-current" />
              <span>{related.length > 0 ? "Related topics" : "More topics"}</span>
            </h2>
            <div className="md:col-span-9">
              {related.length > 0 ? <TopicChips topics={related} /> : null}
              <Link
                href="/topics"
                className="group text-text hover:text-accent mt-8 inline-flex items-center gap-2 font-sans text-sm transition-colors first:mt-0"
              >
                All topics
                <span
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-0.5"
                >
                  →
                </span>
              </Link>
            </div>
          </section>
        </main>
      </PageTransition>

      <Footer />
    </>
  );
}
