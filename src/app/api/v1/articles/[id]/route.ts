import { apiError } from "@/lib/content-api";
import { authenticate } from "@/server/services/api-keys";
import * as contentApi from "@/server/services/content-api";

import { handleError, isUuid, noStore } from "../../_shared";

export const dynamic = "force-dynamic";

/** One article: its draft and live versions, as Markdown and Tiptap JSON. */
export async function GET(request: Request, ctx: RouteContext<"/api/v1/articles/[id]">) {
  const auth = await authenticate(request, "content:read");
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;
  if (!isUuid(id)) return apiError(404, "not_found", "No article with that id.");
  try {
    return Response.json({ data: await contentApi.getArticle(id) }, { headers: noStore });
  } catch (error) {
    return handleError(error);
  }
}
