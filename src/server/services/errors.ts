import "server-only";

import { db } from "@/lib/db";
import { isMissingTableError } from "@/lib/db/errors";
import { cleanErrorMessage, errorFingerprint } from "@/lib/error-fingerprint";
import { getSiteUrl } from "@/lib/metadata";

import * as repo from "../repositories/errors";
import { escapeHtml, isEmailConfigured, sendEmail } from "./email";
import { getPublicSiteSettings } from "./settings";

const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000; // same error re-alerts after 6h
const MAX_ALERTS_PER_HOUR = 10; // site-wide cap on alert emails

export interface ErrorReport {
  source: "server" | "client";
  message: unknown;
  route?: string | null;
  path?: string | null;
  method?: string | null;
  digest?: string | null;
  stack?: string | null;
}

// Fallback when the database is unreachable (or not migrated yet): dedupe
// and cap alerts per server instance, in memory.
const memoryAlerts = new Map<string, number>();
let memoryWindow: number[] = [];
function memoryAllows(fingerprint: string, now: number): boolean {
  memoryWindow = memoryWindow.filter((t) => now - t < 60 * 60 * 1000);
  const last = memoryAlerts.get(fingerprint);
  if (last && now - last < ALERT_COOLDOWN_MS) return false;
  if (memoryWindow.length >= MAX_ALERTS_PER_HOUR) return false;
  memoryAlerts.set(fingerprint, now);
  memoryWindow.push(now);
  return true;
}

const clip = (value: string | null | undefined, max: number) =>
  value ? value.slice(0, max) : null;

/** Strips the query string and fragment: paths are stored, never parameters. */
function cleanPath(path: string | null | undefined): string | null {
  if (!path) return null;
  return clip(path.split(/[?#]/)[0] ?? null, 300);
}

/**
 * Records a production error and emails the owner when it's new, or still
 * happening after the cooldown. Never throws: error reporting must not be
 * able to cause errors of its own.
 */
export async function recordError(report: ErrorReport): Promise<void> {
  try {
    const message = cleanErrorMessage(report.message);
    const route = clip(report.route ?? null, 300);
    const fingerprint = errorFingerprint(report.source, route, message);
    const data = {
      fingerprint,
      source: report.source,
      message,
      route,
      lastPath: cleanPath(report.path),
      method: clip(report.method ?? null, 10),
      digest: clip(report.digest ?? null, 100),
      stack: clip(report.stack ?? null, 4000),
    };

    let row: repo.ErrorEventRow | null = null;
    let shouldAlert = false;
    try {
      row = await repo.upsert(db, data);
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if ((await repo.alertsSince(db, hourAgo)) < MAX_ALERTS_PER_HOUR) {
        shouldAlert = await repo.claimAlert(
          db,
          row.id,
          new Date(Date.now() - ALERT_COOLDOWN_MS),
        );
      }
    } catch (err) {
      if (!isMissingTableError(err)) {
        console.error("recordError: could not store the error:", err);
      }
      shouldAlert = memoryAllows(fingerprint, Date.now());
    }

    if (shouldAlert && isEmailConfigured()) {
      await sendAlert({ ...data, count: row?.count ?? 1, stored: Boolean(row) });
    }
  } catch (err) {
    console.error("recordError failed:", err);
  }
}

async function sendAlert(e: {
  source: string;
  message: string;
  route: string | null;
  lastPath: string | null;
  method: string | null;
  digest: string | null;
  stack: string | null;
  count: number;
  stored: boolean;
}) {
  const settings = await getPublicSiteSettings();
  const to =
    process.env.ERROR_ALERT_EMAIL?.trim() ||
    process.env.CONTACT_NOTIFY_EMAIL?.trim() ||
    settings.primaryEmail;
  if (!to) return;

  const site = getSiteUrl().replace(/\/$/, "");
  const where = e.lastPath ?? e.route ?? "unknown page";
  const rows: [string, string][] = [
    ["Where", `${e.method ? `${e.method} ` : ""}${where}`],
    ...(e.route && e.route !== where ? [["Route", e.route] as [string, string]] : []),
    ["Happened in", e.source === "server" ? "the server" : "a visitor's browser"],
    ["Times so far", String(e.count)],
    ...(e.digest ? [["Reference", e.digest] as [string, string]] : []),
    ["When", new Date().toUTCString()],
  ];
  const adminUrl = `${site}/admin/errors`;
  const note = e.stored
    ? `See every occurrence: ${adminUrl}`
    : "This error couldn't be saved to the database (it may be unreachable, or `npm run db:push` hasn't been run).";

  const text = [
    `Something broke on ${settings.siteName}.`,
    "",
    e.message,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    ...(e.stack ? ["Stack:", e.stack.split("\n").slice(0, 8).join("\n"), ""] : []),
    note,
    "You won't get another email for this error for 6 hours.",
  ].join("\n");

  const html = `<!doctype html><html><body style="margin:0;background:#f5f4f0;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#141416;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e4e2dc;border-radius:12px;"><tr><td style="padding:28px;">
<p style="margin:0 0 4px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#b42318;">Site error</p>
<h1 style="margin:0 0 20px;font-size:19px;line-height:1.35;font-family:Menlo,Consolas,monospace;font-weight:600;">${escapeHtml(e.message)}</h1>
<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;margin-bottom:20px;">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:3px 16px 3px 0;color:#6b6a66;vertical-align:top;white-space:nowrap;">${k}</td><td style="padding:3px 0;">${escapeHtml(v)}</td></tr>`,
    )
    .join("")}</table>
${e.stack ? `<pre style="margin:0 0 20px;padding:12px;background:#f5f4f0;border-radius:8px;font-size:12px;line-height:1.5;white-space:pre-wrap;word-break:break-word;">${escapeHtml(e.stack.split("\n").slice(0, 8).join("\n"))}</pre>` : ""}
${e.stored ? `<p style="margin:0 0 12px;"><a href="${escapeHtml(adminUrl)}" style="display:inline-block;background:#141416;color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-size:14px;">Open the Errors page</a></p>` : `<p style="margin:0 0 12px;font-size:13px;color:#6b6a66;">${escapeHtml(note)}</p>`}
<p style="margin:0;font-size:12px;color:#6b6a66;">You won't get another email for this error for 6 hours.</p>
</td></tr></table></body></html>`;

  await sendEmail({
    to,
    subject: `Site error: ${e.message.slice(0, 90)}`,
    text,
    html,
  });
}

/** Admin list; `available` is false until migration 0005 has run. */
export async function listErrors() {
  try {
    return { available: true, items: await repo.list(db) };
  } catch (err) {
    if (isMissingTableError(err)) return { available: false, items: [] };
    throw err;
  }
}

export async function setErrorResolved(id: string, resolved: boolean) {
  await repo.setResolved(db, id, resolved);
}

export async function deleteError(id: string) {
  await repo.remove(db, id);
}
