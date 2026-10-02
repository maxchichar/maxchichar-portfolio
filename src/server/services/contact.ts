import "server-only";

import { db } from "@/lib/db";
import {
  contactSubmissionSchema,
  hashIp,
  RATE_LIMIT_MAX_COUNT,
  RATE_LIMIT_WINDOW_MS,
  type ContactSubmissionInput,
} from "@/lib/validation/contact";

import * as contactRepo from "../repositories/contact";

export class ContactServiceError extends Error {}
export class ContactRateLimitError extends ContactServiceError {}

export interface ContactSubmissionResult {
  success: boolean;
  error?: string;
}

export async function submitContact(
  rawInput: unknown,
  clientIp: string = "unknown",
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
    await contactRepo.insertContactSubmission(db, {
      name: data.name,
      email: data.email,
      organization: data.organization,
      reason: data.reason,
      message: data.message,
      honeypot: null,
      ipHash,
      status: "NEW",
    });

    return { success: true };
  } catch (err: unknown) {
    console.error("submitContact error:", err);
    return {
      success: false,
      error: "Unable to send your message right now. Please try again later.",
    };
  }
}
