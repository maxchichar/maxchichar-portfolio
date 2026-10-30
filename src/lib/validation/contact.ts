import { z } from "zod";

export const CONTACT_REASONS = [
  "Consulting / Contract",
  "Research Collaboration",
  "Full-time / Advisory",
  "Speaking / Press",
  "Other",
] as const;

export type ContactReason = (typeof CONTACT_REASONS)[number];

// Rate limit: maximum 5 submissions per 60 minutes per IP hash
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
export const RATE_LIMIT_MAX_COUNT = 5;

export const contactSubmissionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(100, "Name must be 100 characters or fewer."),
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address.")
    .max(255, "Email must be 255 characters or fewer."),
  organization: z
    .string()
    .trim()
    .max(150, "Organization must be 150 characters or fewer.")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  reason: z
    .string()
    .trim()
    .max(100, "Reason must be 100 characters or fewer.")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  message: z
    .string()
    .trim()
    .min(5, "Message must be at least 5 characters.")
    .max(5000, "Message must be 5000 characters or fewer."),
  honeypot: z
    .string()
    .max(200)
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
});

export type ContactSubmissionInput = z.infer<typeof contactSubmissionSchema>;

/** Longer bodies are cut; the full email is still in the forwarded copy. */
export const INBOUND_MAX_TEXT = 50_000;

/** An email sent to hello@, as the Cloudflare email worker posts it. */
export const inboundEmailSchema = z.object({
  from: z.object({
    address: z.email().max(255),
    name: z.string().trim().max(200).optional().nullable(),
  }),
  subject: z.string().trim().max(500).optional().nullable(),
  text: z.string(),
  messageId: z.string().trim().max(500).optional().nullable(),
  attachments: z.number().int().min(0).max(1000).optional(),
});
