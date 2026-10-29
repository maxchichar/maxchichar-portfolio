import type { NextConfig } from "next";

type Redirect = Awaited<ReturnType<NonNullable<NextConfig["redirects"]>>>[number];

// The admin is served from its own domain (see docs/CLOUDFLARE.md). That
// domain is the same Vercel project, so without these rules it would also
// show the public site. Its home opens the admin, and public pages go to the
// canonical site. /admin, /preview, /api, /_next and static files stay put.

export const ADMIN_HOSTNAME = "admin.chibuezemaxwell.com";
export const CANONICAL_SITE_URL = "https://chibuezemaxwell.com";

const PUBLIC_PATHS = [
  "/work/:path*",
  "/research/:path*",
  "/writing/:path*",
  "/topics/:path*",
  "/now",
  "/about",
  "/contact",
  "/cv",
  "/feed.xml",
  "/llms.txt",
  "/llms-full.txt",
];

export function adminHostRedirects(): Redirect[] {
  const has = [{ type: "host" as const, value: ADMIN_HOSTNAME }];
  return [
    { source: "/", has, destination: "/admin", permanent: false },
    ...PUBLIC_PATHS.map((source) => ({
      source,
      has,
      destination: `${CANONICAL_SITE_URL}${source}`,
      permanent: false,
    })),
  ];
}
