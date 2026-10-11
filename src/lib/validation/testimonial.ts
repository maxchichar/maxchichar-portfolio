import { z } from "zod";

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null));

const optionalId = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((val) => (val && val.length > 0 ? val : null))
  // Any UUID shape: the service then checks the row actually exists.
  .refine((val) => val === null || z.guid().safeParse(val).success, "Invalid reference.");

/** Checkbox inputs submit "on" when ticked and nothing when not. */
const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.boolean(), z.null(), z.undefined()])
  .transform((val) => val === "on" || val === "true" || val === true);

export const testimonialSchema = z.object({
  quote: z
    .string()
    .trim()
    .min(10, "The quote needs at least 10 characters.")
    .max(800, "Keep the quote to 800 characters or fewer."),
  authorName: z
    .string()
    .trim()
    .min(1, "Author name is required.")
    .max(100, "Author name must be 100 characters or fewer."),
  authorRole: optionalText(100, "Role"),
  authorCompany: optionalText(100, "Company"),
  authorUrl: optionalText(255, "Link").refine(
    (val) => val === null || /^https?:\/\/\S+$/.test(val),
    "The link must start with http:// or https://.",
  ),
  avatarMediaId: optionalId,
  projectId: optionalId,
  featured: checkbox,
  visible: checkbox,
  sortOrder: z.coerce
    .number()
    .int("Order must be a whole number.")
    .min(0, "Order can't be negative.")
    .max(999, "Order must be 999 or less.")
    .catch(0),
});
export type TestimonialInput = z.infer<typeof testimonialSchema>;
