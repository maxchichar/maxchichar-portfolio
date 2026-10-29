import "server-only";

/**
 * Transactional email through Resend's HTTP API (https://resend.com/docs/api-reference/emails/send-email).
 * Plain fetch, no SDK. Email is best-effort everywhere it is used: when
 * RESEND_API_KEY is unset this is a no-op, and failures are logged, never
 * thrown, so a mail outage can't break the action that triggered it.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
// Resend's shared test sender: works without a domain, but can only deliver
// to the address that owns the Resend account.
const FALLBACK_FROM = "Portfolio <onboarding@resend.dev>";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  from?: string;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/** The configured sender (CONTACT_FROM_EMAIL), or null when only the test sender is available. */
export function configuredSender(): string | null {
  return process.env.CONTACT_FROM_EMAIL?.trim() || null;
}

/**
 * The address replies from the admin inbox are sent as, e.g.
 * "Chibueze Maxwell <hello@chibuezemaxwell.com>". REPLY_FROM_EMAIL wins, then
 * CONTACT_FROM_EMAIL. Null means replying is unavailable: Resend's test sender
 * can't deliver to anyone but the account owner.
 */
export function replySender(): string | null {
  return process.env.REPLY_FROM_EMAIL?.trim() || configuredSender();
}

/** Optional Reply-To for inbox replies (REPLY_TO_EMAIL); unset means replies go to the sender. */
export function replyToAddress(): string | null {
  return process.env.REPLY_TO_EMAIL?.trim() || null;
}

/** Strips line breaks so user input can't reshape a header-like field. */
export function singleLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: message.from ?? configuredSender() ?? FALLBACK_FROM,
        to: [message.to],
        subject: singleLine(message.subject).slice(0, 200),
        text: message.text,
        html: message.html,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(`sendEmail: Resend responded ${res.status}: ${await res.text()}`);
      return false;
    }
    return true;
  } catch (err: unknown) {
    console.error("sendEmail failed:", err);
    return false;
  }
}
