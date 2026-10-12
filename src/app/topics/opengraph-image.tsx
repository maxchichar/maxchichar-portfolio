import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og/card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Topics preview card";
// Reads settings from the database.
export const dynamic = "force-dynamic";

export default function Image() {
  return renderOgCard({
    eyebrow: "Topics",
    title: "The threads that run through the work",
    description: "Every theme across the work, research and writing.",
  });
}
