import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og/card";
import { describeCounts } from "@/lib/topics";
import { getTopic } from "@/server/services/topics";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Topic preview card";
// Reads published content and settings from the database.
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await getTopic(slug).catch(() => null);
  if (!found) return renderOgCard({ eyebrow: "Topic", title: "Topics" });
  const { topic } = found;
  return renderOgCard({
    eyebrow: "Topic",
    title: `#${topic.name}`,
    description: `${describeCounts(topic.counts)} on ${topic.name}.`,
    coverUrl: topic.items.find((i) => i.coverUrl)?.coverUrl,
  });
}
