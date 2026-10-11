import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og/card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Now preview card";
// Reads published content and settings from the database.
export const dynamic = "force-dynamic";

export default function Image() {
  return renderOgCard({
    eyebrow: "Now",
    title: "What I'm doing now",
    description: "What I'm currently building, researching, and learning.",
  });
}
