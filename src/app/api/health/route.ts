import { NextResponse } from "next/server";

import { checkDatabaseSchema } from "@/server/services/schema-check";

export const dynamic = "force-dynamic";

/**
 * Checked by the smoke test after every deploy: 200 when the database has
 * every table, column and index the code expects, 503 when a migration is
 * missing. Details go to the admin Errors page, never to this response.
 */
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const missing = await checkDatabaseSchema();
    return missing.length === 0
      ? NextResponse.json({ ok: true }, { headers })
      : NextResponse.json({ ok: false }, { status: 503, headers });
  } catch (err) {
    console.error("/api/health: schema check failed:", err);
    return NextResponse.json({ ok: false }, { status: 503, headers });
  }
}
