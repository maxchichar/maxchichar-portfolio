import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og/card";
import { getPublicArticleDetail } from "@/server/services/articles";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Writing preview card";
// Reads published content and settings from the database.
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getPublicArticleDetail(slug).catch(() => null);
  if (!item) return renderOgCard({ eyebrow: "Writing", title: "Writing" });
  return renderOgCard({
    eyebrow: "Writing",
    title: item.published.title,
    description: item.published.excerpt,
    coverUrl: item.coverUrl,
  });
}
