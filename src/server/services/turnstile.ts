import "server-only";

import { TURNSTILE_ACTION, TURNSTILE_ORIGIN, turnstileSiteKey } from "@/lib/turnstile";

const SITEVERIFY_URL = `${TURNSTILE_ORIGIN}/turnstile/v0/siteverify`;

/** Both keys are needed: a secret without a widget would reject every message. */
export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim() && turnstileSiteKey());
}

export type TurnstileResult = "pass" | "missing" | "fail";

/**
 * Verifies a Turnstile token with Cloudflare (tokens are single-use, valid
 * for 5 minutes). Passes when Turnstile isn't configured. If Cloudflare itself
 * can't be reached it also passes (logged): the honeypot and rate limit still
 * apply, and an outage shouldn't cost real messages.
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp?: string,
): Promise<TurnstileResult> {
  if (!isTurnstileEnabled()) return "pass";
  if (!token || token.length > 2048) return "missing";

  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY!.trim(),
    response: token,
  });
  if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);

  let outcome: { success?: boolean; action?: string; "error-codes"?: string[] };
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new Error(`siteverify responded ${res.status}`);
    outcome = await res.json();
  } catch (err: unknown) {
    console.error("verifyTurnstile: could not reach Cloudflare, allowing:", err);
    return "pass";
  }

  if (!outcome.success) {
    console.warn("verifyTurnstile: rejected", outcome["error-codes"]);
    return "fail";
  }
  // A token minted for another widget/action on the same key isn't valid here.
  if (outcome.action && outcome.action !== TURNSTILE_ACTION) return "fail";
  return "pass";
}
