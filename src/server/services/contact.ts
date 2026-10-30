import { hashIp } from "@/lib/contact-ip";
import "server-only";

import { after } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/config";
import { schema } from "@/lib/db";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import { isMissingTableError } from "@/lib/db/errors";
import {
  contactSubmissionSchema,
  RATE_LIMIT_MAX_COUNT,
  INBOUND_MAX_HTML,
  INBOUND_MAX_TEXT,
  inboundEmailSchema,
  RATE_LIMIT_WINDOW_MS,
  type ContactSubmissionInput,
} from "@/lib/validation/contact";

import * as contactRepo from "../repositories/contact";
import {
  isEmailConfigured,
  replySender,
  replyToAddress,
  sendEmail,
  singleLine,
} from "./email";
import { replyEmail, sendContactEmails, senderName } from "./contact-email";
import { verifyTurnstile } from "./turnstile";

export class ContactServiceError extends Error {}
export class ContactRateLimitError extends ContactServiceError {}

export interface ContactSubmissionResult {
  success: boolean;
  error?: string;
}

export async function submitContact(
  rawInput: unknown,
  clientIp: string = "unknown",
  turnstileToken?: string | null,
): Promise<ContactSubmissionResult> {
  const parsed = contactSubmissionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const data: ContactSubmissionInput = parsed.data;
  const ipHash = hashIp(clientIp);

  try {
    // Honeypot check: bots filling the hidden honeypot are flagged as SPAM
    // and given a clean success response so they don't alter tactics.
    if (data.honeypot && data.honeypot.trim().length > 0) {
      await contactRepo.insertContactSubmission(db, {
        name: data.name,
        email: data.email,
        organization: data.organization,
        reason: data.reason,
        message: data.message,
        honeypot: data.honeypot.slice(0, 200),
        ipHash,
        status: "SPAM",
      });
      return { success: true };
    }

    // Human check (Cloudflare Turnstile), when configured.
    const human = await verifyTurnstile(turnstileToken, clientIp);
    if (human === "missing") {
      return {
        success: false,
        error: "Still checking you're human. Please wait a moment and send again.",
      };
    }
    if (human === "fail") {
      return {
        success: false,
        error: "We couldn't verify you're human. Please refresh the page and try again.",
      };
    }

    // Rate limiting check: enforce max submissions per window per hashed IP
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    const recentCount = await contactRepo.countRecentSubmissionsByIpHash(
      db,
      ipHash,
      windowStart,
    );

    if (recentCount >= RATE_LIMIT_MAX_COUNT) {
      return {
        success: false,
        error: "Too many messages sent. Please wait before submitting again.",
      };
    }

    // Persist verified submission
    const row = await contactRepo.insertContactSubmission(db, {
      name: data.name,
      email: data.email,
      organization: data.organization,
      reason: data.reason,
      message: data.message,
      honeypot: null,
      ipHash,
      status: "NEW",
    });

    // Email the owner (and the visitor, if configured) once the response has
    // been sent, so mail latency or an outage never affects the form.
    if (isEmailConfigured()) {
      after(() =>
        sendContactEmails({
          id: row.id,
          name: row.name,
          email: row.email,
          organization: row.organization,
          reason: row.reason,
          message: row.message,
        }),
      );
    }

    return { success: true };
  } catch (err: unknown) {
    console.error("submitContact error:", err);
    return {
      success: false,
      error: "Unable to send your message right now. Please try again later.",
    };
  }
}

// ---------------------------------------------------------------------------
// Admin inbox
// ---------------------------------------------------------------------------

export async function listInbox(status: contactRepo.InboxStatus | null) {
  const [items, counts] = await Promise.all([
    contactRepo.listSubmissions(db, status),
    contactRepo.countSubmissionsByStatus(db),
  ]);
  return { items, counts };
}

export async function getSubmission(id: string) {
  return contactRepo.findSubmissionById(db, id);
}

export async function setSubmissionStatus(
  id: string,
  status: contactRepo.InboxStatus,
  actorId: string,
) {
  await contactRepo.updateSubmissionStatus(db, id, status);
  await logAudit({
    userId: actorId,
    action: "contact.status_updated",
    resourceType: "contact_submission",
    resourceId: id,
    metadata: { status },
  });
}

/** Authenticate here too so callers cannot supply their own actor or role. */
export async function deleteSubmission(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new ContactServiceError("Please sign in again.");
  if (!z.uuid().safeParse(id).success) {
    throw new ContactServiceError("Invalid message.");
  }
  await db.transaction(async (tx) => {
    // Check the current database role, including for sessions issued before a demotion.
    const [actor] = await tx
      .select({ role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.id, session.user.id))
      .limit(1);
    if (actor?.role !== "ADMIN") {
      throw new ContactServiceError("Only admins can delete messages.");
    }
    const deleted = await contactRepo.deleteSubmission(tx, id);
    // A concurrent/repeated deletion is already the desired outcome.
    if (!deleted) return;
    await tx.insert(schema.auditLogs).values({
      userId: session.user.id,
      action: "contact.deleted",
      resourceType: "contact_submission",
      resourceId: deleted.id,
    });
  });
}

// ---------------------------------------------------------------------------
// Replies from the admin inbox
// ---------------------------------------------------------------------------

export const replySchema = z.object({
  id: z.uuid("Invalid message."),
  subject: z
    .string()
    .trim()
    .min(1, "Add a subject.")
    .max(200, "Subject must be 200 characters or fewer."),
  body: z
    .string()
    .trim()
    .min(1, "Write a reply before sending.")
    .max(20_000, "Reply must be 20,000 characters or fewer."),
});

/** Replying needs Resend plus a sender on a verified domain. */
export function canReply(): boolean {
  return isEmailConfigured() && replySender() !== null;
}

export async function listReplies(submissionId: string) {
  return contactRepo.listReplies(db, submissionId);
}

export async function listSent() {
  const [items, total] = await Promise.all([
    contactRepo.listSentReplies(db),
    contactRepo.countReplies(db),
  ]);
  return { items, total };
}

/**
 * Emails a reply to the person who wrote in, from the configured sender, and
 * records it on the message. Throws ContactServiceError with a message fit to
 * show in the composer.
 */
export async function sendReply(input: unknown) {
  const session = await auth();
  if (!session?.user?.id) throw new ContactServiceError("Please sign in again.");

  const parsed = replySchema.safeParse(input);
  if (!parsed.success) {
    throw new ContactServiceError(parsed.error.issues[0]?.message ?? "Invalid reply.");
  }
  const { id, subject, body } = parsed.data;

  const from = replySender();
  if (!isEmailConfigured() || !from) {
    throw new ContactServiceError(
      "Replying needs RESEND_API_KEY and REPLY_FROM_EMAIL set on the server.",
    );
  }

  const submission = await contactRepo.findSubmissionById(db, id);
  if (!submission) throw new ContactServiceError("This message no longer exists.");

  const replyTo = replyToAddress();
  const sent = await sendEmail({
    to: submission.email,
    from,
    subject,
    ...(replyTo ? { replyTo } : {}),
    // Threads the reply under their email in their mail app.
    ...(submission.messageId
      ? {
          headers: {
            "In-Reply-To": submission.messageId,
            References: submission.messageId,
          },
        }
      : {}),
    ...replyEmail(submission, body, senderName(from)),
  });
  if (!sent) {
    throw new ContactServiceError(
      "The email provider didn't accept the reply. Check the sender domain is verified in Resend, then try again.",
    );
  }

  // The email is out; failing to record it must not make it look unsent.
  try {
    await contactRepo.insertReply(db, {
      submissionId: id,
      fromEmail: from,
      toEmail: submission.email,
      subject,
      body,
      sentBy: session.user.id,
    });
    if (submission.status === "NEW") {
      await contactRepo.updateSubmissionStatus(db, id, "READ");
    }
    await logAudit({
      userId: session.user.id,
      action: "contact.replied",
      resourceType: "contact_submission",
      resourceId: id,
    });
  } catch (err: unknown) {
    console.error("sendReply: reply sent but not recorded:", err);
  }
}

// ---------------------------------------------------------------------------
// Email received at hello@ (posted by the Cloudflare email worker)
// ---------------------------------------------------------------------------

/**
 * Stores an email sent to hello@ as an inbox message. Returns false for a
 * message already stored (a redelivery), so the worker can treat both as done.
 */
export async function receiveEmail(input: unknown): Promise<boolean> {
  const parsed = inboundEmailSchema.safeParse(input);
  if (!parsed.success) {
    throw new ContactServiceError(parsed.error.issues[0]?.message ?? "Invalid email.");
  }
  const { from, subject, text, html, messageId, attachments } = parsed.data;

  if (messageId && (await contactRepo.findSubmissionByMessageId(db, messageId))) {
    return false;
  }

  let message = text.replace(/\r\n/g, "\n").trim();
  if (message.length > INBOUND_MAX_TEXT) {
    message = `${message.slice(0, INBOUND_MAX_TEXT)}\n\n[Message shortened. The full email is in your mailbox.]`;
  }
  if (attachments) {
    const note = `[${attachments} attachment${attachments === 1 ? "" : "s"}, see the email in your mailbox.]`;
    message = message ? `${message}\n\n${note}` : note;
  }

  const submission = await contactRepo.insertContactSubmission(db, {
    name: singleLine(from.name || "") || from.address,
    email: from.address.toLowerCase(),
    organization: null,
    reason: null,
    subject: subject ? singleLine(subject) : null,
    message: message || "(No text in this email.)",
    honeypot: null,
    ipHash: null,
    status: "NEW",
    source: "email",
    messageId: messageId || null,
  });

  // The designed version, when there is one. Losing it only costs the
  // formatting (the text is stored), so it never fails the delivery.
  const cleanHtml = html?.trim();
  if (cleanHtml && cleanHtml.length <= INBOUND_MAX_HTML) {
    try {
      await contactRepo.insertEmailHtml(db, submission.id, cleanHtml);
    } catch (err: unknown) {
      if (!isMissingTableError(err)) console.error("receiveEmail: HTML not stored:", err);
    }
  }
  return true;
}

/** The email's original HTML, or null (form messages, older emails). */
export async function getEmailHtml(submissionId: string) {
  return contactRepo.findEmailHtml(db, submissionId);
}
