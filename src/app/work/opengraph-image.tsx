import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og/card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Selected work preview card";
// Reads published content and settings from the database.
export const dynamic = "force-dynamic";

export default function Image() {
  return renderOgCard({
    eyebrow: "Selected work",
    title: "Selected work",
    description: "Selected projects, intelligent systems, and engineering case studies.",
  });
}
