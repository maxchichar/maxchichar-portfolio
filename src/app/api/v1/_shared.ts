import "server-only";

import type { z } from "zod";

import { apiError, firstIssue } from "@/lib/content-api";
import { ContentApiError } from "@/server/services/content-api";

const MAX_BODY_BYTES = 512 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const noStore = { "Cache-Control": "no-store" };

export function isUuid(id: string) {
  return UUID.test(id);
}

/** Reads and validates a JSON body, or returns the 4xx response to send. */
export async function readJson<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<{ data: z.infer<T> } | { response: Response }> {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return {
      response: apiError(
        415,
        "unsupported_media_type",
        "Send JSON (Content-Type: application/json).",
      ),
    };
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return { response: apiError(413, "too_large", "The request body is too large.") };
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return {
      response: apiError(400, "invalid_json", "The request body isn't valid JSON."),
    };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return { response: apiError(422, "invalid_request", firstIssue(parsed.error)) };
  }
  return { data: parsed.data };
}

/** Turns a ContentApiError into its response; anything else is rethrown. */
export function handleError(error: unknown): Response {
  if (error instanceof ContentApiError) {
    return apiError(error.status, error.code, error.message);
  }
  throw error;
}
