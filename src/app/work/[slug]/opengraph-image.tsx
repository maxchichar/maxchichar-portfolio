import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og/card";
import { getPublicWorkCaseStudy } from "@/server/services/projects";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Case study preview card";
// Reads published content and settings from the database.
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getPublicWorkCaseStudy(slug).catch(() => null);
  if (!item) return renderOgCard({ eyebrow: "Case study", title: "Selected work" });
  return renderOgCard({
    eyebrow: "Case study",
    title: item.published.title,
    description: item.published.shortDescription,
    coverUrl: item.coverUrl,
  });
}
