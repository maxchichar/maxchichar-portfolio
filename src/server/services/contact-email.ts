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
const INK = "#0c0c0f";
const PAPER = "#f2f1ed";
const MUTED = "#6b6a66";
const RULE = "#e7e5df";
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";

interface LayoutOptions {
  /** Inbox preview line shown next to the subject; never visible in the body. */
  preheader?: string;
  /** Small print under the card, e.g. why the recipient got this. */
  footnote?: string;
}

/**
 * The shared frame for every email: a dark header band with the logo and
 * name, a white card for the content and a quiet footer. Table layout and
 * inline styles because that is what mail clients reliably render; the logo
 * is a PNG (public/email-logo.png) since most clients drop SVG.
 */
function layout(inner: string, options: LayoutOptions = {}): string {
  const site = getSiteUrl();
  const siteLabel = site.replace(/^https?:\/\//, "");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:0;background:#f4f3ef;-webkit-font-smoothing:antialiased;">
${options.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(options.preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3ef;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
<tr><td style="background:${INK};border-radius:16px 16px 0 0;padding:26px 36px;">
<a href="${escapeHtml(site)}" style="text-decoration:none;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle;padding-right:14px;"><img src="${escapeHtml(site)}/email-logo.png" width="35" height="28" alt="" style="display:block;border:0;width:35px;height:28px;"></td>
<td style="vertical-align:middle;font-family:${SERIF};font-size:19px;letter-spacing:.01em;color:${PAPER};">Chibueze Maxwell</td>
</tr></table></a>
</td></tr>
<tr><td style="height:3px;line-height:3px;font-size:0;background:${VIOLET};">&nbsp;</td></tr>
<tr><td style="background:#ffffff;border:1px solid ${RULE};border-top:0;border-radius:0 0 16px 16px;padding:40px 36px 36px;font-family:${SANS};color:#141416;">
${inner}
</td></tr>
<tr><td align="center" style="padding:28px 24px 0;font-family:${SANS};font-size:12px;line-height:1.7;color:${MUTED};">
<a href="${escapeHtml(site)}" style="color:${MUTED};text-decoration:none;letter-spacing:.08em;text-transform:uppercase;">${escapeHtml(siteLabel)}</a>
${options.footnote ? `<br>${escapeHtml(options.footnote)}` : ""}
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/** Name and site link closing a personal email. */
function signature(name: string | null): string {
  const site = getSiteUrl();
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:32px;border-top:1px solid ${RULE};padding-top:20px;width:100%;"><tr><td style="padding-top:20px;">
${name ? `<p style="margin:0;font-family:${SERIF};font-size:17px;color:#141416;">${escapeHtml(name)}</p>` : ""}
<p style="margin:4px 0 0;font-size:13px;"><a href="${escapeHtml(site)}" style="color:${VIOLET};text-decoration:none;">${escapeHtml(site.replace(/^https?:\/\//, ""))}</a></p>
</td></tr></table>`;
}

/** Display name from a sender like "Chibueze Maxwell <hello@…>", if it has one. */
export function senderName(from: string): string | null {
  const match = /^\s*"?([^"<]+?)"?\s*</.exec(from);
  return match?.[1]?.trim() || null;
}

const eyebrow = (label: string) =>
  `<p style="margin:0 0 10px;font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:${VIOLET};">${escapeHtml(label)}</p>`;

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

  const html = layout(
    `${eyebrow("New message")}
<h1 style="margin:0 0 24px;font-family:${SERIF};font-size:28px;font-weight:400;line-height:1.25;color:#141416;">${escapeHtml(s.name)}${s.reason ? ` <span style="color:${MUTED};">· ${escapeHtml(s.reason)}</span>` : ""}</h1>
<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;margin-bottom:24px;">
${rows
  .map(
    ([k, v]) =>
      `<tr><td style="padding:4px 20px 4px 0;color:${MUTED};vertical-align:top;white-space:nowrap;">${k}</td><td style="padding:4px 0;color:#141416;">${escapeHtml(v)}</td></tr>`,
  )
  .join("")}
</table>
<div style="white-space:pre-wrap;font-family:${SERIF};font-size:17px;line-height:1.7;color:#141416;background:#faf9f6;border-left:3px solid ${VIOLET};border-radius:0 10px 10px 0;padding:18px 22px;">${escapeHtml(s.message)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:32px;"><tr>
<td style="background:${VIOLET};border-radius:999px;"><a href="${escapeHtml(inboxUrl)}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">Reply from your inbox</a></td>
<td style="padding-left:18px;"><a href="mailto:${escapeHtml(s.email)}" style="font-size:14px;color:#141416;text-decoration:none;">or email ${escapeHtml(s.name.split(/\s+/)[0] ?? s.name)} &rarr;</a></td>
</tr></table>`,
    { preheader: s.message.slice(0, 140) },
  );

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
  const html = layout(
    `${eyebrow("Message received")}
<h1 style="margin:0 0 20px;font-family:${SERIF};font-size:30px;font-weight:400;line-height:1.25;color:#141416;">Thanks, ${escapeHtml(first)}.</h1>
<p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#2a2a2e;">Your message came through, and I read every one personally.</p>
<p style="margin:0;font-size:16px;line-height:1.7;color:#2a2a2e;">I usually reply within two working days.</p>
${signature(siteName)}`,
    {
      preheader: "Your message came through. I usually reply within two working days.",
      footnote: `You're receiving this because you wrote to me through ${getSiteUrl().replace(/^https?:\/\//, "")}.`,
    },
  );
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

/**
 * A reply written in the admin inbox, with the visitor's original message
 * quoted underneath so they have the context.
 */
export function replyEmail(
  original: { name: string; message: string; createdAt: Date },
  body: string,
  signedBy: string | null = null,
) {
  const sentOn = new Date(original.createdAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
  const attribution = `On ${sentOn} UTC, ${singleLine(original.name)} wrote:`;
  const text = [
    body,
    "",
    attribution,
    ...original.message.split(/\r?\n/).map((line) => `> ${line}`),
  ].join("\n");
  const html = layout(
    `<div style="white-space:pre-wrap;font-size:16px;line-height:1.75;color:#141416;">${escapeHtml(body)}</div>
${signature(signedBy)}
<p style="margin:36px 0 10px;font-size:12px;color:${MUTED};">${escapeHtml(attribution)}</p>
<div style="white-space:pre-wrap;font-size:14px;line-height:1.65;color:${MUTED};background:#faf9f6;border-left:3px solid ${RULE};border-radius:0 10px 10px 0;padding:14px 18px;">${escapeHtml(original.message)}</div>`,
    { preheader: body.slice(0, 140) },
  );
  return { text, html };
}
