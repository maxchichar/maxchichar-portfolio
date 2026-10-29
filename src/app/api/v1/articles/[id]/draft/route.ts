import { apiError, updateDraftRequestSchema } from "@/lib/content-api";
import { authenticate } from "@/server/services/api-keys";
import * as contentApi from "@/server/services/content-api";

import { handleError, isUuid, noStore, readJson } from "../../../_shared";

export const dynamic = "force-dynamic";

/**
 * Edits the article's draft (starting one from the live version if needed).
 * Only the fields sent change. The live page stays as it is until a person
 * publishes the draft in the admin.
 */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/v1/articles/[id]/draft">,
) {
  const auth = await authenticate(request, "content:draft");
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;
  if (!isUuid(id)) return apiError(404, "not_found", "No article with that id.");
  const body = await readJson(request, updateDraftRequestSchema);
  if ("response" in body) return body.response;
  try {
    const data = await contentApi.updateDraft(id, body.data, auth.caller);
    return Response.json({ data }, { headers: noStore });
  } catch (error) {
    return handleError(error);
  }
}
