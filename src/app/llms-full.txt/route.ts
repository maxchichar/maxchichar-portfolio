import { buildLlmsTxt } from "@/server/services/llms";

export const dynamic = "force-dynamic";

/** The full-text companion to /llms.txt. */
export async function GET() {
  const body = await buildLlmsTxt({ full: true });
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
