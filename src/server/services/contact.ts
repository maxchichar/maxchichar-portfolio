import "server-only";

import { after } from "next/server";

import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";
import {
  contactSubmissionSchema,
  hashIp,
  RATE_LIMIT_MAX_COUNT,
  RATE_LIMIT_WINDOW_MS,
  type ContactSubmissionInput,
} from "@/lib/validation/contact";

import * as contactRepo from "../repositories/contact";
import { isEmailConfigured } from "./email";
import { sendContactEmails } from "./contact-email";
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
