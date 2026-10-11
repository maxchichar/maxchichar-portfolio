import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og/card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Contact preview card";
// Reads published content and settings from the database.
export const dynamic = "force-dynamic";

export default function Image() {
  return renderOgCard({
    eyebrow: "Contact",
    title: "Let's build something that matters.",
    description:
      "Get in touch regarding AI systems engineering, technical research, advisory, or collaboration.",
  });
}
