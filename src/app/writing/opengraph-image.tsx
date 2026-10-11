import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og/card";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Writing preview card";
// Reads published content and settings from the database.
export const dynamic = "force-dynamic";

export default function Image() {
  return renderOgCard({
    eyebrow: "Writing",
    title: "Writing",
    description: "Essays and notes on building intelligent systems.",
  });
}
