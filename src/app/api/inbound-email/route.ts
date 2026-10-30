import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { ContactServiceError, receiveEmail } from "@/server/services/contact";

// Raw email text plus JSON overhead; the service trims the body further.
const MAX_BODY_BYTES = 256 * 1024;

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

/** Compares hashes so the check takes the same time whatever the guess. */
function authorized(request: NextRequest): boolean {
  const secret = process.env.INBOUND_EMAIL_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  return timingSafeEqual(digest(token), digest(secret));
}

/**
 * Mail sent to hello@ arrives here from the Cloudflare email worker
 * (cloudflare-edge.mjs), authenticated with INBOUND_EMAIL_SECRET, and is
 * stored as an inbox message.
 */
export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Too large" }, { status: 413 });
  }
  try {
    const stored = await receiveEmail(JSON.parse(text));
    return NextResponse.json({ stored }, { status: stored ? 201 : 200 });
  } catch (err: unknown) {
    if (err instanceof SyntaxError || err instanceof ContactServiceError) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    console.error("inbound-email failed:", err);
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}
