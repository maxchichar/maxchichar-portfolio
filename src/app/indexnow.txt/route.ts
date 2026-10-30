import { getIndexNowKey } from "@/lib/indexnow";

export const dynamic = "force-dynamic";

/** IndexNow ownership file: the key, as plain text, at the site root. */
export function GET() {
  const key = getIndexNowKey();
  if (!key) return new Response("Not found", { status: 404 });
  return new Response(key, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
