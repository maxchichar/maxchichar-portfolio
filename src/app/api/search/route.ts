import { NextResponse } from "next/server";

import { getSearchIndex } from "@/server/services/search";

export const dynamic = "force-dynamic";

/**
 * The command palette's index, fetched the first time a visitor opens it.
 * Public data only (what the pages already show); briefly cached at the edge.
 */
export async function GET() {
  const index = await getSearchIndex();
  return NextResponse.json(index, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" },
  });
}
