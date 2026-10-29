import { createArticleRequestSchema } from "@/lib/content-api";
import { authenticate } from "@/server/services/api-keys";
import * as contentApi from "@/server/services/content-api";

import { handleError, noStore, readJson } from "../_shared";

export const dynamic = "force-dynamic";

/** Every article, with whether it has a draft and whether it's live. */
export async function GET(request: Request) {
  const auth = await authenticate(request, "content:read");
  if ("response" in auth) return auth.response;
  return Response.json({ data: await contentApi.listArticles() }, { headers: noStore });
}

/** Creates an article as a draft. It goes live only when a person publishes it. */
export async function POST(request: Request) {
  const auth = await authenticate(request, "content:draft");
  if ("response" in auth) return auth.response;
  const body = await readJson(request, createArticleRequestSchema);
  if ("response" in body) return body.response;
  try {
    const data = await contentApi.createArticle(body.data, auth.caller);
    return Response.json({ data }, { status: 201, headers: noStore });
  } catch (error) {
    return handleError(error);
  }
}
