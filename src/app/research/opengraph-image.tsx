import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og/card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Research preview card";
// Reads published content and settings from the database.
export const dynamic = "force-dynamic";

export default function Image() {
  return renderOgCard({
    eyebrow: "Research",
    title: "Research",
    description:
      "Investigations, technical notes, and experiments, documented with verifiable evidence.",
  });
}
