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
  heroImage: null,
  aboutImage: null,
} as const;

/** A READY media item resolved to what the public pages need to render it. */
export interface SiteImage {
  mediaId: string;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
}

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
  heroImage: SiteImage | null;
  aboutImage: SiteImage | null;
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

const optionalMediaIdSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((val) => (val && val.length > 0 ? val : null))
  .refine(
    (val) => val === null || z.uuid().safeParse(val).success,
    "Invalid media reference.",
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
  heroMediaId: optionalMediaIdSchema,
  aboutMediaId: optionalMediaIdSchema,
});

export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;
