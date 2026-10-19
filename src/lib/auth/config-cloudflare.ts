import "server-only";
import type { Session } from "next-auth";

// Defense in depth: Next Server Actions can be invoked through public URLs.
// Workers never authenticate users, even if an action bypasses route redirects.
export async function auth(): Promise<Session | null> {
  return null;
}
export async function signIn(...args: unknown[]): Promise<never> {
  void args;
  throw new Error("Sign in on the Vercel admin site.");
}
export const signOut = signIn;
const unavailable = () => new Response("Not found", { status: 404 });
export const handlers = { GET: unavailable, POST: unavailable };
