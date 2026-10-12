import { buildLlmsTxt } from "@/server/services/llms";

export const dynamic = "force-dynamic";

/** llmstxt.org summary for AI assistants. */
export async function GET() {
  const body = await buildLlmsTxt({ full: false });
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
