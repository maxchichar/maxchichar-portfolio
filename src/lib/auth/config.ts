import "server-only";

// Next inlines this non-secret build setting. Conditional require keeps the
// Vercel credential implementation and native Argon2 out of the Worker graph.
/* eslint-disable @typescript-eslint/no-require-imports */
const implementation: typeof import("./config-vercel") =
  process.env.PORTFOLIO_AUTH_HOST === "cloudflare"
    ? require("./config-cloudflare")
    : require("./config-vercel");
/* eslint-enable @typescript-eslint/no-require-imports */

export const { auth, handlers, signIn, signOut } = implementation;
