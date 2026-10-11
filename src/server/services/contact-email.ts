import "server-only";

import { getSiteUrl } from "@/lib/metadata";

import { configuredSender, escapeHtml, sendEmail, singleLine } from "./email";
import { getPublicSiteSettings } from "./settings";

export interface NewSubmission {
  id: string;
  name: string;
  email: string;
  organization: string | null;
  reason: string | null;
  message: string;
}

const VIOLET = "#652bfc";

function layout(inner: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f5f4f0;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#141416;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4e2dc;border-radius:12px;">
<tr><td style="padding:28px 28px 8px;"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${VIOLET};"></span></td></tr>
<tr><td style="padding:0 28px 28px;">${inner}</td></tr>
</table></body></html>`;
}

/** Email to the site owner: everything needed to triage and reply. */
function ownerEmail(s: NewSubmission, siteName: string) {
  const inboxUrl = `${getSiteUrl()}/admin/inbox?id=${encodeURIComponent(s.id)}`;
  const rows: [string, string][] = [
    ["From", `${s.name} <${s.email}>`],
    ...(s.organization ? [["Organization", s.organization] as [string, string]] : []),
    ...(s.reason ? [["Reason", s.reason] as [string, string]] : []),
  ];

  const text = [
    `New message from your ${siteName} contact form.`,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    s.message,
    "",
    `Reply to this email to answer ${s.name} directly.`,
    `Open in your inbox: ${inboxUrl}`,
  ].join("\n");

  const html = layout(`
<p style="margin:16px 0 4px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#6b6a66;">New message</p>
<h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;">${escapeHtml(s.name)}${s.reason ? ` <span style="color:#6b6a66;font-weight:400;">· ${escapeHtml(s.reason)}</span>` : ""}</h1>
<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;margin-bottom:20px;">
${rows
  .map(
    ([k, v]) =>
      `<tr><td style="padding:3px 16px 3px 0;color:#6b6a66;vertical-align:top;">${k}</td><td style="padding:3px 0;">${escapeHtml(v)}</td></tr>`,
  )
  .join("")}
</table>
<div style="white-space:pre-wrap;font-size:15px;line-height:1.6;border-left:3px solid ${VIOLET};padding:4px 0 4px 16px;">${escapeHtml(s.message)}</div>
<p style="margin:28px 0 0;font-size:14px;">
<a href="mailto:${escapeHtml(s.email)}" style="display:inline-block;background:#141416;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:999px;margin:0 8px 8px 0;">Reply to ${escapeHtml(s.name.split(/\s+/)[0] ?? s.name)}</a>
<a href="${escapeHtml(inboxUrl)}" style="display:inline-block;color:#141416;padding:10px 4px;">Open in inbox →</a>
</p>`);

  return {
    subject: `New message from ${s.name}${s.reason ? ` · ${s.reason}` : ""}`,
    text,
    html,
  };
}

/**
 * Receipt to the visitor. Deliberately does not echo their message: an
 * auto-reply that repeats input could be abused to relay spam through the form.
 */
function visitorEmail(s: NewSubmission, siteName: string) {
  const first = singleLine(s.name).split(/\s+/)[0] || "there";
  const text = [
    `Hi ${first},`,
    "",
    "Thanks for reaching out. Your message came through and I read every one personally.",
    "I usually reply within two working days.",
    "",
    siteName,
    getSiteUrl(),
  ].join("\n");
  const html = layout(`
<h1 style="margin:16px 0 16px;font-size:22px;line-height:1.3;">Thanks, ${escapeHtml(first)}.</h1>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Your message came through and I read every one personally. I usually reply within two working days.</p>
<p style="margin:24px 0 0;font-size:14px;color:#6b6a66;">${escapeHtml(siteName)}<br><a href="${escapeHtml(getSiteUrl())}" style="color:${VIOLET};">${escapeHtml(getSiteUrl().replace(/^https?:\/\//, ""))}</a></p>`);
  return { subject: `Thanks for your message, ${first}`, text, html };
}

/**
 * Sends the new-message alert to the owner and, when a verified sender is
 * configured, a receipt to the visitor. Never throws.
 */
export async function sendContactEmails(s: NewSubmission): Promise<void> {
  try {
    const settings = await getPublicSiteSettings();
    const ownerAddress =
      process.env.CONTACT_NOTIFY_EMAIL?.trim() || settings.primaryEmail || null;
    const jobs: Promise<boolean>[] = [];

    if (ownerAddress) {
      jobs.push(
        sendEmail({
          to: ownerAddress,
          // Hitting Reply in the mail client answers the visitor.
          replyTo: s.email,
          ...ownerEmail(s, settings.siteName),
        }),
      );
    } else {
      console.warn(
        "sendContactEmails: no CONTACT_NOTIFY_EMAIL or primary email set; skipping alert.",
      );
    }

    // The visitor receipt needs a sender on a domain verified in Resend; the
    // shared test sender can only deliver to the account owner.
    if (configuredSender() && process.env.CONTACT_AUTO_REPLY !== "false") {
      jobs.push(
        sendEmail({
          to: s.email,
          ...(ownerAddress ? { replyTo: ownerAddress } : {}),
          ...visitorEmail(s, settings.siteName),
        }),
      );
    }

    await Promise.all(jobs);
  } catch (err: unknown) {
    console.error("sendContactEmails failed:", err);
  }
}
