import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og/card";
import { getPublicResearchDetail } from "@/server/services/research";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Research preview card";
// Reads published content and settings from the database.
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getPublicResearchDetail(slug).catch(() => null);
  if (!item) return renderOgCard({ eyebrow: "Research", title: "Research" });
  return renderOgCard({
    eyebrow: "Research",
    title: item.published.title,
    description: item.published.abstract,
    coverUrl: item.coverUrl,
  });
}
