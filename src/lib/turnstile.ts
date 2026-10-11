/** Cloudflare Turnstile ("are you human" check) shared constants. */
export const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";
export const TURNSTILE_SCRIPT_URL = `${TURNSTILE_ORIGIN}/turnstile/v0/api.js?render=explicit`;
export const TURNSTILE_FIELD = "cf-turnstile-response";
export const TURNSTILE_ACTION = "contact";

/** Public site key; Turnstile is enabled only when it (and the secret) is set. */
export function turnstileSiteKey(): string | null {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null;
}
