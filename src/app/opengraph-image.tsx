import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "Chibueze Maxwell — Super Intelligence Engineer & Entrepreneur. Work, research and writing.";

// Build once: social crawlers never wait on database, font or image services.
export const dynamic = "force-static";

export default async function Image() {
  const image = await readFile(join(process.cwd(), "public/og-default.png"));
  return new Response(image, { headers: { "Content-Type": contentType } });
}
