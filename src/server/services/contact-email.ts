import "server-only";

import { getSiteUrl } from "@/lib/metadata";

import { isOptimizableImage } from "@/lib/storage/image";
import type { PublicSiteSettings } from "@/lib/validation/settings";

import { getSiteDocument } from "./documents";
import {
  configuredSender,
  escapeHtml,
  replySender,
  replyToAddress,
  sendEmail,
  singleLine,
} from "./email";
import {
  button,
  cardEmail,
  details,
  eyebrow,
  heading,
  letterEmail,
  link,
  paragraph,
  prose,
  quote,
  signature,
  small,
  type EmailProfile,
} from "./email-design";
import { getPublicSiteSettings } from "./settings";

export interface NewSubmission {
  id: string;
  name: string;
  email: string;
  organization: string | null;
  reason: string | null;
  message: string;
}

/** Display name from a sender like "Chibueze Maxwell <hello@…>", if it has one. */
export function senderName(from: string): string | null {
  const match = /^\s*"?([^"<]+?)"?\s*</.exec(from);
  return match?.[1]?.trim() || null;
}

/** "CHIBUEZE MAXWELL" -> "Chibueze Maxwell": the site name is styled in caps. */
function titleCase(value: string) {
  return value.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase());
}

type ProfileSettings = Pick<
  PublicSiteSettings,
  "siteName" | "siteDescription" | "socialLinkedin" | "socialGithub" | "socialX"
>;

export interface ProfilePhoto {
  url: string;
  width: number | null;
  height: number | null;
}

/**
 * The Settings profile photo as a small email image, or null. Mail clients
 * can't crop, so only a roughly square photo is used (anything else would be
 * squashed in the circle), and it goes through the site's image resizer: the
 * originals are camera-sized (megabytes) and the resizer serves ~10 KB.
 */
export function emailPhotoUrl(
  siteUrl: string,
  photo: ProfilePhoto | null,
): string | null {
  if (!photo?.width || !photo.height || !isOptimizableImage(photo.url)) return null;
  const ratio = photo.width / photo.height;
  if (ratio < 0.9 || ratio > 1.1) return null;
  // 256 is the smallest width next.config.ts allows; shown at 36-52px (retina-safe).
  return `${siteUrl}/_next/image?url=${encodeURIComponent(photo.url)}&w=256&q=75`;
}

/** Who the emails are from, built from Settings and the configured sender. */
export function profileFrom(
  settings: ProfileSettings,
  sender: string | null,
  photo: ProfilePhoto | null = null,
): EmailProfile {
  const links = (
    [
      ["LinkedIn", settings.socialLinkedin],
      ["GitHub", settings.socialGithub],
      ["X", settings.socialX],
    ] as const
  )
    .filter(([, url]) => Boolean(url))
    .map(([label, url]) => ({ label, url: url as string }));
  const siteUrl = getSiteUrl().replace(/\/$/, "");
  return {
    name: (sender && senderName(sender)) || titleCase(settings.siteName),
    role: settings.siteDescription || null,
    siteUrl,
    links,
    photoUrl: emailPhotoUrl(siteUrl, photo),
  };
}

/** The profile for emails people read: Settings, sender name and profile photo. */
export async function emailProfile(sender = replySender()): Promise<EmailProfile> {
  const [settings, photo] = await Promise.all([
    getPublicSiteSettings(),
    getSiteDocument("avatar"),
  ]);
  return profileFrom(settings, sender, photo);
}

const firstName = (name: string) => singleLine(name).split(/\s+/)[0] || "there";

/** Email to the site owner: everything needed to triage and reply. */
export function ownerEmail(s: NewSubmission, profile: EmailProfile) {
  const inboxUrl = `${profile.siteUrl}/admin/inbox?id=${encodeURIComponent(s.id)}`;
  const rows: [string, string][] = [
    ["From", `${s.name} <${s.email}>`],
    ...(s.organization ? [["Organization", s.organization] as [string, string]] : []),
    ...(s.reason ? [["Reason", s.reason] as [string, string]] : []),
  ];

  const text = [
    `New message from your contact form.`,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    s.message,
    "",
    `Reply from your inbox: ${inboxUrl}`,
    `Or reply to this email to answer ${s.name} directly.`,
  ].join("\n");

  const html = cardEmail(
    profile,
    `${eyebrow(s.reason ? `New message · ${s.reason}` : "New message")}
${heading(escapeHtml(s.name))}
${details(rows)}
${quote(s.message)}
${button("Reply from your inbox", inboxUrl, { label: `Email ${firstName(s.name)}`, href: `mailto:${s.email}` })}`,
    {
      title: `New message from ${s.name}`,
      preheader: s.message,
      label: "Contact form",
      footnote: "Sent to you because someone used the contact form on your site.",
    },
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
export function visitorEmail(s: NewSubmission, profile: EmailProfile) {
  const first = firstName(s.name);
  const site = profile.siteUrl;
  const work = { label: "Work", url: `${site}/work` };
  const research = { label: "Research", url: `${site}/research` };
  const writing = { label: "Writing", url: `${site}/writing` };
  const sections = [work, research, writing];
  const to = (l: { label: string; url: string }) => link(l.label.toLowerCase(), l.url);
  const text = [
    `Hi ${first},`,
    "",
    "Thank you for reaching out. Your message has arrived, and I read every one personally.",
    "I usually reply within two working days.",
    "",
    "In the meantime:",
    ...sections.map((l) => `${l.label}: ${l.url}`),
    "",
    profile.name,
    ...(profile.role ? [profile.role] : []),
    site,
  ].join("\n");
  const html = cardEmail(
    profile,
    `${eyebrow("Message received")}
${heading(`Thank you, ${escapeHtml(first)}.`)}
${paragraph("Your message has arrived, and I read every one personally. I usually reply within two working days.")}
${paragraph(`In the meantime, you're welcome to look through my ${to(work)}, ${to(research)} and ${to(writing)}.`, { last: true })}
${signature(profile)}`,
    {
      title: "Message received",
      preheader: "Your message has arrived. I usually reply within two working days.",
      footnote: `You're receiving this because you wrote to me through ${site.replace(/^https?:\/\//, "")}.`,
      footerLinks: sections,
      header: "photo",
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
    const [settings, profile] = await Promise.all([
      getPublicSiteSettings(),
      emailProfile(),
    ]);
    const ownerAddress =
      process.env.CONTACT_NOTIFY_EMAIL?.trim() || settings.primaryEmail || null;
    const jobs: Promise<boolean>[] = [];

    if (ownerAddress) {
      jobs.push(
        sendEmail({
          to: ownerAddress,
          // Hitting Reply in the mail client answers the visitor.
          replyTo: s.email,
          ...ownerEmail(s, profile),
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
      const replyTo = replyToAddress();
      jobs.push(
        sendEmail({
          to: s.email,
          // Replies go to the sender address (hello@, which reaches the
          // inbox) or REPLY_TO_EMAIL; never the private notify address,
          // which the visitor would see.
          ...(replyTo ? { replyTo } : {}),
          ...visitorEmail(s, profile),
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
  profile: EmailProfile,
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
    "--",
    profile.name,
    ...(profile.role ? [profile.role] : []),
    profile.siteUrl,
    "",
    attribution,
    ...original.message.split(/\r?\n/).map((line) => `> ${line}`),
  ].join("\n");
  const html = letterEmail(
    profile,
    `${prose(body)}
${signature(profile)}
${small(escapeHtml(attribution))}
<div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
${quote(original.message, { muted: true })}`,
    { title: `Reply from ${profile.name}`, preheader: body },
  );
  return { text, html };
}
