import { z } from "zod";

export const DEFAULT_SITE_SETTINGS = {
  siteName: "CHIBUEZE MAXWELL",
  siteDescription: "Super Intelligence Engineer & Entrepreneur",
  primaryEmail: null,
  socialGithub: null,
  socialX: null,
  socialLinkedin: null,
  socialYoutube: null,
  socialInstagram: null,
  socialTiktok: null,
  footerText: null,
} as const;

export interface PublicSiteSettings {
  siteName: string;
  siteDescription: string | null;
  primaryEmail: string | null;
  socialGithub: string | null;
  socialX: string | null;
  socialLinkedin: string | null;
  socialYoutube: string | null;
  socialInstagram: string | null;
  socialTiktok: string | null;
  footerText: string | null;
}

const safeSocialUrlSchema = z
  .string()
  .trim()
  .max(255, "URL must be 255 characters or fewer.")
  .optional()
  .nullable()
  .transform((val) => (val && val.length > 0 ? val : null))
  .refine(
    (val) => val === null || /^https?:\/\/\S+$/.test(val),
    "Must be a valid http(s) URL.",
  );

export const siteSettingsSchema = z.object({
  siteName: z
    .string()
    .trim()
    .min(1, "Site name is required.")
    .max(100, "Site name must be 100 characters or fewer."),
  siteDescription: z
    .string()
    .trim()
    .max(300, "Site description must be 300 characters or fewer.")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  primaryEmail: z
    .string()
    .trim()
    .max(255, "Email must be 255 characters or fewer.")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null))
    .refine(
      (val) => val === null || z.string().email().safeParse(val).success,
      "Must be a valid email address.",
    ),
  socialGithub: safeSocialUrlSchema,
  socialX: safeSocialUrlSchema,
  socialLinkedin: safeSocialUrlSchema,
  socialYoutube: safeSocialUrlSchema,
  socialInstagram: safeSocialUrlSchema,
  socialTiktok: safeSocialUrlSchema,
  footerText: z
    .string()
    .trim()
    .max(300, "Footer text must be 300 characters or fewer.")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
});

export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;
