import "server-only";

import { db } from "@/lib/db";
import { isMissingTableError } from "@/lib/db/errors";
import { cleanErrorMessage, errorFingerprint } from "@/lib/error-fingerprint";
import { getSiteUrl } from "@/lib/metadata";

import * as repo from "../repositories/errors";
import { profileFrom } from "./contact-email";
import { escapeHtml, isEmailConfigured, replySender, sendEmail } from "./email";
import {
  button,
  cardEmail,
  code,
  details,
  eyebrow,
  heading,
  small,
} from "./email-design";
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

  const html = cardEmail(
    profileFrom(settings, replySender()),
    `${eyebrow("Site error", "danger")}
${heading(escapeHtml(e.message), { mono: true })}
${details(rows)}
${e.stack ? code(e.stack.split("\n").slice(0, 8).join("\n")) : ""}
${e.stored ? button("Open the Errors page", adminUrl) : small(escapeHtml(note))}
${small("You won't get another email for this error for 6 hours.")}`,
    {
      title: "Site error",
      preheader: e.message,
      label: "Error alert",
      footnote: "Sent to you because error alerts are on for your site.",
    },
  );

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
