import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";

import {
  ASSIST_SYSTEM_PROMPT,
  assistOutputSchemas,
  buildAssistPrompt,
  finaliseAssistResult,
  type AssistKind,
  type AssistResult,
} from "@/lib/ai/article-assist";

// Phase 11: the Claude API behind the admin writing assistant. Optional:
// without ANTHROPIC_API_KEY the assistant is hidden and nothing else changes.
// This service only returns suggestions. It never writes content, and
// publishing stays a human action (see docs/SPECIFICATION.md).

export const AI_MODEL = "claude-opus-5-5";

export class AiServiceError extends Error {}

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  client ??= new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: 90_000,
    maxRetries: 1,
  });
  return client;
}

// Short answers need little thought; the review is the one that benefits.
const EFFORT: Record<AssistKind, "low" | "medium"> = {
  excerpt: "low",
  titles: "low",
  tags: "low",
  review: "medium",
};

export async function assistArticle(input: {
  kind: AssistKind;
  title: string;
  excerpt: string;
  body: string;
}): Promise<{ generationId: string; result: AssistResult }> {
  if (!isAiConfigured()) {
    throw new AiServiceError("The writing assistant isn't set up on this site.");
  }
  if (!input.body.trim() && !input.title.trim()) {
    throw new AiServiceError("Write a title or some of the body first.");
  }

  let response;
  try {
    response = await getClient().beta.messages.parse({
      model: AI_MODEL,
      max_tokens: 16000,
      // If a safety classifier declines, the API retries on a fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: ASSIST_SYSTEM_PROMPT,
      output_config: {
        effort: EFFORT[input.kind],
        format: betaZodOutputFormat(assistOutputSchemas[input.kind]),
      },
      messages: [{ role: "user", content: buildAssistPrompt(input) }],
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      throw new AiServiceError("The assistant is busy. Try again in a minute.");
    }
    if (error instanceof Anthropic.AuthenticationError) {
      throw new AiServiceError(
        "The assistant's API key was rejected. Check ANTHROPIC_API_KEY.",
      );
    }
    if (error instanceof Anthropic.APIError) {
      throw new AiServiceError(
        `The assistant couldn't answer (error ${error.status ?? "unknown"}). Try again.`,
      );
    }
    throw error;
  }

  if (response.stop_reason === "refusal") {
    throw new AiServiceError("The assistant declined this request.");
  }
  if (response.stop_reason === "max_tokens" || response.parsed_output == null) {
    throw new AiServiceError("The assistant's answer was incomplete. Try again.");
  }

  return {
    generationId: response.id,
    result: finaliseAssistResult(input.kind, response.parsed_output, input),
  };
}
