"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Sends one cookieless page-view beacon per client-side navigation. Skips
 * the admin, and does nothing for visitors with Global Privacy Control or
 * Do Not Track enabled.
 */
export function AnalyticsBeacon() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || last.current === pathname) return;
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.globalPrivacyControl || nav.doNotTrack === "1") return;

    // Only the first view in a tab can carry an external referrer.
    const referrer = last.current === null ? document.referrer : "";
    last.current = pathname;

    const body = JSON.stringify({ path: pathname, referrer });
    const sent =
      typeof navigator.sendBeacon === "function" &&
      navigator.sendBeacon(
        "/api/analytics/collect",
        new Blob([body], { type: "application/json" }),
      );
    if (!sent) {
      void fetch("/api/analytics/collect", { method: "POST", body, keepalive: true });
    }
  }, [pathname]);

  return null;
}
