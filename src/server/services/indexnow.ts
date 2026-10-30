import "server-only";

import { after } from "next/server";

import { buildIndexNowPayload, getIndexNowKey, INDEXNOW_ENDPOINT } from "@/lib/indexnow";
import { getSiteUrl } from "@/lib/metadata";

/**
 * Pings IndexNow about changed public paths once the response has been sent,
 * so publishing never waits on (or fails because of) a search engine.
 * `resolvePaths` runs after the response too, which keeps slug lookups off
 * the admin's critical path.
 */
export function announceToSearchEngines(
  resolvePaths: () => Promise<string[]> | string[],
): void {
  const key = getIndexNowKey();
  if (!key) return;
  after(async () => {
    try {
      const paths = await resolvePaths();
      const payload = buildIndexNowPayload(getSiteUrl(), key, paths);
      if (!payload) return;
      const res = await fetch(INDEXNOW_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok && res.status !== 202) {
        console.warn(`IndexNow submission returned ${res.status}`);
      }
    } catch (error) {
      console.warn("IndexNow submission failed", error);
    }
  });
}
